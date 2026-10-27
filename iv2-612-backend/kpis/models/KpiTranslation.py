from django.db import models
from issara.ilm_server_2.models import Language


class KpiTranslation(models.Model):
    kpi = models.ForeignKey(
        "kpis.Kpi", null=False, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    description = models.CharField(max_length=200, null=False, blank=False)
    goal = models.TextField(null=False, blank=False)

    class Meta:
        db_table = "kpi_translations"
        unique_together = (
            "kpi",
            "language",
        )

    def __str__(self):
        return self.description
