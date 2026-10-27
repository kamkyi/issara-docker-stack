from django.contrib import admin
from nested_admin.nested import NestedModelAdmin, NestedStackedInline

from issara.ilm_server_2.eti_base_codes.models import (
    EtiBaseCode,
    ETIBaseCodeTranslation,
)


class ETIBaseCodeTranslationInline(NestedStackedInline):
    model = ETIBaseCodeTranslation
    verbose_name = "ETI Base Code Translation"
    extra = 0


@admin.register(EtiBaseCode)
class ETIBaseCodeAdmin(NestedModelAdmin):
    inlines = [ETIBaseCodeTranslationInline]
    verbose_name = "ETI Base Code"
