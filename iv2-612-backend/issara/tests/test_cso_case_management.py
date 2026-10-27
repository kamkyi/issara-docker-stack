"""Focused access tests for the new adapter; legacy KPI routes are untouched."""

from datetime import date

from django.contrib.auth.models import Group, User
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


class CsoCaseManagementTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.org = Organization.objects.create(name="My CSO")
        self.other_org = Organization.objects.create(name="Other CSO")
        self.cso = User.objects.create(username="cso@example.test")
        self.cso.claims = {"role": "org-cso"}
        UserOrganization.objects.create(user=self.cso, organization=self.org)
        self.other_user = User.objects.create(username="other@example.test")
        UserOrganization.objects.create(user=self.other_user, organization=self.other_org)
        self.management = User.objects.create(username="management@example.test")
        self.management.claims = {"role": "org-issara-management"}
        self.linked_management = User.objects.create(username="linked-management@example.test")
        self.linked_management.claims = {"role": "org-issara-management"}
        UserOrganization.objects.create(user=self.linked_management, organization=self.org)

        self.supplier = Supplier.objects.create(name="Shared workplace")
        self.category = KpiCategory.objects.create(name="Payments")
        self.kpi_definition = Kpi.objects.create(
            description="Unpaid wages", level=2, kpi_category=self.category
        )
        self.open_status = SupplierKpiUpdateStatus.objects.create(name="No Progress")
        self.closed_status = SupplierKpiUpdateStatus.objects.create(name="Closed")
        self.kpi = SupplierKpi.objects.create(
            supplier=self.supplier,
            kpi=self.kpi_definition,
            status=self.open_status,
            opened_at=date(2026, 1, 1),
            retaliation=False,
            retaliation_cso=False,
        )
        self.own_call = Case.objects.create(
            supplier=self.supplier,
            case_created_by=self.cso,
            client_nickname="Own worker",
            client_phonenumber="111",
        )
        self.own_call.kpis.add(self.kpi_definition)
        self.own_call.supplier_kpis.add(self.kpi)
        self.other_call = Case.objects.create(
            supplier=self.supplier,
            case_created_by=self.other_user,
            client_nickname="Other worker",
            client_phonenumber="999",
        )
        self.other_call.kpis.add(self.kpi_definition)
        self.other_call.supplier_kpis.add(self.kpi)

    def call(self, view, user, path, method="get", data=None, pk=None, **extra_kwargs):
        request = getattr(self.factory, method)(path, data or {}, format="json")
        force_authenticate(request, user=user)
        kwargs = {"pk": pk} if pk is not None else {}
        kwargs.update(extra_kwargs)
        return view.as_view()(request, **kwargs)

    def test_real_cso_uses_own_link_and_cannot_select_another(self):
        response = self.call(CsoCaseManagementContextAPIView, self.cso, "/context/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["actual_role"], "cso")
        self.assertEqual(response.data["effective_organization"]["id"], self.org.id)
        self.assertFalse(response.data["can_select_organization"])
        queue = self.call(CsoCaseManagementListAPIView, self.cso, "/kpis/")
        self.assertTrue(queue.data["results"][0]["can_edit"])

        forged = self.call(
            CsoCaseManagementListAPIView,
            self.cso,
            f"/kpis/?selected_organization_id={self.other_org.id}",
        )
        self.assertEqual(forged.status_code, 403)

    def test_management_linked_organization_still_must_select(self):
        context = self.call(CsoCaseManagementContextAPIView, self.linked_management, "/context/")
        self.assertIsNone(context.data["effective_organization"])
        self.assertTrue(context.data["selection_required"])
        self.assertTrue(context.data["can_select_organization"])
        missing = self.call(CsoCaseManagementListAPIView, self.linked_management, "/kpis/")
        self.assertEqual(missing.status_code, 400)
        response = self.call(
            CsoCaseManagementListAPIView, self.linked_management,
            f"/kpis/?selected_organization_id={self.org.pk}",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertFalse(response.data["results"][0]["can_edit"])
        detail = self.call(
            CsoCaseManagementDetailAPIView,
            self.linked_management,
            f"/kpis/1/?selected_organization_id={self.org.pk}",
            pk=self.kpi.pk,
        )
        self.assertEqual(detail.status_code, 200)
        self.assertFalse(detail.data["can_edit"])

    def test_management_picker_includes_organizations_without_cases(self):
        empty = Organization.objects.create(name="New CSO without cases")
        response = self.call(CsoCaseManagementOrganizationsAPIView, self.management, "/organizations/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(empty.pk, {item["id"] for item in response.data})
        denied = self.call(CsoCaseManagementOrganizationsAPIView, self.cso, "/organizations/")
        self.assertEqual(denied.status_code, 403)

    def test_specific_call_requires_both_selected_org_and_kpi(self):
        own = self.call(
            CsoCaseManagementCallAPIView, self.management,
            f"/kpis/{self.kpi.pk}/calls/{self.own_call.pk}/?selected_organization_id={self.org.pk}",
            kpi_pk=self.kpi.pk, call_pk=self.own_call.pk,
        )
        self.assertEqual(own.status_code, 200)
        self.assertEqual(own.data["id"], self.own_call.pk)
        self.assertEqual(own.data["client_phonenumber"], "111")
        self.assertEqual(own.data["kpi_details"][0]["id"], self.kpi_definition.pk)
        guessed = self.call(
            CsoCaseManagementCallAPIView, self.management,
            f"/kpis/{self.kpi.pk}/calls/{self.other_call.pk}/?selected_organization_id={self.org.pk}",
            kpi_pk=self.kpi.pk, call_pk=self.other_call.pk,
        )
        self.assertEqual(guessed.status_code, 404)
        unrelated = SupplierKpi.objects.create(
            supplier=self.supplier,
            kpi=Kpi.objects.create(description="Other KPI", level=1, kpi_category=self.category),
            status=self.open_status,
        )
        guessed_kpi = self.call(
            CsoCaseManagementCallAPIView, self.cso,
            f"/kpis/{unrelated.pk}/calls/{self.own_call.pk}/",
            kpi_pk=unrelated.pk, call_pk=self.own_call.pk,
        )
        self.assertEqual(guessed_kpi.status_code, 404)

    def test_history_exposes_cso_snapshot_fields_without_internal_talking_points(self):
        update = SupplierKpiUpdate.objects.create(
            supplier_kpi=self.kpi, status=self.open_status,
            opened_at=date(2026, 1, 1),
            remediation_owed_baht=500, remediation_paid_kyat=200,
            systems_change_business_steps_taken="Earlier plan",
            remediation_action="Internal talking point",
        )
        response = self.call(
            CsoCaseManagementHistoryAPIView, self.cso,
            f"/kpis/{self.kpi.pk}/updates/", pk=self.kpi.pk,
        )
        self.assertEqual(response.status_code, 200)
        item = next(row for row in response.data if row["id"] == update.pk)
        self.assertEqual(item["remediation_owed_baht"], 500)
        self.assertEqual(item["remediation_paid_kyat"], 200)
        self.assertEqual(item["systems_change_business_steps_taken"], "Earlier plan")
        self.assertNotIn("remediation_action", item)
        self.assertNotIn("assigned_to", item)
        self.assertNotIn("bhr_focal", item)

    def test_management_without_link_must_select_and_never_gets_all_data(self):
        context = self.call(CsoCaseManagementContextAPIView, self.management, "/context/")
        self.assertTrue(context.data["selection_required"])
        self.assertTrue(context.data["can_select_organization"])
        missing = self.call(CsoCaseManagementListAPIView, self.management, "/kpis/")
        self.assertEqual(missing.status_code, 400)
        selected = self.call(
            CsoCaseManagementListAPIView,
            self.management,
            f"/kpis/?selected_organization_id={self.org.id}",
        )
        self.assertEqual(selected.status_code, 200)
        self.assertEqual(selected.data["count"], 1)
        invalid = self.call(
            CsoCaseManagementListAPIView,
            self.management,
            "/kpis/?selected_organization_id=99999",
        )
        self.assertEqual(invalid.status_code, 400)

    def test_detail_calls_are_scoped_and_internal_fields_are_omitted(self):
        response = self.call(
            CsoCaseManagementDetailAPIView, self.cso, "/kpis/1/", pk=self.kpi.pk
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data["calls"]], [self.own_call.pk])
        self.assertNotIn("supplier_users", response.data)
        self.assertNotIn("remediation_action", response.data)
        self.assertTrue(response.data["can_edit"])

    def test_related_only_org_can_read_but_not_write(self):
        self.own_call.delete()
        Case.objects.filter(pk=self.other_call.pk).update(refer_to_org=self.org)
        detail = self.call(
            CsoCaseManagementDetailAPIView, self.cso, "/kpis/1/", pk=self.kpi.pk
        )
        self.assertEqual(detail.status_code, 200)
        self.assertFalse(detail.data["can_edit"])
        denied = self.call(
            CsoCaseManagementDetailAPIView,
            self.cso,
            "/kpis/1/",
            method="patch",
            data={"affected_workers": 10},
            pk=self.kpi.pk,
        )
        self.assertEqual(denied.status_code, 403)

    def test_cso_patch_is_allowlisted_and_history_remains_visible(self):
        response = self.call(
            CsoCaseManagementDetailAPIView,
            self.cso,
            "/kpis/1/",
            method="patch",
            data={"affected_workers": 5, "supplier": 999999},
            pk=self.kpi.pk,
        )
        self.assertEqual(response.status_code, 200)
        self.kpi.refresh_from_db()
        self.assertEqual(self.kpi.affected_workers, 5)
        self.assertEqual(self.kpi.supplier_id, self.supplier.pk)
        history = self.call(
            CsoCaseManagementHistoryAPIView, self.cso, "/kpis/1/updates/", pk=self.kpi.pk
        )
        self.assertEqual(history.status_code, 200)
        cycles = self.call(CsoCaseManagementCyclesAPIView, self.cso, "/cycles/")
        self.assertEqual(cycles.status_code, 200)

    def queue_ids(self, user, path="/kpis/"):
        response = self.call(CsoCaseManagementListAPIView, user, path)
        self.assertEqual(response.status_code, 200)
        return [row["id"] for row in response.data["results"]]

    def make_cso_only_kpi(self):
        """A KPI whose only case was logged by a member of the CSO group.

        Legacy `/admin/businesskpiupdates` shows these to a CSO user, because
        `KpiUpdates.js` pins `show_cso_cases` to `isCsoUser`.
        """
        self.cso.groups.add(Group.objects.get_or_create(name="CSO")[0])
        definition = Kpi.objects.create(
            description="CSO-logged KPI", level=1, kpi_category=self.category
        )
        kpi = SupplierKpi.objects.create(
            supplier=self.supplier, kpi=definition, status=self.open_status
        )
        case = Case.objects.create(
            supplier=self.supplier,
            case_created_by=self.cso,
            client_nickname="CSO worker",
            client_phonenumber="222",
        )
        case.kpis.add(definition)
        case.supplier_kpis.add(kpi)
        return kpi

    def test_cso_created_cases_are_visible_like_legacy(self):
        kpi = self.make_cso_only_kpi()
        self.assertIn(kpi.pk, self.queue_ids(self.cso))

    def test_client_cannot_narrow_to_cso_authored_cases_only(self):
        """`cso_cases_only` belongs to the other legacy screen; we ignore it.

        Legacy `/admin/cso-businesskpiupdates` sends it to restrict the queue to
        CSO-authored casework. `/admin/businesskpiupdates`, the screen this
        adapter reproduces, never does -- so a client passing it must not be
        able to change the rule.
        """
        kpi = self.make_cso_only_kpi()
        staff_only = self.kpi  # its cases were logged by non-CSO users

        forced = self.queue_ids(self.cso, "/kpis/?cso_cases_only=true")
        self.assertIn(kpi.pk, forced)
        self.assertIn(staff_only.pk, forced)

    def test_stale_link_is_hidden_when_case_no_longer_lists_the_kpi(self):
        """Legacy rechecks supplier + KPI definition, not just the m2m link."""
        self.assertIn(self.kpi.pk, self.queue_ids(self.cso))

        # Drop the definition from every case but leave `supplier_kpis` behind,
        # which is the shape the historical orphaned rows have.
        for case in (self.own_call, self.other_call):
            case.kpis.clear()
            case.supplier_kpis.add(self.kpi)

        self.assertTrue(self.own_call.supplier_kpis.filter(pk=self.kpi.pk).exists())
        self.assertNotIn(self.kpi.pk, self.queue_ids(self.cso))

    def test_stale_link_is_hidden_when_the_case_supplier_moved_on(self):
        elsewhere = Supplier.objects.create(name="Different workplace")
        Case.objects.filter(
            pk__in=[self.own_call.pk, self.other_call.pk]
        ).update(supplier=elsewhere)

        self.assertTrue(self.own_call.supplier_kpis.filter(pk=self.kpi.pk).exists())
        self.assertNotIn(self.kpi.pk, self.queue_ids(self.cso))

    def test_live_link_survives_when_another_case_still_matches(self):
        self.own_call.kpis.clear()
        self.own_call.supplier_kpis.add(self.kpi)

        # `other_call` still carries the definition for the same supplier, so
        # legacy's recheck keeps the row visible.
        self.assertIn(self.kpi.pk, self.queue_ids(self.cso))


    def test_patch_response_keeps_the_editor_able_to_edit(self):
        """The write response must not tell the editor they may not edit.

        `CsoKpiSerializer.can_edit` defaults to False -- the list supplies it as
        an annotation, the detail computes it -- so a client that merges the
        PATCH body into its cached detail would otherwise hide its own Edit
        action straight after a successful save.
        """
        response = self.call(
            CsoCaseManagementDetailAPIView,
            self.cso,
            "/kpis/1/",
            method="patch",
            data={"affected_workers": 7},
            pk=self.kpi.pk,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["can_edit"])

        # And the detail endpoint still agrees afterwards.
        detail = self.call(
            CsoCaseManagementDetailAPIView, self.cso, "/kpis/1/", pk=self.kpi.pk
        )
        self.assertTrue(detail.data["can_edit"])

    def test_requested_ordering_is_applied_not_ignored(self):
        later = SupplierKpi.objects.create(
            supplier=self.supplier,
            kpi=Kpi.objects.create(
                description="Excess hours", level=1, kpi_category=self.category
            ),
            status=self.open_status,
            opened_at=date(2026, 6, 1),
        )
        self.own_call.kpis.add(later.kpi)
        self.own_call.supplier_kpis.add(later)

        ascending = self.call(
            CsoCaseManagementListAPIView, self.cso, "/kpis/?ordering=opened_at"
        )
        descending = self.call(
            CsoCaseManagementListAPIView, self.cso, "/kpis/?ordering=-opened_at"
        )
        ascending_ids = [row["id"] for row in ascending.data["results"]]
        descending_ids = [row["id"] for row in descending.data["results"]]

        self.assertEqual(ascending_ids, list(reversed(descending_ids)))
        self.assertEqual(ascending_ids[0], self.kpi.pk)
        self.assertEqual(descending_ids[0], later.pk)

    def test_days_active_ordering_is_supported(self):
        """Legacy annotates before sorting on this one; it must not 500."""
        response = self.call(
            CsoCaseManagementListAPIView, self.cso, "/kpis/?ordering=-days_active"
        )
        self.assertEqual(response.status_code, 200)

    def test_an_unknown_ordering_falls_back_instead_of_erroring(self):
        response = self.call(
            CsoCaseManagementListAPIView, self.cso, "/kpis/?ordering=supplier__secret"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_cycles_ordering_is_applied(self):
        for ordering in ("opened_at", "-opened_at"):
            response = self.call(
                CsoCaseManagementCyclesAPIView, self.cso, f"/cycles/?ordering={ordering}"
            )
            self.assertEqual(response.status_code, 200)


    def test_management_write_is_denied_and_unrelated_id_is_404(self):
        denied = self.call(
            CsoCaseManagementDetailAPIView,
            self.linked_management,
            "/kpis/1/",
            method="patch",
            data={"affected_workers": 5},
            pk=self.kpi.pk,
        )
        self.assertEqual(denied.status_code, 403)
        unrelated = SupplierKpi.objects.create(
            supplier=Supplier.objects.create(name="Unrelated workplace"),
            kpi=Kpi.objects.create(
                description="Another KPI", level=1, kpi_category=self.category
            ),
            status=self.open_status,
        )
        hidden = self.call(
            CsoCaseManagementDetailAPIView, self.cso, "/kpis/2/", pk=unrelated.pk
        )
        self.assertEqual(hidden.status_code, 404)
