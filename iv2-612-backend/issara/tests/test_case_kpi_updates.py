from datetime import date, datetime

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

import issara.ilm_server_2.factories as factories
from issara.ilm_server_2.models import Case
from kpis.models import SupplierKpiUpdate
from kpis.views import SupplierKpiUpdateViewset, SupplierKpiViewSet
from supply_chains.models import SupplierSupplyChain


class CaseKpiUpdateSignalTests(TestCase):
    def setUp(self):
        self.open_status = factories.SupplierKpiStatusFactory(name="No Progress")
        self.supplier_kpi = factories.SupplierKpiFactory(status=self.open_status)
        self.original_update = self.supplier_kpi.updates.latest("id")

    def test_case_add_creates_update_for_existing_open_supplier_kpi(self):
        case = Case.objects.create(
            supplier=self.supplier_kpi.supplier,
            interacted=timezone.now(),
        )

        case.kpis.add(self.supplier_kpi.kpi)

        latest_update = self.supplier_kpi.updates.latest("id")

        self.assertEqual(self.supplier_kpi.updates.count(), 2)
        self.assertEqual(latest_update.kpi_update_source, "caseupdate")
        self.assertEqual(latest_update.opened_at, case.interacted.date())
        self.assertEqual(latest_update.supplier_kpi_id, self.supplier_kpi.id)
        self.assertTrue(case.supplier_kpis.filter(id=self.supplier_kpi.id).exists())

    def test_case_remove_keeps_rollback_cleanup_behavior(self):
        case = Case.objects.create(
            supplier=self.supplier_kpi.supplier,
            interacted=timezone.now(),
        )
        case.kpis.add(self.supplier_kpi.kpi)

        case.kpis.remove(self.supplier_kpi.kpi)
        self.supplier_kpi.refresh_from_db()

        self.assertEqual(self.supplier_kpi.updates.count(), 1)
        self.assertEqual(self.supplier_kpi.updates.latest("id").id, self.original_update.id)
        self.assertEqual(self.supplier_kpi.opened_at, self.original_update.opened_at)
        self.assertFalse(case.supplier_kpis.filter(id=self.supplier_kpi.id).exists())
        self.assertEqual(
            SupplierKpiUpdate.objects.filter(supplier_kpi=self.supplier_kpi).count(),
            1,
        )

    def test_cycles_endpoint_returns_latest_row_per_opened_at_cycle(self):
        some_progress = factories.SupplierKpiStatusFactory(name="Some Progress")
        closed_status = factories.SupplierKpiStatusFactory(name="Closed")
        user = factories.UserFactory()

        self.supplier_kpi.opened_at = date(2026, 3, 1)
        self.supplier_kpi.save()

        latest_same_cycle = SupplierKpiUpdate.objects.create(
            supplier_kpi=self.supplier_kpi,
            status=some_progress,
            opened_at=date(2026, 3, 1),
            kpi_update_source="supplierkpiupdateform",
        )
        next_cycle = SupplierKpiUpdate.objects.create(
            supplier_kpi=self.supplier_kpi,
            status=closed_status,
            opened_at=date(2026, 3, 11),
            closed_at=date(2026, 3, 12),
            kpi_update_source="supplierkpiupdateform",
        )

        request = APIRequestFactory().get(
            "/api/v2/supplierkpiupdates/cycles/",
            {"page_size": 50},
        )
        force_authenticate(request, user=user)

        response = SupplierKpiUpdateViewset.as_view({"get": "cycles"})(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(
            [row["id"] for row in response.data["results"]],
            [next_cycle.id, latest_same_cycle.id],
        )
        self.assertEqual(
            [row["cycle_update_count"] for row in response.data["results"]],
            [1, 2],
        )

    def test_case_add_reopens_same_day_closed_supplier_kpi(self):
        closed_status = factories.SupplierKpiStatusFactory(name="Closed")
        closed_at = timezone.make_aware(datetime(2026, 3, 11, 15, 30))
        assigned_user = factories.UserFactory()

        self.supplier_kpi.status = closed_status
        self.supplier_kpi.open = False
        self.supplier_kpi.closed_at = closed_at
        self.supplier_kpi.closure_date = closed_at.date()
        self.supplier_kpi.opened_at = date(2026, 3, 1)
        self.supplier_kpi.affected_workers = 25
        self.supplier_kpi.retaliation = True
        self.supplier_kpi.retaliation_cso = True
        self.supplier_kpi.closed_quality = "Good"
        self.supplier_kpi.closed_notes = "Previous closure notes"
        self.supplier_kpi.remediation_issara_recommendation = "Old recommendation"
        self.supplier_kpi.remediation_progress = "A lot"
        self.supplier_kpi.remediation_aligned = "A little"
        self.supplier_kpi.remediation_business_steps_taken = "Old steps taken"
        self.supplier_kpi.remediation_business_steps_remaining = "Old steps remaining"
        self.supplier_kpi.remediation_payment_deadline = date(2026, 3, 20)
        self.supplier_kpi.remediation_owed_baht = 1000
        self.supplier_kpi.remediation_paid_usd = 50
        self.supplier_kpi.remediation_workers_paid = 2
        self.supplier_kpi.remediation_documents_owed = 3
        self.supplier_kpi.remediation_documents_provided = 1
        self.supplier_kpi.remediation_documents_deadline = date(2026, 3, 21)
        self.supplier_kpi.remediation_notes = "Old notes"
        self.supplier_kpi.remediation_action = "Old action"
        self.supplier_kpi.remediation_validation = "Old validation"
        self.supplier_kpi.remediation_results = "Old results"
        self.supplier_kpi.remediation_sp_recommendation = "Old SP recommendation"
        self.supplier_kpi.systems_change_issara_recommendation = "Old systems recommendation"
        self.supplier_kpi.systems_change_progress = "A lot"
        self.supplier_kpi.systems_change_aligned = "A little"
        self.supplier_kpi.systems_change_business_steps_taken = "Old systems steps taken"
        self.supplier_kpi.systems_change_business_steps_remaining = "Old systems steps remaining"
        self.supplier_kpi.systems_change_deadline = date(2026, 3, 22)
        self.supplier_kpi.next_description = "Old next step"
        self.supplier_kpi.deadline = date(2026, 3, 23)
        self.supplier_kpi.issue_escalated_to_buyer = True
        self.supplier_kpi.assigned_to = assigned_user
        self.supplier_kpi.save()
        self.supplier_kpi.assigned_users.set([assigned_user])
        self.supplier_kpi.bhr_focal.set([assigned_user])

        case = Case.objects.create(
            supplier=self.supplier_kpi.supplier,
            interacted=timezone.make_aware(datetime(2026, 3, 11, 0, 0)),
        )

        case.kpis.add(self.supplier_kpi.kpi)
        self.supplier_kpi.refresh_from_db()

        self.assertEqual(self.supplier_kpi.status.name, "No Progress")
        self.assertTrue(self.supplier_kpi.open)
        self.assertEqual(self.supplier_kpi.opened_at, case.interacted.date())
        self.assertIsNone(self.supplier_kpi.closed_at)
        self.assertIsNone(self.supplier_kpi.closure_date)
        self.assertTrue(case.supplier_kpis.filter(id=self.supplier_kpi.id).exists())
        self.assertEqual(self.supplier_kpi.affected_workers, 0)
        self.assertIsNone(self.supplier_kpi.retaliation)
        self.assertIsNone(self.supplier_kpi.retaliation_cso)
        self.assertIsNone(self.supplier_kpi.closed_quality)
        self.assertIsNone(self.supplier_kpi.closed_notes)
        self.assertIsNone(self.supplier_kpi.remediation_issara_recommendation)
        self.assertEqual(self.supplier_kpi.remediation_progress, "None")
        self.assertEqual(self.supplier_kpi.remediation_aligned, "None")
        self.assertIsNone(self.supplier_kpi.remediation_business_steps_taken)
        self.assertIsNone(self.supplier_kpi.remediation_business_steps_remaining)
        self.assertIsNone(self.supplier_kpi.remediation_payment_deadline)
        self.assertEqual(self.supplier_kpi.remediation_owed_baht, 0)
        self.assertEqual(self.supplier_kpi.remediation_paid_usd, 0)
        self.assertEqual(self.supplier_kpi.remediation_workers_paid, 0)
        self.assertEqual(self.supplier_kpi.remediation_documents_owed, 0)
        self.assertEqual(self.supplier_kpi.remediation_documents_provided, 0)
        self.assertIsNone(self.supplier_kpi.remediation_documents_deadline)
        self.assertIsNone(self.supplier_kpi.remediation_notes)
        self.assertIsNone(self.supplier_kpi.remediation_action)
        self.assertIsNone(self.supplier_kpi.remediation_validation)
        self.assertIsNone(self.supplier_kpi.remediation_results)
        self.assertIsNone(self.supplier_kpi.remediation_sp_recommendation)
        self.assertIsNone(self.supplier_kpi.systems_change_issara_recommendation)
        self.assertEqual(self.supplier_kpi.systems_change_progress, "None")
        self.assertEqual(self.supplier_kpi.systems_change_aligned, "None")
        self.assertIsNone(self.supplier_kpi.systems_change_business_steps_taken)
        self.assertIsNone(self.supplier_kpi.systems_change_business_steps_remaining)
        self.assertIsNone(self.supplier_kpi.systems_change_deadline)
        self.assertIsNone(self.supplier_kpi.next_description)
        self.assertIsNone(self.supplier_kpi.deadline)
        self.assertFalse(self.supplier_kpi.issue_escalated_to_buyer)
        self.assertIsNone(self.supplier_kpi.assigned_to)
        self.assertEqual(self.supplier_kpi.assigned_users.count(), 0)
        self.assertEqual(self.supplier_kpi.bhr_focal.count(), 0)

        latest_update = self.supplier_kpi.updates.latest("id")
        self.assertEqual(latest_update.opened_at, case.interacted.date())
        self.assertIsNone(latest_update.closed_at)
        self.assertEqual(latest_update.affected_workers, 0)
        self.assertIsNone(latest_update.remediation_issara_recommendation)
        self.assertIsNone(latest_update.remediation_notes)
        self.assertIsNone(latest_update.systems_change_issara_recommendation)
        self.assertFalse(latest_update.issue_escalated_to_buyer)
        self.assertIsNone(latest_update.assigned_to)
        self.assertEqual(latest_update.assigned_users.count(), 0)
        self.assertEqual(latest_update.bhr_focal.count(), 0)

    def test_issue_escalated_to_buyer_defaults_false_and_rolls_back(self):
        some_progress = factories.SupplierKpiStatusFactory(name="Some Progress")

        self.assertFalse(self.supplier_kpi.issue_escalated_to_buyer)
        self.assertFalse(self.original_update.issue_escalated_to_buyer)

        self.supplier_kpi.status = some_progress
        self.supplier_kpi.issue_escalated_to_buyer = True
        self.supplier_kpi.save()

        latest_update = self.supplier_kpi.updates.latest("id")
        self.assertTrue(latest_update.issue_escalated_to_buyer)
        self.assertTrue(self.supplier_kpi.issue_escalated_to_buyer)

        latest_update.delete()
        self.supplier_kpi.refresh_from_db()

        self.assertFalse(self.supplier_kpi.issue_escalated_to_buyer)


class SupplyChainKpiFilterTests(TestCase):
    def setUp(self):
        self.user = factories.UserFactory()
        status = factories.SupplierKpiStatusFactory(name="Some Progress")
        self.active_supplier_kpi = factories.SupplierKpiFactory(status=status)
        self.inactive_supplier_kpi = factories.SupplierKpiFactory(status=status)
        self.no_supply_chain_supplier_kpi = factories.SupplierKpiFactory(status=status)
        supply_chain = factories.SupplyChainFactory()

        SupplierSupplyChain.objects.create(
            supplier=self.active_supplier_kpi.supplier,
            supply_chain=supply_chain,
            status=SupplierSupplyChain.STATUS_ACTIVE,
        )
        SupplierSupplyChain.objects.create(
            supplier=self.inactive_supplier_kpi.supplier,
            supply_chain=supply_chain,
            status=SupplierSupplyChain.STATUS_INACTIVE,
        )

    def test_supplier_kpi_list_supply_chain_filters_include_any_membership(self):
        list_view = SupplierKpiViewSet.as_view({"get": "list"})

        request = APIRequestFactory().get(
            "/api/v2/supplierkpis/",
            {"supply_chain": True, "page_size": 100},
        )
        force_authenticate(request, user=self.user)
        response = list_view(request)

        self.assertEqual(response.status_code, 200)
        result_ids = {item["id"] for item in response.data["results"]}
        self.assertIn(self.active_supplier_kpi.id, result_ids)
        self.assertIn(self.inactive_supplier_kpi.id, result_ids)
        self.assertNotIn(self.no_supply_chain_supplier_kpi.id, result_ids)

        request = APIRequestFactory().get(
            "/api/v2/supplierkpis/",
            {"non_supply_chain": True, "page_size": 100},
        )
        force_authenticate(request, user=self.user)
        response = list_view(request)

        self.assertEqual(response.status_code, 200)
        result_ids = {item["id"] for item in response.data["results"]}
        self.assertIn(self.no_supply_chain_supplier_kpi.id, result_ids)
        self.assertNotIn(self.active_supplier_kpi.id, result_ids)
        self.assertNotIn(self.inactive_supplier_kpi.id, result_ids)

    def test_supplier_kpi_cycles_supply_chain_filters_include_any_membership(self):
        cycles_view = SupplierKpiUpdateViewset.as_view({"get": "cycles"})

        request = APIRequestFactory().get(
            "/api/v2/supplierkpiupdates/cycles/",
            {"supply_chain": True, "page_size": 100},
        )
        force_authenticate(request, user=self.user)
        response = cycles_view(request)

        self.assertEqual(response.status_code, 200)
        supplier_ids = {item["supplier"] for item in response.data["results"]}
        self.assertIn(self.active_supplier_kpi.supplier.id, supplier_ids)
        self.assertIn(self.inactive_supplier_kpi.supplier.id, supplier_ids)
        self.assertNotIn(self.no_supply_chain_supplier_kpi.supplier.id, supplier_ids)

        request = APIRequestFactory().get(
            "/api/v2/supplierkpiupdates/cycles/",
            {"non_supply_chain": True, "page_size": 100},
        )
        force_authenticate(request, user=self.user)
        response = cycles_view(request)

        self.assertEqual(response.status_code, 200)
        supplier_ids = {item["supplier"] for item in response.data["results"]}
        self.assertIn(self.no_supply_chain_supplier_kpi.supplier.id, supplier_ids)
        self.assertNotIn(self.active_supplier_kpi.supplier.id, supplier_ids)
        self.assertNotIn(self.inactive_supplier_kpi.supplier.id, supplier_ids)

    def test_supplier_kpi_retrieve_includes_inactive_supply_chain_details(self):
        retrieve_view = SupplierKpiViewSet.as_view({"get": "retrieve"})

        request = APIRequestFactory().get(
            f"/api/v2/supplierkpis/{self.inactive_supplier_kpi.id}/",
            {"lang": "en"},
        )
        force_authenticate(request, user=self.user)
        response = retrieve_view(request, pk=self.inactive_supplier_kpi.id)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["supply_chains"])
        self.assertEqual(
            response.data["supply_chains"][0]["status"],
            SupplierSupplyChain.STATUS_INACTIVE,
        )
