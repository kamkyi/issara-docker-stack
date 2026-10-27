from django.db import models
from django.conf import settings
from django.core.cache import cache
from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from django.utils import timezone
from django.db.models import Q
from issara.ilm_server_2.models import Language, SharedFile
from .cache_keys import (
    WORKER_CONTACT_REASON_LIST,
    WORKER_CONTACT_REASON_ETAG,
    WORKER_CONTACT_REASON_CACHE_VERSION,
    WORKER_FEEDBACK_CACHE_VERSION,
)

# Create your models here.


class WorkerContactReason(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_contact_reasons"
        verbose_name = "Worker Contact Reason"
        verbose_name_plural = "Worker Contact Reasons"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class WorkerContactReasonTranslation(models.Model):
    worker_contact_reason = models.ForeignKey(
        WorkerContactReason,
        on_delete=models.CASCADE,
        related_name="translations",
    )
    language = models.ForeignKey(
        Language,
        on_delete=models.CASCADE,
        related_name="worker_contact_reason_translations",
    )
    name = models.CharField(max_length=255)

    class Meta:
        db_table = "worker_contact_reason_translations"
        unique_together = ("worker_contact_reason", "language")

    def __str__(self):
        return f"{self.worker_contact_reason_id} - {self.language.code}"


@receiver([post_save, post_delete], sender=WorkerContactReason)
def clear_worker_contact_reason_cache(**kwargs):
    # Invalidate cached dropdown data and ETag whenever contact reasons change.
    cache.delete_many([WORKER_CONTACT_REASON_LIST, WORKER_CONTACT_REASON_ETAG])
    cache.set(WORKER_CONTACT_REASON_CACHE_VERSION, int(timezone.now().timestamp()))


@receiver([post_save, post_delete], sender=WorkerContactReasonTranslation)
def clear_worker_contact_reason_translation_cache(**kwargs):
    # Keep cache in sync when translations change
    cache.delete_many([WORKER_CONTACT_REASON_LIST, WORKER_CONTACT_REASON_ETAG])
    cache.set(WORKER_CONTACT_REASON_CACHE_VERSION, int(timezone.now().timestamp()))


def bump_worker_feedback_cache_version():
    # Use a timestamp-based version to invalidate list/detail caches.
    cache.set(WORKER_FEEDBACK_CACHE_VERSION, int(timezone.now().timestamp()))


class WorkerFeedback(models.Model):
    nationality = models.ForeignKey(
        "ilm_server_2.Nationality", on_delete=models.SET_NULL, null=True, blank=True
    )
    contact_reason = models.ForeignKey(
        "supplier.WorkerContactReason",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="worker_feedbacks",
    )
    case_call_type = models.ForeignKey(
        "ilm_server_2.CaseCategory", on_delete=models.SET_NULL, null=True, blank=True
    )
    supplier = models.ForeignKey(
        "ilm_server_2.Supplier", on_delete=models.SET_NULL, null=True, blank=True
    )
    hr_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workerfeedback_hr_staff",
    )
    worker_voice_channel = models.ForeignKey(
        "ilm_server_2.InteractionChannel",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    interaction_date = models.DateField(null=True, blank=True)
    summary = models.TextField(blank=True, null=True)
    client_name = models.CharField(max_length=255, blank=True, null=True)
    employee_id = models.CharField(max_length=255, blank=True, null=True)
    phone_number = models.CharField(max_length=100, blank=True, null=True)
    line_id = models.CharField(max_length=100, blank=True, null=True)
    whatsapp = models.CharField(max_length=100, blank=True, null=True)
    zalo = models.CharField(max_length=100, blank=True, null=True)
    gender = models.ForeignKey(
        "ilm_server_2.Gender", on_delete=models.SET_NULL, null=True, blank=True
    )
    employee_department = models.CharField(max_length=255, blank=True, null=True)
    feedback_description = models.TextField(blank=True, null=True)
    workers_affected = models.IntegerField(blank=True, null=True)
    workers_affected_description = models.TextField(blank=True, null=True)
    situation_improving = models.CharField(max_length=32, blank=True, null=True)
    situation_improving_description = models.TextField(blank=True, null=True)
    issue_categories = models.ManyToManyField("ilm_server_2.IssueCategory", blank=True)
    selected_kpis = models.ManyToManyField("kpis.Kpi", blank=True)
    kpi_categories = models.ManyToManyField("kpis.KpiCategory", blank=True)
    case_status = models.ForeignKey(
        "ilm_server_2.CaseStatus", on_delete=models.SET_NULL, null=True, blank=True
    )
    next_steps = models.TextField(blank=True, null=True)
    next_steps_for_company_staff = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="workerfeedback_next_steps_staff",
    )
    additional_attachments = models.ManyToManyField(
        SharedFile,
        blank=True,
        related_name="worker_feedback_additional_attachments",
    )
    urgent_needs_of_employee = models.TextField(blank=True, null=True)
    deadline = models.DateField(null=True, blank=True)
    final_remarks = models.TextField(blank=True, null=True)
    safeguards_remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_feedbacks"
        verbose_name = "Worker Feedback"
        verbose_name_plural = "Worker Feedbacks"

    def __str__(self):
        return f"WorkerFeedback {self.pk} for Supplier {self.supplier_id}"


