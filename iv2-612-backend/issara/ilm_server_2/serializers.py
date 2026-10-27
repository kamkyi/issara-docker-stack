import json
import os
from datetime import datetime
from typing import Dict, List, Union

from django.conf import settings
from django.contrib.auth.models import Group, User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.db import models
from django.db.models import Count, F, OuterRef, Prefetch, Q, Subquery
from issara.ilm_server_2.eti_base_codes.serializers import EtiBaseCodeSerializer
from issara.ilm_server_2.permissions import is_issara_staff
from issara.ilm_server_2.choices import (
    ORGANIZATION_CORE_FOCUS_AREA_CHOICES,
    ORGANIZATION_STAKEHOLDER_GROUP_CHOICES,
)
from issara.ilm_server_2.models import (
    NACE_CODE_VALIDATOR,
    BusinessResponse,
    Case,
    CaseCategory,
    CaseCategoryTranslation,
    CaseInteraction,
    CaseStatus,
    ClientStatus,
    ClientStatusTranslation,
    ClientType,
    ClientTypeTranslation,
    ContractType,
    Country,
    CsoLogin,
    District,
    DocumentType,
    ERMetrics,
    EthicalRecruitmentMeeting,
    Ethnicity,
    EtiBaseCode,
    FactoryType,
    FieldworkActivity,
    FieldworkActivityPrimaryFocus,
    FieldworkActivityType,
    FieldworkActivityTypeCategory,
    FieldworkActivityTypeTranslation,
    Gender,
    GrievanceMechanismReview,
    HowHearIssara,
    HowHearIssaraTranslation,
    Industry,
    InteractionChannel,
    InteractionChannelTranslation,
    InteractionReason,
    InteractionReasonTranslation,
    IssueCategory,
    IssueCategoryTranslation,
    Language,
    MmThaiDemandData,
    MmThaiSendingData,
    MonthlyWorkerVoice,
    Nationality,
    NewsUpdate,
    NonSupplyChainCase,
    Organization,
    OrganizationCoreFocusArea,
    OrganizationImage,
    OrganizationNaceCode,
    OrganizationStakeholderGroup,
    PartnerMessageBoard,
    PartnerMessageBoardAcknowledgement,
    PartnerMessageBoardComment,
    PartnerMessageBoardRSVP,
    PartnerMessageBoardSeen,
    PartnerReferenceDoc,
    PersonContact,
    Policy,
    PolicyCompliance,
    PriorityActivity,
    PriorityActivityBase,
    PriorityActivityGroup,
    Province,
    Recruiter,
    RecruiterCRCResponse,
    ReferralAction,
    ReferralActionTranslation,
    ResponseInteractionType,
    SharedFile,
    SPWorkplan,
    StrategicPartner,
    StrategicPartnerResponse,
    StrategicPartnerUser,
    SubIndustry,
    Supplier,
    SupplierCRCResponse,
    SupplierLogin,
    SupplierMessageBoard,
    SupplierProgressItem,
    SupplierProgressItemTranslation,
    SupplierRecruiters,
    SupplierSupplyChain,
    SupplierTier,
    SupplyChain,
    UserLogin,
    UserTask,
    VesselType,
    WorkPlace,
    WorkplanActivity,
    WorkPlanAuditTrail,
    WorkplanDocs,
    WorkplanMainGoal,
    WorkplanNotesRemark,
    WorkplanProgressIndicator,
)
from kpis.models import SupplierKpi, SupplierKpiUpdate
from rest_framework import serializers


class WorkPlanAuditTrailSerializer(serializers.ModelSerializer):

    data = serializers.SerializerMethodField()

    def get_data(self, obj):

        try:

            return json.loads(obj.data)

        except Exception:

            return obj.data

    class Meta:

        model = WorkPlanAuditTrail

        fields = "__all__"


class SharedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedFile
        fields = "__all__"


class NonSupplyChainCaseSerializer(serializers.ModelSerializer):
    industries = serializers.PrimaryKeyRelatedField(
        queryset=Industry.objects.all(), many=True, required=False
    )
    subindustries = serializers.PrimaryKeyRelatedField(
        queryset=SubIndustry.objects.all(), many=True, required=False
    )

    class Meta:
        model = NonSupplyChainCase
        fields = "__all__"


class PartnerReferenceDocSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerReferenceDoc
        fields = "__all__"


POLICY_TEXT_MAX_LENGTH = 1000
POLICY_FILE_MAX_BYTES = 10 * 1024 * 1024
POLICY_FILE_ALLOWED_MIME = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class PolicyReadSerializer(serializers.ModelSerializer):
    category_slugs = serializers.SerializerMethodField()
    file_id = serializers.SerializerMethodField()
    source_shared_file_id = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = Policy
        fields = [
            "id",
            "title",
            "type",
            "text_value",
            "link_url",
            "audience",
            "category_slugs",
            "file_id",
            "source_shared_file_id",
            "is_source_hidden",
            "file_url",
            "file_name",
            "created_at",
            "updated_at",
        ]

    def get_category_slugs(self, obj):
        return list(obj.categories.values_list("name", flat=True))

    def get_file_id(self, obj):
        return obj.file_id

    def get_source_shared_file_id(self, obj):
        return obj.source_shared_file_id

    def get_file_url(self, obj):
        if not obj.file or not obj.file.file_path:
            return None
        try:
            return obj.file.file_path.url
        except Exception:
            return None

    def get_file_name(self, obj):
        return obj.file.name if obj.file else None


class PolicyWriteSerializer(serializers.ModelSerializer):
    file = serializers.FileField(required=False, allow_null=True, write_only=True)
    shared_file_id = serializers.IntegerField(
        required=False, allow_null=True, write_only=True
    )
    source_shared_file_id = serializers.IntegerField(
        required=False, allow_null=True, write_only=True
    )
    hide_source = serializers.BooleanField(required=False, write_only=True)
    category_slugs = serializers.ListField(
        child=serializers.CharField(), required=False, write_only=True
    )

    class Meta:
        model = Policy
        fields = [
            "id",
            "title",
            "type",
            "text_value",
            "link_url",
            "audience",
            "file",
            "shared_file_id",
            "source_shared_file_id",
            "hide_source",
            "category_slugs",
        ]
        read_only_fields = ["id"]

    def to_internal_value(self, data):
        # Support multipart form with category_slugs sent as a JSON string
        # or as repeated form fields.
        if hasattr(data, "getlist"):
            # Do NOT use data.copy() here.
            # QueryDict.copy() deep-copies uploaded files and crashes with:
            # TypeError: cannot pickle '_io.BufferedRandom' object
            mutable = data.__class__(
                "", mutable=True, encoding=getattr(data, "encoding", None)
            )

            for key, values in data.lists():
                mutable.setlist(key, values)

            raw = mutable.get("category_slugs")
            if isinstance(raw, str) and raw.startswith("["):
                try:
                    mutable.setlist("category_slugs", json.loads(raw))
                except (TypeError, ValueError):
                    pass

            data = mutable

        return super().to_internal_value(data)

    def validate(self, attrs):
        policy_type = attrs.get("type") or getattr(self.instance, "type", None)
        text_value = attrs.get("text_value")
        link_url = attrs.get("link_url")
        uploaded_file = attrs.get("file")
        shared_file_id = attrs.get("shared_file_id")
        source_shared_file_id = attrs.get("source_shared_file_id")
        hide_source = attrs.get("hide_source", False)
        has_existing_file = bool(self.instance and self.instance.file_id)

        if hide_source:
            if not source_shared_file_id:
                raise serializers.ValidationError(
                    {"source_shared_file_id": "Required when hide_source is true."}
                )
            return attrs

        if policy_type == Policy.POLICY_TYPE_TEXT:
            if not text_value or not text_value.strip():
                raise serializers.ValidationError(
                    {"text_value": "Required for text policies."}
                )
            if len(text_value) > POLICY_TEXT_MAX_LENGTH:
                raise serializers.ValidationError(
                    {
                        "text_value": f"Must be {POLICY_TEXT_MAX_LENGTH} characters or fewer."
                    }
                )
        elif policy_type == Policy.POLICY_TYPE_LINK:
            if not link_url:
                raise serializers.ValidationError(
                    {"link_url": "Required for link policies."}
                )
        elif policy_type == Policy.POLICY_TYPE_FILE:
            if not uploaded_file and shared_file_id is None and not has_existing_file:
                raise serializers.ValidationError(
                    {"file": "Upload a file or provide shared_file_id."}
                )
            if uploaded_file:
                content_type = getattr(uploaded_file, "content_type", "") or ""
                if content_type and content_type not in POLICY_FILE_ALLOWED_MIME:
                    raise serializers.ValidationError(
                        {"file": "Must be a PDF, DOC or DOCX file."}
                    )
                if (getattr(uploaded_file, "size", 0) or 0) > POLICY_FILE_MAX_BYTES:
                    raise serializers.ValidationError(
                        {"file": "Must be 10 MB or smaller."}
                    )
        else:
            raise serializers.ValidationError({"type": "Unknown policy type."})

        return attrs

    def _resolve_categories(self, slugs):
        if slugs is None:
            return None
        categories = list(PolicyCompliance.objects.filter(name__in=slugs))
        known = {c.name for c in categories}
        unknown = [s for s in slugs if s not in known]
        if unknown:
            raise serializers.ValidationError(
                {"category_slugs": f"Unknown categor(y/ies): {', '.join(unknown)}"}
            )
        return categories

    def _persist_file(self, uploaded_file):
        if not uploaded_file:
            return None
        return SharedFile.create_from_upload(uploaded_file, type="SP")

    def _resolve_workplan_shared_file(self, shared_file_id, field_name):
        if not shared_file_id:
            return None
        try:
            shared_file = SharedFile.objects.get(pk=shared_file_id)
        except SharedFile.DoesNotExist:
            raise serializers.ValidationError(
                {field_name: "Shared file does not exist."}
            )

        owner = self.context.get("owner") or {}
        strategic_partner_id = owner.get("strategic_partner_id")
        if not strategic_partner_id:
            raise serializers.ValidationError(
                {
                    field_name: (
                        f"{field_name} is only supported for strategic partner "
                        "Work Plan files."
                    )
                }
            )

        is_workplan_file = WorkplanDocs.objects.filter(
            document=shared_file,
            workplan__strategic_partner_id=strategic_partner_id,
        ).exists()
        if not is_workplan_file:
            raise serializers.ValidationError(
                {
                    field_name: (
                        "Shared file does not belong to this strategic partner "
                        "Work Plan."
                    )
                }
            )

        return shared_file

    def _resolve_shared_file(self, shared_file_id):
        return self._resolve_workplan_shared_file(shared_file_id, "shared_file_id")

    def _resolve_source_shared_file(self, source_shared_file_id):
        return self._resolve_workplan_shared_file(
            source_shared_file_id, "source_shared_file_id"
        )

    def _get_existing_workplan_source_file(self, instance):
        if not instance or not instance.file_id or instance.source_shared_file_id:
            return None

        owner = self.context.get("owner") or {}
        strategic_partner_id = owner.get("strategic_partner_id")
        if not strategic_partner_id:
            return None

        is_workplan_file = WorkplanDocs.objects.filter(
            document_id=instance.file_id,
            workplan__strategic_partner_id=strategic_partner_id,
        ).exists()
        if not is_workplan_file:
            return None

        return instance.file

    def create(self, validated_data):
        owner = self.context.get("owner") or {}
        uploaded_file = validated_data.pop("file", None)
        shared_file_id = validated_data.pop("shared_file_id", None)
        source_shared_file_id = validated_data.pop("source_shared_file_id", None)
        hide_source = validated_data.pop("hide_source", False)
        category_slugs = validated_data.pop("category_slugs", None)
        categories = self._resolve_categories(category_slugs)
        file_obj = self._persist_file(uploaded_file) or self._resolve_shared_file(
            shared_file_id
        )
        source_file_obj = self._resolve_source_shared_file(source_shared_file_id)
        if source_file_obj is None and shared_file_id is not None:
            source_file_obj = file_obj

        policy = Policy.objects.create(
            **validated_data,
            **owner,
            file=file_obj,
            source_shared_file=source_file_obj,
            is_source_hidden=hide_source,
        )
        if categories is not None:
            policy.categories.set(categories)
        return policy

    def update(self, instance, validated_data):
        uploaded_file = validated_data.pop("file", None)
        shared_file_id = validated_data.pop("shared_file_id", None)
        source_shared_file_id = validated_data.pop("source_shared_file_id", None)
        hide_source = validated_data.pop("hide_source", None)
        category_slugs = validated_data.pop("category_slugs", None)
        categories = self._resolve_categories(category_slugs)
        existing_source_file = self._get_existing_workplan_source_file(instance)

        for key, value in validated_data.items():
            setattr(instance, key, value)

        # Clear stale source fields when type changes
        if instance.type == Policy.POLICY_TYPE_TEXT:
            instance.link_url = None
        elif instance.type == Policy.POLICY_TYPE_LINK:
            instance.text_value = None
        elif instance.type == Policy.POLICY_TYPE_FILE:
            instance.text_value = None
            instance.link_url = None

        file_obj = self._persist_file(uploaded_file)
        if file_obj:
            instance.file = file_obj
        elif shared_file_id is not None:
            shared_file = self._resolve_shared_file(shared_file_id)
            instance.file = shared_file
            if instance.source_shared_file_id is None:
                instance.source_shared_file = shared_file

        if source_shared_file_id is not None:
            instance.source_shared_file = self._resolve_source_shared_file(
                source_shared_file_id
            )
        elif existing_source_file is not None:
            instance.source_shared_file = existing_source_file

        if hide_source is not None:
            instance.is_source_hidden = hide_source

        instance.save()

        if categories is not None:
            instance.categories.set(categories)
        return instance


class ReadWriteSerializerMethodField(serializers.SerializerMethodField):
    """
    Default SerializerMethodField in drf is read only.
    This method field class supports both read and write
    """

    def __init__(self, method_name=None, **kwargs):
        self.method_name = method_name
        kwargs["source"] = "*"
        self.read_only = False
        super(serializers.SerializerMethodField, self).__init__(**kwargs)

    def to_internal_value(self, data):
        return {f"{self.field_name}_id": data}


class UserLoginSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLogin
        fields = "__all__"


class SupplierUserLoginSerializer(serializers.ModelSerializer):

    def to_representation(self, instance):
        data = super().to_representation(instance)

        data["user_name"] = "-"
        data["supplier_name"] = "-"

        if instance.user is None:
            return data

        try:

            user = User.objects.filter(id=instance.user.id).last()

            if user is None:
                return data

            data["user_name"] = user.username

            try:

                _groups = list(user.groups.all())

                is_supplier = any(group.name == "Supplier" for group in _groups)

                if is_supplier:

                    supplier_user = getattr(user, "supplier_user", None)
                    supplier = (
                        getattr(supplier_user, "supplier", None)
                        if supplier_user
                        else None
                    )

                    if supplier:
                        data["supplier_name"] = supplier.name

            except AttributeError:

                pass

        except Exception:

            pass

        return data

    class Meta:
        model = SupplierLogin
        fields = "__all__"


class NewsUpdateSerializer(serializers.ModelSerializer):
    title = serializers.CharField()
    description = serializers.CharField()

    class Meta:
        model = NewsUpdate
        fields = ["id", "name", "title", "sort_number", "description", "created"]


def _author_display(user):
    """Render a User as the small author object the message-board UI consumes."""
    if user is None:
        # A null author is a CASCADE-team / WorkOS-staff post or reply.
        return {
            "id": None,
            "name": "ILM Cascade Team",
            "role": "",
            "initials": "IC",
            "is_staff": True,
        }
    full_name = (user.get_full_name() or user.username or "").strip()
    if not full_name:
        full_name = "ILM Cascade Team"
    parts = [p for p in full_name.split() if p]
    initials = "".join(p[0].upper() for p in parts[:2]) or "IC"
    return {
        "id": user.id,
        "name": full_name,
        "role": "",
        "initials": initials,
        "is_staff": is_issara_staff(user),
    }


def _attachment_kind(filename):
    ext = os.path.splitext(filename or "")[1].lower().lstrip(".")
    if ext == "pdf":
        return "pdf"
    if ext in ("xls", "xlsx", "csv"):
        return "xls"
    return "other"


class PartnerMessageBoardAttachmentSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    file_url = serializers.SerializerMethodField()
    size = serializers.CharField(read_only=True)
    kind = serializers.SerializerMethodField()

    def get_file_url(self, obj):
        if not getattr(obj, "file_path", None):
            return None
        try:
            url = obj.file_path.url
        except Exception:
            return None
        if not url:
            return None
        # `FileSystemStorage` (DEBUG=True) returns a relative `/media/...`
        # path; prepend the backend host so the frontend doesn't resolve it
        # against its own origin. S3 storage already returns absolute URLs.
        if url.startswith("http://") or url.startswith("https://"):
            return url
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def get_kind(self, obj):
        return _attachment_kind(obj.name)


def _scoped_comment_qs(qs, context):
    """Restrict a comment queryset to the viewing partner's own org plus
    Cascade-team (staff / null-partner) comments, so one strategic partner never
    sees another partner's conversation. Issara staff see everything. The active
    SP is taken from `strategic_partner_id` (query param on reads, body on the
    ack/rsvp/seen actions), falling back to the requester's own SP link."""
    request = context.get("request")
    user = getattr(request, "user", None) if request else None
    if user is not None and is_issara_staff(user):
        return qs

    sp_id = None
    if request is not None:
        raw = request.query_params.get("strategic_partner_id")
        if not raw:
            data = getattr(request, "data", None) or {}
            raw = data.get("strategic_partner_id")
        if raw is not None and str(raw).isdigit():
            sp_id = int(raw)
    if sp_id is None and user is not None:
        spu = getattr(user, "strategic_partner_user", None)
        sp_id = getattr(spu, "strategic_partner_id", None) if spu else None

    if sp_id is None:
        # Can't determine the viewer's org → only Cascade-team comments.
        return qs.filter(strategic_partner__isnull=True)
    return qs.filter(Q(strategic_partner_id=sp_id) | Q(strategic_partner__isnull=True))


class PartnerMessageBoardCommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    # Denormalised partner the comment came from, so the Team Console can scope
    # comments per partner (read-only; stamped server-side on create).
    strategic_partner = serializers.PrimaryKeyRelatedField(read_only=True)
    strategic_partner_name = serializers.SerializerMethodField()

    class Meta:
        model = PartnerMessageBoardComment
        fields = (
            "id",
            "post",
            "parent_comment",
            "body",
            "author",
            "strategic_partner",
            "strategic_partner_name",
            "created_at",
            "updated_at",
            "replies",
        )
        read_only_fields = ("author", "created_at", "updated_at", "replies")

    def get_author(self, obj):
        return _author_display(obj.author)

    def get_strategic_partner_name(self, obj):
        return obj.strategic_partner.name if obj.strategic_partner_id else None

    def get_replies(self, obj):
        # Only inline replies when serializing a top-level comment, to avoid
        # infinite recursion on nested replies.
        if obj.parent_comment_id is not None:
            return []
        replies = _scoped_comment_qs(obj.replies, self.context).select_related("author")
        return PartnerMessageBoardCommentSerializer(
            replies, many=True, context=self.context
        ).data


class PartnerMessageBoardSerializer(serializers.ModelSerializer):
    title = serializers.CharField(allow_blank=True, required=False)
    description = serializers.CharField(allow_blank=True, required=False)
    strategic_partner = serializers.PrimaryKeyRelatedField(
        queryset=StrategicPartner.objects.all(),
        required=False,
        allow_null=True,
    )
    # Frontend alias for `audience_all`. When true, the post is shown to every
    # strategic partner regardless of the `strategic_partner` FK.
    strategic_partner_all = serializers.BooleanField(required=False, write_only=True)
    image = serializers.ImageField(required=False, allow_null=True)
    author = serializers.SerializerMethodField()
    attachments = PartnerMessageBoardAttachmentSerializer(many=True, read_only=True)
    comments = serializers.SerializerMethodField()
    ack_count = serializers.SerializerMethodField()
    ack_total = serializers.SerializerMethodField()
    user_has_acked = serializers.SerializerMethodField()
    going_count = serializers.SerializerMethodField()
    user_rsvp_status = serializers.SerializerMethodField()
    has_seen = serializers.SerializerMethodField()
    reaction_counts = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()

    # Write-only fields for multipart uploads.
    attachment_files = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True,
    )
    attachment_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="If provided, replaces the post's attachments with these SharedFile ids.",
    )
    # Grouping-based audience fields.
    audience_grouping = serializers.CharField(
        required=False, allow_null=True, allow_blank=True
    )
    audience_partner_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_null=True,
    )

    def to_internal_value(self, data):
        import json as _json
        from django.http import QueryDict

        if isinstance(data, QueryDict):
            # Flatten to plain dict: single-value fields become scalars, true
            # multi-value fields stay as lists. This avoids QueryDict's
            # getlist() wrapping a set list in another list, which would cause
            # DRF's ListField to see [[126, 52, ...]] instead of [126, 52, ...].
            #
            # ListField-backed fields must ALWAYS stay lists, even when the
            # request carries a single value. Collapsing a lone uploaded file to
            # a scalar hands the ListField(FileField()) an UploadedFile, which is
            # itself iterable — DRF then iterates it chunk-by-chunk and reports
            # every chunk as "not a file" (the single-attachment upload bug).
            list_fields = {"attachment_files", "attachment_ids"}
            plain = {
                k: v if k in list_fields else (v[0] if len(v) == 1 else v)
                for k, v in data.lists()
            }
            raw = plain.get("audience_partner_ids")
            if isinstance(raw, str):
                try:
                    plain["audience_partner_ids"] = _json.loads(raw)
                except (ValueError, TypeError):
                    pass
            data = plain
        elif isinstance(data, dict) and "audience_partner_ids" in data:
            raw = data.get("audience_partner_ids")
            if isinstance(raw, str):
                try:
                    data = dict(data)
                    data["audience_partner_ids"] = _json.loads(raw)
                except (ValueError, TypeError):
                    pass
        return super().to_internal_value(data)

    class Meta:
        model = PartnerMessageBoard
        fields = (
            "id",
            "name",
            "title",
            "description",
            "created",
            "sort_number",
            "strategic_partner",
            "strategic_partner_all",
            "audience_all",
            "audience_grouping",
            "audience_partner_ids",
            "status",
            "post_type",
            "pinned",
            "ack_required",
            "ack_by",
            "image",
            "event_starts_at",
            "event_ends_at",
            "event_location",
            "author",
            "attachments",
            "comments",
            "ack_count",
            "ack_total",
            "user_has_acked",
            "going_count",
            "user_rsvp_status",
            "has_seen",
            "reaction_counts",
            "user_reaction",
            "attachment_files",
            "attachment_ids",
        )

    # --- Read-side computed fields -------------------------------------------------

    def _request_user(self):
        """Return the request user only when it's a real Django row with a
        usable pk; lightweight WorkOSUser fallbacks (no Django twin) return
        None so per-user computed fields short-circuit safely."""
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not (user and getattr(user, "is_authenticated", False)):
            return None
        pk = getattr(user, "pk", None)
        if not (isinstance(pk, int) and pk > 0):
            return None
        return user

    def get_author(self, obj):
        return _author_display(obj.author)

    def get_comments(self, obj):
        top_level = _scoped_comment_qs(
            obj.comments.filter(parent_comment__isnull=True), self.context
        ).select_related("author")
        return PartnerMessageBoardCommentSerializer(
            top_level, many=True, context=self.context
        ).data

    def get_ack_count(self, obj):
        # Count distinct strategic-partner *organisations* that have
        # acknowledged — matching `ack_total`'s units (orgs, not raw users) and
        # the per-org roster endpoint. Prefer the denormalised strategic_partner
        # stamped on each row, falling back to the user→org link for legacy rows.
        # Rows that resolve to no org (e.g. staff previewing the partner UI) are
        # excluded, so the headline, the console row and the roster all agree.
        return len(self._distinct_org_ids(obj.acknowledgements.all()))

    @staticmethod
    def _distinct_org_ids(rows):
        org_ids = set()
        for stored, linked in rows.values_list(
            "strategic_partner_id",
            "user__strategic_partner_user__strategic_partner_id",
        ):
            oid = stored if stored is not None else linked
            if oid is not None:
                org_ids.add(oid)
        return org_ids

    def get_ack_total(self, obj):
        # The denominator shown alongside `<n> of <total> partners confirmed`.
        # Uses the post's single audience resolver so this always matches the
        # roster's total (`len(_roster_orgs)`).
        return obj.audience_partner_queryset().count()

    @staticmethod
    def _user_org_id(user):
        """The requester's strategic-partner org id, or None if unlinked."""
        spu = getattr(user, "strategic_partner_user", None)
        return getattr(spu, "strategic_partner_id", None) if spu else None

    def get_user_has_acked(self, obj):
        # Org-level: a post is "acknowledged" for a user once *any* user of their
        # strategic-partner org has acknowledged it (one partner org, many
        # users). Prefer the denormalised partner on the row, fall back to the
        # user→org link. Unlinked accounts (e.g. staff preview) fall back to
        # their own row.
        user = self._request_user()
        if not user:
            return False
        org_id = self._user_org_id(user)
        if org_id is None:
            return obj.acknowledgements.filter(user=user).exists()
        return obj.acknowledgements.filter(
            Q(strategic_partner_id=org_id)
            | Q(user__strategic_partner_user__strategic_partner_id=org_id)
        ).exists()

    def get_going_count(self, obj):
        # Distinct partner orgs with at least one "going" RSVP — same units as
        # the rsvp-roster endpoint, so the console number matches the roster.
        going = obj.rsvps.filter(status=PartnerMessageBoardRSVP.RSVP_GOING)
        return len(self._distinct_org_ids(going))

    def get_user_rsvp_status(self, obj):
        user = self._request_user()
        if not user:
            return None
        rsvp = obj.rsvps.filter(user=user).first()
        return rsvp.status if rsvp else None

    def get_has_seen(self, obj):
        user = self._request_user()
        if not user:
            return False
        return obj.seen_by.filter(user=user).exists()

    def get_reaction_counts(self, obj):
        # Aggregated per-emoji tally, visible to everyone. Only non-zero keys.
        counts = (
            obj.reactions.values("emoji")
            .order_by("emoji")
            .annotate(total=Count("id"))
        )
        return {row["emoji"]: row["total"] for row in counts}

    def get_user_reaction(self, obj):
        # The calling user's own current emoji key (one per user), or None.
        user = self._request_user()
        if not user:
            return None
        return (
            obj.reactions.filter(user=user)
            .values_list("emoji", flat=True)
            .first()
        )

    # --- Write-side overrides ------------------------------------------------------

    def validate(self, attrs):
        """Refuse to persist an audience-less post.

        A missing audience used to fall through to "every partner" in
        `PartnerMessageBoard.audience_partner_queryset()`. That silent broadcast
        is the root of the send-to-everyone incident, so require an explicit
        audience: a deliberate broadcast (`strategic_partner_all=True`), an
        explicit id list, a grouping, or a single partner FK. On partial updates
        the existing instance's audience counts too.
        """
        def _explicit(source_attrs, instance):
            if source_attrs.get("strategic_partner_all"):
                return True
            ids = source_attrs.get("audience_partner_ids")
            if ids:
                return True
            if source_attrs.get("audience_grouping"):
                return True
            if source_attrs.get("strategic_partner") is not None:
                return True
            if instance is not None:
                return bool(
                    instance.audience_all
                    or instance.audience_partner_ids
                    or instance.audience_grouping
                    or instance.strategic_partner_id is not None
                )
            return False

        # Only audience-touching writes are constrained; if the caller isn't
        # (re)setting any audience field on an existing post, leave it alone.
        touching_audience = any(
            key in attrs
            for key in (
                "strategic_partner_all",
                "audience_partner_ids",
                "audience_grouping",
                "strategic_partner",
            )
        )
        is_create = self.instance is None
        if (is_create or touching_audience) and not _explicit(attrs, self.instance):
            raise serializers.ValidationError(
                {
                    "audience": (
                        "Select at least one recipient, a partner grouping, or "
                        "explicitly choose to broadcast to all partners."
                    )
                }
            )
        return attrs

    def _apply_attachments(self, instance, attachment_files, attachment_ids):
        if attachment_ids is not None:
            instance.attachments.set(SharedFile.objects.filter(id__in=attachment_ids))
        if attachment_files:
            for uploaded in attachment_files:
                shared = SharedFile.create_from_upload(uploaded)
                instance.attachments.add(shared)

    def _consume_audience_alias(self, validated_data):
        """Translate audience alias fields into persisted model fields.

        Priority (highest wins):
          1. audience_grouping present → grouping-based post; clear audience_all
             and strategic_partner FK. If audience_partner_ids has exactly one
             entry keep the legacy strategic_partner FK populated for backwards
             compat with old filtering code.
          2. strategic_partner_all=True → broadcast; clear SP FK and grouping.
          3. specific strategic_partner → single-partner post; clear broadcast.
        """
        grouping = validated_data.pop("audience_grouping", ...)
        partner_ids = validated_data.pop("audience_partner_ids", ...)
        # Remember whether an explicit id list was supplied before we normalise
        # the "not supplied" sentinel away — a custom multi-select sends
        # audience_partner_ids with no grouping and must be honoured, not dropped.
        partner_ids_supplied = partner_ids is not ... and partner_ids is not None
        # Normalise the "not supplied" sentinel to None so length checks below
        # never run against the Ellipsis object.
        if partner_ids is ...:
            partner_ids = None

        # Custom multi-select audience: explicit ids, no grouping. Persist the
        # snapshot directly so audience_partner_queryset() filters to exactly
        # those partners instead of falling through to "every partner".
        if grouping is ... and partner_ids_supplied:
            validated_data["audience_partner_ids"] = partner_ids
            validated_data["audience_grouping"] = None
            validated_data["audience_all"] = False
            if len(partner_ids) == 1:
                try:
                    from issara.ilm_server_2.models import StrategicPartner as SP
                    validated_data["strategic_partner"] = SP.objects.get(
                        pk=partner_ids[0]
                    )
                except Exception:
                    validated_data["strategic_partner"] = None
            else:
                validated_data["strategic_partner"] = None
            validated_data.pop("strategic_partner_all", None)
            return

        if grouping is not ...:
            # Grouping-based audience path.
            validated_data["audience_grouping"] = grouping or None
            validated_data["audience_partner_ids"] = partner_ids
            validated_data["audience_all"] = False
            # Populate legacy FK when narrowed to exactly one partner.
            if partner_ids and len(partner_ids) == 1:
                try:
                    from issara.ilm_server_2.models import StrategicPartner as SP

                    validated_data["strategic_partner"] = SP.objects.get(
                        pk=partner_ids[0]
                    )
                except Exception:
                    validated_data["strategic_partner"] = None
            else:
                validated_data["strategic_partner"] = None
            # Remove strategic_partner_all if the frontend also sent it.
            validated_data.pop("strategic_partner_all", None)
            return

        if "strategic_partner_all" in validated_data:
            audience_all = bool(validated_data.pop("strategic_partner_all"))
            validated_data["audience_all"] = audience_all
            if audience_all:
                validated_data["strategic_partner"] = None
                validated_data["audience_grouping"] = None
                validated_data["audience_partner_ids"] = None
        elif validated_data.get("strategic_partner") is not None:
            # A specific partner was chosen → this is not a broadcast.
            validated_data["audience_all"] = False
            validated_data["audience_grouping"] = None
            validated_data["audience_partner_ids"] = None

    def create(self, validated_data):
        attachment_files = validated_data.pop("attachment_files", None)
        attachment_ids = validated_data.pop("attachment_ids", None)
        self._consume_audience_alias(validated_data)
        instance = super().create(validated_data)
        self._apply_attachments(instance, attachment_files, attachment_ids)
        return instance

    def update(self, instance, validated_data):
        attachment_files = validated_data.pop("attachment_files", None)
        attachment_ids = validated_data.pop("attachment_ids", None)
        self._consume_audience_alias(validated_data)
        instance = super().update(instance, validated_data)
        self._apply_attachments(instance, attachment_files, attachment_ids)
        return instance


class PartnerMessageBoardAcknowledgementSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerMessageBoardAcknowledgement
        fields = ("id", "post", "user", "acknowledged_at")
        read_only_fields = ("user", "acknowledged_at")


class PartnerMessageBoardRSVPSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerMessageBoardRSVP
        fields = ("id", "post", "user", "status", "responded_at")
        read_only_fields = ("user", "responded_at")


class PartnerMessageBoardSeenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerMessageBoardSeen
        fields = ("id", "post", "user", "seen_at")
        read_only_fields = ("user", "seen_at")


class SupplierMessageBoardSerializer(serializers.ModelSerializer):
    title = serializers.CharField()
    description = serializers.CharField()
    supplier = serializers.PrimaryKeyRelatedField(queryset=Supplier.objects.all())

    class Meta:
        model = SupplierMessageBoard
        fields = "__all__"


class PersonContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonContact
        fields = ["id", "name", "email", "phone", "description", "created"]


class SupplierSupplyChainSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SupplierSupplyChain
        fields = (
            "supplier",
            "supplier_name",
            "status",
        )

    def get_supplier_name(self, obj: SupplierSupplyChain) -> str:
        return str(obj.supplier.name)


class SupplyChainSerializer(serializers.ModelSerializer):
    strategic_partner_name = serializers.SerializerMethodField(read_only=True)
    suppliers = SupplierSupplyChainSerializer(
        source="suppliersupplychain_set", many=True
    )

    def get_strategic_partner_name(self, obj):
        try:
            return obj.strategic_partner.name if obj.strategic_partner else None
        except Exception:
            return None

    def create(self, validated_data):
        suppliersupplychain_data = validated_data.pop("suppliersupplychain_set")
        supply_chain = SupplyChain.objects.create(**validated_data)
        for scd in suppliersupplychain_data:
            supplier_data = dict(scd)
            SupplierSupplyChain.objects.create(
                supply_chain=supply_chain,
                supplier=supplier_data["supplier"],
                status=supplier_data["status"],
            )
        return supply_chain

    def update(self, instance, validated_data):
        suppliersupplychain_data = validated_data.pop("suppliersupplychain_set", [])
        for item in validated_data:
            if SupplyChain._meta.get_field(item):
                setattr(instance, item, validated_data[item])
        SupplierSupplyChain.objects.filter(supply_chain=instance).delete()
        for scd in suppliersupplychain_data:
            supplier_data = dict(scd)
            SupplierSupplyChain.objects.create(
                supply_chain=instance,
                supplier=supplier_data["supplier"],
                status=supplier_data["status"],
            )
        instance.save()
        return instance

    class Meta:
        model = SupplyChain
        fields = [
            "id",
            "name",
            "strategic_partner",
            "strategic_partner_name",
            "suppliers",
        ]


class SupplyChainMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplyChain
        fields = ["id", "name"]


class MmThaiDemandDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = MmThaiDemandData
        fields = "__all__"


class MmThaiSendingDataSerializer(serializers.ModelSerializer):

    recruiter_name = serializers.CharField(read_only=True)
    supplier_name = serializers.CharField(read_only=True)
    factory_type_name = serializers.CharField(read_only=True)
    industry_name = serializers.CharField(read_only=True)
    subindustry_name = serializers.CharField(read_only=True)
    province_name = serializers.CharField(read_only=True)

    class Meta:
        model = MmThaiSendingData
        fields = "__all__"


class MmThaiSendingDataSerializerOriginal(serializers.ModelSerializer):

    recruiter_name = serializers.CharField(source="recruiter.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    factory_type_name = serializers.CharField(
        source="factory_type.name", read_only=True
    )
    industry_name = serializers.CharField(source="industry.name", read_only=True)
    subindustry_name = serializers.CharField(source="subindustry.name", read_only=True)
    province_name = serializers.CharField(source="province.name", read_only=True)

    class Meta:
        model = MmThaiSendingData
        fields = "__all__"


class FactoryTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FactoryType
        fields = [
            "id",
            "name",
        ]


class GenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gender
        fields = [
            "id",
            "name",
        ]


class ReferralActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferralAction
        fields = [
            "id",
            "name",
        ]


class ReferralActionTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="translated_name", read_only=True)

    class Meta:
        model = ReferralActionTranslation
        fields = ["id", "name"]


class ReferralOrganizationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Organization
        fields = ["id", "name"]


class ChildValueListField(serializers.ListField):
    """A one-row-per-value child table seen as a flat list of strings."""

    def __init__(self, value_field, **kwargs):
        self.value_field = value_field
        super().__init__(**kwargs)

    def to_representation(self, data):
        if hasattr(data, "all"):
            data = [getattr(row, self.value_field) for row in data.all()]
        return super().to_representation(data)


class OrganizationProfileSerializer(serializers.ModelSerializer):
    """Read/write shape of the CSO organization profile.

    The three set-valued fields are stored one row per value in their own
    tables, but are exposed here as flat lists of keys because that is how the
    CSO UI renders them -- a key maps straight onto an i18n label.
    """

    core_focus_areas = ChildValueListField(
        value_field="focus_area",
        child=serializers.ChoiceField(choices=ORGANIZATION_CORE_FOCUS_AREA_CHOICES),
        required=False,
        allow_empty=True,
    )
    stakeholder_groups = ChildValueListField(
        value_field="stakeholder_group",
        child=serializers.ChoiceField(
            choices=ORGANIZATION_STAKEHOLDER_GROUP_CHOICES
        ),
        required=False,
        allow_empty=True,
    )
    nace_codes = ChildValueListField(
        value_field="code",
        child=serializers.CharField(max_length=8, validators=[NACE_CODE_VALIDATOR]),
        required=False,
        allow_empty=True,
    )
    # Languages travel as codes rather than ids; Django owns both the profile
    # catalog and the organization-to-language relationships.
    languages_supported = serializers.SlugRelatedField(
        many=True,
        slug_field="code",
        queryset=Language.objects.filter(is_profile_selectable=True),
        required=False,
    )

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "logo",
            "description",
            "website",
            "organization_type",
            "countries_of_registration",
            "countries_of_operation",
            "languages_supported",
            "core_focus_areas",
            "stakeholder_groups",
            "nace_codes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "logo", "created_at", "updated_at"]

    def validate_nace_codes(self, value):
        return list(dict.fromkeys(value))

    def validate_core_focus_areas(self, value):
        return list(dict.fromkeys(value))

    def validate_stakeholder_groups(self, value):
        return list(dict.fromkeys(value))

    def update(self, instance, validated_data):
        focus_areas = validated_data.pop("core_focus_areas", None)
        stakeholder_groups = validated_data.pop("stakeholder_groups", None)
        nace_codes = validated_data.pop("nace_codes", None)

        instance = super().update(instance, validated_data)

        # Each set is replaced wholesale rather than diffed: the profile form
        # always submits the complete selection for a field it touches.
        if focus_areas is not None:
            instance.core_focus_areas.all().delete()
            OrganizationCoreFocusArea.objects.bulk_create(
                [
                    OrganizationCoreFocusArea(
                        organization=instance, focus_area=focus_area
                    )
                    for focus_area in focus_areas
                ]
            )
        if stakeholder_groups is not None:
            instance.stakeholder_groups.all().delete()
            OrganizationStakeholderGroup.objects.bulk_create(
                [
                    OrganizationStakeholderGroup(
                        organization=instance, stakeholder_group=stakeholder_group
                    )
                    for stakeholder_group in stakeholder_groups
                ]
            )
        if nace_codes is not None:
            instance.nace_codes.all().delete()
            OrganizationNaceCode.objects.bulk_create(
                [
                    OrganizationNaceCode(organization=instance, code=code)
                    for code in nace_codes
                ]
            )

        return instance


class OrganizationImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField()

    class Meta:
        model = OrganizationImage
        fields = ["id", "image", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_image(self, image):
        if getattr(image, "content_type", None) not in {
            "image/jpeg",
            "image/png",
            "image/webp",
        }:
            raise serializers.ValidationError(
                "Upload a JPEG, PNG, or WebP image."
            )
        if image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Images must be 5 MB or smaller.")
        return image


class OrganizationLogoSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=True)

    class Meta:
        model = Organization
        fields = ["logo"]

    def validate_logo(self, image):
        if getattr(image, "content_type", None) not in {
            "image/jpeg",
            "image/png",
            "image/webp",
        }:
            raise serializers.ValidationError(
                "Upload a JPEG, PNG, or WebP image."
            )
        if image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Images must be 5 MB or smaller.")
        return image


class CaseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseCategory
        fields = [
            "id",
            "name",
        ]


class CaseCategoryTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="translated_name", read_only=True)

    class Meta:
        model = CaseCategoryTranslation
        fields = ["id", "name"]


class ClientTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientType
        fields = [
            "id",
            "name",
        ]


class ClientTypeTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="translated_name", read_only=True)

    class Meta:
        model = ClientTypeTranslation
        fields = ["id", "name"]


class ClientStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientStatus
        fields = [
            "id",
            "name",
        ]


class ClientStatusTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="translated_name", read_only=True)

    class Meta:
        model = ClientStatusTranslation
        fields = ["id", "name"]


class CaseStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseStatus
        fields = [
            "id",
            "name",
        ]


