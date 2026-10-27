from django.apps import AppConfig


class AuthkitConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    # Module path updated after moving the app to the project root
    name = "authkit"
    # Keep the legacy label so migrations continue to match existing tables
    label = "workos_auth"
    verbose_name = "WorkOS Authentication"
