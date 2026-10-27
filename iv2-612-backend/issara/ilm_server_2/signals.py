from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import m2m_changed, post_save
from django.dispatch import receiver
from django_rest_passwordreset.signals import reset_password_token_created
from kpis.models import (
    Kpi,
    SupplierKpi,
    SupplierKpiUpdate,
    SupplierKpiUpdateStatus,
)

# Signal to create UserTask on KPI UPDATE
from django.db.models.signals import post_save


@receiver(post_save, sender=SupplierKpiUpdate)
def create_user_task_on_kpi_update(sender, instance, created, **kwargs):
    # Only create task if assigned_to is set and this is a new assignment
    if instance.assigned_to and created:
        # source_id should be SupplierKpi.id (not SupplierKpiUpdate.id)
        # to match the retrieve view and frontend expectations
        source_id = instance.supplier_kpi_id
        source_type = "KPI UPDATE"
        assigned_by = None
        if hasattr(instance, "assigned_by"):
            assigned_by = instance.assigned_by.id if instance.assigned_by else None
        assigned_to = instance.assigned_to.id
        deadline = instance.deadline
        from .models import UserTask

        if not UserTask.objects.filter(
            source_id=source_id, source_type="KPI UPDATE", assigned_to_id=assigned_to
        ).exists():
            UserTask.objects.create(
                source_id=source_id,
                source_type=source_type,
                assigned_by_id=assigned_by,
                assigned_to_id=assigned_to,
                deadline=deadline,
            )


from .models import (
    BusinessResponse,
    Case,
    UserTask,
    WorkplanActivity,
    WorkplanDocs,
    WorkplanMainGoal,
    WorkplanProgressIndicator,
)
from .utils import change_workplan_step


def _is_closed_like_status(status):
    if not status or not getattr(status, "name", None):
        return False
    return status.name.strip().lower() in {"closed", "old, unresolved case"}


def _get_reopen_status_id():
    # Use name-based lookup to avoid environment-specific PK assumptions.
    no_progress_status = (
        SupplierKpiUpdateStatus.objects.filter(name__iexact="No Progress").first()
        or SupplierKpiUpdateStatus.objects.filter(name__iexact="No progress").first()
    )
    if no_progress_status:
        return no_progress_status.id
    # Backward-compat fallback if status names are customized.
    return 1


def _create_case_linked_kpi_update(supplier_kpi, interacted_at):
    from kpis.signals import create_kpi_update_snapshot

    opened_at = (
        interacted_at.date() if hasattr(interacted_at, "date") else interacted_at
    )
    create_kpi_update_snapshot(
        supplier_kpi,
        kpi_update_source="caseupdate",
        opened_at=opened_at,
        closed_at=None,
        closure_date=None,
    )


def _reset_supplier_kpi_for_reopen(supplier_kpi, interacted_at):
    opened_at = (
        interacted_at.date() if hasattr(interacted_at, "date") else interacted_at
    )

    supplier_kpi.status_id = _get_reopen_status_id()
    supplier_kpi.open = True
    supplier_kpi.opened_at = opened_at
    supplier_kpi.closed_at = None
    supplier_kpi.closure_date = None
    supplier_kpi.overview_date = None
    supplier_kpi.kpi_update_source = "caseupdate"
    supplier_kpi.closed_quality = None
    supplier_kpi.closed_notes = None
    supplier_kpi.affected_workers = 0
    supplier_kpi.retaliation = None
    supplier_kpi.retaliation_cso = None
    supplier_kpi.remediation_issara_recommendation = None
    supplier_kpi.remediation_progress = "None"
    supplier_kpi.remediation_aligned = "None"
    supplier_kpi.remediation_business_steps_taken = None
    supplier_kpi.remediation_business_steps_remaining = None
    supplier_kpi.remediation_payment_deadline = None
    supplier_kpi.remediation_owed_baht = 0
    supplier_kpi.remediation_owed_kyat = 0
    supplier_kpi.remediation_owed_ringitt = 0
    supplier_kpi.remediation_owed_usd = 0
    supplier_kpi.remediation_paid_baht = 0
    supplier_kpi.remediation_paid_kyat = 0
    supplier_kpi.remediation_paid_ringitt = 0
    supplier_kpi.remediation_paid_usd = 0
    supplier_kpi.remediation_workers_paid = 0
    supplier_kpi.remediation_documents_owed = 0
    supplier_kpi.remediation_documents_provided = 0
    supplier_kpi.remediation_documents_deadline = None
    supplier_kpi.remediation_notes = None
    supplier_kpi.remediation_action = None
    supplier_kpi.remediation_validation = None
    supplier_kpi.remediation_results = None
    supplier_kpi.remediation_sp_recommendation = None
    supplier_kpi.systems_change_issara_recommendation = None
    supplier_kpi.systems_change_progress = "None"
    supplier_kpi.systems_change_aligned = "None"
    supplier_kpi.systems_change_business_steps_taken = None
    supplier_kpi.systems_change_business_steps_remaining = None
    supplier_kpi.systems_change_deadline = None
    supplier_kpi.next_description = None
    supplier_kpi.deadline = None
    supplier_kpi.issue_escalated_to_buyer = False
    supplier_kpi.assigned_to = None
    supplier_kpi.hide = False