class UserTaskSerializer(serializers.ModelSerializer):
    kpi_update_details = serializers.SerializerMethodField(read_only=True)
    assigned_by_name = serializers.CharField(read_only=True)
    assigned_to_name = serializers.SerializerMethodField(read_only=True)
    supplier_name = serializers.CharField(read_only=True)
    sps_name = serializers.CharField(read_only=True)

    class Meta:
        model = UserTask
        fields = "__all__"

    def get_assigned_to_name(self, obj):
        return ", ".join(obj.assigned_users.all().values_list("first_name", flat=True))

    def get_kpi_update_details(self, obj):
        if obj.source_type == "KPI UPDATE":
            try:
                from kpis.models import (
                    SupplierKpi as SupplierKpiModel,
                    SupplierKpiUpdate,
                )

                # source_id refers to SupplierKpi.id, get the latest update for it
                supplier_kpi = (
                    SupplierKpiModel.objects.select_related(
                        "supplier", "kpi__kpi_category", "status"
                    )
                    .filter(id=obj.source_id)
                    .first()
                )
                if not supplier_kpi:
                    import logging

                    logging.warning(
                        f"No SupplierKpi found for UserTask source_id={obj.source_id}"
                    )
                    return None

                kpi_update = (
                    SupplierKpiUpdate.objects.filter(supplier_kpi_id=obj.source_id)
                    .order_by("-id")
                    .first()
                )

                return {
                    "id": supplier_kpi.id,
                    "supplier": getattr(supplier_kpi.supplier, "name", None),
                    "category": getattr(
                        getattr(supplier_kpi.kpi, "kpi_category", None), "name", None
                    ),
                    "description": getattr(supplier_kpi.kpi, "description", None),
                    "level": getattr(supplier_kpi.kpi, "level", None),
                    "status": getattr(supplier_kpi.status, "name", None),
                    "opened_at": (
                        kpi_update.opened_at if kpi_update else supplier_kpi.opened_at
                    ),
                    "deadline": (
                        kpi_update.deadline if kpi_update else supplier_kpi.deadline
                    ),
                    "remediation_progress": (
                        kpi_update.remediation_progress if kpi_update else None
                    ),
                    "remediation_aligned": (
                        kpi_update.remediation_aligned if kpi_update else None
                    ),
                    "remediation_business_steps_taken": (
                        kpi_update.remediation_business_steps_taken
                        if kpi_update
                        else None
                    ),
                    "remediation_business_steps_remaining": (
                        kpi_update.remediation_business_steps_remaining
                        if kpi_update
                        else None
                    ),
                    "notes": kpi_update.remediation_notes if kpi_update else None,
                    "action": kpi_update.remediation_action if kpi_update else None,
                    "validation": (
                        kpi_update.remediation_validation if kpi_update else None
                    ),
                    "results": kpi_update.remediation_results if kpi_update else None,
                    "sp_recommendation": (
                        kpi_update.remediation_sp_recommendation if kpi_update else None
                    ),
                }
            except Exception as e:
                import logging

                logging.error(
                    f"Error in get_kpi_update_details for UserTask {obj.id}: {e}"
                )
                return None
        return None


class HowHearIssaraSerializer(serializers.ModelSerializer):
    class Meta:
        model = HowHearIssara
        fields = ["id", "name"]


class HowHearIssaraTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="translated_name", read_only=True)

    class Meta:
        model = HowHearIssaraTranslation
        fields = ["id", "name"]


class WorkPlaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkPlace
        fields = ["id", "name"]


class IssueCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueCategory
        fields = ["id", "name"]


class IssueCategoryTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="translated_name", read_only=True)

    class Meta:
        model = IssueCategoryTranslation
        fields = ["id", "name"]


class NationalitySerializer(serializers.ModelSerializer):
    imagefile = SharedFileSerializer(source="imageicon")

    class Meta:
        model = Nationality
        fields = ["id", "name", "imageicon", "imagefile"]


class InteractionChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = InteractionChannel
        fields = ["id", "name"]


class InteractionChannelTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="translated_name", read_only=True)

    class Meta:
        model = InteractionChannelTranslation
        fields = ["id", "name"]


class InteractionReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = InteractionReason
        fields = ["id", "name"]


class InteractionReasonTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="translated_name", read_only=True)

    class Meta:
        model = InteractionReasonTranslation
        fields = ["id", "name"]


class EthnicitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Ethnicity
        fields = ["id", "name", "nationality"]


class ContractTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractType
        fields = ["id", "name"]


class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = ["id", "name"]


class VesselTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VesselType
        fields = ["id", "name"]


class IndustrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Industry
        fields = ["id", "name"]


class SubIndustrySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubIndustry
        fields = ["id", "name", "industry"]


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = "__all__"


class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Province
        fields = "__all__"


class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = "__all__"


class RecruiterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recruiter
        fields = [
            "id",
            "name",
            "created",
            "tier_id",
            "address",
            "zipcode",
            "gps",
            "facebook_website",
            "contact_name",
            "contact_phone",
            "contact_email",
            "num_of_staff",
            "num_lisc_agents",
            "worker_placement_industries",
            "other",
            "industry",
            "country",
            "province",
            "district",
            "golden_dreams_recruiter_id",
            "description",
            "website",
            "lng",
            "lat",
            "image",
        ]


class SupplierRecruiterSerializer(serializers.ModelSerializer):

    class Meta:
        model = SupplierRecruiters
        fields = ("recruiter", "status")


def _normalize_supplier_recruiter_status(raw_status):
    normalized = str(raw_status or "").strip().lower()
    if normalized == SupplierRecruiters.STATUS_INACTIVE or normalized.startswith(
        "inactiv"
    ):
        return SupplierRecruiters.STATUS_INACTIVE
    return SupplierRecruiters.STATUS_ACTIVE


class SupplierSerializer(serializers.ModelSerializer):

    tier_id = serializers.PrimaryKeyRelatedField(
        source="tier",
        queryset=SupplierTier.objects.all(),
        allow_null=True,
        required=False,
    )
    recruiter = SupplierRecruiterSerializer(
        source="supplierrecruiters_set", many=True, required=False
    )
    reports = SharedFileSerializer(read_only=True, many=True)
    supply_chains = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()

    def get_logo(self, obj):
        imageicon = getattr(obj, "imageicon", None)
        if imageicon:
            file_path = getattr(imageicon, "file_path", None)
            if file_path and getattr(file_path, "url", None):
                return file_path.url
        return None

    files = serializers.ListField(
        write_only=True,
        required=False,
        child=serializers.FileField(
            max_length=100000,
            allow_empty_file=False,
            use_url=False,
            write_only=True,
            required=False,
        ),
    )
    file_names = serializers.ListField(
        write_only=True, required=False, child=serializers.CharField()
    )

    date_of_most_recent_recruitment_survey = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True, required=False
    )

    date_of_most_recent_worker_satisfaction_survey = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True, required=False
    )
    industries = serializers.PrimaryKeyRelatedField(
        queryset=Industry.objects.all(), many=True, required=False
    )
    subindustries = serializers.PrimaryKeyRelatedField(
        queryset=SubIndustry.objects.all(), many=True, required=False
    )

    # Timestamps from TotalNumberOfWorkers table
    worker_counts_updated_at = serializers.ReadOnlyField()
    worker_counts_created_at = serializers.ReadOnlyField()

    class Meta:
        model = Supplier
        fields = [
            "id",
            "reports",
            "name",
            "created",
            "anonymous",
            "is_worker_voice_rolled_out",
            "tier_id",
            "address",
            "zipcode",
            "gps",
            "vessel_number",
            "fishing_gear_liscense_number",
            "contact_name",
            "contact_phone",
            "contact_email",
            "name_harvesting_business",
            "num_vessels_sourced_from",
            "total_num_workers",
            "total_num_men_workers",
            "total_num_women_workers",
            "total_num_thai_workers",
            "total_num_cambodian_workers",
            "total_num_myanmar_workers",
            "total_num_lao_workers",
            "total_num_vietnamese_workers",
            "total_num_nepalese_workers",
            "total_num_bangladeshi_workers",
            "total_num_indonesian_workers",
            "total_num_malaysian_workers",
            "total_num_indian_workers",
            "total_num_pakistani_workers",
            "total_num_sri_lankan_workers",
            "num_of_workers_access_to_issara_wv_channels",
            "date_of_most_recent_recruitment_survey",
            "date_of_most_recent_worker_satisfaction_survey",
            "num_workers_reimbursed_recruitment_fees",
            "remain_num_workers_owed_recruitment_fee_reimbursement",
            "total_amt_recruitment_fee_reimbursed_to_workers",
            "remain_amt_owed_recruitment_fee_reimbursement_to_workers",
            "hiring_practice",
            "other",
            "vessel_type",
            "industries",
            "subindustries",
            "country",
            "province",
            "district",
            "golden_dreams_employer_id",
            "website",
            "description",
            "lng",
            "lat",
            "additional_contacts",
            "files",
            "file_names",
            "worker_voice",
            "worker_voice_status",
            "recruiter",
            "supply_chains",
            "imageicon",
            "logo",
            # Timestamps from TotalNumberOfWorkers table
            "worker_counts_updated_at",
            "worker_counts_created_at",
        ]

    def create(self, validated_data):
        industries_data = validated_data.pop("industries", [])
        subindustries_data = validated_data.pop("subindustries", [])
        supplierrecruiter_data = validated_data.pop("supplierrecruiters_set", [])
        supplier_data = Supplier.objects.create(**validated_data)
        supplier_data.industries.set(industries_data)
        supplier_data.subindustries.set(subindustries_data)
        for scd in supplierrecruiter_data:
            recruiter_data = dict(scd)
            SupplierRecruiters.objects.create(
                supplier=supplier_data,
                recruiter=recruiter_data["recruiter"],
                status=_normalize_supplier_recruiter_status(
                    recruiter_data.get("status")
                ),
            )
        return supplier_data

    def update(self, instance, validated_data):
        industries_data = validated_data.pop("industries", [])
        subindustries_data = validated_data.pop("subindustries", [])
        supplierrecruiter_data = validated_data.pop("supplierrecruiters_set", [])
        for item in validated_data:
            if Supplier._meta.get_field(item):
                setattr(instance, item, validated_data[item])
        SupplierRecruiters.objects.filter(supplier=instance).delete()
        for scd in supplierrecruiter_data:
            recruiter_data = dict(scd)
            SupplierRecruiters.objects.create(
                supplier=instance,
                recruiter=recruiter_data["recruiter"],
                status=_normalize_supplier_recruiter_status(
                    recruiter_data.get("status")
                ),
            )
        instance.save()
        if industries_data:
            instance.industries.set(industries_data)
        if subindustries_data:
            instance.subindustries.set(subindustries_data)
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if instance.supplierrecruiters_set.all() is not None:
            recruiters = []
            for item in instance.supplierrecruiters_set.all():
                _data = {
                    "recruiter": item.recruiter.id,
                    "recruiter_name": item.recruiter.name,
                    "status": _normalize_supplier_recruiter_status(item.status),
                }
                recruiters.append(_data)
            data["recruiter"] = recruiters
            return data
        return data

    def get_supply_chains(self, obj: Supplier) -> List[Dict[str, str]]:
        """
        Return all linked supply chains with their status.
        Mirrors the flat list serializer shape so FE can reuse it.
        """
        prefetched = getattr(obj, "_prefetched_objects_cache", {}).get(
            "suppliersupplychain_set"
        )
        links = (
            prefetched
            if prefetched is not None
            else obj.suppliersupplychain_set.select_related("supply_chain").all()
        )

        supply_chains: List[Dict[str, str]] = []
        for link in links:
            if link.supply_chain:
                supply_chains.append(
                    {
                        "id": link.supply_chain.id,
                        "supply_chain_name": link.supply_chain.name,
                        "status": link.status,
                    }
                )
        return supply_chains


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]


class UserSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()
    partner = serializers.IntegerField(
        source="strategic_partner_user.strategic_partner.id"
    )
    supplier = serializers.IntegerField(source="supplier_user.supplier.id")
    organization = serializers.IntegerField(source="organization_user.organization.id")

    def get_groups(self, obj):
        if self.context.get("supplier"):
            return obj._groups.split(",") if obj._groups else []
        return [group.name for group in obj.groups.all()]

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "groups",
            "partner",
            "supplier",
            "organization",
            "is_active",
        ]


class SPUserSerializer(serializers.ModelSerializer):

    partner = serializers.IntegerField(
        source="strategic_partner_user.strategic_partner.id"
    )

    organization = serializers.IntegerField(source="organization_user.organization.id")

    class Meta:

        model = User

        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "partner",
            "organization",
            "is_active",
        ]


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class ChangePasswordSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)
    old_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ("old_password", "password", "password2")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )

        return attrs

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError(
                {"old_password": "Old password is not correct"}
            )
        return value

    def update(self, instance, validated_data):

        instance.set_password(validated_data["password"])
        instance.save()

        return instance


