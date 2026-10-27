from django.db import models

class KpiMetaCategory(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name = "KPI meta category"
        verbose_name_plural = "KPI meta categories"
        managed = True
        db_table = "kpi_meta_categories"

    def __str__(self):
        return self.name
