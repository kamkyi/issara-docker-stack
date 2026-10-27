from django.contrib import admin
from .models import WorkOSUser


@admin.register(WorkOSUser)
class SimpleWorkOSUserAdmin(admin.ModelAdmin):
    list_display = ["email", "workos_user_id", "is_active", "created_at"]
    list_filter = ["is_active", "email_verified"]
    search_fields = ["email", "workos_user_id"]
    readonly_fields = ["workos_user_id", "email", "created_at", "updated_at"]
