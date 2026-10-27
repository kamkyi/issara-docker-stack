from django.db import models


class KpiRecommendedRemediation(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Kpi Recommended Remediations"
        managed = True
        db_table = "kpi_recommended_remediations"

    def __str__(self):
        return self.name
