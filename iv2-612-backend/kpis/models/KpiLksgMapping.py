from django.db import models


class KpiLksgMapping(models.Model):
    id = models.AutoField(primary_key=True)
    kpi = models.ForeignKey(
        "kpis.Kpi", on_delete=models.CASCADE, related_name="lksg_mappings"
    )
    lksg = models.ForeignKey(
        "kpis.LKSGIndicator", on_delete=models.CASCADE, related_name="kpi_mappings"
    )

    class Meta:
        db_table = "kpi_lksg_mapping"
        indexes = [models.Index(fields=("kpi",), name="kpi_lksg_kpi_idx")]
        constraints = [
            models.UniqueConstraint(
                fields=("kpi", "lksg"), name="unique_kpi_lksg_mapping"
            )
        ]

    def __str__(self):
        return f"{self.kpi} : {self.lksg}"
