import pytest
from django.contrib.auth import get_user_model
from model_bakery import baker
from rest_framework.test import APIRequestFactory

from issara.grievance.models import Grievance, Remediation
from issara.grievance.permissions import can_view_attachment, grievance_queryset_for_user
from issara.grievance.serializers import GrievanceSerializer
from issara.ilm_server_2.choices import (
    SHARED_FILE_PERMISSION_BOTH,
    SHARED_FILE_PERMISSION_SUPPLIER,
    SHARED_FILE_PERMISSION_SUPPLIER_ISSARA,
)
from issara.ilm_server_2.models import SharedFile, StrategicPartnerUser, SupplierUser
from supply_chains.models import SupplierSupplyChain


pytestmark = pytest.mark.django_db


def _supplier_user(supplier, username):
    user = get_user_model().objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="test-password",
    )
    SupplierUser.objects.create(user=user, supplier=supplier)
    return user


def test_supplier_queryset_is_scoped_to_own_supplier():
    own_supplier = baker.make("ilm_server_2.Supplier")
    other_supplier = baker.make("ilm_server_2.Supplier")
    user = _supplier_user(own_supplier, "supplier-user")
    own_grievance = Grievance.objects.create(
        supplier_kpi=baker.make("kpis.SupplierKpi", supplier=own_supplier)
    )
    Grievance.objects.create(
        supplier_kpi=baker.make("kpis.SupplierKpi", supplier=other_supplier)
    )

    assert list(grievance_queryset_for_user(Grievance.objects.all(), user)) == [
        own_grievance
    ]


@pytest.mark.parametrize(
    ("permission", "supplier_can_view", "issara_can_view"),
    [
        (SHARED_FILE_PERMISSION_SUPPLIER, True, False),
        (SHARED_FILE_PERMISSION_SUPPLIER_ISSARA, True, True),
        (SHARED_FILE_PERMISSION_BOTH, True, True),
    ],
)
def test_attachment_audience_boundaries(
    permission, supplier_can_view, issara_can_view
):
    supplier = baker.make("ilm_server_2.Supplier")
    supplier_user = _supplier_user(supplier, f"supplier-{permission}")
    issara_user = get_user_model().objects.create_user(
        username=f"staff-{permission}",
        email=f"staff-{permission}@example.com",
        is_staff=True,
    )
    grievance = Grievance.objects.create(
        supplier_kpi=baker.make("kpis.SupplierKpi", supplier=supplier)
    )
    attachment = SharedFile.objects.create(
        name="evidence.pdf",
        permission=permission,
    )

    assert can_view_attachment(supplier_user, grievance, attachment) is supplier_can_view
    assert can_view_attachment(issara_user, grievance, attachment) is issara_can_view


def test_customer_attachment_requires_linked_active_supply_chain():
    supplier = baker.make("ilm_server_2.Supplier")
    partner = baker.make("ilm_server_2.StrategicPartner")
    other_partner = baker.make("ilm_server_2.StrategicPartner")
    supply_chain = baker.make("supply_chains.SupplyChain", strategic_partner=partner)
    SupplierSupplyChain.objects.create(
        supplier=supplier,
        supply_chain=supply_chain,
        status=SupplierSupplyChain.STATUS_ACTIVE,
    )
    linked_user = get_user_model().objects.create_user(username="linked-customer")
    unlinked_user = get_user_model().objects.create_user(username="other-customer")
    StrategicPartnerUser.objects.create(user=linked_user, strategic_partner=partner)
    StrategicPartnerUser.objects.create(
        user=unlinked_user,
        strategic_partner=other_partner,
    )
    grievance = Grievance.objects.create(
        supplier_kpi=baker.make("kpis.SupplierKpi", supplier=supplier)
    )
    customer_attachment = SharedFile.objects.create(
        name="customer-evidence.pdf",
        permission=SHARED_FILE_PERMISSION_BOTH,
    )
    internal_attachment = SharedFile.objects.create(
        name="internal-evidence.pdf",
        permission=SHARED_FILE_PERMISSION_SUPPLIER_ISSARA,
    )

    assert can_view_attachment(linked_user, grievance, customer_attachment)
    assert not can_view_attachment(unlinked_user, grievance, customer_attachment)
    assert not can_view_attachment(linked_user, grievance, internal_attachment)


def test_submitting_a_correction_creates_a_new_remediation():
    supplier = baker.make("ilm_server_2.Supplier")
    user = _supplier_user(supplier, "remediation-author")
    grievance = Grievance.objects.create(
        supplier_kpi=baker.make("kpis.SupplierKpi", supplier=supplier),
        is_draft=False,
    )
    submitted = Remediation.objects.create(
        grievance=grievance,
        description="Original submitted update",
        author=user,
        is_submitted=True,
    )
    request = APIRequestFactory().patch("/")
    request.user = user
    request.data = {
        "is_draft": False,
        "remediation": {
            "id": submitted.id,
            "description": "Corrective follow-up",
            "is_submitted": False,
            "author": None,
        },
    }
    serializer = GrievanceSerializer(
        grievance,
        data={"is_draft": False},
        partial=True,
        context={"request": request},
    )

    assert serializer.is_valid(), serializer.errors
    serializer.save()

    submitted.refresh_from_db()
    assert submitted.description == "Original submitted update"
    assert list(
        Remediation.objects.filter(grievance=grievance, is_submitted=True)
        .order_by("id")
        .values_list("description", flat=True)
    ) == ["Original submitted update", "Corrective follow-up"]


def test_submitted_remediation_rejects_direct_save_and_delete():
    supplier = baker.make("ilm_server_2.Supplier")
    grievance = Grievance.objects.create(
        supplier_kpi=baker.make("kpis.SupplierKpi", supplier=supplier),
        is_draft=False,
    )
    submitted = Remediation.objects.create(
        grievance=grievance,
        description="Original submitted update",
        is_submitted=True,
    )

    submitted.description = "Attempted tamper"
    with pytest.raises(ValueError):
        submitted.save()

    with pytest.raises(ValueError):
        submitted.delete()

    submitted.refresh_from_db()
    assert submitted.description == "Original submitted update"
