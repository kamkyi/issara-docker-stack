#!/usr/bin/env python3
"""
Test script to verify WorkOS environment-specific configuration
"""
import os
import django
from django.conf import settings

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "issara.settings")
django.setup()


def test_workos_config():
    """Test WorkOS configuration for different environments"""

    print("=== WorkOS Configuration Test ===\n")

    # Current environment
    current_env = getattr(settings, "ENVIRONMENT", "unknown")
    print(f"Current Environment: {current_env}")
    print(f"LEVEL env var: {os.environ.get('LEVEL', 'not set')}")
    print()

    # WorkOS settings
    workos_settings = {
        "WORKOS_CLIENT_ID": getattr(settings, "WORKOS_CLIENT_ID", "not set"),
        "WORKOS_API_KEY": getattr(settings, "WORKOS_API_KEY", "not set"),
        "WORKOS_API": getattr(settings, "WORKOS_API", "not set"),
        "WORKOS_ISSUER": getattr(settings, "WORKOS_ISSUER", "not set"),
        "WORKOS_JWKS_URL": getattr(settings, "WORKOS_JWKS_URL", "not set"),
    }

    print("Current WorkOS Configuration:")
    for key, value in workos_settings.items():
        # Mask API keys for security
        if "API_KEY" in key and value != "not set":
            masked_value = (
                f"{value[:10]}...{value[-4:]}" if len(value) > 14 else "***masked***"
            )
            print(f"  {key}: {masked_value}")
        else:
            print(f"  {key}: {value}")
    print()

    # Test different environment scenarios
    print("Testing environment scenarios:")
    print("1. Current configuration is active")

    # Check if environment-specific variables are available
    env_vars = [
        "WORKOS_CLIENT_ID_STAGING",
        "WORKOS_API_KEY_STAGING",
        "WORKOS_CLIENT_ID_PROD",
        "WORKOS_API_KEY_PROD",
    ]

    print("\nEnvironment-specific variables:")
    for var in env_vars:
        value = os.environ.get(var, "not set")
        if value != "not set" and "API_KEY" in var:
            value = (
                f"{value[:10]}...{value[-4:]}" if len(value) > 14 else "***masked***"
            )
        print(f"  {var}: {value}")

    print("\n=== Test Complete ===")


if __name__ == "__main__":
    test_workos_config()
