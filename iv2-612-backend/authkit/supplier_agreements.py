from django.conf import settings
from rest_framework import exceptions


SUPPLIER_ROLE_SLUG = "org-supplier"
AGREEMENT_EXEMPT_PATH_PREFIXES = ("/authkit/",)


def supplier_agreement_applies(claims):
    return (claims or {}).get("role") == SUPPLIER_ROLE_SLUG


def supplier_has_active_agreement(workos_user_id):
    if not workos_user_id:
        return False

    from issara.ilm_server_2.models import SupplierLicenseAgreement

    return SupplierLicenseAgreement.objects.filter(
        signer_workos_user_id=str(workos_user_id),
        agreement_version=settings.SUPPLIER_AGREEMENT_VERSION,
        revoked_at__isnull=True,
    ).exists()


def enforce_supplier_agreement(claims, request_path=""):
    if not supplier_agreement_applies(claims):
        return
    if any(
        request_path.startswith(prefix)
        for prefix in AGREEMENT_EXEMPT_PATH_PREFIXES
    ):
        return

    workos_user_id = (claims or {}).get("sub") or (claims or {}).get("user_id")
    if not supplier_has_active_agreement(workos_user_id):
        raise exceptions.PermissionDenied(
            detail={
                "code": "supplier_agreement_required",
                "message": "An active supplier agreement is required.",
            }
        )
