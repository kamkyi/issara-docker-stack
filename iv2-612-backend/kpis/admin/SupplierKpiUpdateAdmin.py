from django.contrib import admin
from kpis.models import SupplierKpi


class SupplierKpiUpdateAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "supplier_kpi_id",
        "supplier_name",
        "status",
        "kpi_category",
        "kpi__description",
        "opened_at",
        "overview_date",
        "closed_at",
    )
    list_filter = (
        "status",
        "supplier_kpi__kpi__kpi_category",
        "supplier_kpi__supplier__name",
    )
    search_fields = (
        "supplier_kpi__id",
        "supplier_kpi__supplier__name",
        "supplier_kpi__kpi__kpi_category__name",
        "supplier_kpi__kpi__description",
    )
    ordering = ("id", "supplier_kpi__id")

    def status(self, obj):
        return obj.status.name

    def supplier_kpi_id(self, obj):
        return obj.supplier_kpi.id

    def supplier_name(self, obj):
        return obj.supplier_kpi.supplier.name

    def kpi_category(self, obj):
        return obj.supplier_kpi.kpi.kpi_category

    def kpi__description(self, obj):
        return obj.supplier_kpi.kpi.description

    def get_queryset(self, request):
        return (
            super(SupplierKpiUpdateAdmin, self)
            .get_queryset(request)
            .prefetch_related(
                "supplier_kpi__kpi",
                "supplier_kpi__kpi__kpi_category",
                "supplier_kpi__supplier",
            )
        )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "supplier_kpi":
            kwargs["queryset"] = SupplierKpi.objects.prefetch_related(
                "supplier", "kpi__kpi_category"
            ).all()
        return super(SupplierKpiUpdateAdmin, self).formfield_for_foreignkey(
            db_field, request, **kwargs
        )
