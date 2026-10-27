from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class KpiEmailNotificationTemplate(models.Model):
    type = models.CharField(
        max_length=2,
        choices=(
            ("I", "Internal"),
            ("SP", "Partners"),
            ("OZ", "Organization"),
            ("S", "Supplier"),
        ),
        default="I",
    )

    golive = models.BooleanField(default=False)

    # conditions
    kpi_statuses = models.ManyToManyField("kpis.SupplierKpiUpdateStatus")
    days_eq = models.IntegerField(null=True, blank=True)
    # days_gt = models.IntegerField(null=True, blank=True)
    # days_lt = models.IntegerField(null=True, blank=True)

    level_eq = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
        help_text="Level equals (min: 1, max: 4)",
    )
    level_gte = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
        help_text="Level greater than or equals (min: 1, max: 4)",
    )
    level_lte = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
        help_text="Level less than or equals (min: 1, max: 4)",
    )

    # email
    subject = models.CharField(max_length=256)
    email_to = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True)
    text = models.TextField()

    class Meta:
        verbose_name_plural = "KPI Email Notification Templates"
        db_table = "ilm_server_2_kpiemailnotificationtemplate"

    def __str__(self):
        return self.subject

    def __repr__(self):
        repr = (
            f"Type: {self.type} \n"
            f"Subject: {self.subject} \n"
            f"Go live (SP emails will be dynamically appended to email_to): {self.golive} \n"
            f'KPI statuses: {" ".join([status.name for status in self.kpi_statuses.all()])} \n'
            f"Days equals: {self.days_eq} \n"
            f"Level equals: {self.level_eq} \n"
            f"Level greater than: {self.level_gte} \n"
            f"Level less than: {self.level_lte} \n"
            f'Email to: {", ".join([user.email for user in self.email_to.all()])} \n'
        )

        return repr
