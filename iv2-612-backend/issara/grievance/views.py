import json
import logging
from pathlib import Path

from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.settings import api_settings

from authkit import WorkOSAuthKitAuthentication
from issara.ilm_server_2.choices import (
    SHARED_FILE_PERMISSION_BOTH,
    SHARED_FILE_PERMISSION_SUPPLIER,
    SHARED_FILE_PERMISSION_SUPPLIER_ISSARA,
)
from issara.ilm_server_2.models import SharedFile
from kpis.models import SupplierKpi

from .models import (
    CommunicatingNote,
    EthicalInvestigationNote,
    Grievance,
    GrievanceActionEvent,
    GrievanceAttachmentEvent,
    InformationCollectionNote,
    Remediation,
    SafeGuardingNote,
    SystemStrengthening,
)
from .permissions import (
    GrievanceAccessPermission,
    can_edit_supplier_kpi_grievance,
    can_view_attachment,
    grievance_queryset_for_user,
)
from .serializers import GrievanceSerializer
from .utilities import send_email_notification_to_issara

logger = logging.getLogger(__name__)

MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
ALLOWED_ATTACHMENT_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_ATTACHMENT_CONTENT_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
}
ALLOWED_ATTACHMENT_PERMISSIONS = {
    SHARED_FILE_PERMISSION_BOTH,
    SHARED_FILE_PERMISSION_SUPPLIER,
    SHARED_FILE_PERMISSION_SUPPLIER_ISSARA,
}


def _actor_label(user):
    if not user:
        return "System"
    full_name = user.get_full_name().strip() if hasattr(user, "get_full_name") else ""
    email = getattr(user, "email", "") or getattr(user, "username", "")
    return f"{email} ({full_name})" if full_name and email else full_name or email or "System"


def _validate_attachment(uploaded_file):
    if uploaded_file.size > MAX_ATTACHMENT_BYTES:
        raise ValidationError(f"{uploaded_file.name} exceeds the 10 MB limit.")
    extension = Path(uploaded_file.name).suffix.lower()
    content_type = (getattr(uploaded_file, "content_type", "") or "").lower()
    if extension not in ALLOWED_ATTACHMENT_EXTENSIONS:
        raise ValidationError(f"{uploaded_file.name} has an unsupported file extension.")
    if content_type and content_type not in ALLOWED_ATTACHMENT_CONTENT_TYPES:
        raise ValidationError(f"{uploaded_file.name} has an unsupported content type.")


class GrievanceViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = [IsAuthenticated, GrievanceAccessPermission]
    pagination_class = None
    queryset = Grievance.objects.select_related(
        "supplier_kpi__supplier"
    ).prefetch_related("information_collection_attachments")
    serializer_class = GrievanceSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = grievance_queryset_for_user(queryset, self.request.user)
        supplier_kpi_id = self.kwargs.get("skpi_id")
        if supplier_kpi_id is not None:
            queryset = queryset.filter(supplier_kpi_id=supplier_kpi_id)
        return queryset

    def get_queryset_by_supplier_kpi(self, supplier_kpi_id):
        """Returns queryset filtered by supplier_kpi_id."""
        return self.get_queryset().filter(supplier_kpi_id=supplier_kpi_id)

    def handle_send_email(self, request):
        """Handles the logic for sending email notifications."""
        should_send = request.data.get("send_email") and not request.data.get(
            "is_draft"
        )
        if should_send:
            request.data["send_email"] = False
        return should_send

    @staticmethod
    def _requested_is_draft(request):
        """Whether this save was a Save Draft (True) or a Submit (False).

        Defaults to a draft when the flag is absent so an unexpected payload
        never records a spurious "submitted"."""
        value = request.data.get("is_draft", True)
        if value is None:
            return True
        if isinstance(value, str):
            return value.strip().lower() not in ("false", "0", "no", "")
        return bool(value)

    def _record_action_event(self, grievance, request):
        """Log who pressed Save Draft / Preview & Submit, for the history widget.

        Called from create() and update(). A PATCH routes through
        partial_update() -> update(), so recording here (not in partial_update)
        keeps it to one event per request."""
        user = getattr(request, "user", None)
        GrievanceActionEvent.objects.create(
            grievance=grievance,
            action=(
                GrievanceActionEvent.ACTION_SAVED_DRAFT
                if self._requested_is_draft(request)
                else GrievanceActionEvent.ACTION_SUBMITTED
            ),
            actor=user if getattr(user, "is_authenticated", False) else None,
        )

    def retrieve(self, request, *args, **kwargs):
        supplier_kpi_id = self.kwargs.get("skpi_id")
        queryset = self.get_queryset_by_supplier_kpi(supplier_kpi_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        should_send_email = self.handle_send_email(request)
        supplier_kpi = get_object_or_404(
            SupplierKpi.objects.select_related("supplier"),
            pk=self.kwargs.get("skpi_id"),
        )
        if not can_edit_supplier_kpi_grievance(request.user, supplier_kpi):
            raise PermissionDenied("You cannot edit this supplier KPI grievance.")
        if Grievance.objects.filter(supplier_kpi=supplier_kpi).exists():
            raise ValidationError("A grievance already exists for this supplier KPI.")

        data = request.data.copy()
        data["supplier_kpi"] = supplier_kpi.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self._record_action_event(serializer.instance, request)
        if should_send_email:
            send_email_notification_to_issara(serializer.instance.id)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        should_send_email = self.handle_send_email(request)
        response = super().update(request, *args, **kwargs)
        self._record_action_event(self.get_object(), request)
        if should_send_email:
            send_email_notification_to_issara(self.kwargs.get("pk"))
        return response

    def partial_update(self, request, *args, **kwargs):
        should_send_email = self.handle_send_email(request)
        response = super().partial_update(request, *args, **kwargs)
        if should_send_email:
            send_email_notification_to_issara(self.kwargs.get("pk"))
        return response

    @staticmethod
    def _attachment_type(uploaded_file):
        content_type = getattr(uploaded_file, "content_type", "") or ""
        if content_type.startswith("image/"):
            return "SPA"
        if content_type.startswith("video/"):
            return "SVA"
        return "O"

    @staticmethod
    def _create_shared_attachment(uploaded_file, permission):
        return SharedFile.create_from_upload(
            uploaded_file,
            type=GrievanceViewSet._attachment_type(uploaded_file),
            permission=permission,
        )

    @staticmethod
    def _permission_list(request):
        if not hasattr(request.data, "getlist"):
            return []
        return request.data.getlist("information_collection_attachment_permissions")

    @staticmethod
    def _visibility_updates(request):
        raw = request.data.get("information_collection_attachment_visibility", "{}")
        if not raw:
            return {}
        if isinstance(raw, dict):
            return raw
        try:
            parsed = json.loads(raw)
        except (TypeError, ValueError) as exc:
            raise ValidationError("Attachment visibility updates must be valid JSON.") from exc
        if not isinstance(parsed, dict):
            raise ValidationError("Attachment visibility updates must be an object.")
        return parsed

    @action(
        detail=True,
        methods=["post"],
        url_path="information_collection_attachments",
        parser_classes=[MultiPartParser, FormParser],
    )
    def information_collection_attachments(self, request, pk=None, **kwargs):
        """
        Add/remove attachments for the Information Collection tab.
        Multipart: send files under `information_collection_attachments` and
        ids to remove under `remove_information_collection_attachments`.
        """
        try:
            grievance = self.get_object()

            # Attachments persist on any save, drafts included — the supplier's
            # uploaded files should survive a Save Draft just like every other
            # field, instead of only committing on submit.
            remove_ids = []
            raw_remove = (
                request.data.getlist("remove_information_collection_attachments")
                if hasattr(request.data, "getlist")
                else request.data.get("remove_information_collection_attachments", [])
            )
            for value in raw_remove or []:
                try:
                    remove_ids.append(int(value))
                except (TypeError, ValueError):
                    continue
            uploaded_files = request.FILES.getlist("information_collection_attachments")
            permissions = self._permission_list(request)
            if uploaded_files and len(permissions) != len(uploaded_files):
                raise ValidationError("Each uploaded attachment must have one visibility value.")

            visibility_updates = self._visibility_updates(request)
            for permission in [*permissions, *visibility_updates.values()]:
                if permission not in ALLOWED_ATTACHMENT_PERMISSIONS:
                    raise ValidationError(f"Unsupported attachment visibility: {permission}")

            for uploaded_file in uploaded_files:
                _validate_attachment(uploaded_file)

            with transaction.atomic():
                attached_by_id = {
                    attachment.id: attachment
                    for attachment in grievance.information_collection_attachments.all()
                }

                for remove_id in remove_ids:
                    attachment = attached_by_id.get(remove_id)
                    if not attachment:
                        continue
                    grievance.information_collection_attachments.remove(attachment)
                    GrievanceAttachmentEvent.objects.create(
                        grievance=grievance,
                        attachment=attachment,
                        attachment_name=attachment.name,
                        action=GrievanceAttachmentEvent.ACTION_REMOVED,
                        previous_permission=attachment.permission,
                        permission=attachment.permission,
                        actor=request.user,
                    )

                for raw_id, permission in visibility_updates.items():
                    try:
                        attachment_id = int(raw_id)
                    except (TypeError, ValueError) as exc:
                        raise ValidationError("Attachment visibility IDs must be integers.") from exc
                    attachment = attached_by_id.get(attachment_id)
                    if not attachment:
                        raise ValidationError("Attachment is not linked to this grievance.")
                    if attachment_id in remove_ids:
                        continue
                    previous_permission = attachment.permission
                    if previous_permission == permission:
                        continue
                    attachment.permission = permission
                    attachment.save(update_fields=["permission"])
                    GrievanceAttachmentEvent.objects.create(
                        grievance=grievance,
                        attachment=attachment,
                        attachment_name=attachment.name,
                        action=GrievanceAttachmentEvent.ACTION_VISIBILITY_CHANGED,
                        previous_permission=previous_permission,
                        permission=permission,
                        actor=request.user,
                    )

                for index, uploaded_file in enumerate(uploaded_files):
                    permission = permissions[index]
                    shared = self._create_shared_attachment(uploaded_file, permission)
                    grievance.information_collection_attachments.add(shared)
                    GrievanceAttachmentEvent.objects.create(
                        grievance=grievance,
                        attachment=shared,
                        attachment_name=shared.name,
                        action=GrievanceAttachmentEvent.ACTION_ADDED,
                        permission=permission,
                        actor=request.user,
                    )

            serializer = self.get_serializer(grievance)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValidationError:
            raise
        except Exception:
            logger.exception(
                "Failed to sync information_collection_attachments for "
                "grievance pk=%s",
                pk,
            )
            return Response(
                {"detail": "Unable to update grievance attachments."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def download_information_collection_attachment(
        self, request, pk=None, attachment_id=None, **kwargs
    ):
        grievance = self.get_object()
        attachment = get_object_or_404(
            grievance.information_collection_attachments,
            pk=attachment_id,
        )
        if not can_view_attachment(request.user, grievance, attachment):
            raise PermissionDenied("You cannot view this attachment.")
        if not attachment.file_path:
            return Response(
                {"detail": "Attachment file is unavailable."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return FileResponse(
            attachment.file_path.open("rb"),
            as_attachment=True,
            filename=attachment.name,
        )

    def history(self, request, pk=None, **kwargs):
        grievance = self.get_object()
        entries = []

        section_fields = {
            "Safeguarding": {
                "zero_tolerance",
                "reviewed_individual",
                "involved_in_grievance",
                "received_the_training",
                "has_trained_impartial",
            },
            "Investigation": {
                "issara_context",
                "checked_with_hr",
                "repeat_issue",
                "ethical_reviewed",
                "professional_ensured",
                "impartial_ensured",
                "inclusive_and_accessible",
                "timely_and_effective",
            },
            "Communications": {
                "investigation_their_wellbeing",
                "need_help_with_complex_consequences",
            },
            "Form": {"is_draft", "send_email"},
        }
        history_rows = list(grievance.history.order_by("history_date", "history_id"))
        previous = None
        for row in history_rows:
            if previous is None:
                action_text = "Internal grievance form created."
                section = "Form"
            else:
                changed = set(row.diff_against(previous).changed_fields)
                matched_sections = [
                    name
                    for name, fields in section_fields.items()
                    if name != "Form" and changed & fields
                ]
                # A save that only flips is_draft/send_email (the "Form" fields)
                # carries no content change of its own — the explicit
                # GrievanceActionEvent below records that Save Draft / Submit
                # more clearly, so skip the generic "Updated Form." noise.
                if not matched_sections:
                    previous = row
                    continue
                section = ", ".join(matched_sections)
                action_text = f"Updated {section}."
            entries.append(
                {
                    "id": f"grievance-{row.history_id}",
                    "datetime": row.history_date,
                    "actor": _actor_label(row.history_user),
                    "action": action_text,
                    "section": section,
                    "source_type": "grievance",
                    "system_generated": row.history_user is None,
                }
            )
            previous = row

        for event in grievance.action_events.select_related("actor"):
            # Match on a stable prefix rather than the exact code. Some local DB
            # environments have been observed to clip a trailing character from
            # this column on write; a prefix keeps the label correct there and in
            # a healthy deployment alike.
            code = (event.action or "").lower()
            if code.startswith("sub"):
                label = "Submitted grievance for review."
            elif code.startswith("dra") or code.startswith("saved"):
                label = "Saved draft."
            else:
                label = "Updated grievance."
            entries.append(
                {
                    "id": f"action-{event.id}",
                    "datetime": event.created_at,
                    "actor": _actor_label(event.actor),
                    "action": label,
                    "section": "Form",
                    "source_type": "action",
                    "system_generated": event.actor_id is None,
                }
            )

        child_models = (
            (Remediation, "Communications", "Submitted a remediation update."),
            (SystemStrengthening, "Case Update / Closure", "Submitted a systems-strengthening update."),
            (InformationCollectionNote, "Investigation", "Submitted information-collection notes."),
            (EthicalInvestigationNote, "Investigation", "Submitted ethical-investigation notes."),
            (SafeGuardingNote, "Safeguarding", "Submitted safeguarding notes."),
            (CommunicatingNote, "Communications", "Submitted communication notes."),
        )
        for model, section, action_text in child_models:
            for item in model.objects.filter(grievance=grievance, is_submitted=True):
                entries.append(
                    {
                        "id": f"{model.__name__.lower()}-{item.id}",
                        "datetime": item.updated_at,
                        "actor": _actor_label(item.author),
                        "action": action_text,
                        "section": section,
                        "source_type": model.__name__.lower(),
                        "system_generated": item.author_id is None,
                    }
                )

        attachment_actions = {
            GrievanceAttachmentEvent.ACTION_ADDED: "Added attachment",
            GrievanceAttachmentEvent.ACTION_REMOVED: "Removed attachment",
            GrievanceAttachmentEvent.ACTION_VISIBILITY_CHANGED: "Changed attachment visibility",
        }
        for event in grievance.attachment_events.select_related("actor"):
            action_text = f"{attachment_actions[event.action]}: {event.attachment_name}."
            entries.append(
                {
                    "id": f"attachment-{event.id}",
                    "datetime": event.created_at,
                    "actor": _actor_label(event.actor),
                    "action": action_text,
                    "section": "Investigation",
                    "source_type": "attachment",
                    "system_generated": event.actor_id is None,
                }
            )

        kpi_history = list(
            grievance.supplier_kpi.history.order_by("history_date", "history_id")
        )
        previous = None
        for row in kpi_history:
            if previous is not None:
                changed = set(row.diff_against(previous).changed_fields)
                action_text = None
                if "issue_escalated_to_buyer" in changed and row.issue_escalated_to_buyer:
                    action_text = "KPI escalated to the buyer."
                elif "closed_at" in changed and row.closed_at and not previous.closed_at:
                    action_text = "KPI closed."
                elif "closed_at" in changed and not row.closed_at and previous.closed_at:
                    action_text = "KPI reopened."
                if action_text:
                    entries.append(
                        {
                            "id": f"kpi-{row.history_id}",
                            "datetime": row.history_date,
                            "actor": _actor_label(row.history_user),
                            "action": action_text,
                            "section": "KPI",
                            "source_type": "supplier_kpi",
                            "system_generated": row.history_user is None,
                        }
                    )
            previous = row

        entries.sort(key=lambda entry: entry["datetime"], reverse=True)
        return Response(entries)
