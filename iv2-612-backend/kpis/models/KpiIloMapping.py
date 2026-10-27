from django.db import models


class KpiIloMapping(models.Model):
    id = models.AutoField(primary_key=True)
    kpi = models.ForeignKey(
        "kpis.Kpi", on_delete=models.CASCADE, related_name="ilo_mappings"
    )
    ilo = models.ForeignKey(
        "kpis.ILOIndicator", on_delete=models.CASCADE, related_name="kpi_mappings"
    )

    class Meta:
        db_table = "kpi_ilo_mapping"
        indexes = [models.Index(fields=("kpi",), name="kpi_ilo_kpi_idx")]
        constraints = [
            models.UniqueConstraint(
                fields=("kpi", "ilo"), name="unique_kpi_ilo_mapping"
            )
        ]

    def __str__(self):
        return f"{self.kpi} : {self.ilo}"
