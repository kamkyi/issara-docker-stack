from django.db import models
from issara.ilm_server_2.models import Language


class KpiGroupingTranslation(models.Model):
    kpi_grouping = models.ForeignKey(
        "kpis.KpiGroupings", null=False, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=255, null=False, blank=False)

    class Meta:
        db_table = "kpi_grouping_translations"
        unique_together = (
            "kpi_grouping",
            "language",
        )

    def __str__(self):
        return self.name
