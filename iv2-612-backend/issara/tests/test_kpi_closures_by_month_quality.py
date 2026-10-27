from datetime import date

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIRequestFactory, force_authenticate

import issara.ilm_server_2.factories as factories
from issara.cascade.views import KpiClosuresByMonthQualityAPIView
from issara.ilm_server_2.models import Case
from kpis.models import SupplierKpiUpdate, SupplierKpiUpdateStatus


class KpiClosuresByMonthQualityApiTests(TestCase):
    def setUp(self):
        SupplierKpiUpdateStatus.objects.get_or_create(id=1, defaults={"name": "No Progress"})
        SupplierKpiUpdateStatus.objects.get_or_create(id=2, defaults={"name": "Some Progress"})
        self.closed_status, _ = SupplierKpiUpdateStatus.objects.get_or_create(
            id=3,
            defaults={"name": "Closed"},
        )
        self.old_unresolved_status, _ = SupplierKpiUpdateStatus.objects.get_or_create(
            name="Old unresolved",
        )
        self.user = factories.UserFactory()
        self.factory = APIRequestFactory()

    def _request(self, params=None):
        request = self.factory.get(
            "/cascade/kpi_closures_by_month_quality/",
            params or {},
        )
        force_authenticate(request, user=self.user)
        return KpiClosuresByMonthQualityAPIView.as_view()(request)

    def test_matches_closed_worker_reported_violations_table_row_set(self):
        poor_kpi = factories.SupplierKpiFactory(
            status=self.closed_status,
            opened_at=date(2026, 1, 1),
            closed_at=date(2026, 1, 20),
            closed_quality="Poor",
            affected_workers=5,
            remediation_paid_usd=50,
        )
        fair_kpi = factories.SupplierKpiFactory(
            status=self.closed_status,
            opened_at=date(2026, 1, 21),
            closed_at=date(2026, 1, 25),
            closed_quality="Okay",
            affected_workers=7,
            remediation_paid_baht=320,
        )
        no_case_kpi = factories.SupplierKpiFactory(
            status=self.closed_status,
            opened_at=date(2026, 1, 1),
            closed_at=date(2026, 1, 20),
            closed_quality="Excellent",
            affected_workers=100,
            remediation_paid_usd=1000,
        )
        old_unresolved_kpi = factories.SupplierKpiFactory(
            status=self.old_unresolved_status,
            opened_at=date(2026, 1, 1),
            closed_at=date(2026, 1, 21),
            closed_quality="Good",
            affected_workers=200,
            remediation_paid_usd=2000,
        )

        poor_case = Case.objects.create(supplier=poor_kpi.supplier)
        poor_case.kpis.add(poor_kpi.kpi)
        fair_case = Case.objects.create(supplier=fair_kpi.supplier)
        fair_case.kpis.add(fair_kpi.kpi)
        old_unresolved_case = Case.objects.create(supplier=old_unresolved_kpi.supplier)
        old_unresolved_case.kpis.add(old_unresolved_kpi.kpi)

        SupplierKpiUpdate.objects.create(
            supplier_kpi=poor_kpi,
            status=self.closed_status,
            opened_at=date(2026, 1, 1),
            closed_at=date(2026, 1, 20),
            closed_quality="Poor",
            affected_workers=99,
            remediation_paid_usd=999,
        )
        SupplierKpiUpdate.objects.create(
            supplier_kpi=poor_kpi,
            status=self.closed_status,
            opened_at=date(2026, 1, 1),
            closed_at=date(2026, 1, 20),
            closed_quality="Poor",
            affected_workers=5,
            remediation_paid_usd=50,
        )
        SupplierKpiUpdate.objects.create(
            supplier_kpi=fair_kpi,
            status=self.closed_status,
            opened_at=date(2026, 1, 21),
            closed_at=date(2026, 1, 25),
            closed_quality="Okay",
            affected_workers=7,
            remediation_paid_baht=320,
        )
        SupplierKpiUpdate.objects.create(
            supplier_kpi=no_case_kpi,
            status=self.closed_status,
            opened_at=date(2026, 1, 1),
            closed_at=date(2026, 1, 20),
            closed_quality="Excellent",
            affected_workers=100,
            remediation_paid_usd=1000,
        )
        SupplierKpiUpdate.objects.create(
            supplier_kpi=old_unresolved_kpi,
            status=self.old_unresolved_status,
            opened_at=date(2026, 1, 1),
            closed_at=date(2026, 1, 21),
            closed_quality="Good",
            affected_workers=200,
            remediation_paid_usd=2000,
        )

        with CaptureQueriesContext(connection) as queries:
            response = self._request(
                {
                    "start_time": "2026-01-01",
                    "end_time": "2026-01-31",
                    "supplier_id": ",".join(
                        str(kpi.supplier_id)
                        for kpi in (
                            poor_kpi,
                            fair_kpi,
                            no_case_kpi,
                            old_unresolved_kpi,
                        )
                    ),
                }
            )

        self.assertLessEqual(len(queries), 2)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["grandTotal"]["kpis"], 2)
        self.assertEqual(response.data["grandTotal"]["affectedWorkers"], 12)
        self.assertEqual(response.data["grandTotal"]["remediationUsd"], 60.0)

        self.assertEqual(len(response.data["monthlyQuality"]), 1)
        january = response.data["monthlyQuality"][0]
        self.assertEqual(january["month"], "2026-01")
        self.assertEqual(january["poor"], 1)
        self.assertEqual(january["poorWorkers"], 5)
        self.assertEqual(january["poorRemediationUsd"], 50.0)
        self.assertEqual(january["fair"], 1)
        self.assertEqual(january["fairWorkers"], 7)
        self.assertEqual(january["fairRemediationUsd"], 10.0)

    def test_ignores_missing_or_unknown_quality(self):
        missing_quality_kpi = factories.SupplierKpiFactory(
            status=self.closed_status,
            opened_at=date(2026, 2, 1),
            closed_at=date(2026, 2, 2),
            closed_quality=None,
            affected_workers=5,
        )
        unknown_quality_kpi = factories.SupplierKpiFactory(
            status=self.closed_status,
            opened_at=date(2026, 2, 3),
            closed_at=date(2026, 2, 4),
            closed_quality="Unknown",
            affected_workers=5,
        )
        missing_quality_case = Case.objects.create(supplier=missing_quality_kpi.supplier)
        missing_quality_case.kpis.add(missing_quality_kpi.kpi)
        unknown_quality_case = Case.objects.create(supplier=unknown_quality_kpi.supplier)
        unknown_quality_case.kpis.add(unknown_quality_kpi.kpi)
        SupplierKpiUpdate.objects.create(
            supplier_kpi=missing_quality_kpi,
            status=self.closed_status,
            opened_at=date(2026, 2, 1),
            closed_at=date(2026, 2, 2),
            closed_quality=None,
            affected_workers=5,
        )
        SupplierKpiUpdate.objects.create(
            supplier_kpi=unknown_quality_kpi,
            status=self.closed_status,
            opened_at=date(2026, 2, 3),
            closed_at=date(2026, 2, 4),
            closed_quality="Unknown",
            affected_workers=5,
        )

        response = self._request(
            {
                "start_time": "2026-02-01",
                "end_time": "2026-02-28",
                "supplier_id": ",".join(
                    str(kpi.supplier_id)
                    for kpi in (missing_quality_kpi, unknown_quality_kpi)
                ),
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["monthlyQuality"], [])
        self.assertEqual(response.data["grandTotal"]["kpis"], 0)
