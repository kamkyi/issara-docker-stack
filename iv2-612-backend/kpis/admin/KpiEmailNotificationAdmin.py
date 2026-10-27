from django.contrib import admin


class KpiEmailNotificationAdmin(admin.ModelAdmin):
    list_display = (
        "template",
        "_recipients",
        "_type",
        "_text",
        "delivered",
        "_suppliers",
        "_kpis",
        "error_message",
        "date",
    )
    list_filter = ("delivered", "template", "template__type")
    filter_horizontal = (
        "supplier_kpis",
        "recipients",
    )
    readonly_fields = (
        "template",
        "supplier_kpis",
        "recipients",
        "delivered",
        "error_message",
        "date",
    )

    def _recipients(self, obj):
        if obj.recipients.count() > 1:
            return ", ".join(obj.recipients.values_list("email", flat=True))
        elif obj.recipients.count() == 1:
            return obj.recipients.last().email

    def _text(self, obj):
        return obj.template.text

    def _type(self, obj):
        return obj.template.type

    def _kpis(self, obj):
        if obj.supplier_kpis.count() > 1:
            return ", ".join(
                obj.supplier_kpis.values_list("kpi__description", flat=True)
            )
        elif obj.supplier_kpis.count() == 1:
            return obj.supplier_kpis.last().kpi.description

    def _suppliers(self, obj):
        if obj.supplier_kpis.count() > 1:
            return ", ".join(obj.supplier_kpis.values_list("supplier__name", flat=True))
        elif obj.supplier_kpis.count() == 1:
            return obj.supplier_kpis.last().supplier.name

    def get_queryset(self, request):
        return (
            super(KpiEmailNotificationAdmin, self)
            .get_queryset(request)
            .prefetch_related("supplier_kpis", "recipients", "template")
        )