class StrategicPartnerSerializer(serializers.ModelSerializer):
    POLICY_WORKPLAN_DOCUMENT_TYPES = {
        "human_rights",
        "migrant_worker_policy",
        "ethical_recruitment",
    }
    COMPLIANCE_WORKPLAN_DOCUMENT_TYPES = {
        "supply_chain",
        "worker_voice",
        "audit_reports",
        "others",
    }

    user_email_notification = serializers.SerializerMethodField()

    latest_workplan_update = serializers.SerializerMethodField()
    country_name = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()
    policy_compliances = serializers.SerializerMethodField()
    workplan_files = serializers.SerializerMethodField()
    policy_files = serializers.SerializerMethodField()
    compliance_files = serializers.SerializerMethodField()

    def get_user_email_notification(self, obj):
        """

        Returns the user-specific email notification state for this StrategicPartner.

        The _user_email_notification attribute should be set in the queryset by the ViewSet.

        If not present, fallback to DB lookup for robustness (e.g., if queryset annotation was skipped).

        """

        val = getattr(obj, "_user_email_notification", None)

        if val is not None:

            return val

        from workplan.models import WorkplanEmailNotificationSetting

        request = self.context.get("request", None)

        user = getattr(request, "user", None) if request else None

        if not user or not user.is_authenticated:

            return False

        try:

            qs = WorkplanEmailNotificationSetting.objects.filter(
                issara_user=user, strategic_partner=obj
            )

            if qs.exists():

                setting = qs.first()

                if hasattr(setting, "notify_on_workplan_change"):

                    return getattr(setting, "notify_on_workplan_change", False)

                elif hasattr(setting, "notify_on_document_upload"):

                    return getattr(setting, "notify_on_document_upload", False)

        except Exception:

            pass

        return False

    def get_latest_workplan_update(self, obj):
        """

        Returns the latest update timestamp for the workplan of this StrategicPartner.

        Uses the annotated field from the queryset if available, otherwise fallback to DB lookup.

        """

        if hasattr(obj, "latest_workplan_update"):

            return obj.latest_workplan_update

        try:

            from .models import SPWorkplan, WorkPlanAuditTrail

            workplan = SPWorkplan.objects.filter(strategic_partner=obj).first()

            if workplan:

                latest_audit = (
                    WorkPlanAuditTrail.objects.filter(workplan=workplan)
                    .order_by("-created_at")
                    .first()
                )

                if latest_audit:

                    return latest_audit.created_at

        except Exception:

            pass

        return None

    def get_country_name(self, obj):
        return getattr(getattr(obj, "country", None), "name", None)

    def get_logo(self, obj):
        imageicon = getattr(obj, "imageicon", None)
        if imageicon:
            file_path = getattr(imageicon, "file_path", None)
            if file_path and getattr(file_path, "url", None):
                return file_path.url
            if getattr(imageicon, "url", None):
                return imageicon.url
        return obj.image

    def _get_workplan_docs(self, obj):
        try:
            workplan = obj.spworkplan
        except ObjectDoesNotExist:
            return []

        prefetched_docs = getattr(workplan, "prefetched_docs", None)
        if prefetched_docs is not None:
            return prefetched_docs

        return list(workplan.workplandocs_set.select_related("document").all())

    def _get_policy_source_shared_file_ids(self, obj):
        source_ids = getattr(obj, "_policy_source_shared_file_ids", None)
        if source_ids is not None:
            return source_ids

        source_ids = set(
            Policy.objects.filter(
                strategic_partner=obj,
                type=Policy.POLICY_TYPE_FILE,
                source_shared_file_id__isnull=False,
            ).values_list("source_shared_file_id", flat=True)
        )
        obj._policy_source_shared_file_ids = source_ids
        return source_ids

    def _serialize_workplan_doc(self, workplan_doc):
        shared_file = getattr(workplan_doc, "document", None)
        file_path = None
        if shared_file and getattr(shared_file, "file_path", None):
            try:
                file_path = shared_file.file_path.url
            except Exception:
                file_path = str(shared_file.file_path)

        return {
            "id": getattr(shared_file, "id", None),
            "name": getattr(shared_file, "name", None),
            "description": getattr(shared_file, "description", None),
            "type": getattr(shared_file, "type", None),
            "file_path": file_path,
            "document_type": getattr(workplan_doc, "document_type", None),
            "document_type_display": (
                workplan_doc.get_document_type_display()
                if hasattr(workplan_doc, "get_document_type_display")
                else getattr(workplan_doc, "document_type", None)
            ),
            "document_name": getattr(workplan_doc, "document_name", None),
            "audience": getattr(workplan_doc, "audience", None),
        }

    def _viewer_owns_partner(self, obj):
        """Whether the requester may see this partner's `private` documents."""
        cached = getattr(obj, "_viewer_owns_partner", None)
        if cached is not None:
            return cached

        from .audience import user_owns_strategic_partner

        request = self.context.get("request")
        user = getattr(request, "user", None)
        owns = bool(
            user
            and getattr(user, "is_authenticated", False)
            and user_owns_strategic_partner(user, obj.id)
        )
        obj._viewer_owns_partner = owns
        return owns

    def _get_serialized_workplan_docs(self, obj, allowed_types=None):
        from .audience import is_private

        serialized_docs = []
        policy_source_file_ids = self._get_policy_source_shared_file_ids(obj)
        viewer_owns_partner = self._viewer_owns_partner(obj)
        for workplan_doc in self._get_workplan_docs(obj):
            # Private documents are only visible to the owning company.
            if is_private(workplan_doc) and not viewer_owns_partner:
                continue
            if (
                allowed_types is not None
                and workplan_doc.document_type not in allowed_types
            ):
                continue
            if workplan_doc.document_id in policy_source_file_ids:
                continue
            serialized_docs.append(self._serialize_workplan_doc(workplan_doc))
        return serialized_docs

    def get_workplan_files(self, obj):
        return self._get_serialized_workplan_docs(obj)

    def get_policy_files(self, obj):
        return self._get_serialized_workplan_docs(
            obj, self.POLICY_WORKPLAN_DOCUMENT_TYPES
        )

    def get_compliance_files(self, obj):
        return self._get_serialized_workplan_docs(
            obj, self.COMPLIANCE_WORKPLAN_DOCUMENT_TYPES
        )

    def get_policy_compliances(self, obj):
        items = getattr(obj, "policy_compliance_items", None)
        if items is None:
            return []

        return [
            {
                "id": item.id,
                "policy_compliance_id": item.policy_compliance_id,
                "policy_compliance": {
                    "id": item.policy_compliance_id,
                    "name": getattr(item.policy_compliance, "name", None),
                },
                "text_value": item.text_value,
                "link_url": item.link_url,
                "file": (
                    {
                        "id": item.file_id,
                        "name": getattr(item.file, "name", None),
                        "url": getattr(item.file, "url", None),
                    }
                    if item.file_id
                    else None
                ),
            }
            for item in items.all()
        ]

    contract_start_date = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    contract_end_date = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    payment_receipt_date = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    date_last_annual_risk_report = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    date_last_call_meeting_visit = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )

    has_workplan = serializers.SerializerMethodField()

    def get_has_workplan(self, obj):
        annotated_val = getattr(obj, "has_workplan", None)
        if annotated_val is not None:
            return bool(annotated_val)
        # Fallback: minimal DB hit if annotation missing
        try:
            return getattr(obj, "spworkplan", None) is not None
        except Exception:
            return False

    class Meta:
        model = StrategicPartner
        fields = "__all__"


class StrategicPartnerDropDownSerializer(serializers.ModelSerializer):
    class Meta:
        model = StrategicPartner
        fields = ("id", "name")


class StrategicPartnerResponseSerializer(serializers.ModelSerializer):
    interaction_date = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )

    class Meta:
        model = StrategicPartnerResponse
        fields = [
            "id",
            "interaction_date",
            "interaction_event_location",
            "response_focal_point",
            "general_notes",
            "next_steps",
            "response_interaction_type",
            "issara_user_focal_point",
            "strategic_partner",
            "created",
            "last_modified",
        ]


class CaseInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseInteraction
        fields = [
            "id",
            "type",
            "summary",
            "interacted",
            "created",
            "last_modified",
            "issara_staff",
            "interaction_reason",
            "interaction_channel",
        ]


class CaseInteractionDeepSerializer(serializers.ModelSerializer):
    issara_staff = UserSerializer(read_only=True)
    interaction_reason = InteractionReasonSerializer(read_only=True)
    interaction_channel = InteractionChannelSerializer(read_only=True)

    class Meta:
        model = CaseInteraction
        fields = [
            "id",
            "type",
            "summary",
            "interacted",
            "created",
            "last_modified",
            "issara_staff",
            "interaction_reason",
            "interaction_channel",
        ]


class CaseSerializer(serializers.ModelSerializer):

    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        return data

    def update(self, instance, validated_data):
        updated_instance = super().update(instance, validated_data)
        deadline = validated_data.get("dead_line_date", None)

        # Collect assigned users (primary and next-steps)
        assigned_users = []
        issara_staff = validated_data.get("issara_staff", None)
        if issara_staff:
            assigned_users.append(issara_staff)
        next_steps_issara_staff = validated_data.get("next_steps_issara_staff", None)
        if next_steps_issara_staff:
            assigned_users.append(next_steps_issara_staff)

        for user in assigned_users:
            if hasattr(user, "email") and user.email:
                case_number = getattr(instance, "id", "") or ""

                case_name = getattr(instance, "name", "") or ""
                case_description = getattr(instance, "description", "") or ""
                supplier_id = (
                    instance.supplier.id
                    if hasattr(instance, "supplier") and instance.supplier
                    else ""
                )

                frontend_url = (
                    getattr(settings, "FRONTEND_URL", None) or "http://localhost:3000"
                )
                if not frontend_url.startswith(
                    "http://"
                ) and not frontend_url.startswith("https://"):
                    frontend_url = "http://" + frontend_url

                case_link = (
                    f"{frontend_url.rstrip('/')}/admin/issara/case/{case_number}/change"
                    if case_number
                    else ""
                )

                case_category = (
                    instance.case_category.name
                    if hasattr(instance, "case_category")
                    and instance.case_category
                    and hasattr(instance.case_category, "name")
                    else ""
                )

                # Determine environment label (prefer settings.LEVEL, then env var)
                env_label = getattr(settings, "LEVEL", None) or os.environ.get(
                    "LEVEL", None
                )

                message = (
                    f"You have been assigned to a case.\n\n"
                    f"Case number: {case_number}\n"
                    f"Supplier ID: {supplier_id}\n"
                    f"Case name: {case_name}\n"
                    f"Case Category: {case_category}\n"
                    f"Deadline: {deadline if deadline else 'N/A'}\n"
                    f"Case link: {case_link}\n\n"
                    f"Please check the system for more details."
                )
                # Only annotate subject/from when explicitly running in staging
                if env_label and str(env_label).lower() == "staging":
                    subject = f"[STAGING] Case Assignment: Case #{case_number} (Due: {deadline if deadline else 'N/A'})"
                    from_email = (
                        f"Issara Institute ILM (Staging) <ilm@issarainstitute.org>"
                    )
                else:
                    subject = f"Case Assignment: Case #{case_number} (Due: {deadline if deadline else 'N/A'})"
                    from_email = getattr(
                        settings,
                        "DEFAULT_FROM_EMAIL",
                        "Issara Institute ILM <ilm@issarainstitute.org>",
                    )
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=from_email,
                    recipient_list=[user.email],
                    fail_silently=True,
                )

        return updated_instance

    class Meta:
        model = Case
        fields = [
            "id",
            "name",
            "case_status",
            "created",
            "last_modified",
            "client_nickname",
            "client_phonenumber",
            "client_line_account",
            "client_facebook_account",
            "client_whatsapp_account",
            "client_viber_account",
            "client_share_info_consent",
            "consent_to_discuss_with_employer_anonymously",
            "worker_identification_risk_level",
            "client_time_at_job",
            "client_origin_country",
            "client_origin_province",
            "client_origin_district",
            "client_crossing_country",
            "client_crossing_province",
            "client_crossing_district",
            "issara_supply_chain",
            "non_supply_chain",
            "description",
            "debt_bondage",
            "debt_bondage_detail",
            "debt_bondage_broker",
            "debt_bondage_detail_broker",
            "vot_needs",
            "referral_notes",
            "next_steps",
            "work_place_details",
            "supplier",
            "work_place",
            "dead_line_date",
            "final_remarks",
            "issara_staff",
            "next_steps_issara_staff",
            "risk_assessment",
            "source_recruiter",
            "destination_recruiter",
            "source_upstream_broker",
            "rating_source_broker",
            "rating_source_recruiter",
            "rating_dest_recruiter",
            "rating_dest_employer",
            "client_contract_type",
            "client_document_type",
            "client_gender",
            "client_ethnicity",
            "client_nationality",
            "client_type",
            "client_status",
            "case_category",
            "referral_action",
            "first_time_contacting_issara",
            "case_how_hear_issara",
            "country",
            "province",
            "district",
            "case_interactions",
            "issue_category",
            "links",
            "kpis",
            "issue_description",
            "issue_offender_description",
            "issue_workers_affected",
            "issue_workers_affected_description",
            "issue_getting_better",
            "issue_getting_better_description",
            "interactiontype",
            "interacted",
            "interaction_summary",
            "interaction_reason",
            "interaction_channel",
            "interaction_issara_staff",
            "case_created_by",
            "client_telegram_account",
            "refer_to_org",
        ]


class CaseDeepSerializer(serializers.ModelSerializer):
    from kpis.serializers import KpiSerializer

    issara_staff = UserSerializer(read_only=True)
    next_steps_issara_staff = UserSerializer(read_only=True)
    source_recruiter = RecruiterSerializer(read_only=True)
    destination_recruiter = RecruiterSerializer(read_only=True)
    supplier = SupplierSerializer(read_only=True)
    issue_category = IssueCategorySerializer(read_only=True)
    kpis = serializers.SerializerMethodField()

    interaction_issara_staff = UserSerializer(read_only=True)

    country = CountrySerializer(read_only=True)
    province = ProvinceSerializer(read_only=True)
    district = DistrictSerializer(read_only=True)

    client_gender = GenderSerializer(read_only=True)
    client_type = ClientTypeSerializer(read_only=True)
    client_status = ClientStatusSerializer(read_only=True)
    referral_action = ReferralActionSerializer(read_only=True)
    client_document_type = DocumentTypeSerializer(read_only=True)
    case_category = CaseCategorySerializer(read_only=True)
    client_nationality = NationalitySerializer(read_only=True)
    client_ethnicity = EthnicitySerializer(read_only=True)

    client_origin_country = CountrySerializer(read_only=True)
    client_origin_province = ProvinceSerializer(read_only=True)
    client_origin_district = DistrictSerializer(read_only=True)
    client_contract_type = ContractTypeSerializer(read_only=True)

    client_crossing_country = CountrySerializer(read_only=True)
    client_crossing_province = ProvinceSerializer(read_only=True)
    client_crossing_district = DistrictSerializer(read_only=True)
    case_interactions = CaseInteractionDeepSerializer(many=True, read_only=True)

    def get_kpis(self, obj):
        from kpis.serializers import KpiSerializer

        return KpiSerializer(obj.kpis.all(), many=True).data

    class Meta:
        model = Case
        fields = [
            "id",
            "name",
            "case_status",
            "created",
            "last_modified",
            "client_nickname",
            "client_phonenumber",
            "client_line_account",
            "client_facebook_account",
            "client_whatsapp_account",
            "client_viber_account",
            "client_share_info_consent",
            "consent_to_discuss_with_employer_anonymously",
            "worker_identification_risk_level",
            "client_time_at_job",
            "client_origin_country",
            "client_origin_province",
            "client_origin_district",
            "client_crossing_country",
            "client_crossing_province",
            "client_crossing_district",
            "issara_supply_chain",
            "non_supply_chain",
            "description",
            "debt_bondage",
            "debt_bondage_detail",
            "debt_bondage_broker",
            "debt_bondage_detail_broker",
            "vot_needs",
            "referral_notes",
            "risk_assessment",
            "next_steps",
            "work_place_details",
            "supplier",
            "work_place",
            "dead_line_date",
            "final_remarks",
            "issara_staff",
            "next_steps_issara_staff",
            "source_recruiter",
            "destination_recruiter",
            "source_upstream_broker",
            "rating_source_broker",
            "rating_source_recruiter",
            "rating_dest_recruiter",
            "rating_dest_employer",
            "client_contract_type",
            "client_document_type",
            "client_gender",
            "client_ethnicity",
            "client_nationality",
            "case_category",
            "client_type",
            "client_status",
            "referral_action",
            "first_time_contacting_issara",
            "case_how_hear_issara",
            "country",
            "province",
            "district",
            "case_interactions",
            "issue_category",
            "kpis",
            "links",
            "issue_description",
            "issue_offender_description",
            "issue_legacy_level",
            "issue_workers_affected",
            "issue_workers_affected_description",
            "issue_getting_better",
            "issue_getting_better_description",
            "interactiontype",
            "interacted",
            "interaction_summary",
            "interaction_reason",
            "interaction_channel",
            "interaction_issara_staff",
            "case_created_by",
            "client_telegram_account",
            "refer_to_org",
        ]


