from django.db import models


class KpiGroupings(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)  # Adjust max_length as needed

    # Define foreign key relationship with Kpi model
    kpi = models.ForeignKey(
        "kpis.Kpi", on_delete=models.CASCADE, related_name="kpi_groupings"
    )

    class Meta:
        verbose_name = "KPI Grouping"
        verbose_name_plural = "KPI Groupings"
        db_table = "kpi_groupings"

    def __str__(self):
        return self.name
