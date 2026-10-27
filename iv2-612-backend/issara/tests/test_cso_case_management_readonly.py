"""Reading Case Management must not write, and must not disturb legacy rows.

The adapter reuses legacy filter sets, serializers and save signals. These
tests pin the boundary: every read path is side-effect free, and an end-to-end
read leaves an existing legacy case, its `SupplierKpi` links and its history
byte-for-byte as they were.
"""

from datetime import date

from django.contrib.auth.models import User
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from issara.cascade.views.cso_case_management import (
    CsoCaseManagementContextAPIView,
    CsoCaseManagementCyclesAPIView,
    CsoCaseManagementDetailAPIView,
    CsoCaseManagementHistoryAPIView,
    CsoCaseManagementListAPIView,
    CsoCaseManagementOrganizationsAPIView,
    CsoCaseManagementCallAPIView,
)
from issara.ilm_server_2.models import Case, Organization, Supplier, UserOrganization
from kpis.models import Kpi, KpiCategory, SupplierKpi, SupplierKpiUpdate, SupplierKpiUpdateStatus

WRITE_STATEMENTS = ("INSERT", "UPDATE", "DELETE", "REPLACE")


class CaseManagementReadOnlyTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.org = Organization.objects.create(name="My CSO")
        self.cso = User.objects.create(username="cso@example.test")
        self.cso.claims = {"role": "org-cso"}
        UserOrganization.objects.create(user=self.cso, organization=self.org)

        self.management = User.objects.create(username="management@example.test")
        self.management.claims = {"role": "org-issara-management"}

        self.supplier = Supplier.objects.create(name="Shared workplace")
        self.category = KpiCategory.objects.create(name="Payments")
        self.definition = Kpi.objects.create(
            description="Unpaid wages", level=2, kpi_category=self.category
        )
        self.status = SupplierKpiUpdateStatus.objects.create(name="No Progress")
        self.kpi = SupplierKpi.objects.create(
            supplier=self.supplier,
            kpi=self.definition,
            status=self.status,
            opened_at=date(2026, 1, 1),
            retaliation=False,
            retaliation_cso=False,
        )
        self.call = Case.objects.create(
            supplier=self.supplier,
            case_created_by=self.cso,
            client_nickname="Worker",
            client_phonenumber="111",
        )
        self.call.kpis.add(self.definition)
        self.call.supplier_kpis.add(self.kpi)
        SupplierKpiUpdate.objects.create(
            supplier_kpi=self.kpi, status=self.status, opened_at=date(2026, 1, 1)
        )

    def call_view(self, view, user, path, pk=None, **extra_kwargs):
        request = self.factory.get(path)
        force_authenticate(request, user=user)
        kwargs = {"pk": pk} if pk is not None else {}
        kwargs.update(extra_kwargs)
        return view.as_view()(request, **kwargs)

    def snapshot(self):
        """Everything these tests promise not to disturb."""
        return {
            "cases": set(Case.objects.values_list("id", "supplier_id")),
            "case_kpis": set(Case.kpis.through.objects.values_list("case_id", "kpi_id")),
            "case_supplier_kpis": set(
                Case.supplier_kpis.through.objects.values_list(
                    "case_id", "supplierkpi_id"
                )
            ),
            "supplier_kpis": set(
                SupplierKpi.objects.values_list("id", "supplier_id", "kpi_id", "status_id")
            ),
            "updates": set(
                SupplierKpiUpdate.objects.values_list("id", "supplier_kpi_id", "status_id")
            ),
        }

    def assert_no_writes(self, run):
        with CaptureQueriesContext(connection) as captured:
            run()
        writes = [
            query["sql"]
            for query in captured.captured_queries
            if query["sql"].lstrip().upper().startswith(WRITE_STATEMENTS)
        ]
        self.assertEqual(writes, [], f"read path issued writes: {writes}")

    def test_every_read_endpoint_issues_no_write_queries(self):
        for label, run in (
            (
                "context",
                lambda: self.call_view(
                    CsoCaseManagementContextAPIView, self.cso, "/context/"
                ),
            ),
            ("list", lambda: self.call_view(CsoCaseManagementListAPIView, self.cso, "/kpis/")),
            (
                "detail",
                lambda: self.call_view(
                    CsoCaseManagementDetailAPIView, self.cso, "/kpis/1/", pk=self.kpi.pk
                ),
            ),
            (
                "history",
                lambda: self.call_view(
                    CsoCaseManagementHistoryAPIView,
                    self.cso,
                    "/kpis/1/updates/",
                    pk=self.kpi.pk,
                ),
            ),
            ("cycles", lambda: self.call_view(CsoCaseManagementCyclesAPIView, self.cso, "/cycles/")),
            (
                "organizations",
                lambda: self.call_view(
                    CsoCaseManagementOrganizationsAPIView, self.management, "/organizations/"
                ),
            ),
            (
                "specific call",
                lambda: self.call_view(
                    CsoCaseManagementCallAPIView, self.management,
                    f"/kpis/{self.kpi.pk}/calls/{self.call.pk}/?selected_organization_id={self.org.pk}",
                    kpi_pk=self.kpi.pk, call_pk=self.call.pk,
                ),
            ),
        ):
            with self.subTest(endpoint=label):
                self.assert_no_writes(run)

    def test_reading_leaves_every_legacy_row_untouched(self):
        before = self.snapshot()

        self.call_view(CsoCaseManagementContextAPIView, self.cso, "/context/")
        self.call_view(CsoCaseManagementListAPIView, self.cso, "/kpis/")
        self.call_view(
            CsoCaseManagementDetailAPIView, self.cso, "/kpis/1/", pk=self.kpi.pk
        )
        self.call_view(
            CsoCaseManagementHistoryAPIView, self.cso, "/kpis/1/updates/", pk=self.kpi.pk
        )
        self.call_view(CsoCaseManagementCyclesAPIView, self.cso, "/cycles/")

        self.assertEqual(self.snapshot(), before)

    def test_management_inspection_is_read_only_and_writes_nothing(self):
        path = f"/kpis/?selected_organization_id={self.org.id}"
        before = self.snapshot()

        self.assert_no_writes(
            lambda: self.call_view(CsoCaseManagementListAPIView, self.management, path)
        )

        response = self.call_view(CsoCaseManagementListAPIView, self.management, path)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["results"][0]["can_edit"])

        denied = self.factory.patch("/kpis/1/", {"affected_workers": 9}, format="json")
        force_authenticate(denied, user=self.management)
        result = CsoCaseManagementDetailAPIView.as_view()(denied, pk=self.kpi.pk)
        self.assertEqual(result.status_code, 403)
        self.assertEqual(self.snapshot(), before)
