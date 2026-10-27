"""Data-integrity cover for the Facelift supplier back-fill.

The rule this file pins down: assigning or changing a supplier on a Worker
Voice call may add links and may drop *this* case's own link, and may never
delete a `SupplierKpi` or any of its history, nor touch any other case.
"""

from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase

from issara.cascade.case_supplier_kpis import sync_case_supplier_kpis
from issara.tests.test_worker_voice_calls import WorkerVoiceCaseTestBase
from issara.ilm_server_2.models import Case, Supplier
from kpis.models import Kpi, KpiCategory, SupplierKpi, SupplierKpiUpdate, SupplierKpiUpdateStatus


class CaseSupplierKpiSyncTests(TestCase):
    def setUp(self):
        self.author = User.objects.create(username="author@example.test")
        self.supplier = Supplier.objects.create(name="First workplace")
        self.other_supplier = Supplier.objects.create(name="Second workplace")
        self.category = KpiCategory.objects.create(name="Payments")
        self.kpi = Kpi.objects.create(
            description="Unpaid wages", level=2, kpi_category=self.category
        )
        self.second_kpi = Kpi.objects.create(
            description="Excess hours", level=1, kpi_category=self.category
        )
        SupplierKpiUpdateStatus.objects.create(name="No Progress")

    def make_case(self, supplier=None):
        return Case.objects.create(
            supplier=supplier,
            case_created_by=self.author,
            client_nickname="Worker",
            client_phonenumber="100",
        )

    def linked_kpi_ids(self, case):
        return set(case.supplier_kpis.values_list("kpi_id", flat=True))

    # ── The gap this exists to close ──────────────────────────────────────

    def test_supplier_less_case_keeps_kpis_and_creates_no_supplier_kpis(self):
        case = self.make_case()
        case.kpis.set([self.kpi])

        self.assertEqual(set(case.kpis.values_list("id", flat=True)), {self.kpi.pk})
        self.assertEqual(case.supplier_kpis.count(), 0)
        self.assertEqual(SupplierKpi.objects.count(), 0)

    def test_null_to_supplier_creates_only_the_required_links(self):
        case = self.make_case()
        case.kpis.set([self.kpi, self.second_kpi])

        case.supplier = self.supplier
        case.save()
        sync_case_supplier_kpis(case, previous_supplier_id=None)

        self.assertEqual(self.linked_kpi_ids(case), {self.kpi.pk, self.second_kpi.pk})
        # Exactly the two required rows, for this supplier, and nothing else.
        self.assertEqual(SupplierKpi.objects.count(), 2)
        self.assertEqual(
            set(SupplierKpi.objects.values_list("supplier_id", flat=True)),
            {self.supplier.pk},
        )

    def test_supplier_first_then_kpis_is_unchanged_legacy_behaviour(self):
        case = self.make_case(supplier=self.supplier)
        case.kpis.set([self.kpi])

        # Handled entirely by legacy `create_us`; the helper finds nothing to do.
        self.assertEqual(self.linked_kpi_ids(case), {self.kpi.pk})
        before = SupplierKpi.objects.count()
        sync_case_supplier_kpis(case, previous_supplier_id=self.supplier.pk)
        self.assertEqual(SupplierKpi.objects.count(), before)

    # ── Supplier change preserves data ────────────────────────────────────

    def test_supplier_change_drops_only_this_cases_link_and_keeps_the_row(self):
        case = self.make_case(supplier=self.supplier)
        case.kpis.set([self.kpi])
        old_row = SupplierKpi.objects.get(supplier=self.supplier, kpi=self.kpi)
        old_history_ids = set(old_row.updates.values_list("id", flat=True))

        case.supplier = self.other_supplier
        case.save()
        sync_case_supplier_kpis(case, previous_supplier_id=self.supplier.pk)

        # New link made.
        self.assertEqual(self.linked_kpi_ids(case), {self.kpi.pk})
        self.assertEqual(case.supplier_kpis.get().supplier_id, self.other_supplier.pk)
        # Old row survives in full, even though no case references it now.
        old_row.refresh_from_db()
        self.assertTrue(SupplierKpi.objects.filter(pk=old_row.pk).exists())
        self.assertEqual(
            set(old_row.updates.values_list("id", flat=True)), old_history_ids
        )
        self.assertFalse(case.supplier_kpis.filter(pk=old_row.pk).exists())

    def test_supplier_change_leaves_another_cases_links_alone(self):
        keeper = self.make_case(supplier=self.supplier)
        keeper.kpis.set([self.kpi])
        shared = SupplierKpi.objects.get(supplier=self.supplier, kpi=self.kpi)

        mover = self.make_case(supplier=self.supplier)
        mover.kpis.set([self.kpi])
        mover.supplier = self.other_supplier
        mover.save()
        sync_case_supplier_kpis(mover, previous_supplier_id=self.supplier.pk)

        self.assertTrue(SupplierKpi.objects.filter(pk=shared.pk).exists())
        self.assertIn(shared, keeper.supplier_kpis.all())
        self.assertEqual(keeper.supplier_kpis.count(), 1)

    def test_nothing_is_deleted_by_any_supplier_transition(self):
        case = self.make_case(supplier=self.supplier)
        case.kpis.set([self.kpi, self.second_kpi])
        kpi_ids = set(SupplierKpi.objects.values_list("id", flat=True))
        update_ids = set(SupplierKpiUpdate.objects.values_list("id", flat=True))

        for previous, nxt in (
            (self.supplier, self.other_supplier),
            (self.other_supplier, self.supplier),
        ):
            case.supplier = nxt
            case.save()
            sync_case_supplier_kpis(case, previous_supplier_id=previous.pk)

        # Rows and history may have grown, but nothing that existed was removed.
        self.assertTrue(
            kpi_ids.issubset(set(SupplierKpi.objects.values_list("id", flat=True)))
        )
        self.assertTrue(
            update_ids.issubset(
                set(SupplierKpiUpdate.objects.values_list("id", flat=True))
            )
        )

    # ── Unrelated data is untouched ───────────────────────────────────────

    def test_an_unrelated_case_and_its_links_are_untouched(self):
        unrelated_supplier = Supplier.objects.create(name="Elsewhere")
        unrelated = self.make_case(supplier=unrelated_supplier)
        unrelated.kpis.set([self.kpi])
        unrelated_links = set(unrelated.supplier_kpis.values_list("id", flat=True))
        unrelated_updates = set(
            SupplierKpiUpdate.objects.filter(
                supplier_kpi__supplier=unrelated_supplier
            ).values_list("id", flat=True)
        )

        case = self.make_case()
        case.kpis.set([self.second_kpi])
        case.supplier = self.supplier
        case.save()
        sync_case_supplier_kpis(case, previous_supplier_id=None)

        self.assertEqual(
            set(unrelated.supplier_kpis.values_list("id", flat=True)), unrelated_links
        )
        self.assertEqual(
            set(
                SupplierKpiUpdate.objects.filter(
                    supplier_kpi__supplier=unrelated_supplier
                ).values_list("id", flat=True)
            ),
            unrelated_updates,
        )

    def test_a_supplier_less_case_sync_is_a_no_op(self):
        case = self.make_case()
        case.kpis.set([self.kpi])
        before = SupplierKpi.objects.count()

        sync_case_supplier_kpis(case, previous_supplier_id=None)

        self.assertEqual(SupplierKpi.objects.count(), before)
        self.assertEqual(case.supplier_kpis.count(), 0)


