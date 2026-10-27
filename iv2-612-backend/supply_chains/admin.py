from django.contrib import admin
from django.utils import timezone

from .models import BuyerPartnerFlag


@admin.register(BuyerPartnerFlag)
class BuyerPartnerFlagAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "status",
        "supplier",
        "strategic_partner",
        "reason",
        "created_at",
        "resolved_at",
    )
    list_filter = ("status", "reason", "created_at")
    search_fields = (
        "supplier__name",
        "strategic_partner__name",
        "note",
    )
    autocomplete_fields = ("supplier", "strategic_partner")
    readonly_fields = ("created_at", "submitted_by", "resolved_at", "resolved_by")
    date_hierarchy = "created_at"
    actions = ("mark_resolved", "mark_dismissed")

    fieldsets = (
        (
            "Submission",
            {
                "fields": (
                    "supplier",
                    "strategic_partner",
                    "reason",
                    "note",
                    "submitted_by",
                    "created_at",
                ),
            },
        ),
        (
            "Resolution",
            {
                "fields": (
                    "status",
                    "resolution_note",
                    "resolved_by",
                    "resolved_at",
                ),
            },
        ),
    )

    def _stamp_resolution(self, request, queryset, new_status):
        now = timezone.now()
        updated = queryset.update(
            status=new_status,
            resolved_at=now,
            resolved_by=request.user,
        )
        self.message_user(request, f"{updated} flag(s) marked {new_status}.")

    @admin.action(description="Mark selected as Resolved")
    def mark_resolved(self, request, queryset):
        self._stamp_resolution(request, queryset, BuyerPartnerFlag.STATUS_RESOLVED)

    @admin.action(description="Mark selected as Dismissed")
    def mark_dismissed(self, request, queryset):
        self._stamp_resolution(request, queryset, BuyerPartnerFlag.STATUS_DISMISSED)
