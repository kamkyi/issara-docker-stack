from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from issara.ilm_server_2.choices import (
    SHARED_FILE_PERMISSION_BOTH,
    SHARED_FILE_PERMISSION_SP,
    SHARED_FILE_PERMISSION_SUPPLIER,
    SHARED_FILE_PERMISSION_SUPPLIER_ISSARA,
)
from issara.ilm_server_2.permissions import (
    has_explicit_partner_role,
    is_issara_staff,
)
from supply_chains.models import SupplierSupplyChain


def is_active_issara_staff(user) -> bool:
    return is_issara_staff(user) and not has_explicit_partner_role(user)


def supplier_id_for_user(user):
    try:
        return user.supplier_user.supplier_id
    except (AttributeError, TypeError):
        return None


def strategic_partner_id_for_user(user):
    try:
        return user.strategic_partner_user.strategic_partner_id
    except (AttributeError, TypeError):
        return None


def partner_can_access_supplier(user, supplier_id: int) -> bool:
    partner_id = strategic_partner_id_for_user(user)
    if not partner_id:
        return False
    return SupplierSupplyChain.objects.filter(
        supplier_id=supplier_id,
        supply_chain__strategic_partner_id=partner_id,
        status=SupplierSupplyChain.STATUS_ACTIVE,
    ).exists()


def can_read_supplier_kpi(user, supplier_kpi) -> bool:
    if is_active_issara_staff(user):
        return True
    supplier_id = supplier_id_for_user(user)
    if supplier_id:
        return supplier_id == supplier_kpi.supplier_id
    return partner_can_access_supplier(user, supplier_kpi.supplier_id)


def can_edit_supplier_kpi_grievance(user, supplier_kpi) -> bool:
    if is_active_issara_staff(user):
        return True
    return supplier_id_for_user(user) == supplier_kpi.supplier_id


def grievance_queryset_for_user(queryset, user):
    if is_active_issara_staff(user):
        return queryset

    supplier_id = supplier_id_for_user(user)
    if supplier_id:
        return queryset.filter(supplier_kpi__supplier_id=supplier_id)

    partner_id = strategic_partner_id_for_user(user)
    if not partner_id:
        return queryset.none()

    return queryset.filter(
        supplier_kpi__supplier__suppliersupplychain__supply_chain__strategic_partner_id=partner_id,
        supplier_kpi__supplier__suppliersupplychain__status=SupplierSupplyChain.STATUS_ACTIVE,
    ).distinct()


def user_uploaded_attachment(user, grievance, attachment) -> bool:
    """Whether ``user`` is the person who uploaded ``attachment`` to ``grievance``.

    Uploads are recorded as an ``attachment_added`` event with the actor set to
    the uploader (see GrievanceViewSet.information_collection_attachments)."""
    if not getattr(user, "is_authenticated", False):
        return False
    # Imported lazily to keep this module free of a grievance.models import at
    # load time (it is imported very early by the serializers/views).
    from issara.grievance.models import GrievanceAttachmentEvent

    return GrievanceAttachmentEvent.objects.filter(
        grievance=grievance,
        attachment=attachment,
        action=GrievanceAttachmentEvent.ACTION_ADDED,
        actor=user,
    ).exists()


def can_view_attachment(user, grievance, attachment) -> bool:
    # The person who uploaded a file must always be able to see it, regardless of
    # its audience permission. Otherwise an Issara staffer uploading with the
    # default "Supplier Only" visibility would save a file they can never see
    # again — it would vanish from the list right after "saved".
    if user_uploaded_attachment(user, grievance, attachment):
        return True

    if is_active_issara_staff(user):
        return attachment.permission in {
            SHARED_FILE_PERMISSION_BOTH,
            SHARED_FILE_PERMISSION_SUPPLIER_ISSARA,
            SHARED_FILE_PERMISSION_SP,
        }

    supplier_id = supplier_id_for_user(user)
    if supplier_id == grievance.supplier_kpi.supplier_id:
        return attachment.permission in {
            SHARED_FILE_PERMISSION_BOTH,
            SHARED_FILE_PERMISSION_SUPPLIER,
            SHARED_FILE_PERMISSION_SUPPLIER_ISSARA,
        }

    return (
        attachment.permission in {SHARED_FILE_PERMISSION_BOTH, SHARED_FILE_PERMISSION_SP}
        and partner_can_access_supplier(user, grievance.supplier_kpi.supplier_id)
    )


class GrievanceAccessPermission(BasePermission):
    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return can_read_supplier_kpi(request.user, obj.supplier_kpi)
        return can_edit_supplier_kpi_grievance(request.user, obj.supplier_kpi)
