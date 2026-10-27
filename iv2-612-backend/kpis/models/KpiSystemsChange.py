from django.db import models


class KpiSystemsChange(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Kpi Systems Changes"
        managed = True
        db_table = "kpi_systems_changes"

    def __str__(self):
        return self.name
