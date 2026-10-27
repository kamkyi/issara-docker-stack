"""Keep `Case.supplier_kpis` in step when a Worker Voice call gains a supplier.

Facelift-only. `Add Worker Voice` lets a call be logged before its supplier is
known, which legacy `Add Call` never did: legacy always had a supplier, so
`create_us` -- the `m2m_changed` receiver on `Case.kpis` -- could build the
`SupplierKpi` rows as the KPIs were attached. With no supplier that receiver
returns immediately, which is correct (there is nothing to link a KPI to yet)
but leaves the case with KPIs and no `supplier_kpis`.

This module fills that one gap, and is deliberately *additive only*:

* It runs from `WorkerVoiceCaseSerializer.update` alone, never from a signal, so
  no other `Case.save()` in the codebase changes behaviour -- legacy Add Call
  included -- and a save whose `update_fields` excludes `supplier` cannot
  trigger it.
* It **never deletes** a `SupplierKpi` or a `SupplierKpiUpdate`.
* It **never modifies an existing** `SupplierKpi`. Where one already exists for
  the destination supplier it is linked as-is. It deliberately does *not* route
  that through `create_us`, whose reopen branch resets status, dates and
  assignments on a row shared with other cases and writes a history entry --
  the back-fill is repairing a missing link, and must not have side effects on
  data another team may be working. New rows are still created exactly as
  legacy creates them.
* It touches only the case being edited.
"""

from issara.ilm_server_2.signals import _get_reopen_status_id
from kpis.models import SupplierKpi


def sync_case_supplier_kpis(case, previous_supplier_id=None):
    """Bring one case's `supplier_kpis` in line with its supplier and KPIs.

    `previous_supplier_id` is the supplier as it was stored before this save,
    and only when it actually changed; the caller decides that, so this never
    has to guess from in-memory state.
    """
    if previous_supplier_id and previous_supplier_id != case.supplier_id:
        # Unlink this case only. `remove()` clears the join row; the SupplierKpi
        # and its updates are deliberately left in place, even when nothing
        # references them any more.
        for supplier_kpi in list(
            case.supplier_kpis.filter(supplier_id=previous_supplier_id)
        ):
            case.supplier_kpis.remove(supplier_kpi)

    if not case.supplier_id:
        # A supplier-less case keeps its KPIs and simply has no supplier links.
        return

    already_linked = set(
        case.supplier_kpis.filter(supplier_id=case.supplier_id).values_list(
            "kpi_id", flat=True
        )
    )
    pending = set(case.kpis.values_list("id", flat=True)) - already_linked

    for kpi_id in sorted(pending):
        existing = SupplierKpi.objects.filter(
            supplier_id=case.supplier_id, kpi_id=kpi_id
        ).first()
        if existing is not None:
            # Link only. No status, date, assignment or history change.
            case.supplier_kpis.add(existing)
            continue

        # No row for this supplier yet, so creating one takes nothing away.
        # Field-for-field what legacy `create_us` does on its own create branch.
        created = SupplierKpi(supplier_id=case.supplier_id, kpi_id=kpi_id)
        created.status_id = _get_reopen_status_id()
        created.open = True
        created.kpi_update_source = "caseupdate"
        created.opened_at = case.interacted
        created.save()
        case.supplier_kpis.add(created)