def _clear_reopened_supplier_kpi_assignments(supplier_kpi):
    supplier_kpi.assigned_users.clear()
    supplier_kpi.bhr_focal.clear()


def _is_reopen_eligible(interacted_at, closed_at):
    if interacted_at is None or closed_at is None:
        return True

    interacted_date = (
        interacted_at.date() if hasattr(interacted_at, "date") else interacted_at
    )
    closed_date = closed_at.date() if hasattr(closed_at, "date") else closed_at
    return interacted_date >= closed_date


@receiver(m2m_changed, sender=Case.kpis.through)
def create_us(sender, instance, action=None, pk_set=None, **kwargs):
    """
    Handles re-opening or creating SupplierKpi records when KPIs are added to a Case,
    and cleaning up history when KPIs are removed.
    """
    supplier = instance.supplier
    if not supplier:
        return

    if action == "post_add":
        # Iterate through newly added KPIs and re-open or create SupplierKPIs
        added_kpis = Kpi.objects.filter(id__in=pk_set)
        for kpi in added_kpis:
            try:
                supplier_kpi = SupplierKpi.objects.get(supplier=supplier, kpi_id=kpi.id)
                # Re-open if closed
                if _is_closed_like_status(supplier_kpi.status) and (
                    (instance.interacted is None)
                    or (supplier_kpi.closed_at is None)
                    or _is_reopen_eligible(instance.interacted, supplier_kpi.closed_at)
                ):
                    _reset_supplier_kpi_for_reopen(supplier_kpi, instance.interacted)
                    _clear_reopened_supplier_kpi_assignments(supplier_kpi)
                    supplier_kpi.save()
                    print(f"SupplierKPI {supplier_kpi.id} reopened")
                else:
                    _create_case_linked_kpi_update(supplier_kpi, instance.interacted)

                instance.supplier_kpis.add(supplier_kpi)

            except SupplierKpi.DoesNotExist:
                supplier_kpi = SupplierKpi(supplier=supplier, kpi_id=kpi.id)
                supplier_kpi.status_id = _get_reopen_status_id()
                supplier_kpi.open = True
                supplier_kpi.kpi_update_source = "caseupdate"
                supplier_kpi.opened_at = instance.interacted
                supplier_kpi.save()
                instance.supplier_kpis.add(supplier_kpi)
                print(f"New KPI {kpi} Saved for {supplier}")

    elif action == "post_remove" or action == "post_clear":
        # Find which SupplierKpi records should be unlinked and cleaned up
        if action == "post_remove":
            # Only clean up the ones that were explicitly removed
            removed_kpis = Kpi.objects.filter(id__in=pk_set)
            skpis_to_check = list(instance.supplier_kpis.filter(kpi__in=removed_kpis))
        else:
            # post_clear: check all previously linked skpis for this supplier
            skpis_to_check = list(instance.supplier_kpis.all())

        for skpi in skpis_to_check:
            instance.supplier_kpis.remove(skpi)
            _cleanup_kpi_and_history(skpi, exclude_case_id=instance.id)


