from datetime import date

from django.contrib.auth.models import Group, User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIRequestFactory, force_authenticate

from issara.ilm_server_2.models import (
    SharedFile,
    SPWorkplan,
    StrategicPartner,
    StrategicPartnerFile,
    StrategicPartnerUser,
    SupplierUser,
    WorkplanDocs,
)
from issara.ilm_server_2.views import StregicPartnerViewSet
import issara.ilm_server_2.factories as factories


class StrategicPartnerDetailApiTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.retrieve_view = StregicPartnerViewSet.as_view({"get": "retrieve"})

        self.partner = StrategicPartner.objects.create(name="Partner Under Test")
        self.workplan = SPWorkplan.objects.create(
            strategic_partner=self.partner,
            fp_name="Partner Contact",
            fp_title="mr",
            suggested_date=date(2026, 1, 1),
        )

        self.staff_user = User.objects.create_user(
            username="staff-user",
            email="staff@example.com",
            password="pass",
            is_staff=True,
        )

        self.global_partner_group = Group.objects.create(name="global_partner")
        self.partner_user = User.objects.create_user(
            username="partner-user",
            email="partner@example.com",
            password="pass",
        )
        self.partner_user.groups.add(self.global_partner_group)
        StrategicPartnerUser.objects.create(
            user=self.partner_user,
            strategic_partner=self.partner,
        )

        self.supplier_user = User.objects.create_user(
            username="supplier-user",
            email="supplier@example.com",
            password="pass",
        )
        supplier = factories.SupplierFactory.create()
        SupplierUser.objects.create(user=self.supplier_user, supplier=supplier)

    def _shared_file(self, filename, description=""):
        return SharedFile.objects.create(
            name=filename,
            description=description,
            type="SPW",
            file_path=SimpleUploadedFile(
                filename,
                b"test file contents",
                content_type="application/pdf",
            ),
        )

    def _retrieve(self, user, partner_id=None):
        partner_id = partner_id or self.partner.id
        request = self.factory.get(f"/api/v2/strategicpartners/{partner_id}/")
        force_authenticate(request, user=user)
        response = self.retrieve_view(request, pk=partner_id)
        response.render()
        return response

    def test_detail_returns_legacy_and_new_workplan_file_fields(self):
        legacy_file = StrategicPartnerFile.objects.create(
            name="Legacy file",
            url="https://example.com/legacy.pdf",
            description="legacy",
        )
        self.partner.strategic_partner_files.add(legacy_file)

        policy_file = self._shared_file("human-rights.pdf", "policy file")
        compliance_file = self._shared_file("supply-chain.pdf", "compliance file")

        WorkplanDocs.objects.create(
            workplan=self.workplan,
            document_type="human_rights",
            document=policy_file,
        )
        WorkplanDocs.objects.create(
            workplan=self.workplan,
            document_type="supply_chain",
            document=compliance_file,
            document_name="Supply Chain Overview",
        )

        response = self._retrieve(self.staff_user)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["strategic_partner_files"], [legacy_file.id])

        self.assertEqual(len(response.data["workplan_files"]), 2)
        self.assertEqual(len(response.data["policy_files"]), 1)
        self.assertEqual(len(response.data["compliance_files"]), 1)

        policy_payload = response.data["policy_files"][0]
        self.assertEqual(policy_payload["name"], "human-rights.pdf")
        self.assertEqual(policy_payload["description"], "policy file")
        self.assertEqual(policy_payload["type"], "SPW")
        self.assertEqual(policy_payload["document_type"], "human_rights")
        self.assertEqual(policy_payload["document_type_display"], "Human Rights")
        self.assertTrue(policy_payload["file_path"].endswith("human-rights.pdf"))

        compliance_payload = response.data["compliance_files"][0]
        self.assertEqual(compliance_payload["name"], "supply-chain.pdf")
        self.assertEqual(compliance_payload["document_type"], "supply_chain")
        self.assertEqual(
            compliance_payload["document_name"], "Supply Chain Overview"
        )

    def test_workplan_files_are_sourced_from_workplan_documents(self):
        direct_file = self._shared_file("ethical-recruitment.pdf", "workplan source")
        WorkplanDocs.objects.create(
            workplan=self.workplan,
            document_type="ethical_recruitment",
            document=direct_file,
        )

        response = self._retrieve(self.staff_user)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["workplan_files"][0]["id"], direct_file.id)
        self.assertEqual(
            response.data["workplan_files"][0]["name"], "ethical-recruitment.pdf"
        )

    def test_supplier_user_can_still_access_detail_endpoint(self):
        WorkplanDocs.objects.create(
            workplan=self.workplan,
            document_type="human_rights",
            document=self._shared_file("supplier-visible.pdf"),
        )

        response = self._retrieve(self.supplier_user)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.partner.id)
        self.assertEqual(len(response.data["policy_files"]), 1)

    def test_query_count_does_not_grow_with_additional_workplan_docs(self):
        WorkplanDocs.objects.create(
            workplan=self.workplan,
            document_type="human_rights",
            document=self._shared_file("first.pdf"),
        )

        with CaptureQueriesContext(connection) as initial_context:
            initial_response = self._retrieve(self.partner_user)
        self.assertEqual(initial_response.status_code, 200)

        extra_doc_types = [
            "ethical_recruitment",
            "migrant_worker_policy",
            "supply_chain",
            "audit_reports",
            "others",
        ]
        for index, document_type in enumerate(extra_doc_types, start=2):
            WorkplanDocs.objects.create(
                workplan=self.workplan,
                document_type=document_type,
                document=self._shared_file(f"extra-{index}.pdf"),
            )

        with CaptureQueriesContext(connection) as expanded_context:
            expanded_response = self._retrieve(self.partner_user)
        self.assertEqual(expanded_response.status_code, 200)
        self.assertEqual(len(expanded_response.data["workplan_files"]), 6)
        self.assertEqual(
            len(expanded_context),
            len(initial_context),
            msg=(
                f"Expected stable query count, got {len(initial_context)} then "
                f"{len(expanded_context)}"
            ),
        )