class WorkerVoicePatchDataPreservationTests(WorkerVoiceCaseTestBase):
    """Drive the real PATCH endpoint, not the helper.

    DRF saves the instance before applying m2m fields, so a request that
    changes the supplier *and* the KPI set reaches legacy `create_us`'s
    post_remove branch with the new supplier already stored. Its
    `_cleanup_kpi_and_history` then finds no case matching the old supplier and
    deletes that `SupplierKpi` with its history. These pin the protection.
    """

    def setUp(self):
        super().setUp()
        self.old_supplier = Supplier.objects.create(name="Old workplace")
        self.new_supplier = Supplier.objects.create(name="New workplace")
        self.category = KpiCategory.objects.create(name="Payments")
        self.kept_kpi = Kpi.objects.create(
            description="Unpaid wages", level=2, kpi_category=self.category
        )
        self.dropped_kpi = Kpi.objects.create(
            description="Excess hours", level=1, kpi_category=self.category
        )
        SupplierKpiUpdateStatus.objects.create(name="No Progress")

    def make_call(self, supplier, kpis):
        response = self.post(
            self.payload(supplier=supplier.pk if supplier else None,
                         kpis=[k.pk for k in kpis])
        )
        self.assertIn(response.status_code, (200, 201), response.data)
        return Case.objects.get(pk=response.data["id"])

    def snapshot(self):
        return (
            set(SupplierKpi.objects.values_list("id", flat=True)),
            set(SupplierKpiUpdate.objects.values_list("id", flat=True)),
        )

    def test_changing_supplier_and_kpis_together_deletes_nothing(self):
        case = self.make_call(self.old_supplier, [self.kept_kpi, self.dropped_kpi])
        self.assertEqual(case.supplier_kpis.count(), 2)
        kpis_before, updates_before = self.snapshot()

        response = self.patch_case(
            case.pk,
            {"supplier": self.new_supplier.pk, "kpis": [self.kept_kpi.pk]},
        )
        self.assertEqual(response.status_code, 200, response.data)

        kpis_after, updates_after = self.snapshot()
        self.assertTrue(
            kpis_before.issubset(kpis_after),
            f"deleted SupplierKpi rows: {sorted(kpis_before - kpis_after)}",
        )
        self.assertTrue(
            updates_before.issubset(updates_after),
            f"deleted history rows: {sorted(updates_before - updates_after)}",
        )

        # The old supplier's rows survive, unlinked from this case.
        case.refresh_from_db()
        self.assertEqual(
            set(case.supplier_kpis.values_list("supplier_id", flat=True)),
            {self.new_supplier.pk},
        )
        self.assertTrue(
            SupplierKpi.objects.filter(supplier=self.old_supplier).count() >= 2
        )

    def test_assigning_a_supplier_later_backfills_through_the_endpoint(self):
        case = self.make_call(None, [self.kept_kpi])
        self.assertEqual(case.supplier_kpis.count(), 0)

        response = self.patch_case(case.pk, {"supplier": self.new_supplier.pk})
        self.assertEqual(response.status_code, 200, response.data)

        case.refresh_from_db()
        self.assertEqual(
            set(case.supplier_kpis.values_list("kpi_id", flat=True)),
            {self.kept_kpi.pk},
        )

    def test_backfill_does_not_reopen_or_reset_a_shared_closed_kpi(self):
        """Linking must not disturb a row another team may be working on."""
        closed = SupplierKpiUpdateStatus.objects.create(name="Closed")
        shared = SupplierKpi.objects.create(
            supplier=self.new_supplier,
            kpi=self.kept_kpi,
            status=closed,
            open=False,
            closed_at=date(2026, 1, 1),
            affected_workers=42,
        )
        history_before = set(shared.updates.values_list("id", flat=True))

        case = self.make_call(None, [self.kept_kpi])
        response = self.patch_case(case.pk, {"supplier": self.new_supplier.pk})
        self.assertEqual(response.status_code, 200, response.data)

        shared.refresh_from_db()
        self.assertEqual(shared.status_id, closed.pk)
        self.assertFalse(shared.open)
        self.assertEqual(shared.closed_at.date(), date(2026, 1, 1))
        self.assertEqual(shared.affected_workers, 42)
        self.assertEqual(set(shared.updates.values_list("id", flat=True)), history_before)
        # And the case is linked to that very row, not a duplicate.
        case.refresh_from_db()
        self.assertEqual(list(case.supplier_kpis.all()), [shared])

    def test_editing_an_unrelated_field_touches_no_kpi_data(self):
        case = self.make_call(self.old_supplier, [self.kept_kpi])
        before = self.snapshot()
        links_before = set(case.supplier_kpis.values_list("id", flat=True))

        response = self.patch_case(case.pk, {"interaction_summary": "Updated notes."})
        self.assertEqual(response.status_code, 200, response.data)

        case.refresh_from_db()
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(
            set(case.supplier_kpis.values_list("id", flat=True)), links_before
        )

    def test_supplier_change_plus_added_kpi_leaves_a_closed_row_at_y_alone(self):
        """The addition must not reopen a KPI the destination already closed.

        DRF applies the m2m set after saving the instance, so without the
        interception in `update()` legacy `create_us` would run its post_add
        branch against the *new* supplier and reset this shared row.
        """
        closed_status = SupplierKpiUpdateStatus.objects.create(name="Closed")
        assignee = User.objects.create(username="assignee@example.test")
        shared = SupplierKpi.objects.create(
            supplier=self.new_supplier,
            kpi=self.dropped_kpi,
            status=closed_status,
            open=False,
            closed_at=date(2026, 1, 1),
            affected_workers=42,
        )
        shared.assigned_users.add(assignee)
        history_before = set(shared.updates.values_list("id", flat=True))

        # Starts at X with a different KPI; the PATCH moves it to Y and adds the
        # KPI that Y already has closed.
        case = self.make_call(self.old_supplier, [self.kept_kpi])
        kpis_before, updates_before = self.snapshot()

        response = self.patch_case(
            case.pk,
            {
                "supplier": self.new_supplier.pk,
                "kpis": [self.kept_kpi.pk, self.dropped_kpi.pk],
            },
        )
        self.assertEqual(response.status_code, 200, response.data)

        shared.refresh_from_db()
        self.assertEqual(shared.status_id, closed_status.pk)
        self.assertFalse(shared.open)
        self.assertEqual(shared.closed_at.date(), date(2026, 1, 1))
        self.assertEqual(shared.affected_workers, 42)
        self.assertEqual(
            set(shared.assigned_users.values_list("id", flat=True)), {assignee.pk}
        )
        self.assertEqual(
            set(shared.updates.values_list("id", flat=True)), history_before
        )

        # Nothing anywhere was deleted, and the case links to that exact row.
        kpis_after, updates_after = self.snapshot()
        self.assertTrue(kpis_before.issubset(kpis_after))
        self.assertTrue(updates_before.issubset(updates_after))
        case.refresh_from_db()
        self.assertIn(shared, case.supplier_kpis.all())
        self.assertEqual(
            set(case.kpis.values_list("id", flat=True)),
            {self.kept_kpi.pk, self.dropped_kpi.pk},
        )

    def test_same_supplier_kpi_add_still_uses_legacy_behaviour(self):
        """Outside a supplier change nothing is intercepted."""
        closed_status = SupplierKpiUpdateStatus.objects.create(name="Closed")
        shared = SupplierKpi.objects.create(
            supplier=self.old_supplier,
            kpi=self.dropped_kpi,
            status=closed_status,
            open=False,
            closed_at=date(2026, 1, 1),
        )

        case = self.make_call(self.old_supplier, [self.kept_kpi])
        response = self.patch_case(
            case.pk, {"kpis": [self.kept_kpi.pk, self.dropped_kpi.pk]}
        )
        self.assertEqual(response.status_code, 200, response.data)

        # Legacy reopens it, exactly as it does on master and in Add Call.
        shared.refresh_from_db()
        self.assertTrue(shared.open)