class CaseLeanSerializer(serializers.Serializer):
    country_name = serializers.SerializerMethodField()
    district_name = serializers.SerializerMethodField()
    province_name = serializers.SerializerMethodField()

    # Keep the more readable *_name fields for crossing/origin
    # client_crossing_country_name = serializers.SerializerMethodField()
    # client_crossing_province_name = serializers.SerializerMethodField()
    # client_crossing_district_name = serializers.SerializerMethodField()
    # client_origin_country_name = serializers.SerializerMethodField()
    # client_origin_province_name = serializers.SerializerMethodField()
    # client_origin_district_name = serializers.SerializerMethodField()

    def get_country_name(self, obj):
        return obj.country.name if obj.country else None

    def get_district_name(self, obj):
        return obj.district.name if obj.district else None

    def get_province_name(self, obj):
        return obj.province.name if obj.province else None

    def get_client_crossing_country_name(self, obj):
        return obj.client_crossing_country.name if obj.client_crossing_country else None

    def get_client_crossing_province_name(self, obj):
        return (
            obj.client_crossing_province.name if obj.client_crossing_province else None
        )

    def get_client_crossing_district_name(self, obj):
        return (
            obj.client_crossing_district.name if obj.client_crossing_district else None
        )

    # def get_client_origin_country_name(self, obj):
    #     return obj.client_origin_country.name if obj.client_origin_country else None

    # def get_client_origin_province_name(self, obj):
    #     return obj.client_origin_province.name if obj.client_origin_province else None

    # def get_client_origin_district_name(self, obj):
    #     return obj.client_origin_district.name if obj.client_origin_district else None

    id = serializers.IntegerField()
    created = serializers.DateField()
    last_modified = serializers.DateField()
    supplier_name = serializers.SerializerMethodField()
    source_recruiter_name = serializers.SerializerMethodField()
    kpi_description = serializers.SerializerMethodField()
    issara_user = serializers.SerializerMethodField()
    issue_category_name = serializers.SerializerMethodField()
    kpi_level = serializers.SerializerMethodField()
    client_gender_name = serializers.SerializerMethodField()
    client_nationality_name = serializers.SerializerMethodField()
    client_nickname = serializers.CharField()
    client_phonenumber = serializers.CharField()
    first_time_contacting_issara = serializers.CharField(
        allow_null=True, required=False
    )
    interaction_date = serializers.SerializerMethodField()
    interaction_type = serializers.SerializerMethodField()
    kpi_ids = serializers.SerializerMethodField()
    country = serializers.SerializerMethodField()
    translated_kpis = serializers.SerializerMethodField()
    # Removed *_id fields for client_crossing_* and client_origin_*

    def get_translated_kpis(self, obj):
        lang_code = self.context.get("lang", "en")
        kpis = obj.kpis.prefetch_related("kpitranslation_set__language")
        translated_kpis = []

        for kpi in kpis:
            translation = kpi.kpitranslation_set.filter(
                language__code=lang_code
            ).first()
            translated_kpis.append(
                {
                    "id": kpi.id,
                    "description": (
                        translation.description if translation else kpi.description
                    ),
                }
            )
        return translated_kpis

    def get_supplier_name(self, obj):
        return obj.supplier.name if obj.supplier else None

    def get_source_recruiter_name(self, obj):
        return obj.source_recruiter.name if obj.source_recruiter else None

    def get_kpi_description(self, obj):
        lang_code = self.context.get("lang", "en")
        kpi = obj.kpis.order_by("-level").first()

        if not kpi:
            return None

        translation = kpi.kpitranslation_set.filter(language__code=lang_code).first()
        return translation.description if translation else kpi.description

    def get_issara_user(self, obj):
        return (
            obj.interaction_issara_staff.email if obj.interaction_issara_staff else None
        )

    def get_issue_category_name(self, obj):
        lang_code = self.context.get("lang", "en")
        issue_category = obj.issue_category
        if not issue_category:
            return None
        translation = issue_category.issuecategorytranslation_set.filter(
            language__code=lang_code
        ).first()
        return translation.name if translation else issue_category.name

    def get_kpi_level(self, obj):
        return obj.kpis.order_by("-level").first().level if obj.kpis.all() else None

    def get_client_gender_name(self, obj):
        return obj.client_gender.name if obj.client_gender else None

    def get_client_nationality_name(self, obj):
        return obj.client_nationality.name if obj.client_nationality else None

    def get_interaction_date(self, obj):
        return obj.interacted if obj.interacted else None

    def get_interaction_type(self, obj):
        return obj.interactiontype if obj.interactiontype else None

    def get_kpi_ids(self, obj):
        return [kpi.id for kpi in obj.kpis.all()] if obj.kpis.all() else None

    def get_country(self, obj):
        return obj.country.name if obj.country else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["interaction_date"] = str(
            instance.interacted.date() if instance.interacted else ""
        )
        data["closed_at"] = str(
            instance.closed_at.date()
            if hasattr(instance, "closed_at") and instance.closed_at
            else ""
        )
        data["case_created_by"] = (
            instance.case_created_by.username
            if instance.case_created_by is not None
            else ""
        )
        return data

    class Meta:
        fields = "__all__"
        read_only_fields = fields


class CallsByCount(models.Model):
    call_count = models.AutoField(primary_key=True)
    month_year = models.TextField(blank=True, null=True)

    class Meta:
        managed = False


class CallsByCountSerializer(serializers.ModelSerializer):
    call_count = serializers.IntegerField()
    month_year = serializers.CharField()

    class Meta:
        model = CallsByCount
        fields = "__all__"


class SupplierKpiSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(read_only=True)
    category = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    level = serializers.IntegerField(read_only=True)
    status_name = serializers.CharField(read_only=True)
    days_open = serializers.SerializerMethodField()
    remediation = serializers.CharField(default=None, read_only=True)
    systems_change = serializers.CharField(default=None, read_only=True)
    law = serializers.CharField(default=None, read_only=True)

    overview_date = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    remediation_payment_deadline = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    remediation_documents_deadline = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    systems_change_deadline = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    closed_at = serializers.DateTimeField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    closed_quality = serializers.CharField(allow_null=True)

    calls = serializers.SerializerMethodField()
    source_recruiters = serializers.SerializerMethodField()
    destination_recruiters = serializers.SerializerMethodField()

    updates = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    country = serializers.CharField(
        required=False,
    )
    call_details = serializers.SerializerMethodField()
    bhr_focal = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True, required=False
    )

    def get_calls(self, obj):
        if hasattr(obj, "calls") and obj.calls:
            return [int(call_id) for call_id in obj.calls.split(",")]
        return []

    def get_call_details(self, obj):
        call_ids = self.get_calls(obj)

        kpi_level_subquery = (
            Case.objects.filter(id=OuterRef("pk"))
            .values("kpis__level")
            .order_by("-kpis__level")[:1]
        )

        case_details = (
            Case.objects.filter(id__in=call_ids)
            .select_related(
                "interaction_issara_staff",
                "next_steps_issara_staff",
                "source_recruiter",
                "destination_recruiter",
            )
            .annotate(
                issara_user=F("interaction_issara_staff__email"),
                next_steps_issara_user=F("next_steps_issara_staff__email"),
                kpi_level=Subquery(kpi_level_subquery),
                source_recruiter_name=F("source_recruiter__name"),
                destination_recruiter_name=F("destination_recruiter__name"),
            )
            .values(
                "id",
                "created",
                "interacted",
                "last_modified",
                "client_nickname",
                "client_phonenumber",
                "issara_user",
                "next_steps_issara_user",
                "kpi_level",
                "source_recruiter_name",
                "destination_recruiter_name",
                "description",
                "referral_notes",
                "next_steps",
            )
            .distinct()
        )

        return case_details

    def get_source_recruiters(self, obj):
        recruiters_list = []
        if hasattr(obj, "source_recruiters") and obj.source_recruiters:
            recruiters_list = [
                int(recruiter_id) for recruiter_id in obj.source_recruiters.split(",")
            ]
        return recruiters_list

    def get_destination_recruiters(self, obj):
        recruiters_list = []
        if hasattr(obj, "destination_recruiters") and obj.destination_recruiters:
            recruiters_list = [
                int(recruiter_id)
                for recruiter_id in obj.destination_recruiters.split(",")
            ]
        return recruiters_list

    def get_days_open(self, obj):
        if obj.closed_at:
            days_active = obj.closed_at.date() - obj.opened_at
            if days_active.days < 0:
                return "-"
            return days_active.days
        days_active = datetime.today().date() - obj.opened_at
        if days_active.days < 0:
            return "-"
        else:
            return days_active.days

    def to_representation(self, instance):
        _data = super().to_representation(instance)
        _data["closed_at"] = str(
            instance.closed_at.date()
            if hasattr(instance, "closed_at") and instance.closed_at
            else ""
        )

        return _data

    def update(self, instance, validated_data):
        bhr_focal_data = validated_data.pop("bhr_focal", None)

        instance = super().update(instance, validated_data)

        if bhr_focal_data is not None:
            instance.bhr_focal.set(bhr_focal_data)

        assigned_users = validated_data.get("assigned_users", [])
        deadline = validated_data.get("deadline", None)
        deadline_str = f"\nDeadline: {deadline}" if deadline else ""
        user_task = UserTask.objects.filter(
            source_id=instance.id, source_type="KPI UPDATE"
        ).last()
        if user_task:
            user_task.assigned_by = self.context["request"].user
            user_task.assigned_users.set(assigned_users)
            user_task.deadline = validated_data.get("deadline", user_task.deadline)
            user_task.save()
        else:
            user_task = UserTask.objects.create(
                source_id=instance.id,
                source_type="KPI UPDATE",
                assigned_by=self.context["request"].user,
                deadline=validated_data.get("deadline"),
            )
            user_task.assigned_users.set(assigned_users)
        for user in assigned_users:
            if hasattr(user, "email") and user.email:
                kpi_number = instance.id if hasattr(instance, "id") else ""

                kpi_description = (
                    getattr(instance.kpi, "description", "")
                    if hasattr(instance, "kpi") and instance.kpi
                    else ""
                )
                supplier_id = (
                    instance.supplier.id
                    if hasattr(instance, "supplier") and instance.supplier
                    else ""
                )

                frontend_url = (
                    getattr(settings, "FRONTEND_URL", None) or "http://localhost:3000"
                )

                if not frontend_url.startswith(
                    "http://"
                ) and not frontend_url.startswith("https://"):
                    frontend_url = "http://" + frontend_url
                kpi_link = (
                    f"{frontend_url.rstrip('/')}/admin/supplier-kpi-bulk-update?ids={kpi_number}"
                    if kpi_number
                    else ""
                )
                kpi_category = (
                    instance.kpi.kpi_category.name
                    if hasattr(instance, "kpi")
                    and instance.kpi
                    and hasattr(instance.kpi, "kpi_category")
                    and instance.kpi.kpi_category
                    and hasattr(instance.kpi.kpi_category, "name")
                    else ""
                )
                message = (
                    f"You have been assigned to a KPI.\n\n"
                    f"KPI number: {kpi_number}\n"
                    f"Supplier ID: {supplier_id}\n"
                    f"KPI description: {kpi_description}\n"
                    f"KPI Category: {kpi_category}\n"
                    f"Deadline: {deadline if deadline else 'N/A'}\n"
                    f"KPI link: {kpi_link}\n\n"
                    f"Please check the system for more details."
                )
                env_label = getattr(settings, "LEVEL", None) or os.environ.get(
                    "LEVEL", None
                )

                if env_label and str(env_label).lower() == "staging":
                    subject = f"[STAGING] KPI Assignment: KPI #{kpi_number} (Due: {deadline if deadline else 'N/A'})"
                    from_email = (
                        f"Issara Institute ILM (Staging) <ilm@issarainstitute.org>"
                    )
                else:
                    subject = f"KPI Assignment: KPI #{kpi_number} (Due: {deadline if deadline else 'N/A'})"
                    from_email = getattr(
                        settings,
                        "DEFAULT_FROM_EMAIL",
                        "Issara Institute ILM <ilm@issarainstitute.org>",
                    )

                send_mail(
                    subject=subject,
                    message=message,
                    from_email=from_email,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
        instance.save()
        return instance

    class Meta:
        model = SupplierKpi
        fields = "__all__"
        read_only_fields = ["assigned_to"]


class SupplierKpiNewSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    status_name = serializers.SerializerMethodField()
    days_open = serializers.SerializerMethodField()

    remediation = serializers.SerializerMethodField()
    systems_change = serializers.SerializerMethodField()
    law = serializers.SerializerMethodField()

    overview_date = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    remediation_payment_deadline = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    remediation_documents_deadline = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    systems_change_deadline = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    closed_at = serializers.DateTimeField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    closed_quality = serializers.CharField(allow_null=True)
    calls = serializers.SerializerMethodField()
    source_recruiters = serializers.SerializerMethodField()
    destination_recruiters = serializers.SerializerMethodField()
    updates = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    def get_supplier_name(self, obj):
        return obj.supplier.name

    def get_category(self, obj):
        translations = getattr(
            obj.kpi.kpi_category, "filtered_category_translations", []
        )
        if translations:
            return translations[0].name
        return obj.kpi.kpi_category.name

    def get_description(self, obj):
        translations = getattr(obj.kpi, "filtered_kpi_translations", [])
        if translations:
            return translations[0].description
        return obj.kpi.description

    def get_level(self, obj):
        return obj.kpi.level

    def get_status_name(self, obj):
        return obj.status.id if obj.status else ""

    def get_remediation(self, obj):
        return (
            obj.kpi.kpi_recommended_remediation
            if obj.kpi.kpi_recommended_remediation
            else ""
        )

    def get_systems_change(self, obj):
        return obj.kpi.kpi_systems_change if obj.kpi.kpi_systems_change else ""

    def get_law(self, obj):
        return obj.kpi.kpi_legal_violation if obj.kpi.kpi_legal_violation else ""

    def get_calls(self, obj):
        calls_list = []
        cases = obj.case_set.filter(
            Q(
                case_created_by__organization_user__organization=self.context[
                    "request"
                ].organization_user.organization
            )
            | Q(refer_to_org=self.context["request"].organization_user.organization)
        )

        if cases.exists():
            calls_list.append(cases.first().id)

        return calls_list

    def get_source_recruiters(self, obj):
        recruiters_list = []
        cases = Case.objects.filter(supplier__kpis__kpi=obj.kpi.id).filter(
            Q(
                case_created_by__organization_user__organization=self.context[
                    "request"
                ].organization_user.organization
            )
            | Q(refer_to_org=self.context["request"].organization_user.organization)
        )
        for i in cases:
            if i.source_recruiter is not None:
                recruiters_list.append(i.source_recruiter.id)
        return recruiters_list

    def get_destination_recruiters(self, obj):
        recruiters_list = []
        cases = Case.objects.filter(supplier__kpis__kpi=obj.kpi.id).filter(
            Q(
                case_created_by__organization_user__organization=self.context[
                    "request"
                ].organization_user.organization
            )
            | Q(refer_to_org=self.context["request"].organization_user.organization)
        )
        for i in cases:
            if i.destination_recruiter is not None:
                recruiters_list.append(i.destination_recruiter.id)
        return recruiters_list

    def get_days_open(self, obj):
        if obj.closed_at:
            days_open = obj.closed_at.date() - obj.opened_at
            if days_open.days < 0:
                return "-"
            return days_open.days
        return ""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["closed_at"] = str(
            instance.closed_at.date()
            if hasattr(instance, "closed_at") and instance.closed_at
            else ""
        )

        return data

    class Meta:
        model = SupplierKpi
        fields = "__all__"


class BusinessResponseSerializer(serializers.ModelSerializer):
    supplier_names = serializers.SerializerMethodField()
    recruiter_names = serializers.SerializerMethodField()
    global_buyer_names = serializers.SerializerMethodField()

    suppliers_next_steps_deadline = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    recruiters_next_steps_deadline = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    global_buyers_next_steps_deadline = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    issara_next_steps_deadline = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    event_date = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    created_by = serializers.PrimaryKeyRelatedField(
        default=serializers.CurrentUserDefault(), queryset=User.objects.all()
    )

    class Meta:
        model = BusinessResponse
        fields = [
            "id",
            "suppliers",
            "suppliers_notes",
            "recruiters",
            "recruiters_notes",
            "global_buyers",
            "global_buyers_notes",
            "other_parties_notes",
            "event_details",
            "event_location",
            "event_date",
            "event_interaction_type",
            "suppliers_next_steps",
            "suppliers_next_steps_deadline",
            "suppliers_focal_points",
            "recruiters_next_steps",
            "recruiters_next_steps_deadline",
            "recruiters_focal_points",
            "global_buyers_next_steps",
            "global_buyers_next_steps_deadline",
            "global_buyers_focal_points",
            "issara_next_steps",
            "issara_next_steps_deadline",
            "issara_focal_points",
            "created_by",
            "created_at",
            "supplier_names",
            "recruiter_names",
            "global_buyer_names",
        ]

    def get_supplier_names(self, obj):
        # Prefer annotated aggregated names if available (string), otherwise fall back to related suppliers
        agg = getattr(obj, "supplier_names_agg", None)
        if agg:
            # split by comma+space to return list similar to previous behavior
            return [s.strip() for s in agg.split(",") if s.strip()]
        # MySQL fallback: use annotated single-name if present to avoid extra queries
        first = getattr(obj, "supplier_first_name", None)
        if first:
            return [first]
        return [supplier.name for supplier in obj.suppliers.all()]

    def get_recruiter_names(self, obj):
        agg = getattr(obj, "recruiter_names_agg", None)
        if agg:
            return [s.strip() for s in agg.split(",") if s.strip()]
        first = getattr(obj, "recruiter_first_name", None)
        if first:
            return [first]
        return [recruiter.name for recruiter in obj.recruiters.all()]

    def get_global_buyer_names(self, obj):
        agg = getattr(obj, "global_buyer_names_agg", None)
        if agg:
            return [s.strip() for s in agg.split(",") if s.strip()]
        first = getattr(obj, "global_buyer_first_name", None)
        if first:
            return [first]
        return [global_buyer.name for global_buyer in obj.global_buyers.all()]


class SupplierCRCResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierCRCResponse
        fields = "__all__"


class RecruiterCRCResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecruiterCRCResponse
        fields = "__all__"


class FieldworkActivitySerializer(serializers.ModelSerializer):
    fieldwork_date = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    created_by = serializers.SlugRelatedField(
        default=serializers.CurrentUserDefault(),
        queryset=User.objects.all(),
        slug_field="email",
    )
    organization_name = serializers.SerializerMethodField(read_only=True)
    fieldwork_type_name = serializers.CharField(
        source="fieldwork_type.name", read_only=True
    )
    country_name = serializers.CharField(source="country.name", read_only=True)
    district_name = serializers.CharField(source="district.name", read_only=True)
    province_name = serializers.CharField(source="province.name", read_only=True)
    nationality_name = serializers.CharField(source="nationality.name", read_only=True)
    primary_focus_name = serializers.CharField(
        source="primary_focus.name", read_only=True
    )
    location = serializers.SerializerMethodField(read_only=True)
    supplier_name = serializers.SerializerMethodField(read_only=True)
    recruiter_name = serializers.SerializerMethodField(read_only=True)

    def get_location(self, obj):
        location = [obj.district, obj.province, obj.country]
        location_string = ", ".join([i.name for i in location if i is not None])
        return location_string

    def get_organization_name(self, obj):

        if hasattr(obj, "organization_name") and obj.organization_name:
            return obj.organization_name
        return "Issara Institute"

    @staticmethod
    def _join_related_names(related_queryset):
        names = [item.name for item in related_queryset if item and item.name]
        return ", ".join(names)

    def get_supplier_name(self, obj):
        return self._join_related_names(obj.suppliers.all())

    def get_recruiter_name(self, obj):
        return self._join_related_names(obj.recruiters.all())

    class Meta:
        model = FieldworkActivity
        fields = "__all__"


class FieldworkActivityDownloadSerializer(serializers.ModelSerializer):
    fieldwork_activity_id = serializers.IntegerField(source="id", read_only=True)
    organization = serializers.SerializerMethodField(read_only=True)
    organization_name = serializers.SerializerMethodField(read_only=True)
    fieldwork_type = serializers.CharField(source="fieldwork_type.name", read_only=True)
    fieldwork_type_name = serializers.CharField(
        source="fieldwork_type.name", read_only=True
    )
    nationality = serializers.CharField(source="nationality.name", read_only=True)
    nationality_name = serializers.CharField(source="nationality.name", read_only=True)
    country = serializers.CharField(source="country.name", read_only=True)
    country_name = serializers.CharField(source="country.name", read_only=True)
    province = serializers.CharField(source="province.name", read_only=True)
    province_name = serializers.CharField(source="province.name", read_only=True)
    district = serializers.CharField(source="district.name", read_only=True)
    district_name = serializers.CharField(source="district.name", read_only=True)
    notes = serializers.CharField(read_only=True)
    fieldwork_notes = serializers.CharField(source="notes", read_only=True)
    created_by = serializers.CharField(source="created_by.email", read_only=True)
    location = serializers.SerializerMethodField(read_only=True)
    supplier_name = serializers.SerializerMethodField(read_only=True)
    supplier_names = serializers.SerializerMethodField(read_only=True)
    recruiter_name = serializers.SerializerMethodField(read_only=True)
    recruiter_names = serializers.SerializerMethodField(read_only=True)

    @staticmethod
    def _join_related_names(related_queryset):
        names = [item.name for item in related_queryset if item and item.name]
        return ", ".join(names)

    def get_organization(self, obj):
        if hasattr(obj, "organization_name") and obj.organization_name:
            return obj.organization_name
        return "Issara Institute"

    def get_organization_name(self, obj):
        return self.get_organization(obj)

    def get_location(self, obj):
        location_parts = [obj.district, obj.province, obj.country]
        return ", ".join([part.name for part in location_parts if part is not None])

    def get_supplier_name(self, obj):
        return self._join_related_names(obj.suppliers.all())

    def get_supplier_names(self, obj):
        return self.get_supplier_name(obj)

    def get_recruiter_name(self, obj):
        return self._join_related_names(obj.recruiters.all())

    def get_recruiter_names(self, obj):
        return self.get_recruiter_name(obj)

    class Meta:
        model = FieldworkActivity
        fields = [
            "id",
            "fieldwork_activity_id",
            "fieldwork_date",
            "organization",
            "organization_name",
            "outreach_target",
            "notes",
            "fieldwork_notes",
            "links",
            "total_people_reached",
            "total_workers_reached",
            "created_by",
            "fieldwork_type",
            "fieldwork_type_name",
            "nationality",
            "nationality_name",
            "country",
            "country_name",
            "province",
            "province_name",
            "district",
            "district_name",
            "location",
            "supplier_name",
            "supplier_names",
            "recruiter_name",
            "recruiter_names",
            "bangladeshi_workers_reached",
            "cambodian_workers_reached",
            "filipino_workers_reached",
            "indian_workers_reached",
            "indonesian_workers_reached",
            "lao_workers_reached",
            "malaysian_workers_reached",
            "myanmar_workers_reached",
            "nepalese_workers_reached",
            "pakistani_workers_reached",
            "sri_lankan_workers_reached",
            "taiwanese_workers_reached",
            "thai_workers_reached",
            "vietnamese_workers_reached",
        ]


class FieldworkActivityTypeTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="translated_name", read_only=True)

    class Meta:
        model = FieldworkActivityTypeTranslation
        fields = ["id", "name"]


class FieldworkActivityTypeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name")

    class Meta:
        model = FieldworkActivityType
        fields = "__all__"


class GroupedFieldworkActivityTypeSerializer(serializers.ModelSerializer):
    types = FieldworkActivityTypeSerializer(many=True)

    class Meta:
        model = FieldworkActivityTypeCategory
        fields = "__all__"


class FieldworkActivityPrimaryFocusSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldworkActivityPrimaryFocus
        fields = "__all__"


class MonthlyWorkerVoiceSerializer(serializers.ModelSerializer):
    month_year = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )
    created_by = serializers.PrimaryKeyRelatedField(
        default=serializers.CurrentUserDefault(), queryset=User.objects.all()
    )

    class Meta:
        model = MonthlyWorkerVoice
        fields = "__all__"


class MonthlyWorkerVoiceTrackingSerializer(serializers.ModelSerializer):
    month_label = serializers.SerializerMethodField(read_only=True)
    creator_email = serializers.SerializerMethodField(read_only=True)
    creator_organization_id = serializers.SerializerMethodField(read_only=True)
    creator_organization_name = serializers.SerializerMethodField(read_only=True)
    active_interactions = serializers.SerializerMethodField(read_only=True)

    def _safe_int(self, value):
        try:
            return int(value or 0)
        except (TypeError, ValueError):
            return 0

    def get_month_label(self, obj):
        if not obj.month_year:
            return ""
        return obj.month_year.strftime("%Y-%m")

    def get_creator_email(self, obj):
        if not obj.created_by:
            return None
        return obj.created_by.email or obj.created_by.username

    def get_creator_organization_id(self, obj):
        if not obj.created_by or not hasattr(obj.created_by, "organization_user"):
            return None
        if not obj.created_by.organization_user.organization:
            return None
        return obj.created_by.organization_user.organization.id

    def get_creator_organization_name(self, obj):
        if not obj.created_by or not hasattr(obj.created_by, "organization_user"):
            return "Issara Institute"
        if not obj.created_by.organization_user.organization:
            return "Issara Institute"
        return obj.created_by.organization_user.organization.name

    def get_active_interactions(self, obj):
        active_channel_keys = self.context.get("active_channel_keys", [])
        return sum(self._safe_int(getattr(obj, key, 0)) for key in active_channel_keys)

    class Meta:
        model = MonthlyWorkerVoice
        fields = "__all__"


class BusinessResponseInteractionTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResponseInteractionType
        fields = "__all__"


class EthicalRecruitmentMeetingSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(
        default=serializers.CurrentUserDefault(), queryset=User.objects.all()
    )

    class Meta:
        model = EthicalRecruitmentMeeting
        fields = "__all__"


class CaseExcelSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    created = serializers.DateField()
    last_modified = serializers.DateField()
    client_nickname = serializers.CharField()
    client_phonenumber = serializers.CharField()
    client_line_account = serializers.CharField()
    client_facebook_account = serializers.CharField()
    client_whatsapp_account = serializers.CharField()
    client_viber_account = serializers.CharField()
    client_share_info_consent = serializers.CharField()
    client_time_at_job = serializers.IntegerField()

    issara_supply_chain = serializers.CharField()
    non_supply_chain = serializers.CharField()
    description = serializers.CharField()
    debt_bondage = serializers.CharField()
    debt_bondage_detail = serializers.CharField()
    debt_bondage_broker = serializers.CharField()
    debt_bondage_detail_broker = serializers.CharField()
    vot_needs = serializers.CharField()
    referral_notes = serializers.CharField()
    next_steps = serializers.CharField()
    work_place_details = serializers.CharField()

    dead_line_date = serializers.DateField()
    final_remarks = serializers.CharField()
    source_upstream_broker = serializers.CharField()
    rating_source_broker = serializers.IntegerField()
    rating_source_recruiter = serializers.IntegerField()
    rating_dest_recruiter = serializers.IntegerField()
    rating_dest_employer = serializers.IntegerField()

    issue_description = serializers.CharField()
    issue_offender_description = serializers.CharField()
    issue_workers_affected = serializers.IntegerField()
    issue_legacy_level = serializers.IntegerField()
    issue_workers_affected_description = serializers.CharField()
    issue_getting_better = serializers.CharField()
    issue_getting_better_description = serializers.CharField()
    case_status_name = serializers.CharField()

    supplier_name = serializers.CharField()
    source_recruiter_name = serializers.CharField()
    destination_recruiter_name = serializers.CharField()
    description = serializers.CharField()
    issara_staff_email = serializers.CharField()
    next_steps_issara_staff_email = serializers.CharField()
    next_steps = serializers.CharField()
    referral_notes = serializers.CharField()
    referral_action_name = serializers.CharField()
    final_remarks = serializers.CharField()
    issue_category_name = serializers.CharField()
    case_category_name = serializers.CharField()
    risk_assessment = serializers.CharField()

    client_gender_name = serializers.CharField()
    client_contract_type_name = serializers.CharField()
    client_document_type_name = serializers.CharField()
    client_ethnicity_name = serializers.CharField()
    client_nationality_name = serializers.CharField()
    client_type_name = serializers.CharField()
    client_workplace_name = serializers.CharField()

    country_name = serializers.CharField()
    district_name = serializers.CharField()
    province_name = serializers.CharField()
    client_crossing_country_name = serializers.CharField()
    client_crossing_district_name = serializers.CharField()
    client_crossing_province_name = serializers.CharField()
    client_origin_country_name = serializers.CharField()
    client_origin_province_name = serializers.CharField()
    client_origin_district_name = serializers.CharField()

    kpi_id = serializers.IntegerField()
    kpi_description = serializers.CharField()
    kpi_level = serializers.IntegerField()
    kpi_goal = serializers.CharField()
    kpi_category_name = serializers.CharField()
    kpi_eti_base_code_name = serializers.CharField()
    kpi_eti_base_code_description = serializers.CharField()
    kpi_kpi_legal_violation_name = serializers.CharField()
    kpi_kpi_legal_violation_description = serializers.CharField()
    kpi_kpi_recommended_remediation_description = serializers.CharField()
    kpi_kpi_systems_change_description = serializers.CharField()

    links = serializers.CharField()

    class Meta:
        fields = "__all__"


class ReportUploadSerializer(serializers.Serializer):
    file = serializers.FileField(write_only=True)
    name = serializers.CharField()
    description = serializers.CharField(required=False)
    type = serializers.CharField(required=False)
    permission = serializers.CharField(required=False)
    size = serializers.CharField(required=False)

    def save(self, supplier):
        """Override save to accept supplier and call create with validated_data."""
        return self.create(self.validated_data, supplier)

    def create(self, validated_data, supplier=None):
        file_name = validated_data["name"]
        file = validated_data["file"]
        description = validated_data.get("description", "")
        report_type = validated_data.get("type", "SR")
        permission = validated_data.get("permission", "SP Only")
        size = validated_data.get("size", "")

        if not supplier:
            raise serializers.ValidationError(
                "Supplier is required to create a report."
            )

        supplier_report = supplier.reports.create(
            file_path=file,
            type=report_type,
            name=file_name,
            description=description,
            permission=permission,
            size=size,
        )
        supplier.save()

        return SharedFileSerializer(instance=supplier_report).data


class GrievanceMechanismReviewSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(
        default=serializers.CurrentUserDefault(), queryset=User.objects.all()
    )

    class Meta:
        model = GrievanceMechanismReview
        fields = (
            "id",
            "supplier",
            "created_by",
            "date_of_review",
            "assessment",
            "description",
        )


class StrategicPartnerLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = StrategicPartner
        fields = ("id", "name", "image")


class SPWorkplanLiteSerializer(serializers.ModelSerializer):
    strategic_partner = ReadWriteSerializerMethodField()
    suggested_date = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=False
    )

    class Meta:
        model = SPWorkplan
        fields = ("id", "strategic_partner", "suggested_date", "created_at")

    def get_strategic_partner(self, obj: SPWorkplan) -> Dict:
        return StrategicPartnerLiteSerializer(obj.strategic_partner).data


class WorkplanDocsSerializer(serializers.ModelSerializer):
    document = ReadWriteSerializerMethodField()

    def get_document(self, obj: WorkplanDocs) -> Dict:
        return SharedFileSerializer(obj.document).data

    class Meta:
        model = WorkplanDocs
        fields = "__all__"


class WorkplanMainGoalsSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkplanMainGoal
        fields = "__all__"


class WorkplanProgressIndicatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkplanProgressIndicator
        fields = "__all__"


class WorkplanActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkplanActivity
        fields = "__all__"


class PriorityActivityBaseSerializer(serializers.ModelSerializer):
    group = serializers.SerializerMethodField()

    class Meta:
        model = PriorityActivityBase
        fields = "__all__"

    def get_group(self, obj: PriorityActivityBase) -> Dict:
        return PriorityActivityGroupSerializer(obj.group).data


class PriorityActivityGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriorityActivityGroup
        fields = "__all__"


class ActivityPrioritySerializer(serializers.ModelSerializer):
    priority_activity = ReadWriteSerializerMethodField()

    class Meta:
        model = PriorityActivity
        fields = "__all__"

    def get_priority_activity(self, obj: PriorityActivityBase) -> Dict:
        try:
            if obj["priority_activity_id"]:
                activity = PriorityActivityBase.objects.filter(
                    id=obj["priority_activity_id"]
                ).first()
                return PriorityActivityBaseSerializer(activity).data
        except:
            activity = PriorityActivityBase.objects.filter(
                id=obj.priority_activity_id
            ).first()
            return PriorityActivityBaseSerializer(activity).data
        return


class SPWorkplanSerializer(serializers.ModelSerializer):
    def update(self, instance, validated_data):

        request = self.context.get("request")

        user = getattr(request, "user", None) if request else None

        for attr, value in validated_data.items():

            setattr(instance, attr, value)

        instance.save()

        if hasattr(instance, "save_history"):

            instance.save_history(user, is_new=False)

        return instance

    strategic_partner = ReadWriteSerializerMethodField()
    suggested_date = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=False
    )
    documents = serializers.SerializerMethodField(read_only=True)
    main_goals = serializers.SerializerMethodField(read_only=True)
    progress_indicator = serializers.SerializerMethodField(read_only=True)
    key_activities = serializers.SerializerMethodField(read_only=True)
    notes_remark = serializers.SerializerMethodField(read_only=True)
    priority_activity = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SPWorkplan
        fields = "__all__"

    def create(self, validated_data):

        instance = SPWorkplan(**validated_data)

        request = self.context.get("request")

        user = getattr(request, "user", None) if request else None

        instance.save()

        if hasattr(instance, "save_history"):

            instance.save_history(user, is_new=True)

        return instance

    def get_priority_activity(self, obj: SPWorkplan):
        return ActivityPrioritySerializer(
            obj.priorityactivity_set.all(), many=True
        ).data

    def get_strategic_partner(self, obj: SPWorkplan) -> Dict:
        return StrategicPartnerLiteSerializer(obj.strategic_partner).data

    def get_documents(self, obj: SPWorkplan) -> List:
        return WorkplanDocsSerializer(obj.workplandocs_set.all(), many=True).data

    def get_progress_indicator(self, obj: SPWorkplan) -> List:
        return WorkplanProgressIndicatorSerializer(
            obj.workplanprogressindicator_set.all(), many=True
        ).data

    def get_key_activities(self, obj: SPWorkplan) -> List:
        return WorkplanActivitySerializer(
            obj.workplanactivity_set.all(), many=True
        ).data

    def get_main_goals(self, obj: SPWorkplan) -> Union[Dict, None]:
        try:
            return WorkplanMainGoalsSerializer(
                obj.workplanmaingoal_set.all(), many=True
            ).data
        except WorkplanMainGoal.DoesNotExist:
            return None

    def get_notes_remark(self, obj: SPWorkplan) -> List:
        return WorkplanNotesRemarkSerializers(
            obj.workplannotesremark_set.all(), many=True
        ).data


class SPWorkplanListSerializer(serializers.ModelSerializer):
    strategic_partner = ReadWriteSerializerMethodField()
    suggested_date = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=False
    )

    class Meta:
        model = SPWorkplan
        fields = "__all__"

    def get_strategic_partner(self, obj: SPWorkplan) -> Dict:
        return StrategicPartnerLiteSerializer(obj.strategic_partner).data


class StrategicPartnerUserSerializers(serializers.ModelSerializer):
    class Meta:
        model = StrategicPartnerUser
        fields = "__all__"

    def get_workplan(self, obj: StrategicPartnerUser) -> Dict:
        return SPWorkplanLiteSerializer(obj.workplan).data


class WorkplanNotesRemarkSerializers(serializers.ModelSerializer):
    class Meta:
        model = WorkplanNotesRemark
        fields = ("workplan", "txt_value", "area")

    def get_workplan(self, obj: WorkplanNotesRemark) -> Dict:
        return SPWorkplanLiteSerializer(obj.workplan).data


class SuppliersListFlatSerializer(serializers.ModelSerializer):
    industries = serializers.PrimaryKeyRelatedField(
        queryset=Industry.objects.all(), many=True, required=False
    )
    subindustries = serializers.PrimaryKeyRelatedField(
        queryset=SubIndustry.objects.all(), many=True, required=False
    )
    supply_chains = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "anonymous",
            "supply_chains",
            "is_worker_voice_rolled_out",
            "total_num_thai_workers",
            "total_num_cambodian_workers",
            "total_num_myanmar_workers",
            "total_num_lao_workers",
            "total_num_vietnamese_workers",
            "total_num_nepalese_workers",
            "total_num_bangladeshi_workers",
            "total_num_indonesian_workers",
            "total_num_malaysian_workers",
            "total_num_indian_workers",
            "total_num_pakistani_workers",
            "total_num_sri_lankan_workers",
            "industries",
            "subindustries",
            "country",
            "province",
            "district",
            "lng",
            "lat",
            "worker_voice",
            "worker_voice_status",
        ]

    def get_supply_chains(self, obj: Supplier) -> List[Dict[str, str]]:
        """
        Return all linked supply chains with their status.
        """
        prefetched = getattr(obj, "_prefetched_objects_cache", {}).get(
            "suppliersupplychain_set"
        )
        links = (
            prefetched
            if prefetched is not None
            else obj.suppliersupplychain_set.select_related("supply_chain").all()
        )

        supply_chains: List[Dict[str, str]] = []
        for link in links:
            if link.supply_chain:
                supply_chains.append(
                    {
                        "supply_chain_name": link.supply_chain.name,
                        "status": link.status,
                    }
                )
        return supply_chains


class ERMetricsSerializer(serializers.ModelSerializer):
    month = serializers.DateField(
        input_formats=settings.DATE_INPUT_FORMATS, allow_null=True
    )

    class Meta:
        model = ERMetrics
        fields = [
            "id",
            "month",
            "workers_voice_channels",
            "workers_receiving_remedition",
            "workers_pre_departure_mm",
            "workers_pre_departure_ne",
            "workers_pre_departure_kh",
            "workers_pre_departure_vn",
            "workers_pre_departure_th",
            "workers_trained",
            "suppliers_trained",
            "recruitment_agencies_trained",
            "workers_pre_departure_ne",
            "remediation_for_recruitment_fees_and_cases",
            "recruitment_related_fees_detected_and_intercepted",
            "created_at",
            "workers_pre_departure_ne",
            "remediation_for_recruitment_fees_and_cases",
            "recruitment_related_fees_detected_and_intercepted",
        ]

    def create(self, validated_data):
        user = self.context["user"]
        validated_data["created_by"] = user
        return super().create(validated_data)


class CsoLoginTrackingSerializer(serializers.ModelSerializer):

    class Meta:
        model = CsoLogin

        fields = "__all__"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        user = User.objects.filter(id=instance.user.id).last()

        if hasattr(user, "organization_user"):
            if user.organization_user.organization:
                data["organization"] = user.organization_user.organization.name

        data["username"] = user.username
        return data


class CsoLoginSerializer(serializers.ModelSerializer):
    class Meta:
        model = CsoLogin
        fields = "__all__"


class SupplierUserSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(
        source="supplier_user.supplier.name", read_only=True
    )
    supplier_id = serializers.IntegerField(
        source="supplier_user.supplier.id", read_only=True
    )
    label = serializers.SerializerMethodField()
    value = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "supplier_id",
            "supplier_name",
            "label",
            "value",
        ]

    def get_label(self, obj):
        try:
            return f"{obj.email} ({obj.supplier_user.supplier.name})"
        except (AttributeError, TypeError):
            return obj.email or obj.username or f"User {obj.id}"

    def get_value(self, obj):
        return obj.id


class SupplierProgressItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierProgressItem
        fields = [
            "id",
            "name",
            "supplier_progress_category",
        ]


class SupplierProgressItemTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="translated_name", read_only=True)
    supplier_progress_category = serializers.IntegerField(
        source="supplier_progress_category_id", read_only=True
    )

    class Meta:
        model = SupplierProgressItemTranslation
        fields = ["id", "name", "supplier_progress_category"]
