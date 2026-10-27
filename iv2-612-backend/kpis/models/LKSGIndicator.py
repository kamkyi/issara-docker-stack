from django.db import models


class LKSGIndicator(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "LKSG indicator"
        verbose_name_plural = "LKSG indicators"
        managed = True
        db_table = "lksg_indicators"

    def __str__(self):
        return self.name
