from django.conf import settings
from django.db import models
from django.utils import timezone


class KpiEmailNotification(models.Model):
    template = models.ForeignKey(
        "kpis.KpiEmailNotificationTemplate", on_delete=models.CASCADE
    )
    supplier_kpis = models.ManyToManyField(
        "kpis.SupplierKpi", related_name="notifications"
    )
    delivered = models.BooleanField(default=False)
    recipients = models.ManyToManyField(settings.AUTH_USER_MODEL)
    error_message = models.TextField(null=True)
    date = models.DateField(default=timezone.now)

    class Meta:
        verbose_name_plural = "KPI Email Notifications"
        db_table = 'ilm_server_2_kpiemailnotification'
