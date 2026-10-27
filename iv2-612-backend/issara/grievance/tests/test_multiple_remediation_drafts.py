import pytest
from django.contrib.auth import get_user_model
from model_bakery import baker
from rest_framework.test import APIRequestFactory

from issara.grievance.models import Grievance, Remediation
from issara.grievance.serializers import GrievanceSerializer
from issara.ilm_server_2.models import SupplierUser

pytestmark = pytest.mark.django_db


def _supplier_user(supplier, username):
    user = get_user_model().objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="test-password",
    )
    SupplierUser.objects.create(user=user, supplier=supplier)
    return user


def _save(grievance, user, remediations, is_draft):
    request = APIRequestFactory().patch("/")
    request.user = user
    request.data = {"is_draft": is_draft, "remediations": remediations}
    serializer = GrievanceSerializer(
        grievance,
        data={"is_draft": is_draft},
        partial=True,
        context={"request": request},
    )
    assert serializer.is_valid(), serializer.errors
    serializer.save()
    return serializer


def _read(grievance, user):
    request = APIRequestFactory().get("/")
    request.user = user
    return GrievanceSerializer(grievance, context={"request": request}).data


def test_multiple_remediation_drafts_persist_and_read_back():
    supplier = baker.make("ilm_server_2.Supplier")
    user = _supplier_user(supplier, "remediation-multi")
    grievance = Grievance.objects.create(
        supplier_kpi=baker.make("kpis.SupplierKpi", supplier=supplier),
        is_draft=True,
    )

    # Two updates in one Save Draft both persist as draft rows.
    _save(grievance, user, [{"description": "Update 1"}, {"description": "Update 2"}], True)
    assert (
        Remediation.objects.filter(grievance=grievance, is_submitted=False).count()
        == 2
    )

    data = _read(grievance, user)
    entries = data["list_of_text_fields"]["remediations"]
    assert [e["description"] for e in entries] == ["Update 1", "Update 2"]
    assert all(e["is_submitted"] is False for e in entries)

    # Editing one by id and adding a third — all persist.
    first_id = entries[0]["id"]
    _save(
        grievance,
        user,
        [
            {"id": first_id, "description": "Update 1 edited"},
            {"description": "Update 2"},
            {"description": "Update 3"},
        ],
        True,
    )
    descriptions = sorted(
        Remediation.objects.filter(
            grievance=grievance, is_submitted=False
        ).values_list("description", flat=True)
    )
    assert descriptions == ["Update 1 edited", "Update 2", "Update 3"]

    # Submitting locks them all in as submitted history.
    read_entries = _read(grievance, user)["list_of_text_fields"]["remediations"]
    _save(grievance, user, read_entries, False)
    assert (
        Remediation.objects.filter(grievance=grievance, is_submitted=True).count()
        == 3
    )
    assert (
        Remediation.objects.filter(grievance=grievance, is_submitted=False).count()
        == 0
    )


def test_partner_view_hides_draft_remediations():
    """A read-only viewer (no supplier link) sees only submitted remediations."""
    supplier = baker.make("ilm_server_2.Supplier")
    user = _supplier_user(supplier, "remediation-owner")
    grievance = Grievance.objects.create(
        supplier_kpi=baker.make("kpis.SupplierKpi", supplier=supplier),
        is_draft=True,
    )
    _save(grievance, user, [{"description": "A draft-only update"}], True)

    outsider = get_user_model().objects.create_user(username="outsider-viewer")
    entries = _read(grievance, outsider)["list_of_text_fields"]["remediations"]
    assert entries == []