@receiver([post_save, post_delete], sender=WorkerFeedback)
def worker_feedback_cache_invalidator(**kwargs):
    bump_worker_feedback_cache_version()


@receiver(m2m_changed, sender=WorkerFeedback.additional_attachments.through)
def worker_feedback_attachments_cache_invalidator(**kwargs):
    # Keep cached detail/list payloads fresh when attachments are added/removed.
    if kwargs.get("action") in {"post_add", "post_remove", "post_clear"}:
        bump_worker_feedback_cache_version()


class Grievance(models.Model):
    """
    Model to store grievance form data for ethical grievance management
    """

    # Link to the original worker feedback
    worker_feedback = models.OneToOneField(
        WorkerFeedback,
        on_delete=models.CASCADE,
        related_name="grievance_form",
        help_text="Associated worker feedback case",
    )

    # Information Collection (Step 2)
    issara_context = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        choices=[
            ("no_need", "No Need"),
            ("wantMoreInfo", "Yes, I want more information from my Issara focal"),
            ("alreadyReachedOut", "Yes, I already reached out to my Issara focal"),
        ],
        help_text="Context from Issara regarding the worker-reported issue",
    )
    check_with_hr = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Checked with HR team for similar issues",
    )
    repeat_issue = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Is this a repeat issue",
    )
    information_collection_notes = models.TextField(
        blank=True, null=True, help_text="Additional notes about information collection"
    )
    information_collection_attachments = models.ManyToManyField(
        SharedFile,
        blank=True,
        related_name="grievance_information_collection_attachments",
        help_text="Supplier-uploaded attachments supporting internal grievance information collection",
    )

    # Safeguarding Workers (Step 3)
    zero_tolerance = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Zero tolerance of retaliation being followed",
    )
    reviewed_individual = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Reviewed individuals and conducted risk assessment",
    )
    involved_in_grievance = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Reviewed individuals involved in grievance process",
    )
    safeguarding_notes = models.TextField(
        blank=True, null=True, help_text="Additional notes about safeguarding measures"
    )

    # Ethical Investigation (Step 4)
    ethical_reviewed = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Investigation plan reviewed for ethical guidelines",
    )
    professional_ensured = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Investigation conducted professionally",
    )
    impartial_ensured = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Investigation is impartial",
    )
    inclusive_and_accessible = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Investigation process is inclusive and accessible",
    )
    timely_and_effective = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Investigation conducted in timely and effective manner",
    )
    ethical_investigation_notes = models.TextField(
        blank=True, null=True, help_text="Notes about the ethical investigation process"
    )

    # Worker Communication (Step 5)
    investigation_their_wellbeing = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Communicated with affected workers about wellbeing",
    )
    need_help_with_complex_consequences = models.BooleanField(
        default=False, help_text="Need assistance with complex consequences"
    )
    communication_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Notes about communication with affected workers",
    )

    # Monitoring & Communication (Step 6)
    remediation = models.TextField(
        blank=True, null=True, help_text="Remediation actions taken"
    )
    system_strengthening = models.TextField(
        blank=True,
        null=True,
        help_text="How systems will be strengthened to prevent future issues",
    )

    # Training Requirements (Step 7)
    trainings = models.JSONField(
        default=list,
        blank=True,
        help_text="Selected Issara trainings for preventing similar issues",
    )

    # Legacy fields (for backward compatibility)
    received_the_training = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Legacy field: Received training",
    )
    has_trained_impartial = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[("true", "Yes"), ("false", "No")],
        help_text="Legacy field: Has trained impartial staff",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "grievances"
        verbose_name = "Grievance Form"
        verbose_name_plural = "Grievance Forms"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Grievance for WorkerFeedback {self.worker_feedback.pk}"

    def get_training_list(self):
        """Return comma-separated list of selected trainings"""
        if self.trainings:
            return ", ".join(self.trainings)
        return "No trainings selected"

    def is_complete(self):
        """Check if the grievance form is reasonably complete"""
        required_fields = [
            "issara_context",
            "check_with_hr",
            "repeat_issue",
            "zero_tolerance",
            "reviewed_individual",
            "involved_in_grievance",
            "ethical_reviewed",
            "professional_ensured",
            "impartial_ensured",
            "investigation_their_wellbeing",
        ]
        return all(getattr(self, field) for field in required_fields)


