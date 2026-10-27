from __future__ import annotations

from abc import abstractmethod
from enum import Enum

from rest_framework.permissions import SAFE_METHODS, BasePermission

class IlmUserGroups(str, Enum):
    CSO = "CSO"
    ISSRA_STAFF = "Issara Staff"
    ISSRA_MANAGEMENT = "Issara Management"
    DEVELOPER = "Developer"
    DIRECTOR = "Directors"
    STRATEGIC_PARTNER = "Strategic_partner"
    SUPPLIER = "Supplier"


# Group names that grant write access to internal-only resources such as the
# Partner Message Board.
ISSRA_STAFF_GROUP_NAMES = (
    IlmUserGroups.ISSRA_STAFF.value,
    IlmUserGroups.ISSRA_MANAGEMENT.value,
)

# WorkOS role slugs that map to Issara staff / management.
ISSRA_STAFF_ROLE_SLUGS = (
    "org-issara-staff",
    "org-issara-management",
)

# WorkOS role slugs that identify a non-staff, partner-facing session
# (Strategic Partner buyer-view / supplier-view). When a request carries one
# of these explicitly, it should never be treated as staff for read-scoping
# purposes, even if the underlying Django user row (resolved e.g. by email
# match) happens to have `is_staff=True` or an Issara group membership from
# an unrelated, dual-purpose account.
NON_STAFF_PARTNER_ROLE_SLUGS = (
    "org-global-partner",
    "org-supplier",
)


def _workos_roles(user) -> list:
    """Pull role slugs from the WorkOS JWT claims attached by the authkit
    middleware. Returns an empty list if the user has no claims."""
    claims = getattr(user, "claims", None) or {}
    role = claims.get("role")
    roles = claims.get("roles") or []
    out = []
    if isinstance(role, str):
        out.append(role)
    if isinstance(roles, (list, tuple)):
        out.extend(r for r in roles if isinstance(r, str))
    return out


def is_issara_staff(user) -> bool:
    """True if `user` is Django staff/superuser, belongs to an Issara Django
    group, or carries an Issara role slug in their WorkOS JWT claims.

    Defensive against lightweight non-Django user objects (e.g. WorkOSUser)
    that may not expose `is_staff` / `is_superuser` / `groups`.
    """
    if not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return True
    groups = getattr(user, "groups", None)
    if groups is not None:
        try:
            if groups.filter(name__in=ISSRA_STAFF_GROUP_NAMES).exists():
                return True
        except (AttributeError, TypeError):
            pass
    return any(slug in ISSRA_STAFF_ROLE_SLUGS for slug in _workos_roles(user))


def has_explicit_partner_role(user) -> bool:
    """True when the request's WorkOS JWT explicitly carries a non-staff,
    partner-facing role (buyer-view / supplier-view). Callers that need to
    scope data to "this partner only" should treat this as authoritative
    over Django-side staff flags, since those can reflect an unrelated
    dual-purpose account resolved via email match rather than the role the
    user is actually acting under in this session."""
    return any(slug in NON_STAFF_PARTNER_ROLE_SLUGS for slug in _workos_roles(user))


class IlmUserPermission(BasePermission):
    def has_object_permission(self, request, view, obj) -> bool:
        return request.user.groups.filter(name=self._get_name()).exists()

    @abstractmethod
    def _get_name(self) -> str:
        raise NotImplementedError


class IsIssaraStaff(IlmUserPermission):
    def _get_name(self) -> str:
        return IlmUserGroups.ISSRA_STAFF


class IsDeveloper(IlmUserPermission):
    def _get_name(self) -> str:
        return IlmUserGroups.DEVELOPER


class IsDirector(IlmUserPermission):
    def _get_name(self) -> str:
        return IlmUserGroups.DIRECTOR


class IsStrategicPartner(IlmUserPermission):
    def _get_name(self) -> str:
        return IlmUserGroups.STRATEGIC_PARTNER


class IsSupplier(IlmUserPermission):
    def _get_name(self) -> str:
        return IlmUserGroups.SUPPLIER


class IsCSO(IlmUserPermission):
    def _get_name(self) -> str:
        return IlmUserGroups.CSO


class IsIssaraStaffOrReadOnly(BasePermission):
    """Read access for any authenticated user; writes restricted to Issara staff."""

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return is_issara_staff(request.user)
