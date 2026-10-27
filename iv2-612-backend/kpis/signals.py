import logging

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from kpis.models import SupplierKpi, SupplierKpiUpdate

logger = logging.getLogger(__name__)


def _sync_update_m2m_fields(kpi_update, supplier_kpi):
    """
    Best-effort sync for M2M fields. Keep writes non-fatal for environments
    where optional through-tables may not exist yet.
    """
    try:
        kpi_update.assigned_users.set(supplier_kpi.assigned_users.all())
    except Exception:
        pass

    try:
        kpi_update.bhr_focal.set(supplier_kpi.bhr_focal.all())
    except Exception:
        pass


def create_kpi_update_snapshot(supplier_kpi, **overrides):
    new_kpi_update_data = {
        "supplier_kpi": supplier_kpi,
        "overview_date": supplier_kpi.overview_date,
        "status": supplier_kpi.status,
        "kpi_update_source": supplier_kpi.kpi_update_source,
        "closed_quality": supplier_kpi.closed_quality,
        "closed_notes": supplier_kpi.closed_notes,
        "affected_workers": supplier_kpi.affected_workers,
        "retaliation": supplier_kpi.retaliation,
        "retaliation_cso": supplier_kpi.retaliation_cso,
        "remediation_issara_recommendation": supplier_kpi.remediation_issara_recommendation,
        "remediation_progress": supplier_kpi.remediation_progress,
        "remediation_aligned": supplier_kpi.remediation_aligned,
        "remediation_business_steps_taken": supplier_kpi.remediation_business_steps_taken,
        "remediation_business_steps_remaining": supplier_kpi.remediation_business_steps_remaining,
        "remediation_payment_deadline": supplier_kpi.remediation_payment_deadline,
        "remediation_owed_baht": supplier_kpi.remediation_owed_baht,
        "remediation_owed_kyat": supplier_kpi.remediation_owed_kyat,
        "remediation_owed_ringitt": supplier_kpi.remediation_owed_ringitt,
        "remediation_owed_usd": supplier_kpi.remediation_owed_usd,
        "remediation_paid_baht": supplier_kpi.remediation_paid_baht,
        "remediation_paid_kyat": supplier_kpi.remediation_paid_kyat,
        "remediation_paid_ringitt": supplier_kpi.remediation_paid_ringitt,
        "remediation_paid_usd": supplier_kpi.remediation_paid_usd,
        "remediation_workers_paid": supplier_kpi.remediation_workers_paid,
        "remediation_documents_owed": supplier_kpi.remediation_documents_owed,
        "remediation_documents_provided": supplier_kpi.remediation_documents_provided,
        "remediation_documents_deadline": supplier_kpi.remediation_documents_deadline,
        "remediation_notes": supplier_kpi.remediation_notes,
        "remediation_action": supplier_kpi.remediation_action,
        "remediation_validation": supplier_kpi.remediation_validation,
        "remediation_results": supplier_kpi.remediation_results,
        "remediation_sp_recommendation": supplier_kpi.remediation_sp_recommendation,
        "systems_change_issara_recommendation": supplier_kpi.systems_change_issara_recommendation,
        "systems_change_progress": supplier_kpi.systems_change_progress,
        "systems_change_aligned": supplier_kpi.systems_change_aligned,
        "systems_change_business_steps_taken": supplier_kpi.systems_change_business_steps_taken,
        "systems_change_business_steps_remaining": supplier_kpi.systems_change_business_steps_remaining,
        "systems_change_deadline": supplier_kpi.systems_change_deadline,
        "closed_at": supplier_kpi.closed_at,
        "opened_at": supplier_kpi.opened_at,
        "next_description": supplier_kpi.next_description,
        "deadline": supplier_kpi.deadline,
        "issue_escalated_to_buyer": supplier_kpi.issue_escalated_to_buyer,
        "assigned_to": supplier_kpi.assigned_to,
    }
    new_kpi_update_data.update(overrides)

    kpi_update = SupplierKpiUpdate.objects.create(**new_kpi_update_data)
    _sync_update_m2m_fields(kpi_update, supplier_kpi)
    return kpi_update


