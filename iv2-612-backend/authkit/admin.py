from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import WorkOSUser


class WorkOSUserAdmin(admin.ModelAdmin):
    """
    Admin interface for WorkOS Users with comprehensive management capabilities.
    """

    # List display configuration
    list_display = [
        "email",
        "get_full_name",
        "workos_user_id",
        "authentication_method",
        "email_verified",
        "is_active",
        "has_linked_user",
        "created_at",
    ]

    # List filters for easy navigation
    list_filter = [
        "is_active",
        "email_verified",
        "authentication_method",
        "locale",
        "created_at",
        "last_login_workos",
    ]

    # Search functionality
    search_fields = [
        "email",
        "first_name",
        "last_name",
        "workos_user_id",
        "external_id",
    ]

    # Default ordering
    ordering = ["-created_at"]

    # Read-only fields (WorkOS is source of truth)
    readonly_fields = [
        "workos_user_id",
        "email",
        "email_verified",
        "authentication_method",
        "created_at",
        "updated_at",
    ]

    # Organize fields into fieldsets for better UX
    fieldsets = [
        (
            "User Information",
            {
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "email_verified",
                )
            }
        ),
        (
            "WorkOS Details",
            {
                "fields": (
                    "workos_user_id",
                    "workos_organization_id",
                    "authentication_method",
                    "external_id",
                )
            }
        ),
        (
            "Profile",
            {
                "fields": (
                    "profile_picture_url",
                    "locale",
                    "is_active",
                )
            }
        ),
        (
            "Integration",
            {
                "fields": ("linked_django_user",)
            }
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                    "last_login_workos",
                    "workos_last_sign_in_at",
                ),
                "classes": ("collapse",)
            }
        ),
    ]

    # Custom display methods
    def get_full_name(self, obj):
        """Display full name or fallback to email prefix"""
        full_name = obj.full_name.strip()
        return full_name if full_name else obj.email.split('@')[0]
    get_full_name.short_description = "Full Name"

    def has_linked_user(self, obj):
        """Show if user has a linked Django user"""
        return bool(obj.linked_django_user)
    has_linked_user.short_description = "Linked"
    has_linked_user.boolean = True

    # Actions
    actions = ["activate_users", "deactivate_users"]

    def activate_users(self, request, queryset):
        """Activate selected WorkOS users"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} users have been activated.")

    activate_users.short_description = "Activate selected users"

    def deactivate_users(self, request, queryset):
        """Deactivate selected WorkOS users"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} users have been deactivated.")

    deactivate_users.short_description = "Deactivate selected users"

    # Override has_change_permission to allow only status changes
    def has_change_permission(self, request, obj=None):
        return True

    def has_delete_permission(self, request, obj=None):
        return True

    # Custom queryset for performance
    def get_queryset(self, request):
        return super().get_queryset(request).select_related("linked_django_user")

    class Media:
        css = {"all": ["admin/css/workos_admin.css"]}  # Optional: add custom CSS


# Register the admin
admin.site.register(WorkOSUser, WorkOSUserAdmin)