#################################################
############### CREATE USER TASKS ###############
#################################################


@receiver(post_save, sender=Case)
def create_user_task_on_case_save(sender, instance, **kwargs):
    latest_interaction = instance.case_interactions.last()
    if latest_interaction:
        source_id = instance.id
        source_type = "Call"
        assigned_by = (
            latest_interaction.issara_staff.id
            if latest_interaction.issara_staff
            else None
        )
        assigned_to = instance.next_steps_issara_staff
        deadline = instance.dead_line_date

        old_supplier_id = instance._loaded_values.get("supplier_id")
        if old_supplier_id and old_supplier_id != instance.supplier.id:
            # Find old SupplierKpis by supplier_id + the case's KPI types
            # (NOT via M2M, which may not be linked for older cases)
            case_kpi_ids = list(instance.kpis.values_list("id", flat=True))
            old_skpis = list(
                SupplierKpi.objects.filter(
                    supplier_id=old_supplier_id, kpi_id__in=case_kpi_ids
                )
            )
            for skpi in old_skpis:
                instance.supplier_kpis.remove(skpi)
                _cleanup_kpi_and_history(skpi, exclude_case_id=instance.id)

            # Trigger KPI creation for the NEW supplier
            for kpi_id in case_kpi_ids:
                try:
                    supplier_kpi = SupplierKpi.objects.get(
                        supplier=instance.supplier, kpi_id=kpi_id
                    )
                    # Re-open if closed and this call is newer
                    if (
                        _is_closed_like_status(supplier_kpi.status)
                        and instance.interacted
                        and supplier_kpi.closed_at
                        and _is_reopen_eligible(
                            instance.interacted, supplier_kpi.closed_at
                        )
                    ):
                        _reset_supplier_kpi_for_reopen(supplier_kpi, instance.interacted)
                        _clear_reopened_supplier_kpi_assignments(supplier_kpi)
                        supplier_kpi.save()
                    else:
                        _create_case_linked_kpi_update(
                            supplier_kpi, instance.interacted
                        )
                    instance.supplier_kpis.add(supplier_kpi)
                except SupplierKpi.DoesNotExist:
                    supplier_kpi = SupplierKpi(
                        supplier=instance.supplier, kpi_id=kpi_id
                    )
                    supplier_kpi.status_id = _get_reopen_status_id()
                    supplier_kpi.open = True
                    supplier_kpi.kpi_update_source = "caseupdate"
                    supplier_kpi.opened_at = instance.interacted
                    supplier_kpi.save()
                    instance.supplier_kpis.add(supplier_kpi)

        if assigned_to:
            # check if the task was previously created, if not create a new one
            try:
                task = UserTask.objects.get(
                    source_id=source_id,
                    source_type=source_type,
                    assigned_by_id=assigned_by,
                )
                task.assigned_users.set([assigned_to])
                task.save()
            except UserTask.DoesNotExist:
                task = UserTask.objects.create(
                    source_id=source_id,
                    source_type=source_type,
                    assigned_by_id=assigned_by,
                    deadline=deadline,
                )
                task.assigned_users.set([assigned_to])
                task.save()
    if instance.refer_to_org is not None:
        deadline = instance.dead_line_date
        source_type = "Call"
        assigned_by = instance.interaction_issara_staff
        assigned_to_users = instance.refer_to_org.org.all().values_list(
            "user", flat=True
        )

        if assigned_to_users.exists():
            try:
                task = UserTask.objects.get(
                    source_id=instance.id,
                    source_type=source_type,
                    assigned_by_id=assigned_by.id,
                )
                task.assigned_users.set(assigned_to_users)
                task.save()
            except UserTask.DoesNotExist:
                task = UserTask.objects.create(
                    source_id=instance.id,
                    source_type=source_type,
                    assigned_by_id=assigned_by.id,
                    deadline=deadline,
                )
                task.assigned_users.set(assigned_to_users)
                task.save()


