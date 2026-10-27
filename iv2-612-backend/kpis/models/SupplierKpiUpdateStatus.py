from django.db import models


class SupplierKpiUpdateStatus(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Supplier KPI Update Statuses"
        managed = True
        db_table = "supplier_kpi_update_statuses"

    def __str__(self):
        return self.name
