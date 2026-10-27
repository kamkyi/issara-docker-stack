from django.contrib import admin


class SupplierKpiAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "supplier_name",
        "status_name",
        "kpi_category",
        "kpi__description",
        "opened_at",
        "overview_date",
        "closed_at",
    )
    list_filter = ("status__name", "kpi__kpi_category", "supplier__name")
    search_fields = (
        "id",
        "supplier__name",
        "kpi__kpi_category__name",
        "kpi__description",
    )
    ordering = ("id",)

    def supplier_name(self, obj):
        return obj.supplier.name

    def status_name(self, obj):
        return obj.status.name if obj.status else obj.status

    def kpi_category(self, obj):
        return obj.kpi.kpi_category

    def kpi__description(self, obj):
        return obj.kpi.description

    def get_queryset(self, request):
        return (
            super(SupplierKpiAdmin, self)
            .get_queryset(request)
            .prefetch_related("kpi", "kpi__kpi_category", "supplier", "status")
        )
