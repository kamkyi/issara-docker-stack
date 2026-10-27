from kpis.models import KpiCategoryTranslation
from nested_admin.nested import NestedModelAdmin, NestedStackedInline


class KpiCategoryTranslationInline(NestedStackedInline):
    model = KpiCategoryTranslation
    verbose_name = "Kpi Category Translation"
    extra = 0


class KpiCategoryAdmin(NestedModelAdmin):
    inlines = [KpiCategoryTranslationInline]
    list_display = ('id', 'name', 'kpi_meta_category', 'issue_category')
    list_filter = ('kpi_meta_category', 'issue_category')
    verbose_name = "Kpi Category"
