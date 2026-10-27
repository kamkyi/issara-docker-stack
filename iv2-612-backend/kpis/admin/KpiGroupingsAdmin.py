from kpis.models import KpiGroupingTranslation
from nested_admin.nested import NestedModelAdmin, NestedStackedInline


class KpiGroupingsTranslationInline(NestedStackedInline):
    model = KpiGroupingTranslation
    verbose_name = "Kpi Grouping Translation"
    extra = 0


class KpiGroupingsAdmin(NestedModelAdmin):
    inlines = [KpiGroupingsTranslationInline]
    list_display = ("name", "kpi")
    search_fields = ("name", "kpi__description")
    list_select_related = ("kpi",)
