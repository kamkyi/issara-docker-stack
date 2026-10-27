"""Audience visibility helpers for company-profile documents.

Policies and Work Plan documents both carry an ``audience`` field. Documents
marked ``private`` must only ever be returned to the company that owns them
(plus Issara staff) -- everybody else, including the Member Directory read
paths, must not see them.

"Owns" is deliberately narrow: Issara staff, or a real membership row
(``StrategicPartnerUser`` / ``SupplierUser``) for that *specific* company -- the
canonical "my company" link used across the codebase. A company may have many
users; each of them sees their own company's private documents and nobody
else's.

Role claims are intentionally NOT accepted here. The viewsets grant access by
role (``_user_can_access_owner``), but those claims are not scoped to a single
org anywhere in this codebase -- ``org-global-partner`` and friends pass for
*any* SP id, which is what powers the Member Directory read paths. Treating them
as ownership would expose every company's private documents to every partner
user.

Note for local development: if you sign in against staging while pointing at a
local database, your user id will not have a matching membership row locally, so
your own private documents will look invisible. Create the
``StrategicPartnerUser`` row locally rather than loosening this predicate.
"""

from .models import (
    DOCUMENT_AUDIENCE_PRIVATE,
    StrategicPartnerUser,
    SupplierUser,
)
from .permissions import IlmUserGroups


def is_issara_staff(user):
    return user.groups.filter(name=IlmUserGroups.ISSRA_STAFF.value).exists()


def user_owns_strategic_partner(user, sp_id):
    """True when the user may see every audience of this SP's documents."""
    if is_issara_staff(user):
        return True
    return StrategicPartnerUser.objects.filter(
        user=user, strategic_partner_id=sp_id
    ).exists()


def user_owns_supplier(user, supplier_id):
    """True when the user may see every audience of this supplier's documents."""
    if is_issara_staff(user):
        return True
    return SupplierUser.objects.filter(user=user, supplier_id=supplier_id).exists()


def exclude_private_for(queryset, is_owner):
    """Drop ``private`` documents unless the requester owns them."""
    if is_owner:
        return queryset
    return queryset.exclude(audience=DOCUMENT_AUDIENCE_PRIVATE)


def is_private(document):
    return getattr(document, "audience", None) == DOCUMENT_AUDIENCE_PRIVATE
