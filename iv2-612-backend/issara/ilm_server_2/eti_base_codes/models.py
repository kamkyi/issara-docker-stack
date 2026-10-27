from django.db import models
from django.apps import apps


class EtiBaseCode(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)

    code = models.CharField(max_length=1024)
    description = models.TextField(blank=True, null=True)

    sub_code = models.CharField(max_length=1024)
    sub_description = models.TextField(blank=True, null=True)

    created = models.DateField(blank=True, null=True, auto_now_add=True)
    last_modified = models.DateField(blank=True, null=True, auto_now=True)

    class Meta:
        verbose_name_plural = "Eti Base Codes"
        managed = True
        db_table = "eti_base_codes"

    def __str__(self):
        return self.name


class ETIBaseCodeTranslation(models.Model):
    eti_base_code = models.ForeignKey(
        EtiBaseCode, null=False, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        "ilm_server_2.Language", null=False, blank=False, on_delete=models.CASCADE
    )

    name = models.CharField(max_length=1024)
    description = models.TextField(null=False, blank=False)
    sub_description = models.TextField(null=False, blank=True)

    class Meta:
        db_table = "eti_base_code_translations"
        unique_together = (
            "eti_base_code",
            "language",
        )

    def __str__(self):
        return self.name
