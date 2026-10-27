from django.conf import settings
from django.db import models


class WorkplanEmailNotificationSetting(models.Model):
    issara_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workplan_notification_recipients",
    )
    strategic_partner = models.ForeignKey(
        "ilm_server_2.StrategicPartner",
        on_delete=models.CASCADE,
        related_name="workplan_notification_sources",
    )
    sp_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workplan_notifications_makers",
        null=True,
        blank=True,
    )
    notify_on_workplan_change = models.BooleanField(default=True)
    notify_on_document_upload = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("issara_user", "strategic_partner", "sp_user")
        verbose_name = "Workplan Email Notification Setting"
        verbose_name_plural = "Workplan Email Notification Settings"

    def __str__(self):
        return f"{self.issara_user} - {self.strategic_partner} - {self.sp_user or 'No SP User'}"


class WorkplanEmailNotificationLog(models.Model):
    setting = models.ForeignKey(
        WorkplanEmailNotificationSetting, on_delete=models.CASCADE
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    event_type = models.CharField(max_length=64)
    details = models.TextField(blank=True)

    def __str__(self):
        return f"{self.setting} - {self.event_type} at {self.sent_at}"
