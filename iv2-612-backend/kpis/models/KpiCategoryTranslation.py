from django.db import models
from issara.ilm_server_2.models import Language


class KpiCategoryTranslation(models.Model):
    kpi_category = models.ForeignKey(
        "kpis.KpiCategory", null=False, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=200, null=False, blank=False)

    class Meta:
        db_table = "kpi_category_translations"
        unique_together = (
            "kpi_category",
            "language",
        )

    def __str__(self):
        return self.name