@receiver(m2m_changed, sender=Grievance.information_collection_attachments.through)
def grievance_information_collection_attachments_cache_invalidator(**kwargs):
    # Keep worker-feedback list/detail caches in sync when grievance attachments change.
    if kwargs.get("action") in {"post_add", "post_remove", "post_clear"}:
        bump_worker_feedback_cache_version()


class TotalNumberOfWorkers(models.Model):
    """
    Model to track total number of workers by nationality for each supplier.
    This separates worker count data from the main Supplier model for better organization.
    """
    supplier = models.OneToOneField(
        'ilm_server_2.Supplier',
        on_delete=models.CASCADE,
        related_name='worker_counts',
        help_text="The supplier this worker count data belongs to"
    )
    
    # Total counts
    total_num_workers = models.IntegerField(
        default=0,
        help_text="Total number of workers"
    )
    total_num_men_workers = models.IntegerField(
        default=0,
        help_text="Total number of male workers"
    )
    total_num_women_workers = models.IntegerField(
        default=0,
        help_text="Total number of female workers"
    )
    
    # Workers by nationality
    total_num_thai_workers = models.IntegerField(
        default=0,
        help_text="Number of Thai workers"
    )
    total_num_thai_male_workers = models.IntegerField(
        default=0,
        help_text="Number of Thai male workers"
    )
    total_num_thai_female_workers = models.IntegerField(
        default=0,
        help_text="Number of Thai female workers"
    )
    total_num_cambodian_workers = models.IntegerField(
        default=0,
        help_text="Number of Cambodian workers"
    )
    total_num_cambodian_male_workers = models.IntegerField(
        default=0,
        help_text="Number of Cambodian male workers"
    )
    total_num_cambodian_female_workers = models.IntegerField(
        default=0,
        help_text="Number of Cambodian female workers"
    )
    total_num_myanmar_workers = models.IntegerField(
        default=0,
        help_text="Number of Myanmar workers"
    )
    total_num_myanmar_male_workers = models.IntegerField(
        default=0,
        help_text="Number of Myanmar male workers"
    )
    total_num_myanmar_female_workers = models.IntegerField(
        default=0,
        help_text="Number of Myanmar female workers"
    )
    total_num_lao_workers = models.IntegerField(
        default=0,
        help_text="Number of Lao workers"
    )
    total_num_lao_male_workers = models.IntegerField(
        default=0,
        help_text="Number of Lao male workers"
    )
    total_num_lao_female_workers = models.IntegerField(
        default=0,
        help_text="Number of Lao female workers"
    )
    total_num_vietnamese_workers = models.IntegerField(
        default=0,
        help_text="Number of Vietnamese workers"
    )
    total_num_vietnamese_male_workers = models.IntegerField(
        default=0,
        help_text="Number of Vietnamese male workers"
    )
    total_num_vietnamese_female_workers = models.IntegerField(
        default=0,
        help_text="Number of Vietnamese female workers"
    )
    total_num_nepalese_workers = models.IntegerField(
        default=0,
        help_text="Number of Nepalese workers"
    )
    total_num_nepalese_male_workers = models.IntegerField(
        default=0,
        help_text="Number of Nepalese male workers"
    )
    total_num_nepalese_female_workers = models.IntegerField(
        default=0,
        help_text="Number of Nepalese female workers"
    )
    total_num_bangladeshi_workers = models.IntegerField(
        default=0,
        help_text="Number of Bangladeshi workers"
    )
    total_num_bangladeshi_male_workers = models.IntegerField(
        default=0,
        help_text="Number of Bangladeshi male workers"
    )
    total_num_bangladeshi_female_workers = models.IntegerField(
        default=0,
        help_text="Number of Bangladeshi female workers"
    )
    total_num_indonesian_workers = models.IntegerField(
        default=0,
        help_text="Number of Indonesian workers"
    )
    total_num_indonesian_male_workers = models.IntegerField(
        default=0,
        help_text="Number of Indonesian male workers"
    )
    total_num_indonesian_female_workers = models.IntegerField(
        default=0,
        help_text="Number of Indonesian female workers"
    )
    total_num_malaysian_workers = models.IntegerField(
        default=0,
        help_text="Number of Malaysian workers"
    )
    total_num_malaysian_male_workers = models.IntegerField(
        default=0,
        help_text="Number of Malaysian male workers"
    )
    total_num_malaysian_female_workers = models.IntegerField(
        default=0,
        help_text="Number of Malaysian female workers"
    )
    total_num_indian_workers = models.IntegerField(
        default=0,
        help_text="Number of Indian workers"
    )
    total_num_indian_male_workers = models.IntegerField(
        default=0,
        help_text="Number of Indian male workers"
    )
    total_num_indian_female_workers = models.IntegerField(
        default=0,
        help_text="Number of Indian female workers"
    )
    total_num_pakistani_workers = models.IntegerField(
        default=0,
        help_text="Number of Pakistani workers"
    )
    total_num_pakistani_male_workers = models.IntegerField(
        default=0,
        help_text="Number of Pakistani male workers"
    )
    total_num_pakistani_female_workers = models.IntegerField(
        default=0,
        help_text="Number of Pakistani female workers"
    )
    total_num_sri_lankan_workers = models.IntegerField(
        default=0,
        help_text="Number of Sri Lankan workers"
    )
    total_num_sri_lankan_male_workers = models.IntegerField(
        default=0,
        help_text="Number of Sri Lankan male workers"
    )
    total_num_sri_lankan_female_workers = models.IntegerField(
        default=0,
        help_text="Number of Sri Lankan female workers"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'total_number_of_workers'
        verbose_name = 'Total Number of Workers'
        verbose_name_plural = 'Total Number of Workers'
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.supplier.name} - {self.total_num_workers} workers"
    
    def calculate_total(self):
        """Calculate total workers from nationality counts"""
        nationality_fields = [
            'total_num_thai_workers',
            'total_num_cambodian_workers', 
            'total_num_myanmar_workers',
            'total_num_lao_workers',
            'total_num_vietnamese_workers',
            'total_num_nepalese_workers',
            'total_num_bangladeshi_workers',
            'total_num_indonesian_workers',
            'total_num_malaysian_workers',
            'total_num_indian_workers',
            'total_num_pakistani_workers',
            'total_num_sri_lankan_workers',
        ]
        return sum(getattr(self, field, 0) or 0 for field in nationality_fields)
    
    def save(self, *args, **kwargs):
        """Override save to ensure data consistency"""
        # Auto-calculate gender totals if they don't add up to total
        gender_total = (self.total_num_men_workers or 0) + (self.total_num_women_workers or 0)
        if gender_total != self.total_num_workers and gender_total > 0:
            # If gender breakdown exists but doesn't match total, use gender total
            self.total_num_workers = gender_total
        
        super().save(*args, **kwargs)
