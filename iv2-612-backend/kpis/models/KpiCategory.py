from django.db import models
from issara.ilm_server_2.models import IssueCategory
from .KpiMetaCategory import KpiMetaCategory


class KpiCategory(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    issue_category = models.ForeignKey(
        IssueCategory, on_delete=models.CASCADE, null=True
    )
    kpi_meta_category = models.ForeignKey(
        KpiMetaCategory, on_delete=models.CASCADE, null=True, blank=True, related_name='kpi_categories'
    )

    class Meta:
        verbose_name = "KPI category"
        verbose_name_plural = "KPI categories"
        managed = True
        db_table = "kpi_categories"

    def __str__(self):
        return self.name
