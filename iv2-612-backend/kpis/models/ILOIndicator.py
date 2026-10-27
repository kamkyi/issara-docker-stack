from django.db import models


class ILOIndicator(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "ILO indicator"
        verbose_name_plural = "ILO indicators"
        managed = True
        db_table = "ilo_indicators"

    def __str__(self):
        return self.name