@receiver(m2m_changed, sender=Case.case_interactions.through)
def create_user_task_on_case_intaractions_change(sender, instance, action, **kwargs):
    print("________M@M Changed____________________________\n\n\n\n\n\n")
    source_id = instance.id
    source_type = "Call"
    assigned_to = instance.next_steps_issara_staff
    deadline = instance.dead_line_date
    print(action, assigned_to)
    if action == "post_add" and assigned_to:
        assigned_by = instance.case_interactions.last().issara_staff.id
        # check if the task was previously created, if not create a new one
        try:
            task = UserTask.objects.get(
                source_id=source_id,
                source_type=source_type,
                assigned_by_id=assigned_by,
            )
            task.assigned_users.set([assigned_to])
            task.save()
            print("GOT task", task)
        except UserTask.DoesNotExist:
            task = UserTask.objects.create(
                source_id=source_id,
                source_type=source_type,
                assigned_by_id=assigned_by,
                deadline=deadline,
            )
            task.save()
            task.assigned_users.set([assigned_to])

    if action == "post_add" and instance.refer_to_org is not None:
        assigned_by = instance.interaction_issara_staff
        assigned_to_users = instance.refer_to_org.org.all().values_list(
            "user", flat=True
        )
        deadline = instance.dead_line_date
        source_type = "Call"

        try:

            task = UserTask.objects.get(
                source_id=source_id,
                source_type=source_type,
                assigned_by_id=assigned_by.id,
            )
            task.assigned_users.set(assigned_to_users)
            task.save()
        except UserTask.DoesNotExist:
            task = UserTask.objects.create(
                source_id=source_id,
                source_type=source_type,
                assigned_by_id=assigned_by.id,
                deadline=deadline,
            )
            task.save()
            task.assigned_users.set(assigned_to_users)


@receiver(m2m_changed, sender=BusinessResponse.issara_focal_points.through)
def create_user_task_on_business_response_focal_points_change(
    sender, instance, pk_set, action, **kwargs
):
    source_id = instance.id
    source_type = "Business Response"
    assigned_to = instance.issara_focal_points.all()
    assigned_by = instance.created_by
    deadline = instance.issara_next_steps_deadline

    if action == "post_add" and assigned_to.exists():
        try:
            task = UserTask.objects.get(source_id=source_id, source_type=source_type)
            task.assigned_users.set(assigned_to)
            task.save()
        except UserTask.DoesNotExist:
            task = UserTask.objects.create(
                source_id=source_id,
                source_type=source_type,
                assigned_by=assigned_by,
                deadline=deadline,
            )
            task.assigned_users.set(assigned_to)
            task.save()


@receiver(reset_password_token_created)
def password_reset_token_created(
    sender, instance, reset_password_token, *args, **kwargs
):
    # send a successfull verification message
    link = (
        f"{settings.FRONTEND_URL}/auth/reset-password?token={reset_password_token.key}"
    )
    title = "Your password reset link has arrived"
    message = (
        f"You're receiving this e-mail because you or someone else has "
        f"requested a password for your user account.\n"
        f"It can be safely ignored if you did not request a password reset.\n"
        f"Click here to reset the password: {link}"
    )
    receiver = [reset_password_token.user.email]
    send_mail(title, message, None, receiver)


@receiver(post_save, sender=WorkplanMainGoal)
def update_workplan_step(sender, instance: WorkplanMainGoal, created, **kwargs):
    if created:
        change_workplan_step(instance, "main_goals")
    return


@receiver(post_save, sender=WorkplanProgressIndicator)
def update_workplan_step(sender, instance: WorkplanMainGoal, created, **kwargs):
    if created:
        change_workplan_step(instance, "progress_indicators")
    return


@receiver(post_save, sender=WorkplanDocs)
def update_workplan_step(sender, instance: WorkplanDocs, created, **kwargs):
    if created:
        change_workplan_step(instance, "doc_submission")
    return


@receiver(post_save, sender=WorkplanActivity)
def update_workplan_step(sender, instance: WorkplanActivity, created, **kwargs):
    if created:
        change_workplan_step(instance, "workplan_activities")
    return


