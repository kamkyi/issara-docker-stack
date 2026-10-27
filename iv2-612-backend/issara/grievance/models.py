from django.conf import settings
from django.db import models
from django.db.models import JSONField
from kpis.models import SupplierKpi
from issara.ilm_server_2.models import SharedFile
from simple_history.models import HistoricalRecords


class Trainings(models.Model):
    name = models.CharField(max_length=255, blank=True, null=True)


class ImmutableOnceSubmittedMixin(models.Model):
    """Blocks save()/delete() on rows already submitted (is_submitted=True) in
    the database, so submitted grievance updates stay immutable even if a
    future code path bypasses the draft-only queryset used by
    GrievanceSerializer.update_or_create_note_or_data."""

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk, is_submitted=True).exists():
            raise ValueError(
                f"{type(self).__name__} {self.pk} is already submitted and cannot be modified."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.is_submitted:
            raise ValueError(
                f"{type(self).__name__} {self.pk} is already submitted and cannot be deleted."
            )
        super().delete(*args, **kwargs)


class Grievance(models.Model):
    supplier_kpi = models.OneToOneField(SupplierKpi, on_delete=models.CASCADE)

    # Information Collection (Tab 2)
    issara_context = models.CharField(max_length=255, blank=True, null=True)
    checked_with_hr = models.BooleanField(null=True, blank=True)
    repeat_issue = models.BooleanField(null=True, blank=True)
    information_collection_attachments = models.ManyToManyField(
        SharedFile,
        blank=True,
        related_name="kpi_grievance_information_collection_attachments",
        help_text=(
            "Supplier-uploaded attachments supporting internal grievance "
            "information collection"
        ),
    )

    # Safe Guarding Affected Areas (Tab 3)
    zero_tolerance = models.BooleanField(null=True, blank=True)
    reviewed_individual = models.BooleanField(null=True, blank=True)
    involved_in_grievance = models.BooleanField(null=True, blank=True)
    received_the_training = models.BooleanField(null=True, blank=True)
    has_trained_impartial = JSONField(blank=True, null=True)

    # Ensuring an ethical investigation (Tab 4)
    ethical_reviewed = JSONField(blank=True, null=True)
    professional_ensured = JSONField(blank=True, null=True)
    impartial_ensured = JSONField(blank=True, null=True)
    inclusive_and_accessible = JSONField(blank=True, null=True)
    timely_and_effective = JSONField(blank=True, null=True)

    # Communicating with the workers reporting issue (Tab 5)
    investigation_their_wellbeing = JSONField(blank=True, null=True)
    need_help_with_complex_consequences = models.BooleanField(null=True, blank=True)

    # Utility fields
    send_email = models.BooleanField(default=False)
    is_draft = models.BooleanField(default=True)
    # Supplier-selected internal closure date for the grievance. Distinct from
    # the KPI closing workflow (which drives the actual case status); this simply
    # records the date the supplier noted internally.
    internal_closed_at = models.DateField(null=True, blank=True)
    trainings = models.ManyToManyField(Trainings, blank=True)
    history = HistoricalRecords()


class GrievanceAttachmentEvent(models.Model):
    ACTION_ADDED = "attachment_added"
    ACTION_VISIBILITY_CHANGED = "attachment_visibility_changed"
    ACTION_REMOVED = "attachment_removed"
    ACTION_CHOICES = (
        (ACTION_ADDED, "Attachment added"),
        (ACTION_VISIBILITY_CHANGED, "Attachment visibility changed"),
        (ACTION_REMOVED, "Attachment removed"),
    )

    grievance = models.ForeignKey(
        Grievance,
        related_name="attachment_events",
        on_delete=models.CASCADE,
    )
    attachment = models.ForeignKey(
        SharedFile,
        related_name="grievance_attachment_events",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    attachment_name = models.CharField(max_length=256)
    action = models.CharField(max_length=40, choices=ACTION_CHOICES)
    previous_permission = models.CharField(max_length=20, blank=True, default="")
    permission = models.CharField(max_length=20, blank=True, default="")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")


class GrievanceActionEvent(models.Model):
    """Records an explicit Save Draft / Submit action on a grievance so the
    change-history widget can show who saved or submitted, and when.

    The simple-history rows on ``Grievance`` already capture field-level diffs,
    but they cannot reliably distinguish "saved a draft" (which may not change
    ``is_draft``) from "submitted", nor which button the user pressed. This
    event does exactly that. It mirrors ``GrievanceAttachmentEvent``."""

    # Short, stable status codes. Kept deliberately compact (<= 9 chars) rather
    # than the longer "saved_draft": this environment's dev server truncated an
    # 11-char value written to this column through the ORM, so short codes keep
    # the stored data exact regardless. Display labels live in the view.
    ACTION_SAVED_DRAFT = "draft"
    ACTION_SUBMITTED = "submitted"
    ACTION_CHOICES = (
        (ACTION_SAVED_DRAFT, "Saved draft"),
        (ACTION_SUBMITTED, "Submitted"),
    )

    grievance = models.ForeignKey(
        Grievance,
        related_name="action_events",
        on_delete=models.CASCADE,
    )
    action = models.CharField(max_length=40, choices=ACTION_CHOICES)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")


class Remediation(ImmutableOnceSubmittedMixin):
    grievance = models.ForeignKey(
        Grievance, related_name="remediation", on_delete=models.CASCADE
    )
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    is_submitted = models.BooleanField(default=False)


class SystemStrengthening(ImmutableOnceSubmittedMixin):
    grievance = models.ForeignKey(
        Grievance, related_name="system_strengthening", on_delete=models.CASCADE
    )
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    is_submitted = models.BooleanField(default=False)


class Note(ImmutableOnceSubmittedMixin):
    value = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    grievance = models.ForeignKey(
        "Grievance", related_name="%(class)s_notes", on_delete=models.CASCADE
    )
    is_submitted = models.BooleanField(default=False)

    class Meta:
        abstract = True


class InformationCollectionNote(Note):
    pass


class SafeGuardingNote(Note):
    pass


class EthicalInvestigationNote(Note):
    pass


class CommunicatingNote(Note):
    pass
