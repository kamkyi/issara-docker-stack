import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from model_bakery import baker
from rest_framework.test import APIRequestFactory, force_authenticate

from issara.grievance.models import Grievance
from issara.grievance.serializers import GrievanceSerializer
from issara.grievance.views import GrievanceViewSet
from issara.ilm_server_2.choices import SHARED_FILE_PERMISSION_SUPPLIER
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


def _upload_attachment(user, supplier_kpi, grievance):
    upload = SimpleUploadedFile(
        "evidence.pdf", b"%PDF-1.4 test content", content_type="application/pdf"
    )
    factory = APIRequestFactory()
    request = factory.post(
        f"/api/v2/supplier-kpis/{supplier_kpi.id}/grievance/"
        f"{grievance.id}/information_collection_attachments/",
        {
            "information_collection_attachments": upload,
            "information_collection_attachment_permissions": (
                SHARED_FILE_PERMISSION_SUPPLIER
            ),
        },
        format="multipart",
    )
    force_authenticate(request, user=user)
    view = GrievanceViewSet.as_view(
        {"post": "information_collection_attachments"}
    )
    return view(request, skpi_id=supplier_kpi.id, pk=grievance.id)


def test_draft_attachment_persists_and_reads_back():
    supplier = baker.make("ilm_server_2.Supplier")
    user = _supplier_user(supplier, "draft-att-supplier")
    supplier_kpi = baker.make("kpis.SupplierKpi", supplier=supplier)
    grievance = Grievance.objects.create(supplier_kpi=supplier_kpi, is_draft=True)

    response = _upload_attachment(user, supplier_kpi, grievance)
    assert response.status_code == 200, getattr(response, "data", response)

    grievance.refresh_from_db()
    # Still a draft, and the file is now linked.
    assert grievance.is_draft is True
    assert grievance.information_collection_attachments.count() == 1

    # And it appears in the payload the supplier reads back.
    read_req = APIRequestFactory().get("/")
    read_req.user = user
    data = GrievanceSerializer(grievance, context={"request": read_req}).data
    names = [a["name"] for a in data["information_collection_attachments"]]
    assert "evidence.pdf" in names


def test_issara_uploader_sees_their_default_internal_only_upload():
    """An Issara staffer who uploads with the default 'Internal Only' (=Supplier
    Only) permission must still see the file they just uploaded on read-back.

    can_view_attachment() hides Supplier-Only files from Issara staff, so before
    the fix the file saved but vanished from the uploader's view."""
    supplier = baker.make("ilm_server_2.Supplier")
    issara = get_user_model().objects.create_user(
        username="issara-uploader",
        email="issara-uploader@example.com",
        is_staff=True,
    )
    supplier_kpi = baker.make("kpis.SupplierKpi", supplier=supplier)
    grievance = Grievance.objects.create(supplier_kpi=supplier_kpi, is_draft=True)

    response = _upload_attachment(issara, supplier_kpi, grievance)
    assert response.status_code == 200, getattr(response, "data", response)

    grievance.refresh_from_db()
    assert grievance.information_collection_attachments.count() == 1

    read_req = APIRequestFactory().get("/")
    read_req.user = issara
    data = GrievanceSerializer(grievance, context={"request": read_req}).data
    names = [a["name"] for a in data["information_collection_attachments"]]
    assert "evidence.pdf" in names
