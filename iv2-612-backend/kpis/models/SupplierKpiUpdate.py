from datetime import date

from django.conf import settings
from django.db import models
from django.utils import timezone

from kpis.choices import (
    KPI_UPDATE_CLOSED_QUALITY_CHOICES,
    KPI_UPDATE_PROGRESS_CHOICES,
    KPI_UPDATE_SOURCE_CHOICES,
)


class SupplierKpiUpdate(models.Model):
    id = models.AutoField(primary_key=True)
    supplier_kpi = models.ForeignKey(
        "kpis.SupplierKpi", on_delete=models.CASCADE, related_name="updates"
    )
    overview_date = models.DateField(blank=True, null=True)

    status = models.ForeignKey(
        "kpis.SupplierKpiUpdateStatus", on_delete=models.CASCADE, null=True, blank=True
    )

    kpi_update_source = models.CharField(
        max_length=512, choices=KPI_UPDATE_SOURCE_CHOICES, null=True
    )

    closed_quality = models.CharField(
        max_length=10, choices=KPI_UPDATE_CLOSED_QUALITY_CHOICES, null=True
    )
    closed_notes = models.TextField(blank=True, null=True)
    affected_workers = models.IntegerField(default=0, blank=True, null=True)
    retaliation = models.BooleanField(default=None, null=True)
    retaliation_cso = models.BooleanField(default=None, null=True)

    remediation_issara_recommendation = models.TextField(blank=True, null=True)

    remediation_progress = models.CharField(
        max_length=8, choices=KPI_UPDATE_PROGRESS_CHOICES, default="None", null=True
    )
    remediation_aligned = models.CharField(
        max_length=8, choices=KPI_UPDATE_PROGRESS_CHOICES, default="None", null=True
    )
    remediation_business_steps_taken = models.TextField(blank=True, null=True)
    remediation_business_steps_remaining = models.TextField(blank=True, null=True)
    remediation_payment_deadline = models.DateField(blank=True, null=True)

    remediation_owed_baht = models.IntegerField(default=0, blank=True)
    remediation_owed_kyat = models.IntegerField(default=0, blank=True)
    remediation_owed_ringitt = models.IntegerField(default=0, blank=True)
    remediation_owed_usd = models.IntegerField(default=0, blank=True)

    remediation_paid_baht = models.IntegerField(default=0, blank=True)
    remediation_paid_kyat = models.IntegerField(default=0, blank=True)
    remediation_paid_ringitt = models.IntegerField(default=0, blank=True)
    remediation_paid_usd = models.IntegerField(default=0, blank=True)

    remediation_workers_paid = models.IntegerField(default=0, blank=True)
    remediation_documents_owed = models.IntegerField(default=0, blank=True)
    remediation_documents_provided = models.IntegerField(default=0, blank=True)
    remediation_documents_deadline = models.DateField(blank=True, null=True)
    remediation_notes = models.TextField(blank=True, null=True)
    remediation_action = models.TextField(blank=True, null=True)
    remediation_validation = models.TextField(blank=True, null=True)
    remediation_results = models.TextField(blank=True, null=True)
    remediation_sp_recommendation = models.TextField(blank=True, null=True)

    systems_change_issara_recommendation = models.TextField(blank=True, null=True)
    systems_change_progress = models.CharField(
        max_length=8, choices=KPI_UPDATE_PROGRESS_CHOICES, default="None", null=True
    )
    systems_change_aligned = models.CharField(
        max_length=8, choices=KPI_UPDATE_PROGRESS_CHOICES, default="None", null=True
    )
    systems_change_business_steps_taken = models.TextField(blank=True, null=True)
    systems_change_business_steps_remaining = models.TextField(blank=True, null=True)
    systems_change_deadline = models.DateField(blank=True, null=True)

    opened_at = models.DateField(blank=True, null=True, default=timezone.now)
    closed_at = models.DateField(blank=True, null=True)
    closure_date = models.DateField(blank=True, null=True)
    next_description = models.TextField(
        blank=True,
        null=True,
    )
    deadline = models.DateField(blank=True, null=True, default=None)
    # Default false per requirement so legacy KPI history is treated as not escalated.
    issue_escalated_to_buyer = models.BooleanField(default=False)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    assigned_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name="assgined_kpi_updates"
    )
    bhr_focal = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        blank=True, 
        related_name="bhr_focal_kpi_updates",
    )

    def save(self, *args, **kwargs):
        if self.closed_at:
            self.closure_date = date.today()
        super(SupplierKpiUpdate, self).save(*args, **kwargs)

    class Meta:
        verbose_name_plural = "Supplier KPI Updates"
        managed = True
        db_table = "supplier_kpi_updates"