@receiver(post_save, sender=SupplierKpi)
def supplier_kpi_save(sender, instance, **kwargs):
    try:
        kpiUpdateData = (
            SupplierKpiUpdate.objects.filter(supplier_kpi=instance.id)
            .order_by("-id")[:1]
            .get()
        )
        if kpiUpdateData.status_id != instance.status_id:
            create_kpi_update_snapshot(instance)
        else:
            kpiUpdateData.overview_date = instance.overview_date
            kpiUpdateData.status = instance.status
            kpiUpdateData.kpi_update_source = instance.kpi_update_source
            kpiUpdateData.closed_quality = instance.closed_quality
            kpiUpdateData.closed_notes = instance.closed_notes
            kpiUpdateData.affected_workers = instance.affected_workers
            kpiUpdateData.retaliation = instance.retaliation
            kpiUpdateData.retaliation_cso = instance.retaliation_cso

            kpiUpdateData.remediation_issara_recommendation = (
                instance.remediation_issara_recommendation
            )
            kpiUpdateData.remediation_progress = instance.remediation_progress
            kpiUpdateData.remediation_aligned = instance.remediation_aligned
            kpiUpdateData.remediation_business_steps_taken = (
                instance.remediation_business_steps_taken
            )
            kpiUpdateData.remediation_business_steps_remaining = (
                instance.remediation_business_steps_remaining
            )
            kpiUpdateData.remediation_payment_deadline = (
                instance.remediation_payment_deadline
            )

            kpiUpdateData.remediation_owed_baht = instance.remediation_owed_baht
            kpiUpdateData.remediation_owed_kyat = instance.remediation_owed_kyat
            kpiUpdateData.remediation_owed_ringitt = instance.remediation_owed_ringitt
            kpiUpdateData.remediation_owed_usd = instance.remediation_owed_usd

            kpiUpdateData.remediation_paid_baht = instance.remediation_paid_baht
            kpiUpdateData.remediation_paid_kyat = instance.remediation_paid_kyat
            kpiUpdateData.remediation_paid_ringitt = instance.remediation_paid_ringitt
            kpiUpdateData.remediation_paid_usd = instance.remediation_paid_usd

            kpiUpdateData.remediation_workers_paid = instance.remediation_workers_paid
            kpiUpdateData.remediation_documents_owed = (
                instance.remediation_documents_owed
            )
            kpiUpdateData.remediation_documents_provided = (
                instance.remediation_documents_provided
            )
            kpiUpdateData.remediation_documents_deadline = (
                instance.remediation_documents_deadline
            )
            kpiUpdateData.remediation_notes = instance.remediation_notes
            kpiUpdateData.remediation_action = instance.remediation_action
            kpiUpdateData.remediation_validation = instance.remediation_validation
            kpiUpdateData.remediation_results = instance.remediation_results
            kpiUpdateData.remediation_sp_recommendation = (
                instance.remediation_sp_recommendation
            )

            kpiUpdateData.systems_change_issara_recommendation = (
                instance.systems_change_issara_recommendation
            )
            kpiUpdateData.systems_change_progress = instance.systems_change_progress
            kpiUpdateData.systems_change_aligned = instance.systems_change_aligned
            kpiUpdateData.systems_change_business_steps_taken = (
                instance.systems_change_business_steps_taken
            )
            kpiUpdateData.systems_change_business_steps_remaining = (
                instance.systems_change_business_steps_remaining
            )
            kpiUpdateData.systems_change_deadline = instance.systems_change_deadline
            kpiUpdateData.closed_at = instance.closed_at
            kpiUpdateData.opened_at = instance.opened_at
            kpiUpdateData.next_description = instance.next_description
            kpiUpdateData.deadline = instance.deadline
            kpiUpdateData.issue_escalated_to_buyer = (
                instance.issue_escalated_to_buyer
            )
            kpiUpdateData.assigned_to = instance.assigned_to

            kpiUpdateData.save()
            _sync_update_m2m_fields(kpiUpdateData, instance)

    except Exception:
        logger.exception(
            "SupplierKpi signal sync failed; creating fallback SupplierKpiUpdate. supplier_kpi_id=%s",
            instance.id,
        )
        create_kpi_update_snapshot(instance)


@receiver(post_delete, sender=SupplierKpiUpdate)
def rollback_kpi_on_update_delete(sender, instance, **kwargs):
    """
    When a SupplierKpiUpdate is deleted (e.g. via admin UI "Delete Selected"),
    roll back the parent SupplierKpi to reflect the latest REMAINING update.
    Uses .update() to bypass post_save signal and avoid creating new history.
    """
    try:
        skpi = instance.supplier_kpi
    except SupplierKpi.DoesNotExist:
        return  # Parent KPI was also deleted (CASCADE), nothing to roll back

    # Find the latest remaining update for this SupplierKpi
    latest = skpi.updates.order_by("-id").first()

    if latest:
        # Roll back to the latest remaining update's state
        fields_to_sync = [
            "overview_date", "kpi_update_source",
            "closed_quality", "closed_notes", "affected_workers",
            "retaliation", "retaliation_cso",
            "remediation_issara_recommendation", "remediation_progress",
            "remediation_aligned", "remediation_business_steps_taken",
            "remediation_business_steps_remaining", "remediation_payment_deadline",
            "remediation_owed_baht", "remediation_owed_kyat",
            "remediation_owed_ringitt", "remediation_owed_usd",
            "remediation_paid_baht", "remediation_paid_kyat",
            "remediation_paid_ringitt", "remediation_paid_usd",
            "remediation_workers_paid", "remediation_documents_owed",
            "remediation_documents_provided", "remediation_documents_deadline",
            "remediation_notes", "remediation_action",
            "remediation_validation", "remediation_results",
            "remediation_sp_recommendation",
            "systems_change_issara_recommendation", "systems_change_progress",
            "systems_change_aligned", "systems_change_business_steps_taken",
            "systems_change_business_steps_remaining", "systems_change_deadline",
            "opened_at", "closed_at", "next_description", "deadline",
            "issue_escalated_to_buyer",
        ]

        update_kwargs = {}
        for field in fields_to_sync:
            if hasattr(latest, field):
                update_kwargs[field] = getattr(latest, field)

        # FK fields need _id suffix for .update()
        update_kwargs["status_id"] = latest.status_id if latest.status else None
        update_kwargs["assigned_to_id"] = latest.assigned_to_id if latest.assigned_to else None

        # Derived fields
        update_kwargs["open"] = not latest.closed_at
        update_kwargs["closure_date"] = latest.closure_date if latest.closed_at else None

        # Use .update() to bypass post_save signal
        SupplierKpi.objects.filter(id=skpi.id).update(**update_kwargs)
        skpi.refresh_from_db()
        skpi.assigned_users.set(latest.assigned_users.all())
        skpi.bhr_focal.set(latest.bhr_focal.all())
