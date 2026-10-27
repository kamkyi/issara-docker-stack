from django.db import models
from issara.ilm_server_2.models import EtiBaseCode
from kpis.choices import KPI_LEVEL_CHOICES


class Kpi(models.Model):
    id = models.AutoField(primary_key=True)
    description = models.CharField(max_length=1024)
    level = models.PositiveSmallIntegerField(choices=KPI_LEVEL_CHOICES, default=1)
    goal = models.TextField(blank=True, null=True)

    kpi_category = models.ForeignKey(
        "kpis.KpiCategory", on_delete=models.CASCADE, blank=True, null=True
    )

    ilo_indicators = models.ManyToManyField(
        "kpis.ILOIndicator",
        through="kpis.KpiIloMapping",
        through_fields=("kpi", "ilo"),
        related_name="kpis",
        blank=True,
        verbose_name="ILO indicators",
    )

    lksg_indicators = models.ManyToManyField(
        "kpis.LKSGIndicator",
        through="kpis.KpiLksgMapping",
        through_fields=("kpi", "lksg"),
        related_name="kpis",
        blank=True,
        verbose_name="LkSG indicators",
    )

    eti_base_code = models.ForeignKey(
        EtiBaseCode, on_delete=models.CASCADE, blank=True, null=True
    )

    kpi_legal_violation = models.ForeignKey(
        "kpis.KpiLegalViolation", on_delete=models.CASCADE, blank=True, null=True
    )

    kpi_recommended_remediation = models.ForeignKey(
        "kpis.KpiRecommendedRemediation",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )

    kpi_systems_change = models.ForeignKey(
        "kpis.KpiSystemsChange", on_delete=models.CASCADE, blank=True, null=True
    )

    class Meta:
        verbose_name = "KPI"
        verbose_name_plural = "KPIs"
        managed = True
        db_table = "kpis"

    def __str__(self):
        return str(self.kpi_category) + " : " + self.description
