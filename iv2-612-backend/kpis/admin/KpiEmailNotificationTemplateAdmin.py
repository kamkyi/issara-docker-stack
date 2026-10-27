from django.contrib import admin


class KpiEmailNotificationTemplateAdmin(admin.ModelAdmin):
    list_display = (
        "subject",
        "recipients",
        "statuses",
        "days_eq",
        "level_eq",
        "level_gte",
        "level_lte",
        "type",
        "golive",
    )
    list_filter = ("type",)
    filter_horizontal = (
        "kpi_statuses",
        "email_to",
    )

    # ordering = ('-date',)

    fieldsets = (
        (None, {"fields": ("type",)}),
        (
            "Conditions",
            {
                "fields": (
                    "kpi_statuses",
                    "days_eq",
                    "level_eq",
                    "level_gte",
                    "level_lte",
                    "golive",
                )
            },
        ),
        (
            "Email",
            {
                "fields": (
                    "email_to",
                    "subject",
                    "text",
                )
            },
        ),
    )

    def statuses(self, obj):
        if obj.kpi_statuses.count() > 1:
            return ", ".join(obj.kpi_statuses.values_list("name", flat=True))
        return obj.kpi_statuses.first().name

    def recipients(self, obj):
        if obj.email_to.count() > 1:
            return ", ".join(obj.email_to.values_list("email", flat=True))
        elif obj.email_to.count() == 1:
            return obj.email_to.last().email

    def get_queryset(self, request):
        return (
            super(KpiEmailNotificationTemplateAdmin, self)
            .get_queryset(request)
            .prefetch_related(
                "kpi_statuses",
                "email_to",
            )
        )