def _cleanup_kpi_and_history(skpi, exclude_case_id=None):
    """
    Ensures a SupplierKpi and its history accurately reflect remaining cases.
    """
    # Robust case lookup based on supplier and KPI type, NOT just the M2M link
    remaining_cases = Case.objects.filter(supplier=skpi.supplier, kpis=skpi.kpi)
    if exclude_case_id:
        remaining_cases = remaining_cases.exclude(id=exclude_case_id)

    # 1. Purge KPI if truly orphaned AND no manual history exists
    # If there is manual history (e.g. from a form), we MUST preserve the KPI.
    # We use startswith('case') to be resilient to source name variations like 'caseupdate' or truncated 'caseupd'.
    has_manual_history = skpi.updates.exclude(
        kpi_update_source__startswith="case"
    ).exists()

    if not remaining_cases.exists() and not has_manual_history:
        skpi.delete()  # Deletes all history automatically
        return

    # 2. Identify remaining valid interaction dates
    valid_dates = set()
    for c in remaining_cases:
        if c.interacted:
            valid_dates.add(
                c.interacted.date() if hasattr(c.interacted, "date") else c.interacted
            )

    # 3. Purge "Ghost" updates (caseupdate records with no matching case date)
    # We use exclude in case there are multiple valid dates.
    # We use startswith('case') to be resilient to source name variations like 'caseupdate' or truncated 'caseupd'.
    skpi.updates.filter(kpi_update_source__startswith="case").exclude(
        opened_at__in=valid_dates
    ).delete()

    # 4. Normalize Source Names (fulfill user request for "caseupdate")
    skpi.updates.filter(kpi_update_source__startswith="case").update(
        kpi_update_source="caseupdate"
    )
    if skpi.kpi_update_source and skpi.kpi_update_source.startswith("case"):
        # Use .update() to avoid triggering post_save signal (which creates new history)
        SupplierKpi.objects.filter(id=skpi.id).update(kpi_update_source="caseupdate")
        skpi.refresh_from_db()

    # 5. Rollback to latest remaining state from history
    latest = skpi.updates.order_by("-id").first()
    if latest:
        _restore_kpi_from_update(skpi, latest)


def _restore_kpi_from_update(skpi, update):
    """Utility to sync SupplierKpi state back from a SupplierKpiUpdate record."""
    fields_to_sync = [
        "status",
        "overview_date",
        "kpi_update_source",
        "closed_quality",
        "closed_notes",
        "affected_workers",
        "retaliation",
        "retaliation_cso",
        "remediation_issara_recommendation",
        "remediation_progress",
        "remediation_aligned",
        "remediation_business_steps_taken",
        "remediation_business_steps_remaining",
        "remediation_payment_deadline",
        "remediation_owed_baht",
        "remediation_owed_kyat",
        "remediation_owed_ringitt",
        "remediation_owed_usd",
        "remediation_paid_baht",
        "remediation_paid_kyat",
        "remediation_paid_ringitt",
        "remediation_paid_usd",
        "remediation_workers_paid",
        "remediation_documents_owed",
        "remediation_documents_provided",
        "remediation_documents_deadline",
        "remediation_notes",
        "remediation_action",
        "remediation_validation",
        "remediation_results",
        "remediation_sp_recommendation",
        "systems_change_issara_recommendation",
        "systems_change_progress",
        "systems_change_aligned",
        "systems_change_business_steps_taken",
        "systems_change_business_steps_remaining",
        "systems_change_deadline",
        "opened_at",
        "closed_at",
        "next_description",
        "deadline",
        "issue_escalated_to_buyer",
        "assigned_to",
    ]
    update_kwargs = {}
    for field in fields_to_sync:
        if hasattr(update, field):
            value = getattr(update, field)
            # For FK fields, use the _id column for .update()
            if field in ("status", "assigned_to"):
                update_kwargs[f"{field}_id"] = value.id if value else None
            else:
                update_kwargs[field] = value

    # Deriving fields not explicitly in update or needing extra logic
    update_kwargs["open"] = not update.closed_at
    update_kwargs["closed_at"] = update.closed_at
    update_kwargs["closure_date"] = update.closure_date if update.closed_at else None

    # Use .update() to avoid triggering post_save signal (which creates new history)
    SupplierKpi.objects.filter(id=skpi.id).update(**update_kwargs)
    skpi.refresh_from_db()
    skpi.assigned_users.set(update.assigned_users.all())
    skpi.bhr_focal.set(update.bhr_focal.all())
