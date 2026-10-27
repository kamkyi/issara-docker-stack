# WorkOS AuthKit Integration
#
# Keep the legacy app label (workos_auth) via AuthkitConfig so existing
# migrations and database tables continue to line up after the package move.
default_app_config = "authkit.apps.AuthkitConfig"

# Re-export authentication backend so existing imports keep working.
from .authentication import WorkOSAuthKitAuthentication  # noqa: F401
