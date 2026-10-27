from django.db import models
from issara.ilm_server_2.models import Country


class KpiLegalViolation(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    description = models.TextField(blank=True, null=True)
    law = models.CharField(max_length=100, blank=True, null=True)
    article = models.CharField(max_length=200, blank=True, null=True)
    country = models.ForeignKey(Country, on_delete=models.CASCADE, null=True)

    class Meta:
        verbose_name_plural = "Kpi Legal Violations"
        managed = True
        db_table = "kpi_legal_violations"

    def __str__(self):
        return self.name
