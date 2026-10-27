from datetime import date

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.timezone import now
from simple_history.models import HistoricalRecords

from issara.ilm_server_2.choices import (
    KPI_LEVEL_CHOICES,
    KPI_UPDATE_CLOSED_QUALITY_CHOICES,
    KPI_UPDATE_PROGRESS_CHOICES,
    KPI_UPDATE_SOURCE_CHOICES,
)
from issara.ilm_server_2.models import Supplier


class SupplierKpi(models.Model):
    id = models.AutoField(primary_key=True)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE, related_name="kpis"
    )
    kpi = models.ForeignKey("kpis.Kpi", on_delete=models.CASCADE)

    overview_date = models.DateField(blank=True, null=True)
    status = models.ForeignKey(
        "kpis.SupplierKpiUpdateStatus",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    kpi_update_source = models.CharField(
        max_length=512, choices=KPI_UPDATE_SOURCE_CHOICES, null=True
    )

    closed_quality = models.CharField(
        max_length=10, choices=KPI_UPDATE_CLOSED_QUALITY_CHOICES, null=True, blank=True
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

    open = models.BooleanField(default=True)
    opened_at = models.DateField(blank=True, null=True, default=timezone.now)
    closed_at = models.DateTimeField(blank=True, null=True)
    closure_date = models.DateField(blank=True, null=True)

    hide = models.BooleanField(default=False)
    history = HistoricalRecords()
    next_description = models.TextField(blank=True, null=True)
    deadline = models.DateField(blank=True, null=True, default=None)
    # Default false per requirement so legacy KPI history is treated as not escalated.
    issue_escalated_to_buyer = models.BooleanField(default=False)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    assigned_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name="assigned_supplier_kpi"
    )
    bhr_focal = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        blank=True, 
        related_name="bhr_focal_supplier_kpis",
        help_text="Business and Human Rights focal persons"
    )

    class Meta:
        verbose_name_plural = "Supplier KPIs"
        managed = True
        db_table = "supplier_kpis"

    @property
    def days_open(self):
        if self.closed_at:
            days_active = self.closed_at.date() - self.opened_at
        else:
            days_active = now().date() - self.opened_at

        return "-" if days_active.days < 0 else days_active.days

    def __str__(self):
        return str(self.supplier) + " - " + str(self.kpi)

    def save(self, *args, **kwargs):
        if self.closed_at:
            self.closure_date = date.today()
        super(SupplierKpi, self).save(*args, **kwargs)
