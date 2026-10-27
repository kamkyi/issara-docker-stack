from __future__ import annotations
import os
import json
import logging
import threading
from django.db import models
from datetime import date, datetime, timedelta
import pandas as pd
from django.conf import settings
from django.contrib.auth.models import Group, User
from django.core import serializers

from django.core.cache import cache
from django.core.mail import EmailMessage, send_mail
from django.db import IntegrityError, connection, transaction
from django.db.models import (
    Avg,
    Case,
    Count,
    Exists,
    F,
    OuterRef,
    Prefetch,
    Q,
    Subquery,
    Sum,
    Value,
)
from django.db.models.expressions import RawSQL
from django.db.models.functions import Coalesce, TruncMonth
from django.http import HttpResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import get_template, render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.views.decorators.vary import vary_on_headers
from django.views.decorators.http import etag
import hashlib
from django.db.models import Max, Count
from django.contrib.postgres.aggregates import StringAgg
from rest_framework.pagination import PageNumberPagination

# MySQL compatible GROUP_CONCAT aggregate wrapper for non-Postgres DBs
from django.db.models import Func


class GroupConcat(Func):
    function = "GROUP_CONCAT"
    # include DISTINCT and separator to mimic StringAgg(..., delimiter=', ', distinct=True)
    template = "GROUP_CONCAT(DISTINCT %(expressions)s SEPARATOR ', ')"
    output_field = models.TextField()


from django_filters.rest_framework import DjangoFilterBackend
from issara.ilm_server_2.filters import SPWorkplanFilters, UserTaskFilters
from workplan.models import WorkplanEmailNotificationSetting
from issara.ilm_server_2.models import (
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
    Config,
    ContractType,
    Country,
    CsoLogin,
    District,
    DocumentType,
    EthicalRecruitmentMeeting,
    Ethnicity,
    FactoryType,
    FieldworkActivity,
    FieldworkActivityPrimaryFocus,
    FieldworkActivityType,
    FieldworkActivityTypeCategory,
    FieldworkActivityTypeTranslation,
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
    MmThaiDemandData,
    MmThaiSendingData,
    MonthlyWorkerVoice,
    Nationality,
    NewsUpdate,
    NonSupplyChainCase,
    Organization,
    PartnerMessageBoard,
    PartnerMessageBoardAcknowledgement,
    PartnerMessageBoardComment,
    PartnerMessageBoardReaction,
    PartnerMessageBoardReminder,
    PartnerMessageBoardRSVP,
    PartnerMessageBoardSeen,
    PersonContact,
    PriorityActivity,
    PriorityActivityBase,
    Province,
    Recruiter,
    RecruiterCRCResponse,
    RecruiterIssue,
    RecruiterResponse,
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
    SupplierRecruiters,
    SupplierSupplyChain,
    SupplierUser,
    SupplyChain,
    UserLogin,
    UserOrganization,
    UserTask,
    VesselType,
    WorkPlace,
    WorkplanActivity,
    WorkplanDocs,
    WorkplanMainGoal,
    WorkplanNotesRemark,
    WorkplanProgressIndicator,
)
from issara.ilm_server_2.pagination import CustomPageNumberPagination
from issara.ilm_server_2.serializers import (
    ActivityPrioritySerializer,
    BusinessResponseInteractionTypeSerializer,
    BusinessResponseSerializer,
    CallsByCountSerializer,
    CaseCategorySerializer,
    CaseCategoryTranslationSerializer,
    CaseDeepSerializer,
    CaseLeanSerializer,
    CaseSerializer,
    CaseStatusSerializer,
    ChangePasswordSerializer,
    ClientStatusSerializer,
    ClientStatusTranslationSerializer,
    ClientTypeSerializer,
    ClientTypeTranslationSerializer,
    ContractTypeSerializer,
    CountrySerializer,
    CsoLoginSerializer,
    CsoLoginTrackingSerializer,
    DistrictSerializer,
    DocumentTypeSerializer,
    ERMetricsSerializer,
    EthicalRecruitmentMeetingSerializer,
    EthnicitySerializer,
    FieldworkActivityDownloadSerializer,
    FactoryTypeSerializer,
    FieldworkActivityPrimaryFocusSerializer,
    FieldworkActivitySerializer,
    FieldworkActivityTypeSerializer,
    FieldworkActivityTypeTranslationSerializer,
    GrievanceMechanismReviewSerializer,
    GroupedFieldworkActivityTypeSerializer,
    GroupSerializer,
    HowHearIssaraSerializer,
    HowHearIssaraTranslationSerializer,
    IndustrySerializer,
    InteractionChannelSerializer,
    InteractionChannelTranslationSerializer,
    InteractionReasonSerializer,
    InteractionReasonTranslationSerializer,
    IssueCategorySerializer,
    IssueCategoryTranslationSerializer,
    MmThaiDemandDataSerializer,
    MmThaiSendingDataSerializer,
    MmThaiSendingDataSerializerOriginal,
    MonthlyWorkerVoiceSerializer,
    MonthlyWorkerVoiceTrackingSerializer,
    NationalitySerializer,
    NewsUpdateSerializer,
    NonSupplyChainCaseSerializer,
    PartnerMessageBoardAcknowledgementSerializer,
    PartnerMessageBoardCommentSerializer,
    PartnerMessageBoardRSVPSerializer,
    PartnerMessageBoardSeenSerializer,
    PartnerMessageBoardSerializer,
    PartnerReferenceDocSerializer,
    PersonContactSerializer,
    PriorityActivityBaseSerializer,
    ProvinceSerializer,
    RecruiterCRCResponseSerializer,
    RecruiterSerializer,
    ReferralActionSerializer,
    ReferralActionTranslationSerializer,
    ReferralOrganizationSerializer,
    ReportUploadSerializer,
    SharedFileSerializer,
    SPWorkplanSerializer,
    StrategicPartnerResponseSerializer,
    StrategicPartnerDropDownSerializer,
    StrategicPartnerSerializer,
    StrategicPartnerUserSerializers,
    SubIndustrySerializer,
    SupplierCRCResponseSerializer,
    SupplierKpiNewSerializer,
    SupplierKpiSerializer,
    SupplierMessageBoardSerializer,
    SupplierSerializer,
    SuppliersListFlatSerializer,
    SupplierUserLoginSerializer,
    SupplyChainMinimalSerializer,
    SupplyChainSerializer,
    UserLoginSerializer,
    UserSerializer,
    SPUserSerializer,
    UserTaskSerializer,
    VesselTypeSerializer,
    WorkPlaceSerializer,
    WorkplanActivitySerializer,
    WorkplanDocsSerializer,
    WorkplanMainGoalsSerializer,
    WorkplanNotesRemarkSerializers,
    WorkplanProgressIndicatorSerializer,
)
from kpis.models import (
    Kpi,
    KpiCategoryTranslation,
    KpiEmailNotification,
    KpiEmailNotificationTemplate,
    KpiTranslation,
    SupplierKpi,
    SupplierKpiUpdate,
)
from rest_framework import (
    authentication,
    filters,
    generics,
    permissions,
    status,
    viewsets,
)
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView
from xhtml2pdf import pisa
from authkit import WorkOSAuthKitAuthentication

from .models import ERMetrics, PartnerReferenceDoc, PriorityActivityGroup
from .cso_audience import requests_cso_audience, use_cso_audience
from .permissions import *
from .utilities import Concat, Kpis_Counts
from .utils import EmailMailgun, calculate_sp_crc_score, get_serializer

DB_INFO = connection.get_connection_params()
DB_NAME = DB_INFO["database"]

MONTHLY_WV_CHANNELS = [
    {
        "key": "mm_hotline_total",
        "label": "Burmese hotline in Thailand",
        "group": "Burmese - Thailand",
    },
    {
        "key": "mm_whatsapp_total",
        "label": "Burmese WhatsApp in Thailand",
        "group": "Burmese - Thailand",
    },
    {
        "key": "mm_fb_total",
        "label": "Burmese Facebook Messenger",
        "group": "Burmese - Thailand",
    },
    {
        "key": "burmese_titok_messages",
        "label": "Burmese TikTok Messages",
        "group": "Burmese - Thailand",
    },
    {"key": "mm_line_total", "label": "Burmese LINE", "group": "Burmese - Thailand"},
    {
        "key": "mm_viber_total",
        "label": "Burmese Viber in Thailand",
        "group": "Burmese - Thailand",
    },
    {
        "key": "yangon_hotline_total",
        "label": "Burmese hotline in Myanmar",
        "group": "Burmese - Myanmar",
    },
    {
        "key": "yangon_whatsapp_total",
        "label": "Burmese WhatsApp in Myanmar",
        "group": "Burmese - Myanmar",
    },
    {
        "key": "yangon_viber_total",
        "label": "Burmese Viber in Myanmar",
        "group": "Burmese - Myanmar",
    },
    {
        "key": "my_burmese_hotline_total",
        "label": "Burmese Hotline in Malaysia",
        "group": "Burmese - Malaysia",
    },
    {
        "key": "my_burmese_whatsapp_total",
        "label": "Burmese WhatsApp in Malaysia",
        "group": "Burmese - Malaysia",
    },
    {
        "key": "my_burmese_viber_total",
        "label": "Burmese Viber in Malaysia",
        "group": "Burmese - Malaysia",
    },
    {"key": "cb_hotline_total", "label": "Khmer Hotline", "group": "Khmer - Thailand"},
    {
        "key": "cb_whatsapp_total",
        "label": "Khmer WhatsApp",
        "group": "Khmer - Thailand",
    },
    {
        "key": "cb_fb_total",
        "label": "Khmer Facebook Messenger",
        "group": "Khmer - Thailand",
    },
    {
        "key": "khmer_tiktok",
        "label": "Khmer TikTok Messages",
        "group": "Khmer - Thailand",
    },
    {"key": "cb_line_total", "label": "Khmer LINE", "group": "Khmer - Thailand"},
    {"key": "cb_viber_total", "label": "Khmer Telegram", "group": "Khmer - Thailand"},
    {"key": "thai_hotline_total", "label": "Thai Hotline", "group": "Thai - Thailand"},
    {
        "key": "thai_whatsapp_total",
        "label": "Thai WhatsApp",
        "group": "Thai - Thailand",
    },
    {
        "key": "thai_fb_total",
        "label": "Thai Facebook Messenger",
        "group": "Thai - Thailand",
    },
    {"key": "thai_line_total", "label": "Thai LINE", "group": "Thai - Thailand"},
    {"key": "thai_viber_total", "label": "Thai Viber", "group": "Thai - Thailand"},
    {
        "key": "bangladeshi_hotline",
        "label": "Bangladeshi Hotline",
        "group": "Bangladeshi - Malaysia and Bangladesh",
    },
    {
        "key": "bangladeshi_whatsapp",
        "label": "Bangladeshi WhatsApp",
        "group": "Bangladeshi - Malaysia and Bangladesh",
    },
    {
        "key": "bangladeshi_facebook_messenger",
        "label": "Bangladeshi Facebook Messenger",
        "group": "Bangladeshi - Malaysia and Bangladesh",
    },
    {
        "key": "bangladeshi_tiktok_messages",
        "label": "Bangladeshi TikTok Messages",
        "group": "Bangladeshi - Malaysia and Bangladesh",
    },
    {
        "key": "bangladeshi_telegram_messages",
        "label": "Bangladeshi Telegram",
        "group": "Bangladeshi - Malaysia and Bangladesh",
    },
    {
        "key": "nepal_hotline_total",
        "label": "Nepali Hotline",
        "group": "Nepali - Malaysia and Nepal",
    },
    {
        "key": "my_nepal_whatsapp_total",
        "label": "Nepali WhatsApp",
        "group": "Nepali - Malaysia and Nepal",
    },
    {
        "key": "nepal_facebook_total",
        "label": "Nepali Facebook Messenger",
        "group": "Nepali - Malaysia and Nepal",
    },
    {
        "key": "nepalese_tiktok_messages",
        "label": "Nepali TikTok Messages",
        "group": "Nepali - Malaysia and Nepal",
    },
    {
        "key": "vietnamese_hotline_total",
        "label": "Vietnamese Hotline",
        "group": "Vietnamese - Vietnam",
    },
    {
        "key": "vietnamese_whatsapp_total",
        "label": "Vietnamese WhatsApp",
        "group": "Vietnamese - Vietnam",
    },
    {
        "key": "vietnamese_facebook_messenger",
        "label": "Vietnamese Facebook Messenger",
        "group": "Vietnamese - Vietnam",
    },
    {
        "key": "vietnamese_tiktok_messages",
        "label": "Vietnamese TikTok Messages",
        "group": "Vietnamese - Vietnam",
    },
    {
        "key": "vietnamese_zalo_messages",
        "label": "Vietnamese Zalo Messages",
        "group": "Vietnamese - Vietnam",
    },
    {
        "key": "hotline_in_taiwan",
        "label": "Hotline in Taiwan",
        "group": "Other Channels",
    },
    {
        "key": "my_indonesia_hotline_total",
        "label": "Indonesian Hotline in Malaysia",
        "group": "Other Channels",
    },
    {
        "key": "my_indonesian_whatsapp_total",
        "label": "Indonesian WhatsApp in Malaysia",
        "group": "Other Channels",
    },
]

MONTHLY_WV_GROUPS = ["All"] + sorted(
    list({channel["group"] for channel in MONTHLY_WV_CHANNELS})
)


class HelloView(APIView):
    """
    permission_classes = (IsAuthenticated,)
    """

    def get(self, request):
        content = {"message": "Hello ilm_server_2 is running!!!"}
        return Response(content)


class InvalidateCacheView(APIView):
    """
    Invalidates all caches including Django cache and ETag-based caching.
    Admin-only access. Supports both GET and POST methods.
    """

    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        # Clear Django cache
        cache.clear()

        # Invalidate ETag cache by updating supplier timestamps
        # This forces new ETag generation for supplier endpoints
        updated_count = Supplier.objects.all().update(updated_at=timezone.now())

        return Response(
            {
                "detail": "All caches cleared successfully",
                "django_cache": "cleared",
                "suppliers_etag": f"invalidated ({updated_count} suppliers updated)",
            }
        )

    def get(self, request):
        return self.post(request)


class UserLoginView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = UserLogin.objects.all().order_by("-id")
    serializer_class = UserLoginSerializer
    pagination_class = CustomPageNumberPagination


class SupplierUserLoginView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = SupplierLogin.objects.all().order_by("-id")
    serializer_class = SupplierUserLoginSerializer
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        """
        Override get_queryset to implement search functionality
        """
        queryset = super().get_queryset()
        search = self.request.query_params.get("search", None)

        if search:

            matching_user_ids = User.objects.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            ).values_list("id", flat=True)

            from issara.ilm_server_2.models import Supplier

            matching_supplier_ids = Supplier.objects.filter(
                name__icontains=search
            ).values_list("id", flat=True)

            from issara.ilm_server_2.models import SupplierUser

            supplier_user_ids = SupplierUser.objects.filter(
                supplier__in=matching_supplier_ids
            ).values_list("user_id", flat=True)

            queryset = queryset.filter(
                Q(user__in=list(matching_user_ids) + list(supplier_user_ids))
                | Q(created_at__icontains=search)
                | Q(loggedout_at__icontains=search)
            )

        return queryset


class NonSupplyChainCaseViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = NonSupplyChainCase.objects.all().order_by("-id")
    serializer_class = NonSupplyChainCaseSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class ChangePasswordView(generics.UpdateAPIView):

    queryset = User.objects.all()
    permission_classes = (IsAuthenticated,)
    serializer_class = ChangePasswordSerializer


class NewsUpdateViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = NewsUpdate.objects.all().order_by("-id")
    serializer_class = NewsUpdateSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class PartnerMessageBoardViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated, IsIssaraStaffOrReadOnly)
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    queryset = PartnerMessageBoard.objects.all().order_by("-pinned", "-id")
    serializer_class = PartnerMessageBoardSerializer

    # End-user interactions (acknowledge / rsvp / seen) are not "writes" to the
    # post resource itself, so they only require IsAuthenticated. Everything
    # else falls back to IsIssaraStaffOrReadOnly (read = any auth user, write
    # to the post = Issara staff only).
    _USER_ACTION_NAMES = ("acknowledge", "rsvp", "seen", "react")

    def get_permissions(self):
        if self.action in self._USER_ACTION_NAMES:
            return [IsAuthenticated()]
        return super().get_permissions()

    def _django_user_or_none(self):
        """Return the request user only if it's a real Django row (has a usable
        pk for FK columns). Lightweight WorkOSUser fallbacks return None."""
        user = self.request.user
        pk = getattr(user, "pk", None)
        if isinstance(pk, int) and pk > 0:
            return user
        return None

    def _scope_partner_id(self):
        """The active strategic-partner id supplied by the client, read from the
        `strategic_partner_id` query param (reads) or request body (ack/rsvp/seen
        actions). Returns an int, or None when absent/invalid."""
        raw = self.request.query_params.get("strategic_partner_id")
        if not raw:
            body = getattr(self.request, "data", None) or {}
            raw = body.get("strategic_partner_id")
        if raw is not None and str(raw).isdigit():
            return int(raw)
        return None

    def get_queryset(self):
        queryset = self.queryset.select_related("strategic_partner", "author")
        user = self.request.user
        # Issara staff / management (via Django groups OR WorkOS role claims)
        # see everything, including their own drafts. Skip this when the
        # session's WorkOS JWT explicitly carries a partner role (buyer-view /
        # supplier-view): that role reflects what the user is actually acting
        # as right now, and must win over Django-side staff flags on whatever
        # user row got resolved by email match (see WorkOSAuthKitAuthentication
        # in authkit/authentication.py) — otherwise a dual-purpose account
        # would see every partner's posts while browsing as a partner.
        if is_issara_staff(user) and not has_explicit_partner_role(user):
            return queryset
        # Everyone else only ever sees published posts — drafts are staff-only.
        queryset = queryset.filter(status=PartnerMessageBoard.STATUS_PUBLISHED)
        # Scope to the partner being viewed. The frontend passes the active SP id
        # via `?strategic_partner_id` on reads and in the request body on the
        # ack/rsvp/seen actions; mirror the cascade notifications API and trust it
        # directly (the SP is resolved client-side from the session).
        # NOTE: this intentionally does not verify the caller belongs to that SP,
        # matching the notifications endpoint's behaviour.
        sp_id = self._scope_partner_id()
        if sp_id is not None:
            try:
                from issara.ilm_server_2.models import StrategicPartner as _SP
                sp_obj = _SP.objects.filter(pk=sp_id).first()
                sp_grouping = sp_obj.strategic_partner_grouping if sp_obj else None
            except Exception:
                sp_grouping = None
            q = (
                models.Q(strategic_partner_id=sp_id)
                | models.Q(audience_all=True)
                # Grouping posts store an explicit partner-id snapshot; a partner
                # sees the post if their id is in that list, regardless of their
                # own (possibly unset) grouping column.
                | models.Q(audience_partner_ids__contains=[sp_id])
            )
            if sp_grouping:
                # Whole-grouping posts with no explicit list (legacy/null list).
                q |= models.Q(
                    audience_grouping=sp_grouping,
                    audience_partner_ids__isnull=True,
                )
            return queryset.filter(q)
        # No SP hint supplied: fall back to the caller's own SP link when we can
        # resolve it (real Django partner accounts), otherwise broadcast-only so
        # WorkOS-only sessions never see another partner's posts by default.
        django_user = self._django_user_or_none()
        if django_user is not None and hasattr(
            django_user, "strategic_partner_user"
        ):
            sp = django_user.strategic_partner_user.strategic_partner
            sp_grouping = getattr(sp, "strategic_partner_grouping", None)
            q = (
                models.Q(strategic_partner=sp)
                | models.Q(audience_all=True)
                | models.Q(audience_partner_ids__contains=[sp.pk])
            )
            if sp_grouping:
                q |= models.Q(
                    audience_grouping=sp_grouping,
                    audience_partner_ids__isnull=True,
                )
            return queryset.filter(q)
        return queryset.filter(audience_all=True)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)

    def perform_create(self, serializer):
        # Stamp author only when the request is from a real Django user; for
        # WorkOS-only sessions the `author` FK stays NULL (rendered as
        # "ILM Cascade Team" by the serializer).
        serializer.save(author=self._django_user_or_none())

    def _ensure_django_user(self, request):
        user = self.request.user
        pk = getattr(user, "pk", None)
        if isinstance(pk, int) and pk > 0:
            return user
        raise PermissionDenied(
            "This action requires a fully provisioned account; please contact"
            " support to link your WorkOS user to an internal record."
        )

    def _resolve_action_user(self, request):
        """Resolve the acting Django user for a self-action (ack / rsvp / seen).

        Prefers the authenticated Django user; when the session resolved only to
        a lightweight WorkOS user, falls back to the `X-ILM-User-Id` header the
        facelift frontend sends from the user's own `auth_user.links.ilm.userId`.
        These actions only mutate the user's own ack/RSVP/seen row, so trusting
        the self-supplied id here is acceptable.
        """
        user = self._django_user_or_none()
        if user is not None:
            return user
        raw = request.META.get("HTTP_X_ILM_USER_ID")
        if raw and str(raw).isdigit():
            user = User.objects.filter(pk=int(raw)).first()
            if user is not None:
                return user
        raise PermissionDenied(
            "This action requires a fully provisioned account; please contact"
            " support to link your WorkOS user to an internal record."
        )

    def _resolve_action_partner(self, request, user):
        """Strategic partner to stamp on an ack/RSVP row: the request body hint
        (validated against a real StrategicPartner), else the acting user's own
        `strategic_partner_user` link. May be None (e.g. staff previewing)."""
        raw = (request.data or {}).get("strategic_partner_id")
        if raw not in (None, ""):
            try:
                partner = StrategicPartner.objects.filter(pk=int(raw)).first()
            except (TypeError, ValueError):
                partner = None
            if partner is not None:
                return partner
        spu = getattr(user, "strategic_partner_user", None)
        return spu.strategic_partner if spu is not None else None

    @action(detail=True, methods=["post"], url_path="acknowledge")
    def acknowledge(self, request, pk=None):
        post = self.get_object()
        user = self._resolve_action_user(request)
        partner = self._resolve_action_partner(request, user)
        # update_or_create (not get_or_create) so an existing ack also has its
        # denormalised strategic_partner backfilled.
        PartnerMessageBoardAcknowledgement.objects.update_or_create(
            post=post, user=user, defaults={"strategic_partner": partner}
        )
        serializer = self.get_serializer(post)
        data = dict(serializer.data)
        # The acting partner's name, so the client can name the PARTNER (not the
        # individual user) in the cross-notification it emits.
        data["acting_partner_name"] = partner.name if partner else None
        return Response(data)

    @action(detail=True, methods=["post"], url_path="rsvp")
    def rsvp(self, request, pk=None):
        post = self.get_object()
        user = self._resolve_action_user(request)
        partner = self._resolve_action_partner(request, user)
        status_value = (request.data or {}).get(
            "status", PartnerMessageBoardRSVP.RSVP_GOING
        )
        valid_statuses = {choice[0] for choice in PartnerMessageBoardRSVP.RSVP_STATUSES}
        if status_value not in valid_statuses:
            raise ValidationError({"status": f"must be one of {sorted(valid_statuses)}"})
        PartnerMessageBoardRSVP.objects.update_or_create(
            post=post,
            user=user,
            defaults={"status": status_value, "strategic_partner": partner},
        )
        serializer = self.get_serializer(post)
        data = dict(serializer.data)
        data["acting_partner_name"] = partner.name if partner else None
        return Response(data)

    @action(detail=True, methods=["post"], url_path="seen")
    def seen(self, request, pk=None):
        post = self.get_object()
        user = self._resolve_action_user(request)
        partner = self._resolve_action_partner(request, user)
        PartnerMessageBoardSeen.objects.update_or_create(
            post=post, user=user, defaults={"strategic_partner": partner}
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="react")
    def react(self, request, pk=None):
        """Set / replace / clear the acting user's emoji reaction on a post.

        Facebook-style: one reaction per user. An `emoji` in the valid set
        replaces any previous reaction; a null/empty `emoji`, or the emoji the
        user has already selected, removes it (toggle off).
        """
        post = self.get_object()
        user = self._resolve_action_user(request)
        partner = self._resolve_action_partner(request, user)
        emoji = (request.data or {}).get("emoji")
        if emoji in (None, ""):
            PartnerMessageBoardReaction.objects.filter(post=post, user=user).delete()
        else:
            valid_emojis = {
                choice[0] for choice in PartnerMessageBoardReaction.REACTION_EMOJIS
            }
            if emoji not in valid_emojis:
                raise ValidationError(
                    {"emoji": f"must be one of {sorted(valid_emojis)}"}
                )
            existing = (
                PartnerMessageBoardReaction.objects.filter(post=post, user=user)
                .values_list("emoji", flat=True)
                .first()
            )
            if existing == emoji:
                # Clicking the already-selected emoji toggles it off.
                PartnerMessageBoardReaction.objects.filter(
                    post=post, user=user
                ).delete()
            else:
                PartnerMessageBoardReaction.objects.update_or_create(
                    post=post,
                    user=user,
                    defaults={"emoji": emoji, "strategic_partner": partner},
                )
        serializer = self.get_serializer(post)
        data = dict(serializer.data)
        data["acting_partner_name"] = partner.name if partner else None
        return Response(data)

    # Deterministic avatar palette for the acknowledgement roster.
    _ROSTER_COLORS = (
        "#004A60", "#148696", "#6F2E97", "#FB8379",
        "#B26A1A", "#2C7A50", "#3F7E8C", "#9A4FC0",
    )

    @action(detail=True, methods=["get"], url_path="roster")
    def roster(self, request, pk=None):
        """Per-strategic-partner acknowledgement roster for a post (staff only).

        Audience = the post's single `strategic_partner`, or every
        StrategicPartner when the post is a broadcast (`audience_all`). An org
        counts as acknowledged when any of its users has acknowledged the post.
        """
        post = self.get_object()
        if not is_issara_staff(request.user):
            raise PermissionDenied("The acknowledgement roster is staff-only.")

        orgs = self._roster_orgs(post)

        # Map each acknowledging user back to their strategic partner; keep the
        # earliest acknowledgement per org. Prefer the denormalised
        # strategic_partner on the row, falling back to the user link for legacy
        # rows written before that column existed.
        acked_at_by_org = {}
        acks = PartnerMessageBoardAcknowledgement.objects.filter(
            post=post
        ).select_related("user__strategic_partner_user", "strategic_partner")
        for ack in acks:
            org_id = ack.strategic_partner_id
            if org_id is None:
                spu = getattr(ack.user, "strategic_partner_user", None)
                org_id = spu.strategic_partner_id if spu is not None else None
            if org_id is None:
                continue
            current = acked_at_by_org.get(org_id)
            if current is None or ack.acknowledged_at < current:
                acked_at_by_org[org_id] = ack.acknowledged_at

        reminded_at_by_org = self._reminded_map(post)
        roster = []
        for index, org in enumerate(orgs):
            acked_at = acked_at_by_org.get(org.id)
            reminded_at = reminded_at_by_org.get(org.id)
            roster.append(
                {
                    "id": org.id,
                    "org": org.name,
                    "contact": org.focal_point_name or "",
                    "initials": self._org_initials(org.name),
                    "color": self._ROSTER_COLORS[index % len(self._ROSTER_COLORS)],
                    "acked": acked_at is not None,
                    "acked_on": acked_at.date().isoformat() if acked_at else None,
                    "reminded": reminded_at is not None,
                    "reminded_on": (
                        reminded_at.date().isoformat() if reminded_at else None
                    ),
                }
            )

        return Response(
            {
                "post": post.id,
                "ack_total": len(roster),
                "ack_count": sum(1 for row in roster if row["acked"]),
                "roster": roster,
            }
        )

    def _reminded_map(self, post):
        """org_id -> latest reminded_at for the post."""
        return {
            r.strategic_partner_id: r.reminded_at
            for r in PartnerMessageBoardReminder.objects.filter(post=post)
        }

    @action(detail=True, methods=["post"], url_path="remind")
    def remind(self, request, pk=None):
        """Record reminders to one or more partners to acknowledge / RSVP (staff
        only). Body: `strategic_partner_ids` (list) or `strategic_partner_id`."""
        post = self.get_object()
        if not is_issara_staff(request.user):
            raise PermissionDenied("Reminders are staff-only.")
        raw = (request.data or {}).get("strategic_partner_ids")
        if raw is None:
            raw = (request.data or {}).get("strategic_partner_id")
        ids = raw if isinstance(raw, list) else [raw]
        actor = self._django_user_or_none()
        reminded = 0
        for rid in ids:
            try:
                pid = int(rid)
            except (TypeError, ValueError):
                continue
            partner = StrategicPartner.objects.filter(pk=pid).first()
            if partner is None:
                continue
            PartnerMessageBoardReminder.objects.update_or_create(
                post=post,
                strategic_partner=partner,
                defaults={"reminded_by": actor},
            )
            reminded += 1
        return Response({"reminded": reminded})

    @staticmethod
    def _org_initials(name):
        return (
            "".join(word[0] for word in (name or "").split()[:2]).upper() or "?"
        )

    def _roster_orgs(self, post):
        """The ordered org audience for a roster. Uses the post's single audience
        resolver so the roster total always matches the post card's ack_total."""
        return list(post.audience_partner_queryset().order_by("name"))

    @action(detail=True, methods=["get"], url_path="rsvp-roster")
    def rsvp_roster(self, request, pk=None):
        """Per-strategic-partner RSVP roster for an event (staff only). An org
        counts as "going" when any of its users RSVP'd going. Mirrors `roster`."""
        post = self.get_object()
        if not is_issara_staff(request.user):
            raise PermissionDenied("The RSVP roster is staff-only.")

        orgs = self._roster_orgs(post)

        # Earliest "going" RSVP per org; prefer the denormalised partner, fall
        # back to the user link for legacy rows.
        going_at_by_org = {}
        rsvps = PartnerMessageBoardRSVP.objects.filter(
            post=post, status=PartnerMessageBoardRSVP.RSVP_GOING
        ).select_related("user__strategic_partner_user", "strategic_partner")
        for rsvp in rsvps:
            org_id = rsvp.strategic_partner_id
            if org_id is None:
                spu = getattr(rsvp.user, "strategic_partner_user", None)
                org_id = spu.strategic_partner_id if spu is not None else None
            if org_id is None:
                continue
            current = going_at_by_org.get(org_id)
            if current is None or rsvp.responded_at < current:
                going_at_by_org[org_id] = rsvp.responded_at

        reminded_at_by_org = self._reminded_map(post)
        roster = []
        for index, org in enumerate(orgs):
            responded_at = going_at_by_org.get(org.id)
            reminded_at = reminded_at_by_org.get(org.id)
            roster.append(
                {
                    "id": org.id,
                    "org": org.name,
                    "contact": org.focal_point_name or "",
                    "initials": self._org_initials(org.name),
                    "color": self._ROSTER_COLORS[index % len(self._ROSTER_COLORS)],
                    "going": responded_at is not None,
                    "responded_on": (
                        responded_at.date().isoformat() if responded_at else None
                    ),
                    "reminded": reminded_at is not None,
                    "reminded_on": (
                        reminded_at.date().isoformat() if reminded_at else None
                    ),
                }
            )

        return Response(
            {
                "post": post.id,
                "going_total": len(roster),
                "going_count": sum(1 for row in roster if row["going"]),
                "roster": roster,
            }
        )

    @action(detail=True, methods=["get"], url_path="reaction-roster")
    def reaction_roster(self, request, pk=None):
        """Per-strategic-partner reaction roster for a post (staff only). An org
        counts as "reacted" when any of its users left a reaction; the earliest
        reaction's emoji is shown for the org. Mirrors `rsvp_roster`."""
        post = self.get_object()
        if not is_issara_staff(request.user):
            raise PermissionDenied("The reaction roster is staff-only.")

        orgs = self._roster_orgs(post)

        # Earliest reaction per org (with its emoji); prefer the denormalised
        # partner, fall back to the user link for legacy rows.
        reaction_by_org = {}
        reactions = PartnerMessageBoardReaction.objects.filter(
            post=post
        ).select_related("user__strategic_partner_user", "strategic_partner")
        for reaction in reactions:
            org_id = reaction.strategic_partner_id
            if org_id is None:
                spu = getattr(reaction.user, "strategic_partner_user", None)
                org_id = spu.strategic_partner_id if spu is not None else None
            if org_id is None:
                continue
            current = reaction_by_org.get(org_id)
            if current is None or reaction.reacted_at < current[0]:
                reaction_by_org[org_id] = (reaction.reacted_at, reaction.emoji)

        roster = []
        for index, org in enumerate(orgs):
            entry = reaction_by_org.get(org.id)
            reacted_at = entry[0] if entry else None
            roster.append(
                {
                    "id": org.id,
                    "org": org.name,
                    "initials": self._org_initials(org.name),
                    "color": self._ROSTER_COLORS[index % len(self._ROSTER_COLORS)],
                    "reacted": entry is not None,
                    "emoji": entry[1] if entry else None,
                    "reacted_on": (
                        reacted_at.date().isoformat() if reacted_at else None
                    ),
                }
            )

        return Response(
            {
                "post": post.id,
                "react_total": len(roster),
                "react_count": sum(1 for row in roster if row["reacted"]),
                "roster": roster,
            }
        )


class PartnerMessageBoardCommentViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)
    serializer_class = PartnerMessageBoardCommentSerializer
    queryset = PartnerMessageBoardComment.objects.select_related("author").all()
    # No update / partial_update in V1 — comments are immutable once posted.
    http_method_names = ("get", "post", "delete", "head", "options")

    def _user_can_read_post(self, post: PartnerMessageBoard) -> bool:
        user = self.request.user
        # Same override as PartnerMessageBoardViewSet.get_queryset: an explicit
        # WorkOS partner role must win over Django-side staff flags on
        # whatever user row got resolved by email match.
        if is_issara_staff(user) and not has_explicit_partner_role(user):
            return True
        if not hasattr(user, "groups"):
            # Lightweight WorkOSUser without a Django twin: allow only when the
            # post is a broadcast.
            return bool(getattr(post, "audience_all", False))
        groups = user.groups.values_list("name", flat=True)
        if "global_partner" not in groups:
            return True
        if not hasattr(user, "strategic_partner_user"):
            return False
        return (
            user.strategic_partner_user.strategic_partner_id
            == post.strategic_partner_id
            or bool(post.audience_all)
        )

    def _django_user_or_none(self):
        user = self.request.user
        pk = getattr(user, "pk", None)
        return user if isinstance(pk, int) and pk > 0 else None

    def perform_create(self, serializer):
        post = serializer.validated_data["post"]
        if not self._user_can_read_post(post):
            raise PermissionDenied("You cannot comment on this post.")
        parent = serializer.validated_data.get("parent_comment")
        if parent is not None and parent.post_id != post.id:
            raise ValidationError(
                {"parent_comment": "parent_comment must belong to the same post"}
            )
        author = self._django_user_or_none()
        if author is None:
            raise PermissionDenied(
                "This action requires a fully provisioned account; please"
                " contact support to link your WorkOS user to an internal"
                " record."
            )
        serializer.save(author=author, strategic_partner=self._comment_partner())

    def _comment_partner(self):
        """Strategic partner to tag a comment with, so the Team Console can scope
        comments per partner. ONLY the explicit request hint — the facelift sends
        the acting partner id for partner comments and omits it for Cascade-team
        replies. We must NOT fall back to the author's `strategic_partner_user`
        link: Issara staff accounts can carry such a link and a reply would then
        be mis-attributed to a partner (and wrongly kept "awaiting reply")."""
        raw = (self.request.data or {}).get("strategic_partner_id")
        if raw in (None, ""):
            return None
        try:
            return StrategicPartner.objects.filter(pk=int(raw)).first()
        except (TypeError, ValueError):
            return None

    def perform_destroy(self, instance):
        user = self.request.user
        user_pk = getattr(user, "pk", None)
        if (
            isinstance(user_pk, int)
            and user_pk > 0
            and instance.author_id == user_pk
        ) or is_issara_staff(user):
            instance.delete()
            return
        raise PermissionDenied("You cannot delete this comment.")


class SupplierMessageBoardViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    queryset = SupplierMessageBoard.objects.all().order_by("-id")
    serializer_class = SupplierMessageBoardSerializer
    http_method_names = (
        "get",
        "head",
    )

    def get_queryset(self):
        queryset = self.queryset.select_related("supplier")
        groups = self.request.user.groups.values_list("name", flat=True)
        if not (
            self.request.user.is_staff
            and self.request.user.is_superuser
            and "global_partner" not in groups
        ):
            if not hasattr(self.request.user, "supplier_user"):
                return SupplierMessageBoard.objects.none()
            queryset = queryset.filter(
                supplier=self.request.user.supplier_user.supplier
            )
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class PersonContactViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = PersonContact.objects.all().order_by("-id")
    serializer_class = PersonContactSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class SupplyChainViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    queryset = SupplyChain.objects.all().order_by("-id")
    serializer_class = SupplyChainSerializer

    def get_queryset(self):
        # The serializer reads the through-model directly. Prefetch it with
        # each supplier name in one query and avoid the separate, unused
        # `suppliers` many-to-many prefetch. Restricting columns also avoids
        # loading the large Supplier and StrategicPartner rows in full.
        qs = (
            self.queryset.select_related("strategic_partner")
            .only(
                "id",
                "name",
                "strategic_partner_id",
                "strategic_partner__name",
            )
            .prefetch_related(
                Prefetch(
                    "suppliersupplychain_set",
                    queryset=SupplierSupplyChain.objects.select_related(
                        "supplier"
                    ).only(
                        "supplier_id",
                        "supply_chain_id",
                        "status",
                        "supplier__name",
                    ),
                )
            )
        )
        user = self.request.user
        if not hasattr(user, "groups"):
            return SupplyChain.objects.none()

        groups = user.groups.values_list("name", flat=True)
        if not (user.is_staff or user.is_superuser or "global_partner" not in groups):
            if not hasattr(user, "strategic_partner_user"):
                return SupplyChain.objects.none()
            qs = qs.filter(
                strategic_partner=user.strategic_partner_user.strategic_partner
            )

        ids = self.request.query_params.getlist("id")
        if not ids:
            id_param = self.request.query_params.get("id")
            if id_param:
                ids = [
                    item.strip() for item in str(id_param).split(",") if item.strip()
                ]

        if ids:
            normalized_ids = []
            for value in ids:
                try:
                    normalized_ids.append(int(str(value).strip()))
                except (TypeError, ValueError):
                    continue

            if normalized_ids:
                qs = qs.filter(id__in=normalized_ids)
            else:
                return SupplyChain.objects.none()
        return qs

    def get_serializer_class(self):
        if self.request.query_params.get("minimal") == "true":
            return SupplyChainMinimalSerializer
        return self.serializer_class


class CaseCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = CaseCategory.objects.all().order_by("-id")
    default_serializer_class = CaseCategorySerializer
    translation_serializer_class = CaseCategoryTranslationSerializer

    def get_serializer_class(self):
        return get_serializer(self, self.request)

    def get_queryset(self):
        """Filter case categories based on user type"""
        queryset = CaseCategory.objects.all()

        if hasattr(self.request.user, "supplier_user"):

            queryset = queryset.exclude(hide_for_supplier=True)
        else:

            queryset = queryset.exclude(supplier_only=True)

        return queryset.order_by("-id")

    def list(self, request, *args, **kwargs):
        lang = request.query_params.get("lang")
        if lang and lang != "en":
            translation_subquery = CaseCategoryTranslation.objects.filter(
                case_category__id=OuterRef("pk"), language__code=lang
            ).values("name")[:1]

            queryset = CaseCategory.objects.annotate(
                translated_name=Coalesce(Subquery(translation_subquery), "name")
            )
        else:
            queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ClientTypeViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    queryset = ClientType.objects.all().order_by("-id")
    default_serializer_class = ClientTypeSerializer
    translation_serializer_class = ClientTypeTranslationSerializer

    def get_serializer_class(self):
        return get_serializer(self, self.request)

    def filter_queryset(self, queryset):
        # The CSO audience is either a real CSO account or a client rendering
        # the CSO Worker Voice UI and saying so with `?cso_only=true` (see
        # `cso_audience`). Both land on the identical row set, so the Cascade
        # tester reviews the list a CSO officer actually gets. Everyone else is
        # unchanged: the Issara-worded rows, minus the CSO-only ones.
        if use_cso_audience(self.request):
            return queryset.exclude(hide_for_cso=True)
        return queryset.exclude(cso_only=True)

    def list(self, request, *args, **kwargs):
        lang = request.query_params.get("lang")
        if lang and lang != "en":
            translation_subquery = ClientTypeTranslation.objects.filter(
                client_type__id=OuterRef("pk"), language__code=lang
            ).values("name")[:1]

            queryset = ClientType.objects.annotate(
                translated_name=Coalesce(Subquery(translation_subquery), "name")
            )
        else:
            queryset = self.get_queryset()
        serializer = self.get_serializer(self.filter_queryset(queryset), many=True)
        return Response(serializer.data)


class ClientStatusViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = ClientStatus.objects.all().order_by("-id")
    default_serializer_class = ClientStatusSerializer
    translation_serializer_class = ClientStatusTranslationSerializer

    def get_serializer_class(self):
        return get_serializer(self, self.request)

    def list(self, request, *args, **kwargs):
        lang = request.query_params.get("lang")
        if lang and lang != "en":
            translation_subquery = ClientStatusTranslation.objects.filter(
                client_status__id=OuterRef("pk"), language__code=lang
            ).values("name")[:1]

            queryset = ClientStatus.objects.annotate(
                translated_name=Coalesce(Subquery(translation_subquery), "name")
            )
        else:
            queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ReferralActionViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    queryset = ReferralAction.objects.all().order_by("-id")
    default_serializer_class = ReferralActionSerializer
    translation_serializer_class = ReferralActionTranslationSerializer

    def get_serializer_class(self):
        return get_serializer(self, self.request)

    def filter_queryset(self, queryset):
        lang = self.request.query_params.get("lang")
        is_cso = "CSO" in [x.name for x in self.request.user.groups.all()]

        if lang and lang != "en":
            translation_subquery = ReferralActionTranslation.objects.filter(
                referral_action__id=OuterRef("pk"), language__code=lang
            ).values("name")[:1]

            queryset = ReferralAction.objects.annotate(
                translated_name=Coalesce(Subquery(translation_subquery), "name")
            )

        # The CSO Worker Voice form asks for the rows written for CSOs plus the
        # audience-neutral ones -- "Referral information provided to the
        # partner organization" is shared with Issara staff, so it carries
        # neither flag and would drop out of a plain cso_only filter. For this
        # opt-in lookup cso_only is the sole visibility field on the CSO rows:
        # deliberately do not apply hide_for_cso as a second filter to them,
        # because the org-worded rows carry it as a legacy leftover.
        if self.request.query_params.get("cso_only", "").lower() in {
            "1",
            "true",
            "yes",
        }:
            return queryset.filter(
                Q(cso_only=True) | Q(cso_only=False, hide_for_cso=False)
            )

        if is_cso:
            queryset = queryset.exclude(hide_for_cso=True)
        else:
            queryset = queryset.exclude(cso_only=True)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ReferralOrganisationViewSet(viewsets.ReadOnlyModelViewSet):
    """Organizations as referral targets -- a dropdown source, so read-only.

    Organizations are maintained by Issara staff in the admin, and by their own
    users through the CSO profile endpoint; neither route goes through here.
    """

    # Step 5 of the Worker Voice form reads this list, and that frontend
    # authenticates with an AuthKit bearer token. Without this the project
    # default answers 401 before any view code runs, and the dropdown renders
    # permanently empty.
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    queryset = Organization.objects.all().order_by("-id")
    serializer_class = ReferralOrganizationSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


"""
Note.. This is best used to get post or put a single object
the load time is obnovious.  Use CaseLeanViewSet for a list
"""


class CaseDeepViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = Case.objects.all()

    def get_queryset(self):
        qs = self.queryset.select_related(
            "case_status",
            "supplier",
            "work_place",
            "issara_staff",
            "next_steps_issara_staff",
            "source_recruiter",
            "destination_recruiter",
            "client_contract_type",
            "client_document_type",
            "client_gender",
            "client_ethnicity",
            "client_nationality",
            "case_category",
            "client_type",
            "client_status",
            "referral_action",
            "refer_to_org",
            "country",
            "province",
            "district",
            "client_origin_country",
            "client_origin_province",
            "client_origin_district",
            "client_crossing_country",
            "client_crossing_province",
            "client_crossing_province",
            "issue_category",
        )

        source_type = self.request.query_params.get("source_type")
        source_id = self.request.query_params.get("source_id")
        if source_type and source_id:

            if source_type == "KPI UPDATE":
                from kpis.models import SupplierKpiUpdate

                kpi_update = SupplierKpiUpdate.objects.filter(id=source_id).first()
                if kpi_update and hasattr(kpi_update, "case"):
                    return Case.objects.filter(id=kpi_update.case.id)
            elif source_type == "Call":
                from issara.ilm_server_2.models import Case

                return Case.objects.filter(id=source_id)

        return qs

    def get_serializer_class(self):
        if self.request.method in ["GET"]:
            return CaseDeepSerializer
        return CaseSerializer

    def create(self, request, *args, **kwargs):

        request.data["interacted"] = datetime.strptime(
            request.data["interacted"], "%Y-%m-%d"
        )
        case_interactions = request.data.pop("posted_case_interactions")
        listCreatedInteractions = []
        for interaction in case_interactions:
            interaction_user = interaction.get("issara_staff")
            if interaction_user:

                interaction["issara_staff"] = User.objects.get(pk=interaction_user)
            interaction_reason = interaction.get("interaction_reason")
            if interaction_reason:
                interaction["interaction_reason"] = InteractionReason.objects.get(
                    pk=interaction_reason
                )

            interaction_channel = interaction.get("interaction_channel")
            if interaction_channel:
                interaction["interaction_channel"] = InteractionChannel.objects.get(
                    pk=interaction_channel
                )

            interaction["type"] = interaction.get("type")

            listCreatedInteractions.append(
                CaseInteraction.objects.create(**interaction).id
            )
        request.data["case_interactions"] = listCreatedInteractions
        request.data["case_status"] = CaseStatus.objects.get(name="Open").pk
        request.data["case_created_by"] = request.user.id

        if "CSO" in [x.name for x in request.user.groups.all()]:
            if request.data["refer_to_org"] is not None:
                data = request.data
                org_kpi_email_templates = KpiEmailNotificationTemplate.objects.filter(
                    type="OZ"
                ).first()
                new_case = super().create(request)
                supplier_kpis_ids = (
                    Case.objects.get(id=new_case.data["id"])
                    .supplier_kpis.all()
                    .values_list("id", flat=True)
                )
                data["supplier_kpi"] = supplier_kpis_ids
                org_cso_user_email(data, org_kpi_email_templates, pk=None)
                self.case_cache_update()
                return new_case
        new_case = super().create(request)
        self.case_cache_update()
        return new_case

    def update(self, request, pk=None, *args, **kwargs):
        case_interactions = request.data.pop("posted_case_interactions")
        listCreatedInteractions = []

        for interaction in case_interactions:
            if not interaction.get("id"):
                listCreatedInteractions.append(interaction.get("id"))
            else:
                interaction_user = interaction.get("issara_staff")
                if interaction_user:
                    interaction["issara_staff"] = User.objects.get(pk=interaction_user)

                interaction_reason = interaction.get("interaction_reason")
                if interaction_reason:
                    interaction["interaction_reason"] = InteractionReason.objects.get(
                        pk=interaction_reason
                    )

                interaction_channel = interaction.get("interaction_channel")
                if interaction_channel:
                    interaction["interaction_channel"] = InteractionChannel.objects.get(
                        pk=interaction_channel
                    )

                interaction["type"] = interaction.get("type")
                current_interaction = CaseInteraction.objects.filter(
                    pk=interaction.get("id")
                )
                current_interaction.update(**interaction)
                listCreatedInteractions.append(current_interaction.first().id)
        request.data["case_interactions"] = listCreatedInteractions
        request.data["interacted"] = datetime.strptime(
            request.data["interacted"], "%Y-%m-%d"
        )

        if "CSO" in [x.name for x in request.user.groups.all()]:
            if request.data["refer_to_org"] is not None:
                data = request.data
                org_kpi_email_templates = KpiEmailNotificationTemplate.objects.filter(
                    type="OZ"
                ).first()
                new_case = super().create(request, *args, **kwargs)
                supplier_kpis_ids = (
                    Case.objects.get(id=new_case.data["id"])
                    .supplier_kpis.all()
                    .values_list("id", flat=True)
                )
                data["supplier_kpi"] = supplier_kpis_ids
                org_cso_user_email(data, org_kpi_email_templates, pk)
                updated_case = super().update(request, pk)
                self.case_cache_update()
                return updated_case
        updated_case = super().update(request, pk)
        self.case_cache_update()
        return updated_case

    def case_cache_update(self):
        cache.set(
            "all_cases",
            (Case.objects.all().values_list("supplier_kpis__id", flat=True).distinct()),
            settings.CACHE_TIMEOUT,
        )


def org_cso_user_email(data, org_kpi_email_templates, pk):

    org = Organization.objects.get(id=data["refer_to_org"])
    org_users = org.org.all()
    emails_list = []
    if org_users.exists():
        emails_list = User.objects.filter(
            id__in=org_users.values_list("user_id", flat=True)
        ).values_list("email", flat=True)
        kpis = []

        all_kpi = SupplierKpi.objects.filter(id__in=data["supplier_kpi"])
        for kpi in all_kpi:
            kpis.append(kpi)
        if "case_created_by" in data:
            case_registered_by = data["case_created_by"]
        else:
            case_registered_by = Case.objects.get(id=pk).case_created_by
            if case_registered_by is not None:
                case_registered_by = case_registered_by.organization_user
            else:
                return
        context = {
            "context": {
                "kpi_template": org_kpi_email_templates,
                "kpis": kpis,
                "org_referred": Organization.objects.filter(id=data["refer_to_org"])
                .first()
                .name,
                "case_org": Organization.objects.filter(org=case_registered_by)
                .first()
                .name,
            }
        }

        html_message = render_to_string("emails/kpi_referral_org.html", context)
        plain_message = strip_tags(html_message)
        data = {}
        data["to"] = emails_list
        data["subject"] = org_kpi_email_templates.subject
        data["text"] = plain_message
        data["html"] = html_message
        emailer = EmailMailgun()
        emailer.send_email(data)


class CaseStatusViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    queryset = CaseStatus.objects.all().order_by("name")
    serializer_class = CaseStatusSerializer

    def filter_queryset(self, queryset):
        """Audience filter, opt-in the same way `ReferralActionViewSet` is.

        "Early warning risk" and "Forced labor risk" were added for the Cascade
        Worker Voice form only. Making them `cso_only` is not enough on its own
        -- ILM-fronted serves CSO users too, and would start offering them
        there -- so a client has to ask for the CSO set by name. Every existing
        caller keeps exactly the list it has always had.
        """
        if self.request.query_params.get("cso_only", "").lower() in {
            "1",
            "true",
            "yes",
        }:
            return queryset.filter(
                Q(cso_only=True) | Q(cso_only=False, hide_for_cso=False)
            )
        return queryset.exclude(cso_only=True)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class UserTaskViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = UserTask.objects.all().order_by("-id")
    serializer_class = UserTaskSerializer
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filter_class = UserTaskFilters
    ordering_fields = [
        "id",
        "source_id",
        "source_type",
        "assigned_by",
        "assigned_to",
        "deadline",
        "created_at",
        "modified_at",
        "assigned_by_name",
        "assigned_to_name",
        "supplier_name",
        "sps_name",
    ]

    def get_queryset(self):
        qs = self.queryset
        user = self.request.user

        if hasattr(user, "organization_user") or user.groups in ["CSO"]:
            organization = user.organization_user.organization
            qs = self._filter_by_organization(qs, organization)
        elif user.groups in ["Issara Staff", "Issara Management"]:
            qs = self._filter_by_staff(qs)

        qs = self._annotate_and_order(qs)
        return qs

    def _filter_by_organization(self, qs, organization):
        return qs.filter(
            assigned_by__organization_user__organization=organization,
        )

    def _filter_by_staff(self, qs):
        return qs.filter(assigned_by__is_staff=True, assigned_to__is_staff=True)

    def _annotate_and_order(self, qs):
        from django.db.models import Case as DbCase, When

        # Supplier name subqueries per source type
        kpi_supplier_sq = SupplierKpi.objects.filter(id=OuterRef("source_id")).values(
            "supplier__name"
        )[:1]

        from issara.ilm_server_2.models import Case as CaseModel

        call_supplier_sq = CaseModel.objects.filter(id=OuterRef("source_id")).values(
            "supplier__name"
        )[:1]

        br_supplier_sq = Supplier.objects.filter(
            businessresponse=OuterRef("source_id")
        ).values("name")[:1]

        # Strategic partner subqueries per source type
        kpi_sps_sq = SupplierKpi.objects.filter(id=OuterRef("source_id")).values(
            "supplier__suppliersupplychain__supply_chain__strategic_partner__name"
        )[:1]

        call_sps_sq = CaseModel.objects.filter(id=OuterRef("source_id")).values(
            "supplier__suppliersupplychain__supply_chain__strategic_partner__name"
        )[:1]

        br_sps_sq = Supplier.objects.filter(
            businessresponse=OuterRef("source_id")
        ).values("suppliersupplychain__supply_chain__strategic_partner__name")[:1]

        return qs.annotate(
            assigned_by_name=F("assigned_by__first_name"),
            assigned_to_name=F("assigned_to__first_name"),
            supplier_name=DbCase(
                When(source_type="KPI UPDATE", then=Subquery(kpi_supplier_sq)),
                When(source_type="Call", then=Subquery(call_supplier_sq)),
                When(source_type="Business Response", then=Subquery(br_supplier_sq)),
                default=Value(None),
                output_field=models.CharField(),
            ),
            sps_name=DbCase(
                When(source_type="KPI UPDATE", then=Subquery(kpi_sps_sq)),
                When(source_type="Call", then=Subquery(call_sps_sq)),
                When(source_type="Business Response", then=Subquery(br_sps_sq)),
                default=Value(None),
                output_field=models.CharField(),
            ),
        )

    def retrieve(self, request, *args, **kwargs):

        source_type = request.query_params.get("source_type", None)
        source_id = kwargs.get("pk")
        response_data = None

        if source_type == "KPI UPDATE":
            from kpis.models import SupplierKpi
            from kpis.serializers import SupplierKpiReadOnlySerializer

            try:
                supplier_kpi = SupplierKpi.objects.get(pk=source_id)
                serializer = SupplierKpiReadOnlySerializer(supplier_kpi)
                response_data = serializer.data
            except SupplierKpi.DoesNotExist:
                pass
        elif source_type == "Call":
            from issara.ilm_server_2.models import Case
            from issara.ilm_server_2.serializers import CaseSerializer

            try:
                call = Case.objects.get(pk=source_id)
                serializer = CaseSerializer(call)
                response_data = serializer.data
            except Case.DoesNotExist:
                pass
        else:
            try:
                business_response = BusinessResponse.objects.get(pk=source_id)
                serializer = BusinessResponseSerializer(business_response)
                response_data = serializer.data
            except BusinessResponse.DoesNotExist:
                pass

        if response_data is not None:
            return Response(response_data, status=200)
        else:
            return Response({"detail": "Not found."}, status=404)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class WorkPlaceViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = WorkPlace.objects.all().order_by("name")
    serializer_class = WorkPlaceSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class IssueCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = IssueCategory.objects.all().order_by("name")
    default_serializer_class = IssueCategorySerializer
    translation_serializer_class = IssueCategoryTranslationSerializer

    def get_serializer_class(self):
        return get_serializer(self, self.request)

    @method_decorator(cache_control(max_age=60 * 60 * 24, private=True))
    @method_decorator(vary_on_headers("Authorization"))
    def list(self, request, *args, **kwargs):
        lang = request.query_params.get("lang")
        if lang and lang != "en":
            translation_subquery = IssueCategoryTranslation.objects.filter(
                issue_category__id=OuterRef("pk"), language__code=lang
            ).values("name")[:1]

            queryset = IssueCategory.objects.annotate(
                translated_name=Coalesce(Subquery(translation_subquery), "name")
            )
        else:
            queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class NationalityViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = Nationality.objects.all().select_related("imageicon").order_by("name")
    serializer_class = NationalitySerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class InteractionReasonViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = InteractionReason.objects.all().order_by("name")
    default_serializer_class = InteractionReasonSerializer
    translation_serializer_class = InteractionReasonTranslationSerializer

    def get_serializer_class(self):
        return get_serializer(self, self.request)

    def filter_queryset(self, queryset):
        lang = self.request.query_params.get("lang")
        # A real CSO, or a client rendering the CSO Worker Voice UI that asked
        # for the CSO rows with `?cso_only=true` (see `cso_audience`).
        is_cso = use_cso_audience(self.request)

        if lang and lang != "en":
            translation_subquery = InteractionReasonTranslation.objects.filter(
                interaction_reason__id=OuterRef("pk"), language__code=lang
            ).values("name")[:1]

            queryset = InteractionReason.objects.annotate(
                translated_name=Coalesce(Subquery(translation_subquery), "name")
            )

        # Audience filtering applies to every language. It used to sit inside
        # the branch above, so English requests -- the default -- returned the
        # Issara-worded and cso_only rows to everyone.
        if is_cso:
            queryset = queryset.exclude(hide_for_cso=True)
        else:
            queryset = queryset.exclude(cso_only=True)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class InteractionChannelViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = InteractionChannel.objects.all().order_by("name")
    default_serializer_class = InteractionChannelSerializer
    translation_serializer_class = InteractionChannelTranslationSerializer

    def get_serializer_class(self):
        return get_serializer(self, self.request)

    def get_queryset(self):
        """Filter interaction channels based on user type"""
        return InteractionChannel.get_for_user(
            self.request.user, cso_audience=requests_cso_audience(self.request)
        )

    def list(self, request, *args, **kwargs):
        lang = request.query_params.get("lang")
        if lang and lang != "en":
            translation_subquery = InteractionChannelTranslation.objects.filter(
                interaction_channel__id=OuterRef("pk"), language__code=lang
            ).values("name")[:1]

            queryset = InteractionChannel.objects.annotate(
                translated_name=Coalesce(Subquery(translation_subquery), "name")
            )
        else:
            queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class EthnicityViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = Ethnicity.objects.all().order_by("name")
    serializer_class = EthnicitySerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class ContractTypeViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = ContractType.objects.all().order_by("name")
    serializer_class = ContractTypeSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class DocumentTypeViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = DocumentType.objects.all().order_by("name")
    serializer_class = DocumentTypeSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class CaseViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = Case.objects.all().order_by("-id")
    serializer_class = CaseSerializer


class MmThaiDemandDataViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = MmThaiDemandData.objects.all().order_by("-record_date")
    serializer_class = MmThaiDemandDataSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({"results": serializer.data})


class MmThaiSendingDataRawViewSet(APIView):
    def get(self, request):

        big_query = f"""select mm_thai_sending_data.*,
                            (select suppliers.name from suppliers where suppliers.id=mm_thai_sending_data.supplier_id) as supplier_name,
                            (select factory_types.name from factory_types where factory_types.id=mm_thai_sending_data.factory_type_id) as factory_type_name,
                            (select recruiters.name from recruiters where recruiters.id=mm_thai_sending_data.recruiter_id) as recruiter_name,
                            (select industries.name from industries where industries.id=mm_thai_sending_data.industry_id) as industry_name,
                            (select subindustries.name from subindustries where subindustries.id=mm_thai_sending_data.subindustry_id) as subindustry_name,
                            (select provinces.name from provinces where provinces.id=mm_thai_sending_data.province_id) as province_name
                        from mm_thai_sending_data order by mm_thai_sending_data.record_date desc """

        return Response(
            MmThaiSendingDataSerializer(
                MmThaiSendingData.objects.raw(big_query), many=True
            ).data
        )


class MmThaiSendingDataViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = MmThaiSendingData.objects.all()
    serializer_class = MmThaiSendingDataSerializerOriginal

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset().select_related(
            "recruiter",
            "supplier",
            "industry",
            "subindustry",
            "factory_type",
            "province",
        )
        groups = self.request.user.groups.values_list("name", flat=True)
        if not (
            self.request.user.is_staff
            or self.request.user.is_superuser
            or "global_partner" not in groups
        ):
            if not hasattr(self.request.user, "strategic_partner_user"):
                queryset = MmThaiSendingData.objects.none()
            supply_chains = (
                self.request.user.strategic_partner_user.strategic_partner.supplychain_set.all()
            )
            supplier_ids = Supplier.objects.filter(
                pk__in=supply_chains.values_list("suppliers", flat=True)
            ).values_list("id", flat=True)
            queryset = queryset.filter(supplier_id__in=supplier_ids)
        serializer = self.serializer_class(queryset.order_by("-record_date"), many=True)
        return Response(serializer.data)


class FactoryTypeViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = FactoryType.objects.all().order_by("name")
    serializer_class = FactoryTypeSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class VesselTypeViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = VesselType.objects.all().order_by("name")
    serializer_class = VesselTypeSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


def industry_etag_func(request, *args, **kwargs):
    """
    ETag for industries keyed on row content (id + name).
    """
    pk = kwargs.get("pk")
    if pk:
        row = Industry.objects.filter(pk=pk).values_list("id", "name").first()
        if not row:
            return None
        payload = f"{row[0]}:{row[1]}"
        return hashlib.md5(payload.encode()).hexdigest()

    digest = hashlib.md5()
    has_rows = False
    for industry_id, name in (
        Industry.objects.order_by("id").values_list("id", "name").iterator()
    ):
        has_rows = True
        digest.update(f"{industry_id}:{name}|".encode())

    if not has_rows:
        return None
    return digest.hexdigest()


class IndustryViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = Industry.objects.only("id", "name").order_by("name")
    serializer_class = IndustrySerializer

    @method_decorator(
        cache_control(max_age=60 * 15, private=True, must_revalidate=True)
    )
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(industry_etag_func))
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)

    @method_decorator(
        cache_control(max_age=60 * 15, private=True, must_revalidate=True)
    )
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(industry_etag_func))
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


def subindustry_etag_func(request, *args, **kwargs):
    """
    ETag for subindustries keyed on latest update and count.
    """
    pk = kwargs.get("pk")
    if pk:
        latest = SubIndustry.objects.filter(pk=pk).aggregate(latest=Max("updated_at"))
        latest_ts = latest.get("latest")
        if not latest_ts:
            return None
        payload = f"{pk}:{latest_ts}"
    else:
        latest = SubIndustry.objects.aggregate(
            latest=Max("updated_at"), total=Count("id")
        )
        latest_ts = latest.get("latest")
        if not latest_ts:
            return None
        payload = f"list:{latest_ts}:{latest.get('total')}"

    return hashlib.md5(str(payload).encode()).hexdigest()


class SubIndustryViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = SubIndustry.objects.select_related("industry").order_by("name")
    serializer_class = SubIndustrySerializer

    @method_decorator(
        cache_control(max_age=60 * 15, private=True, must_revalidate=True)
    )
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(subindustry_etag_func))
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)

    @method_decorator(
        cache_control(max_age=60 * 15, private=True, must_revalidate=True)
    )
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(subindustry_etag_func))
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


def country_etag_func(request, *args, **kwargs):
    """
    Generate a stable ETag based on the latest country update and total count.
    Any create/update/delete will bump updated_at or the count, changing the hash.
    """
    pk = kwargs.get("pk")
    if pk:
        latest = Country.objects.filter(pk=pk).aggregate(latest=Max("updated_at"))
        latest_ts = latest.get("latest")
        if not latest_ts:
            return None
        payload = f"{pk}:{latest_ts}"
    else:
        latest = Country.objects.aggregate(latest=Max("updated_at"), total=Count("id"))
        latest_ts = latest.get("latest")
        if not latest_ts:
            return None
        payload = f"list:{latest_ts}:{latest.get('total')}"

    return hashlib.md5(str(payload).encode()).hexdigest()


def province_etag_func(request, *args, **kwargs):
    """
    ETag for provinces keyed on latest update and count.
    """
    pk = kwargs.get("pk")
    if pk:
        latest = Province.objects.filter(pk=pk).aggregate(latest=Max("updated_at"))
        latest_ts = latest.get("latest")
        if not latest_ts:
            return None
        payload = f"{pk}:{latest_ts}"
    else:
        latest = Province.objects.aggregate(latest=Max("updated_at"), total=Count("id"))
        latest_ts = latest.get("latest")
        if not latest_ts:
            return None
        payload = f"list:{latest_ts}:{latest.get('total')}"

    return hashlib.md5(str(payload).encode()).hexdigest()


def district_etag_func(request, *args, **kwargs):
    """
    ETag for districts keyed on latest update and count.
    """
    pk = kwargs.get("pk")
    if pk:
        latest = District.objects.filter(pk=pk).aggregate(latest=Max("updated_at"))
        latest_ts = latest.get("latest")
        if not latest_ts:
            return None
        payload = f"{pk}:{latest_ts}"
    else:
        latest = District.objects.aggregate(latest=Max("updated_at"), total=Count("id"))
        latest_ts = latest.get("latest")
        if not latest_ts:
            return None
        payload = f"list:{latest_ts}:{latest.get('total')}"

    return hashlib.md5(str(payload).encode()).hexdigest()


class CountryViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    """
    API endpoint that allows users to be viewed or edited.
    """

    queryset = Country.objects.all().order_by("name")
    serializer_class = CountrySerializer

    @method_decorator(
        cache_control(max_age=60 * 15, private=True, must_revalidate=True)
    )
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(country_etag_func))
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)

    @method_decorator(
        cache_control(max_age=60 * 15, private=True, must_revalidate=True)
    )
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(country_etag_func))
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


class ProvinceViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = Province.objects.all().order_by("name")
    serializer_class = ProvinceSerializer

    @method_decorator(
        cache_control(max_age=60 * 15, private=True, must_revalidate=True)
    )
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(province_etag_func))
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)

    @method_decorator(
        cache_control(max_age=60 * 15, private=True, must_revalidate=True)
    )
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(province_etag_func))
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


class DistrictViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = District.objects.all().order_by("name")
    serializer_class = DistrictSerializer

    @method_decorator(
        cache_control(max_age=60 * 15, private=True, must_revalidate=True)
    )
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(district_etag_func))
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)

    @method_decorator(
        cache_control(max_age=60 * 15, private=True, must_revalidate=True)
    )
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(district_etag_func))
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


class RecruiterViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = Recruiter.objects.all().order_by("name")
    serializer_class = RecruiterSerializer

    def get_queryset(self):
        qs = self.queryset.select_related("industry", "country", "province", "district")

        queryset = MmThaiSendingData.objects.select_related(
            "recruiter",
            "supplier",
            "industry",
            "subindustry",
            "factory_type",
            "province",
        )
        groups = self.request.user.groups.values_list("name", flat=True)
        if not (
            self.request.user.is_staff
            or self.request.user.is_superuser
            or "global_partner" not in groups
        ):
            if not hasattr(self.request.user, "strategic_partner_user"):
                queryset = Recruiter.objects.none()
            supply_chains = (
                self.request.user.strategic_partner_user.strategic_partner.supplychain_set.all()
            )
            supplier_ids = Supplier.objects.filter(
                pk__in=supply_chains.values_list("suppliers", flat=True)
            ).values_list("id", flat=True)
            recruiter_ids = queryset.filter(supplier_id__in=supplier_ids).values_list(
                "recruiter", flat=True
            )
            qs = qs.filter(id__in=recruiter_ids)

        return qs

    @action(
        detail=True,
        methods=["post", "delete", "get"],
        parser_classes=[MultiPartParser, FormParser],
    )
    def image(self, request, pk=None):
        """
        Handle recruiter image upload/deletion/retrieval.
        POST: Upload or update recruiter image
        DELETE: Remove recruiter image
        GET: Retrieve recruiter image URL
        """
        recruiter = self.get_object()

        if request.method == "POST":
            image_file = request.FILES.get("image") or request.FILES.get("logo")
            if image_file is None:
                return Response(
                    {"detail": "No image file provided."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            content_type = (getattr(image_file, "content_type", "") or "").lower()
            if content_type and not content_type.startswith("image/"):
                return Response(
                    {"detail": "Uploaded file must be an image."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            recruiter.image = image_file
            recruiter.save(update_fields=["image"])
            image_url = recruiter.image.url if recruiter.image else None
            return Response(
                {"image": image_url, "logo": image_url},
                status=status.HTTP_200_OK,
            )

        elif request.method == "DELETE":
            if recruiter.image:
                recruiter.image.delete()
                recruiter.image = None
                recruiter.save(update_fields=["image"])
                return Response(status=status.HTTP_204_NO_CONTENT)

            return Response(
                {"detail": "No image to delete."},
                status=status.HTTP_404_NOT_FOUND,
            )

        elif request.method == "GET":
            image_url = recruiter.image.url if recruiter.image else None
            return Response(
                {"image": image_url, "logo": image_url},
                status=status.HTTP_200_OK,
            )


def supplier_etag_func(request, *args, **kwargs):
    supplier_id = kwargs.get("pk")

    if not supplier_id:

        queryset = (
            Supplier.objects.select_related(
                "vessel_type", "country", "province", "district"
            )
            .prefetch_related(
                "additional_contacts",
                "reports",
                "industries",
                "subindustries",
                Prefetch(
                    "supplierrecruiters_set", queryset=SupplierRecruiters.objects.all()
                ),
            )
            .order_by("name")
        )
        user = request.user
        if not (user.is_staff or user.is_superuser):
            groups = user.groups.values_list("name", flat=True)
            if "global_partner" in groups and hasattr(user, "strategic_partner_user"):
                supply_chains = (
                    user.strategic_partner_user.strategic_partner.supplychain_set.all()
                )
                queryset = queryset.filter(
                    pk__in=supply_chains.values_list("suppliers", flat=True)
                )

        latest_update = queryset.aggregate(latest_update=Max("updated_at"))[
            "latest_update"
        ]
    else:

        try:
            supplier = Supplier.objects.get(pk=supplier_id)
            latest_update = supplier.updated_at
        except Supplier.DoesNotExist:
            return None

    if latest_update:
        return hashlib.md5(str(latest_update).encode()).hexdigest()
    return None


class SupplierViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)
    serializer_class = SupplierSerializer

    queryset = (
        Supplier.objects.select_related(
            "vessel_type", "country", "province", "district"
        )
        .prefetch_related(
            "additional_contacts",
            "reports",
            "industries",
            "subindustries",
            Prefetch(
                "supplierrecruiters_set",
                queryset=SupplierRecruiters.objects.select_related("recruiter"),
            ),
            Prefetch(
                "suppliersupplychain_set",
                queryset=SupplierSupplyChain.objects.select_related("supply_chain"),
            ),
        )
        .annotate(
            former_supplier=Exists(
                SupplierSupplyChain.objects.filter(
                    supplier=OuterRef("pk"),
                    status=SupplierSupplyChain.STATUS_FORMER_SUPPLIER,
                )
            )
        )
        .order_by("name")
    )
    CACHE_NAME_SUPPLIERS = f"suppliers_queryset_cache"

    def get_queryset(self):
        user = self.request.user
        groups = user.groups.values_list("name", flat=True)

        queryset = super().get_queryset()

        if user.is_staff or user.is_superuser:
            return queryset

        if "global_partner" in groups and hasattr(user, "strategic_partner_user"):
            supply_chains = (
                user.strategic_partner_user.strategic_partner.supplychain_set.all()
            )
            queryset = queryset.filter(
                pk__in=supply_chains.values_list("suppliers", flat=True)
            )

        return queryset

    @method_decorator(cache_control(max_age=60 * 60 * 2, private=True, no_cache=True))
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(supplier_etag_func))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @method_decorator(cache_control(max_age=60 * 15, private=True, no_cache=True))
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(supplier_etag_func))
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=["post", "patch", "delete", "put", "get"])
    def documents(self, request, pk=None):
        supplier = self.get_object()
        if request.method in ["POST", "PUT"]:
            serializer = ReportUploadSerializer(
                data=request.data, context={"request": request}
            )
            if serializer.is_valid():
                document = serializer.save(supplier=supplier)
                self.update_list_cache(request, supplier)
                return Response(document, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == "PATCH":
            document_id = request.data.get("document_id")
            try:
                document = supplier.reports.get(id=document_id)
                serializer = SharedFileSerializer(
                    document,
                    data=request.data,
                    partial=True,
                    context={"request": request},
                )
                if serializer.is_valid():
                    serializer.save()
                    self.update_list_cache(request, supplier)
                    return Response(serializer.data, status=status.HTTP_200_OK)
            except supplier.reports.model.DoesNotExist:
                return Response(
                    {"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == "DELETE":
            document_ids = request.data.get("document_ids")
            try:
                supplier.reports.filter(id__in=document_ids).delete()
                self.update_list_cache(request, supplier)
                return Response(status=status.HTTP_204_NO_CONTENT)
            except supplier.reports.model.DoesNotExist:
                return Response(
                    {"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND
                )

        elif request.method == "GET":
            response = Response(SharedFileSerializer(supplier.reports, many=True).data)
            response["Cache-Control"] = "private, max-age=300"
            response["Vary"] = "Authorization"
            return response

        return Response(
            {"detail": "Invalid request"}, status=status.HTTP_400_BAD_REQUEST
        )

    def update_list_cache(self, request=None, supplier=None):
        """
        Invalidate supplier list caching and refresh ETags by bumping updated_at.
        """
        cache.delete(self.CACHE_NAME_SUPPLIERS)
        if supplier:
            Supplier.objects.filter(pk=supplier.pk).update(updated_at=timezone.now())

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["user"] = self.request.user
        return context

    @action(detail=True, methods=["post", "delete", "get"], parser_classes=[MultiPartParser, FormParser])
    def image(self, request, pk=None):
        """
        Handle supplier logo upload/deletion/retrieval.
        POST: Upload or update supplier logo (stored as SharedFile)
        DELETE: Remove supplier logo
        GET: Retrieve current supplier logo URL
        """
        supplier = self.get_object()

        if request.method == "POST":
            image_file = request.FILES.get("image") or request.FILES.get("logo")
            if image_file is None:
                return Response(
                    {"detail": "No image file provided."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            content_type = (getattr(image_file, "content_type", "") or "").lower()
            if content_type and not content_type.startswith("image/"):
                return Response(
                    {"detail": "Uploaded file must be an image."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            shared_file = SharedFile.create_from_upload(image_file, type="S")
            supplier.imageicon = shared_file
            supplier.save(update_fields=["imageicon"])

            logo_url = shared_file.file_path.url if shared_file.file_path else None
            return Response(
                {"image": logo_url, "logo": logo_url, "imageicon": supplier.imageicon_id},
                status=status.HTTP_200_OK,
            )

        elif request.method == "DELETE":
            if supplier.imageicon_id is None:
                return Response(
                    {"detail": "No image to delete."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            supplier.imageicon = None
            supplier.save(update_fields=["imageicon"])
            return Response(status=status.HTTP_204_NO_CONTENT)

        elif request.method == "GET":
            logo_url = None
            if supplier.imageicon and supplier.imageicon.file_path:
                logo_url = supplier.imageicon.file_path.url
            return Response(
                {"image": logo_url, "logo": logo_url, "imageicon": supplier.imageicon_id},
                status=status.HTTP_200_OK,
            )

    @method_decorator(cache_control(max_age=60 * 15, private=True))
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(supplier_etag_func))
    @action(detail=True, methods=["get"])
    def total_workers(self, request, pk=None):
        supplier = self.get_object()
        total = supplier.worker_count()
        return Response({"Total_workers": total}, status=status.HTTP_200_OK)

    @method_decorator(cache_control(max_age=60 * 15, private=True))
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(supplier_etag_func))
    @action(detail=True, methods=["get"])
    def closed_cases(self, request, pk=None):
        supplier = self.get_object()
        cases = supplier.cases_days()
        if cases["under60"] != 0:
            percentage = cases["under60"] * 100 / supplier.kpis.all().count()
            return Response(
                {"closed_cases percentage under 60 days": percentage},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"closed_cases percentage under 60 days": 0}, status=status.HTTP_200_OK
        )

    @method_decorator(cache_control(max_age=60 * 15, private=True))
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(supplier_etag_func))
    @action(detail=True, methods=["get"])
    def cases_quality_level(self, request, pk=None):
        supplier = self.get_object()
        level = supplier.cases_quality_level()
        return Response(
            {"closed_cases_quality_level": level}, status=status.HTTP_200_OK
        )

    @method_decorator(cache_control(max_age=60 * 15, private=True))
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(supplier_etag_func))
    @action(detail=True, methods=["get"])
    def supplier_has_supply_chain(self, request, pk=None):
        supplier = self.get_object()
        supply_chain_exists = supplier.supplychain_set.exists()
        return Response(
            {"Supplier has supply chain": supply_chain_exists},
            status=status.HTTP_200_OK,
        )


class SuppliersListFlatAPI(SupplierViewSet):
    serializer_class = SuppliersListFlatSerializer

    def list(self, request, *args, **kwargs):
        """Allow cache refresh with ?refresh=1 or ?no_cache=1 parameter"""

        if request.query_params.get("refresh") or request.query_params.get("no_cache"):
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        return super().list(request, *args, **kwargs)


class StregicPartnerViewSet(viewsets.ModelViewSet):

    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)
    pagination_class = CustomPageNumberPagination

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = StrategicPartner.objects.all().order_by("name")
    serializer_class = StrategicPartnerSerializer

    @action(detail=True, methods=["post"], url_path="toggle-notification")
    def toggle_notification(self, request, pk=None):
        """
        Toggle user-specific email notification for a Strategic Partner.
        Expects: { "email_notification": true/false }
        """
        from workplan.models import WorkplanEmailNotificationSetting

        def get_notification_field():
            if hasattr(WorkplanEmailNotificationSetting, "notify_on_workplan_change"):
                return "notify_on_workplan_change"
            if hasattr(WorkplanEmailNotificationSetting, "notify_on_document_upload"):
                return "notify_on_document_upload"
            return None

        def parse_enabled(val):
            if isinstance(val, str):
                return val.lower() == "true"
            return bool(val)

        user = request.user
        partner = self.get_object()
        enabled = request.data.get("email_notification", None)
        if enabled is None:
            return Response({"error": "Missing email_notification"}, status=400)
        enabled = parse_enabled(enabled)

        notification_field = get_notification_field()
        if not notification_field:
            return Response(
                {"error": "No valid notification field found in model."}, status=500
            )

        defaults = {notification_field: enabled}
        setting, created = WorkplanEmailNotificationSetting.objects.get_or_create(
            issara_user=user, strategic_partner=partner, defaults=defaults
        )
        if not created:
            setattr(setting, notification_field, enabled)
            setting.save()
        return Response({"email_notification": getattr(setting, notification_field)})

    def get_queryset(self):
        from django.db.models import Exists, OuterRef, Subquery
        from .models import WorkPlanAuditTrail, SPWorkplan

        latest_workplan_subquery = (
            WorkPlanAuditTrail.objects.filter(
                workplan__strategic_partner=OuterRef("pk")
            )
            .order_by("-created_at")
            .values("created_at")[:1]
        )

        workplan_docs_prefetch = Prefetch(
            "spworkplan__workplandocs_set",
            queryset=WorkplanDocs.objects.select_related("document").order_by("id"),
            to_attr="prefetched_docs",
        )

        qs = self.queryset.select_related(
            "country", "imageicon", "spworkplan"
        ).prefetch_related(
            "strategic_partner_files",
            "policy_compliance_items__policy_compliance",
            "policy_compliance_items__file",
            workplan_docs_prefetch,
        ).annotate(
            latest_workplan_update=Subquery(latest_workplan_subquery),
            has_workplan=Exists(
                SPWorkplan.objects.filter(strategic_partner_id=OuterRef("pk"))
            ),
        )

        groups = self.request.user.groups.values_list("name", flat=True)
        if not (
            self.request.user.is_staff
            or self.request.user.is_superuser
            or "global_partner" not in groups
        ):
            if not hasattr(self.request.user, "strategic_partner_user"):
                return StrategicPartner.objects.none()
            qs = qs.filter(
                id=self.request.user.strategic_partner_user.strategic_partner.id
            )

        user = self.request.user
        notification_settings = WorkplanEmailNotificationSetting.objects.filter(
            issara_user=user
        )
        notification_field = None
        if notification_settings.exists():
            first_setting = notification_settings.first()
            if hasattr(first_setting, "notify_on_workplan_change"):
                notification_field = "notify_on_workplan_change"
            elif hasattr(first_setting, "notify_on_document_upload"):
                notification_field = "notify_on_document_upload"
        if notification_field:
            notification_map = {
                getattr(s, "strategic_partner_id"): getattr(
                    s, notification_field, False
                )
                for s in notification_settings
            }
        else:
            notification_map = {}

        for partner in qs:
            partner._user_email_notification = notification_map.get(partner.id, False)

        work_plan_param = self.request.query_params.get("work_plan", None)
        if work_plan_param is not None:
            if work_plan_param.lower() == "true":
                qs = qs.filter(spworkplan__isnull=False)
            elif work_plan_param.lower() == "false":
                qs = qs.filter(spworkplan__isnull=True)
        country_param = self.request.query_params.get("country", None)
        if country_param is not None and country_param != "":
            try:
                qs = qs.filter(country=int(country_param))
            except Exception:
                pass

        industry_param = self.request.query_params.get(
            "industry", None
        ) or self.request.query_params.get("industry_id", None)
        if industry_param is not None and industry_param != "":
            try:
                industry_ids = [
                    int(industry_id)
                    for industry_id in str(industry_param).split(",")
                    if industry_id.strip()
                ]
            except Exception:
                industry_ids = []
            if industry_ids:
                qs = qs.filter(industries__industry_id__in=industry_ids).distinct()

        search_param = self.request.query_params.get("search", None)
        if search_param is not None and search_param.strip() != "":
            qs = qs.filter(name__icontains=search_param.strip())

        return qs

    @action(
        detail=True,
        methods=["post", "delete", "get"],
        parser_classes=[MultiPartParser, FormParser],
    )
    def image(self, request, pk=None):
        """
        Handle strategic partner logo upload/deletion/retrieval.
        POST: Upload or update partner logo
        DELETE: Remove partner logo
        GET: Retrieve current partner logo URL
        """
        partner = self.get_object()

        if request.method == "POST":
            if "image" not in request.FILES:
                return Response(
                    {"detail": "No image file provided."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            image_file = request.FILES["image"]
            content_type = (getattr(image_file, "content_type", "") or "").lower()
            if content_type and not content_type.startswith("image/"):
                return Response(
                    {"detail": "Uploaded file must be an image."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            shared_file = SharedFile.create_from_upload(image_file, type="SP")
            partner.imageicon = shared_file
            # Keep one source of truth for logo and avoid stale URL fallback.
            partner.image = None
            partner.save(update_fields=["imageicon", "image", "last_modified"])

            payload = StrategicPartnerSerializer(
                partner, context={"request": request}
            ).data
            return Response(
                {
                    "logo": payload.get("logo"),
                    "imageicon": partner.imageicon_id,
                    "image": partner.image,
                },
                status=status.HTTP_200_OK,
            )

        elif request.method == "DELETE":
            if partner.imageicon_id is None and not partner.image:
                return Response(
                    {"detail": "No logo to delete."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            partner.imageicon = None
            partner.image = None
            partner.save(update_fields=["imageicon", "image", "last_modified"])
            return Response(status=status.HTTP_204_NO_CONTENT)

        elif request.method == "GET":
            payload = StrategicPartnerSerializer(
                partner, context={"request": request}
            ).data
            return Response(
                {
                    "logo": payload.get("logo"),
                    "imageicon": partner.imageicon_id,
                    "image": partner.image,
                },
                status=status.HTTP_200_OK,
            )

    @action(
        detail=True,
        methods=[
            "get",
        ],
    )
    def suppliers(self, request, pk=None):
        return Response(
            {
                "suppliers": self.get_object().supplychain_set.values(
                    "suppliers__pk", "suppliers__name"
                )
            },
            status=200,
        )

    @action(
        detail=True,
        methods=[
            "get",
        ],
    )
    def get_wp_docs(self, request, pk=None):
        wp_docs = None
        try:
            partner = self.get_object()
            workplan = getattr(partner, "spworkplan", None)
            if workplan:
                wp_docs = workplan.workplandocs_set.select_related("document").all()
        except Exception:
            pass

        if wp_docs:
            return Response(WorkplanDocsSerializer(wp_docs, many=True).data)
        return Response({"Result": "Workplan document not found!"})

    @action(
        detail=True,
        methods=[
            "get",
        ],
    )
    def supplier_crc_score(self, request, pk=None):
        supply_chain = SupplyChain.objects.filter(
            strategic_partner=self.get_object()
        ).first()
        data = calculate_sp_crc_score(supply_chain)
        return Response(data, status=200)


class StrategicPartnerListDropDownView(viewsets.ReadOnlyModelViewSet):
    """
    Lightweight strategic partner endpoint for async dropdowns.
    Returns only id/name with pagination and search to keep payload/query cost low.
    """

    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)
    pagination_class = CustomPageNumberPagination
    serializer_class = StrategicPartnerDropDownSerializer
    queryset = StrategicPartner.objects.only("id", "name").order_by("name")

    def get_queryset(self):
        qs = self.queryset
        user = self.request.user

        groups = user.groups.values_list("name", flat=True)
        if not (user.is_staff or user.is_superuser or "global_partner" not in groups):
            if not hasattr(user, "strategic_partner_user"):
                return StrategicPartner.objects.none()
            qs = qs.filter(id=user.strategic_partner_user.strategic_partner.id)

        search_param = self.request.query_params.get(
            "search"
        ) or self.request.query_params.get("name")
        if search_param is not None and search_param.strip() != "":
            qs = qs.filter(name__icontains=search_param.strip())

        ids = self.request.query_params.getlist("id")
        if ids:
            qs = qs.filter(id__in=ids)

        return qs


class StregicPartnerResponseViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows strategic partner responses to be viewed or edited.
    """
    queryset = StrategicPartnerResponse.objects.all()
    serializer_class = StrategicPartnerResponseSerializer

    def get_queryset(self):
        queryset = self.queryset.select_related("strategic_partner")
        groups = self.request.user.groups.values_list("name", flat=True)
        if not (
            self.request.user.is_staff
            or self.request.user.is_superuser
            or "global_partner" not in groups
        ):
            if not hasattr(self.request.user, "strategic_partner_user"):
                return StrategicPartnerResponse.objects.none()
            queryset = queryset.filter(
                strategic_partner=self.request.user.strategic_partner_user.strategic_partner
            )
        return queryset


class StregicPartnerReferenceDocsViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = PartnerReferenceDoc.objects.all()
    serializer_class = PartnerReferenceDocSerializer

    def get_queryset(self):
        queryset = self.queryset.select_related("strategic_partner")
        groups = self.request.user.groups.values_list("name", flat=True)
        if not (
            self.request.user.is_staff
            or self.request.user.is_superuser
            or "global_partner" not in groups
        ):
            if not hasattr(self.request.user, "strategic_partner_user"):
                return PartnerReferenceDoc.objects.none()
            queryset = queryset.filter(
                strategic_partner=self.request.user.strategic_partner_user.strategic_partner
            )
        return queryset


class SPUserViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = User.objects.all()
    serializer_class = SPUserSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "first_name", "last_name", "email"]

    def get_queryset(self):
        strategic_partner_id = self.request.query_params.get("strategic_partner_id")
        qs = self.queryset.prefetch_related("strategic_partner_user__strategic_partner")
        if strategic_partner_id:
            qs = qs.filter(
                strategic_partner_user__strategic_partner_id=strategic_partner_id
            )

        return qs


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer

    def get_queryset(self):
        base_qs = self.queryset.select_related(
            "strategic_partner_user__strategic_partner",
            "supplier_user__supplier",
            "organization_user__organization",
        )
        if "CSO" in [x.name for x in self.request.user.groups.all()]:
            return base_qs.filter(
                organization_user__organization_id=self.request.user.organization_user.organization.id
            ).annotate(_groups=Concat("groups__name"))
        return base_qs.exclude(groups__name="CSO").annotate(
            _groups=Concat("groups__name")
        )

    def get_serializer_context(self):
        context = super(UserViewSet, self).get_serializer_context()
        context.update({"supplier": True})
        return context


class GroupViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    """
    API endpoint that allows groups to be viewed or edited.
    """
    queryset = Group.objects.all()
    serializer_class = GroupSerializer


class HowHearIssaraViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = HowHearIssara.objects.all()
    default_serializer_class = HowHearIssaraSerializer
    translation_serializer_class = HowHearIssaraTranslationSerializer

    def get_serializer_class(self):
        return get_serializer(self, self.request)

    def filter_queryset(self, queryset):
        lang = self.request.query_params.get("lang")
        is_cso = "CSO" in [x.name for x in self.request.user.groups.all()]

        if lang and lang != "en":
            translation_subquery = HowHearIssaraTranslation.objects.filter(
                how_hear_issara__id=OuterRef("pk"), language__code=lang
            ).values("name")[:1]

            queryset = HowHearIssara.objects.annotate(
                translated_name=Coalesce(Subquery(translation_subquery), "name")
            )
        if is_cso:
            queryset = queryset.exclude(hide_for_cso=True)
        else:
            queryset = queryset.exclude(cso_only=True)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


def param_to_list(data):
    if "," in data:
        return data.strip("()").split(",")
    else:
        return [data.strip("()")]


class CaseLeanViewSet(APIView):
    permission_classes = (IsAuthenticated or IsCSO,)
    pagination_class = CustomPageNumberPagination

    @method_decorator(cache_control(max_age=60 * 2, private=True))
    @method_decorator(vary_on_headers("Authorization"))
    def get(self, request):
        getAll = self.request.query_params.get("getAll")
        # Support multiple q+filter_by pairs (repeated params, ANDed together).
        # Single ?q=foo&filter_by=bar still works as before.
        queries = [
            q for q in self.request.query_params.getlist("q") if q not in [None, ""]
        ]
        filter_bys = self.request.query_params.getlist("filter_by")
        query = queries[0] if queries else None

        # Normalize q/filter_by pairs so all provided filters are honored.
        # Supported shapes:
        # - q1&filter_by=f1&q2&filter_by=f2
        # - q1&filter_by=f1&filter_by=f2 (same q for both fields)
        # - q1&q2&filter_by=f1 (same field for both q values)
        if len(queries) == len(filter_bys):
            search_pairs = list(zip(queries, filter_bys))
        elif len(queries) == 1 and len(filter_bys) > 1:
            search_pairs = [(queries[0], fb) for fb in filter_bys]
        elif len(filter_bys) == 1 and len(queries) > 1:
            search_pairs = [(q, filter_bys[0]) for q in queries]
        elif len(filter_bys) == 0:
            search_pairs = [(q, None) for q in queries]
        else:
            search_pairs = [
                (q, filter_bys[idx] if idx < len(filter_bys) else None)
                for idx, q in enumerate(queries)
            ]

        lang = self.request.query_params.get("lang", "en")
        download_xls = (
            self.request.query_params.get("download_xls", "").lower() == "true"
        )
        kpi_translation_qs = KpiTranslation.objects.select_related("language").filter(
            language__code=lang
        )

        select_related_fields = [
            "case_created_by",
            "country",
            "province",
            "client_origin_country",
            "client_origin_province",
            "client_origin_district",
            "client_crossing_country",
            "client_crossing_province",
            "client_crossing_district",
        ]
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            filtered_qs = (
                Case.objects.filter(
                    case_created_by__organization_user__organization_id__in=UserOrganization.objects.filter(
                        user_id=request.user.id
                    ).values_list(
                        "organization_id", flat=True
                    )
                )
                .select_related(*select_related_fields)
                .prefetch_related(
                    Prefetch(
                        "kpis",
                        queryset=Kpi.objects.prefetch_related(
                            Prefetch("kpitranslation_set", queryset=kpi_translation_qs),
                            "ilo_indicators",
                            "lksg_indicators",
                        ),
                    )
                )
            )
        else:
            filtered_qs = (
                Case.objects.all()
                .select_related(*select_related_fields)
                .prefetch_related(
                    Prefetch(
                        "kpis",
                        queryset=Kpi.objects.prefetch_related(
                            Prefetch("kpitranslation_set", queryset=kpi_translation_qs),
                            "ilo_indicators",
                            "lksg_indicators",
                        ),
                    )
                )
            )

        if getAll in [None, ""] and query is None:
            if "CSO" in [x.name for x in request.user.groups.all()]:
                case_query = filtered_qs.filter(
                    self.get_case_filters(self.request, True)
                ).order_by("-last_modified", "-id")
            else:
                case_query = filtered_qs.filter(
                    self.get_case_filters(self.request, False)
                ).order_by("-last_modified", "-id")
        elif query:
            # Build combined AND filter from all q+filter_by pairs.
            combined_filter = Q()
            for q_val, fb_val in search_pairs:
                combined_filter &= self.get_search_filters(q_val, fb_val or None)
            if "CSO" in [x.name for x in request.user.groups.all()]:
                case_query = filtered_qs.filter(
                    self.get_cso_visibility_filter(request) & combined_filter
                ).order_by("-last_modified", "-id")
            else:
                case_query = filtered_qs.filter(combined_filter).order_by(
                    "-last_modified", "-id"
                )

            if any(fb == "kpi_level" for _, fb in search_pairs):
                # KPI level filtering joins through M2M and can duplicate cases.
                case_query = case_query.distinct()
        else:
            case_query = filtered_qs.all().order_by("-last_modified", "-id")

        if download_xls:
            serializer_context = {"lang": lang}
            data = CaseLeanSerializer(
                case_query, many=True, context=serializer_context
            ).data
            return Response(data)

        paginator = self.pagination_class()
        paginator.page_size = paginator.page_size
        result_page = paginator.paginate_queryset(case_query, request)
        serializer_context = {"lang": lang}
        paginated_data = CaseLeanSerializer(
            result_page, many=True, context=serializer_context
        ).data
        return paginator.get_paginated_response(paginated_data)

    def get_search_filters(self, query, filter_by=None):
        if filter_by:
            if filter_by == "supplier":
                return Q(supplier__name__icontains=query)
            elif filter_by == "id":
                return Q(id__icontains=query)
            elif filter_by == "source_recruiter":
                return Q(source_recruiter__name__icontains=query)
            elif filter_by == "issue_category":
                return Q(issue_category__name__icontains=query)
            elif filter_by == "description":
                return Q(description__icontains=query)
            elif filter_by == "staff":
                return Q(case_created_by__username__icontains=query)
            elif filter_by == "client_nickname":
                return Q(client_nickname__icontains=query)
            elif filter_by == "client_gender_name":
                return Q(client_gender__name__icontains=query)
            elif filter_by == "client_nationality_name":
                return Q(client_nationality__name__icontains=query)
            elif filter_by == "country_name":
                return Q(country__name__icontains=query)
            elif filter_by == "province_name":
                return Q(province__name__icontains=query)
            elif filter_by == "district_name":
                return Q(district__name__icontains=query)
            elif filter_by == "client_origin_country_name":
                return Q(client_origin_country__name__icontains=query)
            elif filter_by == "client_origin_province_name":
                return Q(client_origin_province__name__icontains=query)
            elif filter_by == "client_origin_district_name":
                return Q(client_origin_district__name__icontains=query)
            elif filter_by == "client_crossing_country_name":
                return Q(client_crossing_country__name__icontains=query)
            elif filter_by == "client_crossing_province_name":
                return Q(client_crossing_province__name__icontains=query)
            elif filter_by == "client_crossing_district_name":
                return Q(client_crossing_district__name__icontains=query)
            elif filter_by == "interaction_type":
                return Q(interactiontype__icontains=query)
            elif filter_by == "client_phonenumber":
                return Q(client_phonenumber__icontains=query)
            elif filter_by == "interaction_date":
                return Q(interacted__icontains=query)
            elif filter_by == "first_time_contacting_issara":
                return Q(first_time_contacting_issara__iexact=query)
            elif filter_by == "issara_user":
                return (
                    Q(case_created_by__username__icontains=query)
                    | Q(case_created_by__first_name__icontains=query)
                    | Q(case_created_by__last_name__icontains=query)
                    | Q(case_created_by__email__icontains=query)
                )
            elif filter_by == "kpi_level":
                try:
                    return Q(kpis__level=int(str(query).strip()))
                except (TypeError, ValueError):
                    return Q(pk__in=[])
        case_id_search = Q(id__icontains=query)
        supplier_name_search = Q(supplier__name__icontains=query)
        source_recruiter_search = Q(source_recruiter__name__icontains=query)
        destination_recruiter_search = Q(destination_recruiter__name__icontains=query)
        case_created_by_search = Q(case_created_by__username__icontains=query)
        return (
            case_id_search
            | supplier_name_search
            | source_recruiter_search
            | destination_recruiter_search
            | case_created_by_search
        )

    def get_cso_visibility_filter(self, request):
        organization_ids = UserOrganization.objects.filter(
            user_id=request.user.id
        ).values_list("organization_id", flat=True)
        cso_filter_1 = Q(refer_to_org_id__in=organization_ids)
        cso_filter_2 = Q(
            case_created_by__organization_user__organization_id__in=organization_ids
        )
        return cso_filter_1 | cso_filter_2

    def get_case_filters(self, request, cso=False):
        supplier_ids = request.query_params.get("supplier_ids", None)
        src_recruiter_ids = request.query_params.get("src_recruiter_ids", None)
        dest_recruiter_ids = request.query_params.get("dest_recruiter_ids", None)
        first_time_contacting_issara = request.query_params.get(
            "first_time_contacting_issara", None
        )
        after = request.query_params.get("after", None)
        before = request.query_params.get("before", None)

        after = datetime.fromtimestamp(int(after) / 1000) if after else None
        before = datetime.fromtimestamp(int(before) / 1000) if before else None
        supplier_ids = param_to_list(supplier_ids) if supplier_ids else None
        src_recruiter_ids = (
            param_to_list(src_recruiter_ids) if src_recruiter_ids else None
        )
        dest_recruiter_ids = (
            param_to_list(dest_recruiter_ids) if dest_recruiter_ids else None
        )
        first_time_contacting_issara = (
            param_to_list(first_time_contacting_issara)
            if first_time_contacting_issara
            else None
        )

        after_filter = Q(interacted__gte=after) if after else Q()
        before_filter = Q(interacted__lte=before) if before else Q()
        supplier_filter = Q(supplier__id__in=supplier_ids) if supplier_ids else Q()
        src_recruiter_filter = (
            Q(source_recruiter__id__in=src_recruiter_ids) if src_recruiter_ids else Q()
        )
        dest_recruiter_filter = (
            Q(destination_recruiter__id__in=dest_recruiter_ids)
            if dest_recruiter_ids
            else Q()
        )
        first_time_contacting_issara_filter = (
            Q(first_time_contacting_issara__in=first_time_contacting_issara)
            if first_time_contacting_issara
            else Q()
        )

        if cso:
            return (
                self.get_cso_visibility_filter(request)
                & after_filter
                & before_filter
                & supplier_filter
                & src_recruiter_filter
                & dest_recruiter_filter
                & first_time_contacting_issara_filter
            )

        return (
            after_filter
            & before_filter
            & supplier_filter
            & src_recruiter_filter
            & dest_recruiter_filter
            & first_time_contacting_issara_filter
        )


class SupplierKpiRawViewSet(APIView):
    permission_classes = (IsAuthenticated,)

    def build_big_query(self, request):
        lang = request.query_params.get("lang", "en")
        query = f"""SELECT supplier_kpis.*,
                           suppliers.name AS supplier_name,
                           COALESCE(kpi_category_translations.name, kpi_categories.name) AS category,
                           COALESCE(kpi_translations.description, kpis.description) AS description,
                           kpis.level AS level,
                           supplier_kpi_update_statuses.name AS status_name,
                           kpi_recommended_remediations.name AS remediation,
                           kpi_systems_changes.name AS systems_change,
                           kpi_legal_violations.name AS law,
                           (SELECT GROUP_CONCAT(cases_kpis.case_id)
                            FROM {DB_NAME}.supplier_kpis temp_supplier_kpis
                            LEFT OUTER JOIN {DB_NAME}.cases_kpis ON {DB_NAME}.cases_kpis.kpi_id = temp_supplier_kpis.kpi_id
                            LEFT OUTER JOIN {DB_NAME}.cases ON {DB_NAME}.cases.id = {DB_NAME}.cases_kpis.case_id
                            WHERE {DB_NAME}.cases.supplier_id = temp_supplier_kpis.supplier_id AND temp_supplier_kpis.id = supplier_kpis.id
                            GROUP BY temp_supplier_kpis.id) AS calls,
                           (SELECT GROUP_CONCAT(DISTINCT countries.name)
                            FROM {DB_NAME}.supplier_kpis temp_supplier_kpis
                            LEFT OUTER JOIN {DB_NAME}.cases_kpis ON {DB_NAME}.cases_kpis.kpi_id = temp_supplier_kpis.kpi_id
                            LEFT OUTER JOIN {DB_NAME}.cases ON {DB_NAME}.cases.id = {DB_NAME}.cases_kpis.case_id
                            INNER JOIN {DB_NAME}.countries ON {DB_NAME}.cases.country_id = {DB_NAME}.countries.id
                            WHERE {DB_NAME}.cases.supplier_id = temp_supplier_kpis.supplier_id AND temp_supplier_kpis.id = supplier_kpis.id
                            GROUP BY temp_supplier_kpis.id) AS country,
                           (SELECT GROUP_CONCAT(cases.source_recruiter_id)
                            FROM {DB_NAME}.supplier_kpis temp_supplier_kpis
                            LEFT OUTER JOIN {DB_NAME}.cases_kpis ON {DB_NAME}.cases_kpis.kpi_id = temp_supplier_kpis.kpi_id
                            LEFT OUTER JOIN {DB_NAME}.cases ON {DB_NAME}.cases.id = {DB_NAME}.cases_kpis.case_id
                            WHERE {DB_NAME}.cases.supplier_id = temp_supplier_kpis.supplier_id AND temp_supplier_kpis.id = supplier_kpis.id
                            GROUP BY temp_supplier_kpis.id) AS source_recruiters,
                           (SELECT GROUP_CONCAT(cases.destination_recruiter_id)
                            FROM {DB_NAME}.supplier_kpis temp_supplier_kpis
                            LEFT OUTER JOIN {DB_NAME}.cases_kpis ON {DB_NAME}.cases_kpis.kpi_id = temp_supplier_kpis.kpi_id
                            LEFT OUTER JOIN {DB_NAME}.cases ON {DB_NAME}.cases.id = {DB_NAME}.cases_kpis.case_id
                            WHERE {DB_NAME}.cases.supplier_id = temp_supplier_kpis.supplier_id AND temp_supplier_kpis.id = supplier_kpis.id
                            GROUP BY temp_supplier_kpis.id) AS destination_recruiters
                            FROM supplier_kpis
                            LEFT OUTER JOIN suppliers 
                                ON suppliers.id = supplier_kpis.supplier_id
                            LEFT OUTER JOIN kpis 
                                ON kpis.id = supplier_kpis.kpi_id
                            LEFT OUTER JOIN supplier_kpi_update_statuses 
                                ON supplier_kpi_update_statuses.id = supplier_kpis.status_id
                            LEFT OUTER JOIN kpi_recommended_remediations 
                                ON kpi_recommended_remediations.id = kpis.kpi_recommended_remediation_id
                            LEFT OUTER JOIN kpi_systems_changes 
                                ON kpi_systems_changes.id = kpis.kpi_systems_change_id
                            LEFT OUTER JOIN kpi_legal_violations 
                                ON kpi_legal_violations.id = kpis.kpi_legal_violation_id
                            LEFT OUTER JOIN kpi_categories 
                                ON kpi_categories.id = kpis.kpi_category_id
                            LEFT OUTER JOIN kpi_category_translations 
                                ON kpi_categories.id = kpi_category_translations.kpi_category_id
                                AND kpi_category_translations.language_id = (SELECT id FROM languages WHERE code = '{lang}')
                            LEFT OUTER JOIN kpi_translations 
                                ON kpis.id = kpi_translations.kpi_id
                                AND kpi_translations.language_id = (SELECT id FROM languages WHERE code = '{lang}')"""

        conditions = []

        supplier_id = request.query_params.get("supplier_id", "").strip()
        if supplier_id:
            try:
                supplier_id = int(supplier_id)
                conditions.append(f"supplier_kpis.supplier_id = {supplier_id}")
            except ValueError:
                pass

        if hasattr(request.user, "supplier_user"):
            conditions.append("hide = false")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        return query

    def get_supplier_kpis_by_cases(self, organization_id):
        lang_code = self.request.query_params.get("lang", "en")

        cases = Case.objects.filter(
            Q(case_created_by__organization_user__organization_id=organization_id)
            | Q(refer_to_org_id=organization_id)
        ).prefetch_related("supplier_kpis")

        supplier_kpi_ids = set()
        for case in cases:
            supplier_kpi_ids.update(case.supplier_kpis.values_list("id", flat=True))

        supplier_kpis = SupplierKpi.objects.filter(
            id__in=supplier_kpi_ids
        ).prefetch_related(
            Prefetch(
                "kpi__kpi_category__kpicategorytranslation_set",
                queryset=KpiCategoryTranslation.objects.filter(
                    language__code=lang_code
                ),
                to_attr="filtered_category_translations",
            ),
            Prefetch(
                "kpi__kpitranslation_set",
                queryset=KpiTranslation.objects.filter(language__code=lang_code),
                to_attr="filtered_kpi_translations",
            ),
        )

        return supplier_kpis

    def serialize_supplier_kpis(self, supplier_kpis):
        return [
            x
            for x in SupplierKpiNewSerializer(
                supplier_kpis, many=True, context={"request": self.request.user}
            ).data
            if x["calls"]
        ]

    def get_cso_data(self, request):
        supplier_kpis = self.get_supplier_kpis_by_cases(
            request.user.organization_user.organization.id
        )

        return Response(self.serialize_supplier_kpis(supplier_kpis))

    def get_issara_data(self, request, organization_id):
        supplier_kpis = self.get_supplier_kpis_by_cases(organization_id)

        return Response(self.serialize_supplier_kpis(supplier_kpis))

    def get_issara_data_by_user_id(self, user_id):
        try:
            user_id = int(user_id)
        except ValueError:
            return None

        user = User.objects.filter(id=user_id).first()
        if not user:
            return None

        organization_id = user.organization_user.organization_id
        supplier_kpis = self.get_supplier_kpis_by_cases(organization_id)
        return Response(self.serialize_supplier_kpis(supplier_kpis))

    def get_default_data(self, request):
        big_query = self.build_big_query(request)
        qs = SupplierKpi.objects.raw(big_query)
        list_data = [x for x in SupplierKpiSerializer(qs, many=True).data if x["calls"]]

        if request.query_params.get("filterbyday") == "true":
            days_range = request.query_params["days"].strip()
            list_data = self.filterbydays(list_data, days_range)

        return Response(list_data)

    def filterbydays(self, list_data, day_range):
        days_range = day_range.split("-") if "-" in day_range else day_range.split("+")
        lower_range = days_range[0]
        upper_range = days_range[-1] if len(days_range) > 1 else 0
        if upper_range == 0:
            return [
                x
                for x in list_data
                if (x["days_open"] != "-") and (int(x["days_open"]) >= int(lower_range))
            ]
        else:
            return [
                x
                for x in list_data
                if (x["days_open"] != "-")
                and (int(lower_range) <= int(x["days_open"]) <= int(upper_range))
            ]

    def get(self, request):
        if hasattr(request.user, "organization_user"):
            groups = request.user.groups.values_list("name", flat=True)
            if "CSO" in groups:
                return self.get_cso_data(request)

        organization_id = request.query_params.get("organization_id", "").strip()
        if organization_id:
            return self.get_issara_data(request, organization_id)

        user_id = request.query_params.get("user_id", "").strip()
        if user_id:
            return self.get_issara_data_by_user_id(user_id)

        return self.get_default_data(request)


class SupplierKpiViewSet(viewsets.ModelViewSet):

    queryset = SupplierKpi.objects.all()
    serializer_class = SupplierKpiSerializer

    f"""
    REMOVED FROM QUERY TO SEE IF GET CALLS BACK
    Although.. jmaybe it's useful to show the entire call history?
    AND {DB_NAME}.supplier_kpis.opened_at <= {DB_NAME}.cases.created
    """

    def get_queryset(self):
        qs = self.queryset.prefetch_related(
            "kpi__kpi_category", "supplier", "updates"
        ).annotate(
            calls=RawSQL(
                f"""
                    SELECT GROUP_CONCAT(cases_kpis.case_id)
                    FROM {DB_NAME}.supplier_kpis temp_supplier_kpis
                    LEFT OUTER JOIN {DB_NAME}.cases_kpis on {DB_NAME}.cases_kpis.kpi_id=temp_supplier_kpis.kpi_id
                    LEFT OUTER JOIN {DB_NAME}.cases on {DB_NAME}.cases.id={DB_NAME}.cases_kpis.case_id
                    WHERE {DB_NAME}.cases.supplier_id=temp_supplier_kpis.supplier_id and {DB_NAME}.supplier_kpis.id = temp_supplier_kpis.id
                    GROUP by temp_supplier_kpis.id
                """,
                (),
            ),
            source_recruiters=RawSQL(
                f"""
                    SELECT GROUP_CONCAT(cases.source_recruiter_id)
                    FROM {DB_NAME}.supplier_kpis temp_supplier_kpis
                    LEFT OUTER JOIN {DB_NAME}.cases_kpis on {DB_NAME}.cases_kpis.kpi_id=temp_supplier_kpis.kpi_id
                    LEFT OUTER JOIN {DB_NAME}.cases on {DB_NAME}.cases.id={DB_NAME}.cases_kpis.case_id
                    WHERE {DB_NAME}.cases.supplier_id=temp_supplier_kpis.supplier_id and {DB_NAME}.supplier_kpis.id = temp_supplier_kpis.id
                    GROUP by temp_supplier_kpis.id
                """,
                (),
            ),
            destination_recruiters=RawSQL(
                f"""
                    SELECT GROUP_CONCAT(cases.destination_recruiter_id)
                    FROM {DB_NAME}.supplier_kpis temp_supplier_kpis
                    LEFT OUTER JOIN {DB_NAME}.cases_kpis on {DB_NAME}.cases_kpis.kpi_id=temp_supplier_kpis.kpi_id
                    LEFT OUTER JOIN {DB_NAME}.cases on {DB_NAME}.cases.id={DB_NAME}.cases_kpis.case_id
                    WHERE {DB_NAME}.cases.supplier_id=temp_supplier_kpis.supplier_id and {DB_NAME}.supplier_kpis.id = temp_supplier_kpis.id
                    GROUP by temp_supplier_kpis.id
                """,
                (),
            ),
        )

        groups = self.request.user.groups.values_list("name", flat=True)
        if not (
            self.request.user.is_staff
            or self.request.user.is_superuser
            or "global_partner" not in groups
        ):
            if not hasattr(self.request.user, "strategic_partner_user"):
                return Supplier.objects.none()
            supply_chains = (
                self.request.user.strategic_partner_user.strategic_partner.supplychain_set.all()
            )
            supplier_kpi = qs.filter(
                supplier__id__in=supply_chains.values_list("suppliers", flat=True)
            )
            return supplier_kpi

        return qs

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)


class BusinessResponseViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    # We perform custom, DB-vendor-aware ordering inside `get_queryset()`
    # so avoid DRF's `OrderingFilter` which would override our manual
    # order_by() and reject virtual/annotated sort keys.
    filter_backends = ()
    ordering_fields = [
        "id",
        "event_date",
        "created_at",
        "event_interaction_type",
        "created_by__first_name",
        "event_details",
    ]
    ordering = ("-id",)

    class BusinessResponsePagination(PageNumberPagination):
        page_size = 50
        page_size_query_param = "page_size"
        max_page_size = 1000

    pagination_class = BusinessResponsePagination
    queryset = BusinessResponse.objects.all().order_by("-id")
    serializer_class = BusinessResponseSerializer

    @staticmethod
    def _supplier_name_match(query):
        # Use EXISTS instead of an m2m JOIN so matching rows are not
        # duplicated (which previously forced an expensive SELECT DISTINCT).
        return Q(
            Exists(
                Supplier.objects.filter(
                    businessresponse=OuterRef("pk"), name__icontains=query
                )
            )
        )

    @staticmethod
    def _recruiter_name_match(query):
        return Q(
            Exists(
                Recruiter.objects.filter(
                    businessresponse=OuterRef("pk"), name__icontains=query
                )
            )
        )

    @staticmethod
    def _partner_name_match(query):
        return Q(
            Exists(
                StrategicPartner.objects.filter(
                    businessresponse=OuterRef("pk"), name__icontains=query
                )
            )
        )

    def _get_business_response_search_filter(self, query, filter_by=None):
        if filter_by == "id":
            return Q(id__icontains=query)
        if filter_by in [
            "suppliers",
            "supplier",
            "supplier_name",
            "supplier_names",
        ]:
            return self._supplier_name_match(query)
        if filter_by in ["recruiters", "recruiter", "recruiter_name"]:
            return self._recruiter_name_match(query)
        if filter_by in [
            "partners",
            "partner",
            "partner_name",
            "partner_names",
            "global_buyer",
            "global_buyer_name",
            "global_buyer_names",
        ]:
            return self._partner_name_match(query)
        if filter_by in [
            "type",
            "event_interaction_type",
            "event_interaction_type_name",
        ]:
            return Q(event_interaction_type__name__icontains=query)
        if filter_by in ["date", "event_date"]:
            return Q(event_date__icontains=query)
        if filter_by in ["created_by", "created_by_name", "staff", "issara_user"]:
            return (
                Q(created_by__username__icontains=query)
                | Q(created_by__first_name__icontains=query)
                | Q(created_by__last_name__icontains=query)
                | Q(created_by__email__icontains=query)
            )
        if filter_by in ["event_details", "description"]:
            return Q(event_details__icontains=query)

        return (
            Q(id__icontains=query)
            | self._supplier_name_match(query)
            | self._recruiter_name_match(query)
            | self._partner_name_match(query)
            | Q(event_details__icontains=query)
            | Q(created_by__first_name__icontains=query)
            | Q(created_by__last_name__icontains=query)
        )

    def get_queryset(self):
        # Prefetch relations and annotate aggregated supplier/recruiter/global buyer names
        qs = self.queryset.select_related("created_by").prefetch_related(
            "suppliers",
            "recruiters",
            "global_buyers",
            "issara_focal_points",
            "event_interaction_type",
        )

        params = (
            self.request.query_params if hasattr(self.request, "query_params") else {}
        )

        # CaseLean-style multi query support with repeated q/filter_by params.
        # Examples:
        # - ?filter_by=created_by_name&q=Kotcha&filter_by=event_date&q=202
        # - ?q=Kotcha&filter_by=created_by_name, ?q=202&filter_by=event_date
        queries = (
            [q for q in params.getlist("q") if q not in [None, ""]]
            if hasattr(params, "getlist")
            else []
        )
        filter_bys = params.getlist("filter_by") if hasattr(params, "getlist") else []

        search_pairs = []
        if len(queries) == len(filter_bys):
            search_pairs = list(zip(queries, filter_bys))
        elif len(queries) == 1 and len(filter_bys) > 1:
            search_pairs = [(queries[0], fb) for fb in filter_bys]
        elif len(filter_bys) == 1 and len(queries) > 1:
            search_pairs = [(q, filter_bys[0]) for q in queries]
        elif len(filter_bys) == 0:
            search_pairs = [(q, None) for q in queries]
        elif len(queries) > 0:
            search_pairs = [
                (q, filter_bys[idx] if idx < len(filter_bys) else None)
                for idx, q in enumerate(queries)
            ]

        if search_pairs:
            combined_filter = Q()
            for q_val, fb_val in search_pairs:
                combined_filter &= self._get_business_response_search_filter(
                    q_val,
                    fb_val or None,
                )
            qs = qs.filter(combined_filter)

        # Filter by id (single or comma-separated list)
        ids = params.get("id")
        if ids:
            try:
                id_list = [int(x) for x in ids.split(",") if x.strip()]
                if id_list:
                    qs = qs.filter(id__in=id_list)
            except Exception:
                pass

        # Filter by suppliers (comma-separated list)
        supplier_ids = params.get("suppliers") or params.get("supplier_ids")
        if supplier_ids:
            try:
                s_ids = [int(x) for x in supplier_ids.split(",") if x.strip()]
                if s_ids:
                    qs = qs.filter(
                        Exists(
                            Supplier.objects.filter(
                                businessresponse=OuterRef("pk"), id__in=s_ids
                            )
                        )
                    )
            except Exception:
                pass

        # Filter by recruiters (comma-separated list)
        recruiter_ids = params.get("recruiters") or params.get("recruiter_ids")
        if recruiter_ids:
            try:
                r_ids = [int(x) for x in recruiter_ids.split(",") if x.strip()]
                if r_ids:
                    qs = qs.filter(
                        Exists(
                            Recruiter.objects.filter(
                                businessresponse=OuterRef("pk"), id__in=r_ids
                            )
                        )
                    )
            except Exception:
                pass

        # Filter by partners (comma-separated list)
        partner_ids = params.get("partners") or params.get("partner_ids")
        if partner_ids:
            try:
                p_ids = [int(x) for x in partner_ids.split(",") if x.strip()]
                if p_ids:
                    qs = qs.filter(
                        Exists(
                            StrategicPartner.objects.filter(
                                businessresponse=OuterRef("pk"), id__in=p_ids
                            )
                        )
                    )
            except Exception:
                pass

        # Filter by type (event_interaction_type, comma-separated list or string)
        type_param = params.get("type") or params.get("event_interaction_type")
        if type_param:
            try:
                type_list = [x.strip() for x in type_param.split(",") if x.strip()]
                if type_list:
                    qs = qs.filter(event_interaction_type__name__in=type_list)
            except Exception:
                pass

        # Filter by date (event_date, supports range: event_date__gte, event_date__lte)
        event_date_gte = params.get("event_date__gte")
        event_date_lte = params.get("event_date__lte")
        if event_date_gte:
            try:
                qs = qs.filter(event_date__gte=event_date_gte)
            except Exception:
                pass
        if event_date_lte:
            try:
                qs = qs.filter(event_date__lte=event_date_lte)
            except Exception:
                pass

        # Filter by created_by (id or name, comma-separated list)
        created_by = params.get("created_by")
        if created_by:
            try:
                # Try as id(s) first
                cb_ids = [int(x) for x in created_by.split(",") if x.strip().isdigit()]
                if cb_ids:
                    qs = qs.filter(created_by__id__in=cb_ids)
                else:
                    # Otherwise, try as name(s)
                    cb_names = [x.strip() for x in created_by.split(",") if x.strip()]
                    if cb_names:
                        name_q = Q()
                        for name in cb_names:
                            name_q |= Q(created_by__first_name__icontains=name) | Q(
                                created_by__last_name__icontains=name
                            )
                        qs = qs.filter(name_q)
            except Exception:
                pass

        # Search / q: broad search fallback when no multi q/filter_by pairs are provided
        search = params.get("search") or (params.get("q") if not search_pairs else None)
        if search:
            search_q = (
                Q(id__icontains=search)
                | self._supplier_name_match(search)
                | self._recruiter_name_match(search)
                | self._partner_name_match(search)
                | Q(event_details__icontains=search)
                | Q(created_by__first_name__icontains=search)
                | Q(created_by__last_name__icontains=search)
            )
            qs = qs.filter(search_q)

        # created_at__gte / created_at__lte: expect unix ms timestamps
        created_gte = params.get("created_at__gte")
        created_lte = params.get("created_at__lte")
        try:
            if created_gte:
                ts = int(created_gte) / 1000.0
                qs = qs.filter(created_at__gte=datetime.fromtimestamp(ts))
            if created_lte:
                ts = int(created_lte) / 1000.0
                qs = qs.filter(created_at__lte=datetime.fromtimestamp(ts))
        except Exception:
            pass

        # NOTE: All m2m filters/searches above use EXISTS subqueries rather than
        # JOINs, so no duplicate rows are produced and `.distinct()` is not
        # needed. Avoiding DISTINCT removes an expensive temp-table/filesort over
        # the wide TEXT columns in the SELECT list.

        # Use Postgres StringAgg when available; fall back to MySQL GROUP_CONCAT
        try:
            vendor = connection.vendor
        except Exception:
            vendor = None
        logging.debug(
            "BusinessResponseViewSet.get_queryset: connection.vendor=%s",
            vendor,
        )

        if vendor == "mysql":
            try:
                supplier_first = (
                    Supplier.objects.filter(businessresponse__id=OuterRef("pk"))
                    .order_by("name")
                    .values("name")[:1]
                )
                recruiter_first = (
                    Recruiter.objects.filter(businessresponse__id=OuterRef("pk"))
                    .order_by("name")
                    .values("name")[:1]
                )
                partner_first = (
                    StrategicPartner.objects.filter(businessresponse__id=OuterRef("pk"))
                    .order_by("name")
                    .values("name")[:1]
                )

                qs = qs.annotate(
                    supplier_first_name=Subquery(supplier_first),
                    recruiter_first_name=Subquery(recruiter_first),
                    global_buyer_first_name=Subquery(partner_first),
                )
                logging.debug(
                    "BusinessResponseViewSet.get_queryset: Applied MySQL subquery annotations: supplier_first_name, recruiter_first_name, global_buyer_first_name"
                )
            except Exception:
                logging.exception(
                    "BusinessResponseViewSet.get_queryset: failed to apply MySQL subquery annotations"
                )
                pass
        else:
            qs = qs.annotate(
                supplier_names_agg=StringAgg(
                    "suppliers__name", delimiter=", ", distinct=True
                ),
                recruiter_names_agg=StringAgg(
                    "recruiters__name", delimiter=", ", distinct=True
                ),
                global_buyer_names_agg=StringAgg(
                    "global_buyers__name", delimiter=", ", distinct=True
                ),
            )
            logging.debug(
                "BusinessResponseViewSet.get_queryset: Applied Postgres StringAgg annotations: supplier_names_agg, recruiter_names_agg, global_buyer_names_agg"
            )

        ordering_param = params.get("ordering") or self.request.query_params.get(
            "ordering"
        )
        if ordering_param:
            try:

                def map_key(key):
                    desc = key.startswith("-")
                    k = key[1:] if desc else key
                    mapping = {
                        "supplier_names": "supplier_names_agg",
                        "recruiter_names": "recruiter_names_agg",
                        "partner_names": "global_buyer_names_agg",
                        "global_buyer_names": "global_buyer_names_agg",
                        "event_details": "event_details",
                        "id": "id",
                        "event_date": "event_date",
                        "created_at": "created_at",
                        "type": "event_interaction_type__name",
                        "event_interaction_type": "event_interaction_type__name",
                        "event_interaction_type.name": "event_interaction_type__name",
                        "event_interaction_type_name": "event_interaction_type__name",
                        "event_interaction_type__name": "event_interaction_type__name",
                        "created_by": "created_by__first_name",
                        "created_by_first_name": "created_by__first_name",
                        "created_by__first_name": "created_by__first_name",
                        "created_by.first_name": "created_by__first_name",
                        "created_by_name": "created_by__first_name",
                        "created_by__name": "created_by__first_name",
                    }
                    mapped = mapping.get(k, k)
                    return ("-" + mapped) if desc else mapped

                parts = [p.strip() for p in ordering_param.split(",") if p.strip()]
                mapped_parts = [map_key(p) for p in parts]
                logging.debug(
                    "BusinessResponseViewSet.get_queryset: ordering_param=%s mapped_parts=%s",
                    ordering_param,
                    mapped_parts,
                )

                if vendor == "mysql":
                    replace_map = {
                        "supplier_names_agg": "supplier_first_name",
                        "recruiter_names_agg": "recruiter_first_name",
                        "global_buyer_names_agg": "global_buyer_first_name",
                        "global_buyer_names": "global_buyer_first_name",
                        "supplier_names": "supplier_first_name",
                        "recruiter_names": "recruiter_first_name",
                        "partner_names": "global_buyer_first_name",
                    }
                    safe_parts = []
                    for p in mapped_parts:
                        neg = p.startswith("-")
                        base = p[1:] if neg else p
                        new = replace_map.get(base, base)
                        safe_parts.append(("-" + new) if neg else new)
                    logging.debug(
                        "BusinessResponseViewSet.get_queryset: vendor=mysql safe_parts=%s",
                        safe_parts,
                    )
                else:
                    safe_parts = mapped_parts
                    logging.debug(
                        "BusinessResponseViewSet.get_queryset: vendor!=mysql safe_parts=%s",
                        safe_parts,
                    )

                if len(safe_parts) > 0:
                    try:
                        bases = [p.lstrip("-") for p in safe_parts]
                        if "id" not in bases:
                            first = safe_parts[0]
                            tie = "-id" if first.startswith("-") else "id"
                            safe_parts.append(tie)
                    except Exception:
                        pass

                    qs = qs.order_by(*safe_parts)
                    # Avoid compiling the full SQL (str(qs.query)) on every
                    # request; only emit the cheap mapped ordering at DEBUG.
                    logging.debug(
                        "BusinessResponseViewSet.get_queryset: applied_ordering=%s",
                        safe_parts,
                    )
            except Exception:
                pass

        return qs


class SupplierCRCResponseViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = SupplierCRCResponse.objects.all().order_by("-id")
    serializer_class = SupplierCRCResponseSerializer


class RecruiterCRCResponseViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = RecruiterCRCResponse.objects.all()
    serializer_class = RecruiterCRCResponseSerializer


class FieldworkActivityViewSet(viewsets.ModelViewSet):

    serializer_class = FieldworkActivitySerializer
    queryset = FieldworkActivity.objects.all()

    def _get_fieldwork_date_range(self):
        query_params = self.request.query_params

        date_from_raw = (
            query_params.get("fieldwork_date_from")
            or query_params.get("date_from")
            or query_params.get("from")
            or query_params.get("start_date")
        )
        date_to_raw = (
            query_params.get("fieldwork_date_to")
            or query_params.get("date_to")
            or query_params.get("to")
            or query_params.get("end_date")
        )
        start_timestamp_raw = query_params.get("start_timestamp")
        end_timestamp_raw = query_params.get("end_timestamp")

        def _parse_date(raw_value, param_name):
            if not raw_value:
                return None
            for date_format in settings.DATE_INPUT_FORMATS:
                try:
                    return datetime.strptime(raw_value, date_format).date()
                except ValueError:
                    continue
            raise ValidationError(
                {
                    param_name: (
                        f"Invalid date format `{raw_value}`. "
                        "Use one of DATE_INPUT_FORMATS."
                    )
                }
            )

        def _parse_unix_timestamp(raw_value, param_name):
            if not raw_value:
                return None
            try:
                return datetime.fromtimestamp(int(raw_value)).date()
            except (TypeError, ValueError, OSError):
                raise ValidationError(
                    {param_name: (f"Invalid unix timestamp `{raw_value}`.")}
                )

        date_from = _parse_date(date_from_raw, "fieldwork_date_from")
        date_to = _parse_date(date_to_raw, "fieldwork_date_to")

        if not date_from and start_timestamp_raw:
            date_from = _parse_unix_timestamp(start_timestamp_raw, "start_timestamp")
        if not date_to and end_timestamp_raw:
            date_to = _parse_unix_timestamp(end_timestamp_raw, "end_timestamp")

        if date_from and date_to and date_from > date_to:
            raise ValidationError(
                {
                    "detail": "`fieldwork_date_from` cannot be later than `fieldwork_date_to`."
                }
            )

        return date_from, date_to

    def _apply_fieldwork_date_range_filter(self, queryset):
        date_from, date_to = self._get_fieldwork_date_range()
        if date_from:
            queryset = queryset.filter(fieldwork_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(fieldwork_date__lte=date_to)
        return queryset

    def _get_query_param_ids(self, param_names):
        query_params = self.request.query_params
        id_values = []

        for param_name in param_names:
            raw_values = query_params.getlist(param_name)
            for raw_value in raw_values:
                if not raw_value:
                    continue

                cleaned_value = raw_value.replace("(", "").replace(")", "")
                for value_part in cleaned_value.split(","):
                    value_part = value_part.strip()
                    if not value_part:
                        continue
                    try:
                        id_values.append(int(value_part))
                    except (TypeError, ValueError):
                        continue

        return list(dict.fromkeys(id_values))

    def _apply_supplier_filter(self, queryset):
        supplier_ids = self._get_query_param_ids(
            ["supplier_ids", "suppliers", "suppliers[]"]
        )
        if supplier_ids:
            queryset = queryset.filter(suppliers__id__in=supplier_ids).distinct()
        return queryset

    def _get_related_prefetches(self):
        return (
            Prefetch(
                "suppliers",
                queryset=Supplier.objects.only("id", "name").order_by("name"),
            ),
            Prefetch(
                "recruiters",
                queryset=Recruiter.objects.only("id", "name").order_by("name"),
            ),
            Prefetch(
                "strategic_partners",
                queryset=StrategicPartner.objects.only("id"),
            ),
        )

    def _filter_queryset_by_visibility(self, queryset):
        organization_id = self.request.query_params.get("organization_id", None)

        if organization_id:

            users = User.objects.filter(
                organization_user__organization_id=organization_id
            )
            queryset = queryset.filter(created_by__in=users)
        elif "CSO" in [x.name for x in self.request.user.groups.all()]:
            user_data = User.objects.filter(
                groups__in=[Group.objects.filter(name="CSO")[0].id]
            )
            users = user_data.filter(
                organization_user__organization=self.request.user.organization_user.organization
            )
            queryset = queryset.filter(created_by__in=users)
        return queryset

    def get_queryset(self):
        queryset = self._filter_queryset_by_visibility(self.queryset.all())
        queryset = (
            queryset.annotate(
                organization_name=F("created_by__organization_user__organization__name")
            )
            .select_related(
                "fieldwork_type",
                "district",
                "province",
                "country",
                "nationality",
                "primary_focus",
                "created_by",
            )
            .prefetch_related(*self._get_related_prefetches())
        )
        return queryset

    def _get_download_queryset(self):
        queryset = self._filter_queryset_by_visibility(self.queryset.all())
        queryset = (
            queryset.annotate(
                organization_name=F("created_by__organization_user__organization__name")
            )
            .select_related(
                "fieldwork_type",
                "district",
                "province",
                "country",
                "nationality",
                "created_by",
            )
            .prefetch_related(
                Prefetch(
                    "suppliers",
                    queryset=Supplier.objects.only("id", "name").order_by("name"),
                ),
                Prefetch(
                    "recruiters",
                    queryset=Recruiter.objects.only("id", "name").order_by("name"),
                ),
            )
            .only(
                "id",
                "fieldwork_date",
                "outreach_target",
                "notes",
                "links",
                "total_people_reached",
                "total_workers_reached",
                "created_by__id",
                "created_by__email",
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
                "fieldwork_type__id",
                "fieldwork_type__name",
                "nationality__id",
                "nationality__name",
                "country__id",
                "country__name",
                "province__id",
                "province__name",
                "district__id",
                "district__name",
            )
        )
        return queryset

    def list(self, request, *args, **kwargs):

        download_xls = request.query_params.get("download_xls") == "true"

        queryset = self.filter_queryset(self.get_queryset())
        queryset = self._apply_supplier_filter(queryset)
        queryset = self._apply_fieldwork_date_range_filter(queryset)

        if download_xls:
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="download-xls")
    def download_xls(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self._get_download_queryset())
        queryset = self._apply_supplier_filter(queryset)
        queryset = self._apply_fieldwork_date_range_filter(queryset)

        serializer = FieldworkActivityDownloadSerializer(queryset, many=True)
        return Response(serializer.data)


class FieldworkActivityTypeViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = FieldworkActivityType.objects.all()
    default_serializer_class = FieldworkActivityTypeSerializer
    translation_serializer_class = FieldworkActivityTypeTranslationSerializer

    def get_serializer_class(self):
        return get_serializer(self, self.request)

    def list(self, request, *args, **kwargs):
        lang = request.query_params.get("lang")
        if lang and lang != "en":
            translation_subquery = FieldworkActivityTypeTranslation.objects.filter(
                fieldwork_activity_type__id=OuterRef("pk"), language__code=lang
            ).values("name")[:1]

            queryset = FieldworkActivityType.objects.annotate(
                translated_name=Coalesce(Subquery(translation_subquery), "name")
            )
        else:
            queryset = self.get_queryset()

        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class GroupedFieldworkActivityTypeViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = FieldworkActivityTypeCategory.objects.all()
    serializer_class = GroupedFieldworkActivityTypeSerializer

    def get_queryset(self):
        if "CSO" in [x.name for x in self.request.user.groups.all()]:
            queryset = self.queryset.prefetch_related(
                Prefetch(
                    "types",
                    queryset=FieldworkActivityType.objects.exclude(hide_for_cso=True),
                )
            )
        else:
            queryset = self.queryset.prefetch_related(
                Prefetch(
                    "types",
                    queryset=FieldworkActivityType.objects.exclude(cso_only=True),
                )
            )
        return queryset


class FieldworkActivityPrimaryFocusViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = FieldworkActivityPrimaryFocus.objects.all()
    serializer_class = FieldworkActivityPrimaryFocusSerializer


class MonthlyWorkerVoiceViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = MonthlyWorkerVoice.objects.all()
    serializer_class = MonthlyWorkerVoiceSerializer


class BusinessResponseInteractionTypeViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = ResponseInteractionType.objects.all()
    serializer_class = BusinessResponseInteractionTypeSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)


class EthicalRecruitmentMeetingViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = EthicalRecruitmentMeeting.objects.all()
    serializer_class = EthicalRecruitmentMeetingSerializer


def grievance_mechanism_review_etag_func(request, *args, **kwargs):
    grievance_mechanism_id = kwargs.get("pk")

    if not grievance_mechanism_id:

        queryset = GrievanceMechanismReview.objects.all()
        latest_update = queryset.aggregate(latest_update=Max("updated_at"))[
            "latest_update"
        ]
    else:

        try:
            supplier = GrievanceMechanismReview.objects.get(pk=grievance_mechanism_id)
            latest_update = supplier.updated_at
        except Supplier.DoesNotExist:
            return None

    if latest_update:
        return hashlib.md5(str(latest_update).encode()).hexdigest()
    return None


class GrievanceMechanismReviewViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)

    queryset = GrievanceMechanismReview.objects.all()
    serializer_class = GrievanceMechanismReviewSerializer

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @method_decorator(cache_control(max_age=60 * 5, private=True))
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(grievance_mechanism_review_etag_func))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @method_decorator(cache_control(max_age=60 * 5, private=True))
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(grievance_mechanism_review_etag_func))
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


class MetricsWorkersView(APIView):
    def get(self, request):
        from supplier.models import TotalNumberOfWorkers

        supplier_ids_param = self.request.query_params.get("supplierIds")

        # Build filter for TotalNumberOfWorkers directly
        worker_counts_qs = TotalNumberOfWorkers.objects.all()
        if supplier_ids_param and supplier_ids_param != "":
            supplier_ids = list(map(int, supplier_ids_param.split(",")))
            worker_counts_qs = worker_counts_qs.filter(supplier_id__in=supplier_ids)

        data = worker_counts_qs.aggregate(
            total=Sum("total_num_workers"),
            men=Sum("total_num_men_workers"),
            women=Sum("total_num_women_workers"),
            burmese=Sum("total_num_myanmar_workers"),
            khmer=Sum("total_num_cambodian_workers"),
            thai=Sum("total_num_thai_workers"),
            nepalese=Sum("total_num_nepalese_workers"),
            bangladeshi=Sum("total_num_bangladeshi_workers"),
            indonesian=Sum("total_num_indonesian_workers"),
            malaysian=Sum("total_num_malaysian_workers"),
            indian=Sum("total_num_indian_workers"),
            pakistani=Sum("total_num_pakistani_workers"),
            sri_lankan=Sum("total_num_sri_lankan_workers"),
        )

        return Response(data)


class MetricsInteractionsView(APIView):

    @method_decorator(cache_control(max_age=60 * 5, private=True))
    @method_decorator(vary_on_headers("Authorization"))
    def get(self, request):
        organization_id = self.request.query_params.get("organization_id", None)

        if organization_id:
            users = User.objects.filter(
                organization_user__organization_id=organization_id
            )
            cases_queryset = Case.objects.filter(case_created_by__in=users)
        elif "CSO" in [x.name for x in request.user.groups.all()]:
            cases_queryset = Case.objects.filter(case_created_by=self.request.user.id)
        else:
            cases_queryset = Case.objects.all()

        suppliers_queryset, supplier_ids = self.get_suppliers_queryset(request)
        kpis_queryset = Kpi.objects.all()
        crc_scores_queryset = SupplierCRCResponse.objects.all()
        supplierKpi_queryset = SupplierKpi.objects.all()
        interactions_queryset = CaseInteraction.objects.all()

        start_timestamp = self.request.query_params.get("start")
        end_timestamp = self.request.query_params.get("end")

        if start_timestamp or end_timestamp:
            (
                cases_queryset,
                interactions_queryset,
                supplierKpi_queryset,
                crc_scores_queryset,
            ) = self.filter_by_date_range(
                start_timestamp,
                end_timestamp,
                cases_queryset,
                interactions_queryset,
                supplierKpi_queryset,
                crc_scores_queryset,
            )

        return Response(
            {
                "caseDataSummary": self.get_case_data_summary(
                    cases_queryset, suppliers_queryset
                ),
                "crcRawScored": self.get_crc_raw_scores(
                    crc_scores_queryset, suppliers_queryset
                ),
                "supplierKpiDataSummary": self.get_supplier_kpi_data_summary(
                    supplierKpi_queryset, suppliers_queryset
                ),
                "kpiDataSummary": self.get_kpi_data_summary(
                    kpis_queryset, suppliers_queryset
                ),
                "caseCountByYearMonth": self.get_case_count_by_year_month(
                    start_timestamp, end_timestamp, request, supplier_ids
                ),
                "countriesByCallCount": self.get_countries_by_call_count(
                    cases_queryset, suppliers_queryset
                ),
                "provincesByCallCount": self.get_provinces_by_call_count(
                    cases_queryset, suppliers_queryset
                ),
                "districtsByCallCount": self.get_districts_by_call_count(
                    cases_queryset, suppliers_queryset
                ),
                "nationalityByCallCount": self.get_nationality_by_call_count(
                    cases_queryset, suppliers_queryset
                ),
                "genderByCallCount": self.get_gender_by_call_count(
                    cases_queryset, suppliers_queryset
                ),
                "ethnicityByCallCount": self.get_ethnicity_by_call_count(
                    cases_queryset, suppliers_queryset
                ),
            }
        )

    def get_gender_by_call_count(self, cases_queryset, suppliers_queryset):
        return (
            cases_queryset.filter(
                supplier__in=suppliers_queryset, client_gender__isnull=False
            )
            .values("client_gender", "client_gender__name")
            .annotate(client_gender__count=Count("client_gender"))
        )

    def get_suppliers_queryset(self, request):
        supplier_ids = request.query_params.get("supplierIds")
        suppliers_queryset = Supplier.objects.all()
        if supplier_ids and supplier_ids != "":
            try:
                suppliers_queryset = suppliers_queryset.filter(
                    id__in=list(map(int, supplier_ids.split(",")))
                )
            except ValueError:
                raise ValidationError(
                    {"message": "Invalid query params in supplier Ids"}
                )
        return suppliers_queryset, supplier_ids

    def filter_by_date_range(
        self,
        start_timestamp,
        end_timestamp,
        cases_queryset,
        interactions_queryset,
        supplierKpi_queryset,
        crc_scores_queryset,
    ):
        if start_timestamp:
            start = datetime.fromtimestamp(int(start_timestamp))
            interactions_queryset = interactions_queryset.filter(interacted__gte=start)
            cases_queryset = cases_queryset.filter(created__gte=start)
            supplierKpi_queryset = supplierKpi_queryset.filter(opened_at__gte=start)
            crc_scores_queryset = crc_scores_queryset.filter(created_at__gte=start)
        if end_timestamp:
            end = datetime.fromtimestamp(int(end_timestamp))
            interactions_queryset = interactions_queryset.filter(interacted__lte=end)
            cases_queryset = cases_queryset.filter(created__lte=end)
            supplierKpi_queryset = supplierKpi_queryset.filter(opened_at__lte=end)
            crc_scores_queryset = crc_scores_queryset.filter(created_at__lte=end)
        return (
            cases_queryset,
            interactions_queryset,
            supplierKpi_queryset,
            crc_scores_queryset,
        )

    def get_case_data_summary(self, cases_queryset, suppliers_queryset):
        return cases_queryset.filter(supplier__in=suppliers_queryset).aggregate(
            total=Count("id"),
            issue_workers_affected=Sum("issue_workers_affected"),
            total_suppliers_in_worker_cases=Count("supplier", distinct=True),
            total_recruiters_in_worker_cases=(
                Count("destination_recruiter", distinct=True)
                + Count("source_recruiter", distinct=True)
            ),
            total_destination_recruiters_in_worker_cases=Count(
                "destination_recruiter", distinct=True
            ),
            total_source_recruiters_in_worker_cases=Count(
                "source_recruiter", distinct=True
            ),
            rating_dest_employer_avg=Avg("rating_dest_employer"),
            rating_dest_recruiter_avg=Avg("destination_recruiter"),
            rating_source_broker_avg=Avg("source_recruiter"),
            rating_source_recruiter_avg=Avg("rating_source_recruiter"),
            cases_closed=Count("id", filter=Q(case_status__id=2)),
            cases_open=Count("id", filter=Q(case_status__id=1)),
            men=Count("id", filter=Q(client_gender__name="Male")),
            women=Count("id", filter=Q(client_gender__name="Female")),
        )

    def get_crc_raw_scores(self, crc_scores_queryset, suppliers_queryset):
        return (
            crc_scores_queryset.filter(supplier__in=suppliers_queryset)
            .order_by("-id")
            .values()
        )

    def get_supplier_kpi_data_summary(self, supplierKpi_queryset, suppliers_queryset):
        return supplierKpi_queryset.filter(supplier__in=suppliers_queryset).aggregate(
            total_supplier_kpis=Count("id"),
            total_supplier_kpi_violation=Count("kpi"),
            total_supplier_affected_workers=Sum("kpi"),
            closed_quality_poor=Count("id", filter=Q(closed_quality="Poor")),
            closed_quality_fair=Count("id", filter=Q(closed_quality="Fair")),
            closed_quality_good=Count("id", filter=Q(closed_quality="Good")),
            closed_quality_very_good=Count("id", filter=Q(closed_quality="Very good")),
            closed_quality_excelent=Count("id", filter=Q(closed_quality="Excelent")),
            remediation_aligned_none=Count("id", filter=Q(remediation_aligned="None")),
            remediation_aligned_alot=Count("id", filter=Q(remediation_aligned="A lot")),
            remediation_aligned_alittle=Count(
                "id", filter=Q(remediation_aligned="A little")
            ),
            remediation_progress_none=Count(
                "id", filter=Q(remediation_progress="None")
            ),
            remediation_progress_alot=Count(
                "id", filter=Q(remediation_progress="A lot")
            ),
            remediation_proress_alittle=Count(
                "id", filter=Q(remediation_progress="A little")
            ),
            systems_change_aligned_none=Count(
                "id", filter=Q(systems_change_aligned="None")
            ),
            systems_change_aligned_alot=Count(
                "id", filter=Q(systems_change_aligned="A lot")
            ),
            systems_change_aligned_alittle=Count(
                "id", filter=Q(systems_change_aligned="A little")
            ),
            systems_change_progress_none=Count(
                "id", filter=Q(systems_change_progress="None")
            ),
            systems_change_progress_alot=Count(
                "id", filter=Q(systems_change_progress="A lot")
            ),
            systems_change_progress_alittle=Count(
                "id", filter=Q(systems_change_progress="A little")
            ),
            total_supplier_open_kpis=Count("id", filter=Q(status__in=[1, 2])),
            total_supplier_closed_kpis=Count("id", filter=Q(status__in=[3, 4])),
        )

    def get_kpi_data_summary(self, kpis_queryset, suppliers_queryset):
        return kpis_queryset.filter(case__supplier__in=suppliers_queryset).aggregate(
            total_kpis_level_1_violation_cases=Count("case__id", filter=(Q(level=1))),
            total_kpis_level_2_violation_cases=Count("case__id", filter=(Q(level=2))),
            total_kpis_level_3_violation_cases=Count("case__id", filter=(Q(level=3))),
            total_kpis_level_4_violation_cases=Count("case__id", filter=(Q(level=4))),
            total_kpis_violation_cases=Count("case__id"),
        )

    def get_case_count_by_year_month(
        self, start_timestamp, end_timestamp, request, supplier_ids
    ):
        if start_timestamp:
            start_datetime = datetime.fromtimestamp(
                int(start_timestamp), tz=timezone.utc
            )
        if end_timestamp:
            end_datetime = datetime.fromtimestamp(int(end_timestamp), tz=timezone.utc)

        organization_id = request.query_params.get("organization_id", None)
        cases_queryset = (
            Case.objects.all()
            if not organization_id
            else Case.objects.filter(
                case_created_by__organization_user__organization_id=organization_id
            )
        )

        if start_timestamp:
            cases_queryset = cases_queryset.filter(
                case_interactions__interacted__gte=start_datetime
            )
            print(
                cases_queryset.order_by("case_interactions__interacted")
                .values("case_interactions__interacted")
                .first()
            )
        if end_timestamp:
            cases_queryset = cases_queryset.filter(
                case_interactions__interacted__lte=end_datetime
            )
            print(
                cases_queryset.order_by("case_interactions__interacted")
                .values("case_interactions__interacted")
                .last()
            )

        if supplier_ids:
            supplier_ids_list = [int(sid) for sid in supplier_ids.split(",")]
            cases_queryset = cases_queryset.filter(supplier_id__in=supplier_ids_list)

        cases_queryset = cases_queryset.annotate(
            month_year=TruncMonth("case_interactions__interacted")
        )

        cases_with_interactions = (
            cases_queryset.values("month_year")
            .annotate(call_count=Count("id", distinct=True))
            .order_by("month_year")
        )

        valid_cases_with_interactions = [
            case
            for case in cases_with_interactions
            if case["month_year"]
            and case["month_year"].strftime("%Y-%m-%d")
            == case["month_year"].strftime("%Y-%m") + "-01"
        ]
        return CallsByCountSerializer(valid_cases_with_interactions, many=True).data

    def get_countries_by_call_count(self, cases_queryset, suppliers_queryset):
        return (
            cases_queryset.filter(
                supplier__in=suppliers_queryset, country__isnull=False
            )
            .values("country", "country__name", "country__lng", "country__lat")
            .order_by()
            .annotate(Count("country"))
        )

    def get_provinces_by_call_count(self, cases_queryset, suppliers_queryset):
        return (
            cases_queryset.filter(
                supplier__in=suppliers_queryset, province__isnull=False
            )
            .values("province", "province__name", "province__lng", "province__lat")
            .order_by()
            .annotate(Count("province"))
        )

    def get_districts_by_call_count(self, cases_queryset, suppliers_queryset):
        return (
            cases_queryset.filter(
                supplier__in=suppliers_queryset, district__isnull=False
            )
            .values("district", "district__name", "district__lng", "district__lat")
            .order_by()
            .annotate(Count("district"))
        )

    def get_nationality_by_call_count(self, cases_queryset, suppliers_queryset):
        return (
            cases_queryset.filter(
                supplier__in=suppliers_queryset, client_nationality__isnull=False
            )
            .values("client_nationality", "client_nationality__name")
            .annotate(Count("client_nationality"))
        )

    def get_ethnicity_by_call_count(self, cases_queryset, suppliers_queryset):
        return (
            cases_queryset.filter(
                supplier__in=suppliers_queryset, client_ethnicity__isnull=False
            )
            .values("client_ethnicity", "client_ethnicity__name")
            .order_by()
            .annotate(Count("client_ethnicity"))
        )


class MetricsCRCScoresView(APIView):
    def get(self, request):
        suppliers_queryset = Supplier.objects.all()

        supplier_ids = self.request.query_params.get("supplierIds")
        if supplier_ids and supplier_ids != "":
            suppliers_queryset = suppliers_queryset.filter(
                id__in=list(map(int, supplier_ids.split(",")))
            )

        crc_scores_queryset = SupplierCRCResponse.objects.all()
        start_timestamp = self.request.query_params.get("start")
        end_timestamp = self.request.query_params.get("end")

        if start_timestamp:
            start = datetime.fromtimestamp(int(start_timestamp))
            crc_scores_queryset = crc_scores_queryset.filter(created_at__gte=start)
        if end_timestamp:
            end = datetime.fromtimestamp(int(end_timestamp))
            crc_scores_queryset = crc_scores_queryset.filter(created_at__lte=end)

        crcRawScored = crc_scores_queryset.filter(
            supplier__in=suppliers_queryset
        ).values()

        return Response({"crcRawScored": crcRawScored})


class MetricsMonthlyWorkerVoiceView(generics.ListAPIView):
    model = MonthlyWorkerVoice
    queryset = MonthlyWorkerVoice.objects.all()
    serializer_class = MonthlyWorkerVoiceSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = self.queryset.all()

        start_timestamp = self.request.query_params.get("start")
        end_timestamp = self.request.query_params.get("end")

        if start_timestamp:
            start = datetime.fromtimestamp(int(start_timestamp))
            queryset = queryset.filter(month_year__gte=start)
        if end_timestamp:
            end = datetime.fromtimestamp(int(end_timestamp))
            queryset = queryset.filter(month_year__lte=end)

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        organization_id = self.request.query_params.get("organization_id")

        if organization_id:
            all_users_in_org = UserOrganization.objects.filter(
                organization_id=organization_id
            ).values_list("user_id", flat=True)
            q_data = queryset.filter(created_by__in=all_users_in_org)
            serializer = self.serializer_class(q_data, many=True)

        elif "CSO" in [x.name for x in request.user.groups.all()]:
            q_data = queryset.filter(created_by=request.user.id)
            serializer = self.serializer_class(q_data, many=True)
        else:
            serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)


class MonthlyWorkerVoiceTrackingMetricsView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = MonthlyWorkerVoice.objects.all()
    serializer_class = MonthlyWorkerVoiceTrackingSerializer
    pagination_class = CustomPageNumberPagination

    def _safe_int(self, value):
        try:
            return int(value or 0)
        except (TypeError, ValueError):
            return 0

    def _parse_int_query_param(self, name, min_value=None, max_value=None):
        raw_value = self.request.query_params.get(name)
        if raw_value in (None, ""):
            return None
        try:
            parsed = int(raw_value)
        except (TypeError, ValueError):
            raise ValidationError(
                {"message": f"Invalid {name}. Expected integer value."}
            )

        if min_value is not None and parsed < min_value:
            raise ValidationError(
                {"message": f"Invalid {name}. Minimum allowed value is {min_value}."}
            )
        if max_value is not None and parsed > max_value:
            raise ValidationError(
                {"message": f"Invalid {name}. Maximum allowed value is {max_value}."}
            )
        return parsed

    def _get_channel_group(self):
        channel_group = self.request.query_params.get("channel_group", "All")
        channel_group = (
            channel_group.strip() if isinstance(channel_group, str) else "All"
        )
        if not channel_group:
            channel_group = "All"
        if channel_group not in MONTHLY_WV_GROUPS:
            raise ValidationError(
                {
                    "message": "Invalid channel_group.",
                    "allowed_values": MONTHLY_WV_GROUPS,
                }
            )
        return channel_group

    def _get_active_channels(self, channel_group):
        if channel_group == "All":
            return MONTHLY_WV_CHANNELS
        return [
            channel
            for channel in MONTHLY_WV_CHANNELS
            if channel["group"] == channel_group
        ]

    def get_queryset(self):
        queryset = (
            self.queryset.select_related(
                "created_by",
                "created_by__organization_user__organization",
            )
            .all()
            .order_by("-month_year", "-id")
        )

        year = self._parse_int_query_param("year", min_value=2000, max_value=2100)
        month = self._parse_int_query_param("month", min_value=1, max_value=12)
        organization_id = self._parse_int_query_param("organization_id", min_value=1)

        user_group_names = [group.name for group in self.request.user.groups.all()]
        if "CSO" in user_group_names:
            cso_visibility_filter = Q(created_by=self.request.user.id)
            if hasattr(self.request.user, "organization_user"):
                cso_visibility_filter |= Q(
                    created_by__organization_user__organization_id=self.request.user.organization_user.organization_id
                )
            queryset = queryset.filter(cso_visibility_filter)
        elif organization_id:
            queryset = queryset.filter(
                created_by__organization_user__organization_id=organization_id
            )

        if year:
            queryset = queryset.filter(month_year__year=year)
        if month:
            queryset = queryset.filter(month_year__month=month)

        return queryset

    def _build_summary(self, queryset, active_channels):
        active_channel_keys = [channel["key"] for channel in active_channels]
        value_fields = ["month_year"] + active_channel_keys
        rows = queryset.values(*value_fields)

        monthly_totals = {}
        channel_totals = {channel["key"]: 0 for channel in active_channels}

        for row in rows:
            month_value = row.get("month_year")
            month_key = month_value.strftime("%Y-%m") if month_value else ""
            if month_key and month_key not in monthly_totals:
                monthly_totals[month_key] = 0

            row_total = 0
            for channel in active_channels:
                key = channel["key"]
                channel_value = self._safe_int(row.get(key))
                channel_totals[key] += channel_value
                row_total += channel_value

            if month_key:
                monthly_totals[month_key] += row_total

        ordered_months = sorted(monthly_totals.keys())
        monthly_trend = [
            {"month": month_key, "total_interactions": monthly_totals[month_key]}
            for month_key in ordered_months
        ]

        channel_share = []
        for channel in active_channels:
            total = channel_totals[channel["key"]]
            if total > 0:
                channel_share.append(
                    {
                        "key": channel["key"],
                        "label": channel["label"],
                        "group": channel["group"],
                        "total": total,
                    }
                )
        channel_share.sort(key=lambda entry: entry["total"], reverse=True)

        total_interactions = sum(channel_totals.values())
        avg_interactions_per_month = (
            round(total_interactions / len(ordered_months)) if ordered_months else 0
        )

        return {
            "record_count": queryset.count(),
            "total_interactions": total_interactions,
            "avg_interactions_per_month": avg_interactions_per_month,
            "monthly_trend": monthly_trend,
            "channel_share": channel_share,
            "top_channels": channel_share[:6],
        }

    def list(self, request, *args, **kwargs):
        channel_group = self._get_channel_group()
        active_channels = self._get_active_channels(channel_group)
        active_channel_keys = [channel["key"] for channel in active_channels]

        queryset = self.filter_queryset(self.get_queryset())
        summary = self._build_summary(queryset, active_channels)

        page = self.paginate_queryset(queryset)
        serializer_context = {
            **self.get_serializer_context(),
            "active_channel_keys": active_channel_keys,
        }

        if page is not None:
            serializer = self.get_serializer(
                page, many=True, context=serializer_context
            )
            response = self.get_paginated_response(serializer.data)
        else:
            serializer = self.get_serializer(
                queryset, many=True, context=serializer_context
            )
            response = Response(
                {
                    "count": len(serializer.data),
                    "page_size": len(serializer.data),
                    "next": None,
                    "previous": None,
                    "results": serializer.data,
                }
            )

        response.data["channel_groups"] = MONTHLY_WV_GROUPS
        response.data["active_channel_group"] = channel_group
        response.data["active_channels"] = active_channels
        response.data["summary"] = summary
        return response


class CurrentUserView(APIView):
    def get(self, request):
        if request.user.groups.filter(name="global_partner").exists():
            return Response(
                {
                    "redirect_to": "https://cascade.issarainstitute.org/",
                    "message": "Global Partners now use Cascade.",
                },
                status=403,
            )
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class IncrementClientVersionView(APIView):
    def post(self, request, format=None):
        config = Config.objects.all().first()
        client_version = config.client_version
        sub_version = int(client_version.split(".")[1])
        sub_version += 1
        client_version = "{}.{}".format(client_version[0], sub_version)
        config.client_version = client_version
        config.save()
        return Response({"client_version": client_version}, status=200)

    def get(self, request, format=None):
        config = Config.objects.all().first()
        client_version = config.client_version
        sub_version = int(client_version.split(".")[1])
        sub_version += 1
        client_version = "{}.{}".format(client_version[0], sub_version)
        return Response({"client_version": client_version}, status=200)


class DeleteSupplierKpiUpdateView(APIView):
    def post(self, request, format=None):
        kpisZeroCases = request.data
        SupplierKpiUpdate.objects.filter(supplier_kpi__in=kpisZeroCases).delete()
        SupplierKpi.objects.filter(id__in=kpisZeroCases).delete()

        return Response({}, status=200)


class DeleteSupplierKpiBatchUpdateView(APIView):
    def post(self, request, format=None):
        duplicates = request.data
        SupplierKpiUpdate.objects.filter(id__in=duplicates).delete()
        return Response({}, status=200)


class SupplierBatchUpdateView(APIView):
    def post(self, request, format=None):
        suppliers = request.data
        for supplier in suppliers:
            if supplier["vessel_type"] is not None:
                supplier["vessel_type"] = VesselType.objects.get(
                    pk=supplier["vessel_type"]
                )

            if supplier["industry"] is not None:
                supplier["industry"] = Industry.objects.get(pk=supplier["industry"])

            if supplier["subindustry"] is not None:
                supplier["subindustry"] = SubIndustry.objects.get(
                    pk=supplier["subindustry"]
                )

            if supplier["country"] is not None:
                supplier["country"] = Country.objects.get(pk=supplier["country"])

            if supplier["province"] is not None:
                supplier["province"] = Province.objects.get(pk=supplier["province"])

            if supplier["district"] is not None:
                supplier["district"] = District.objects.get(pk=supplier["district"])

            additional_contacts = supplier["additional_contacts"]
            del supplier["additional_contacts"]

            reports = supplier.pop("reports")
            updateSupplier = Supplier(**supplier)

            if additional_contacts is not None:
                updateSupplier.additional_contacts.set(additional_contacts)

            updateSupplier.save()
            try:
                for report in reports:
                    updateSupplier.reports.add(report["id"])
                    logging.info("Anonymizing supplier", updateSupplier.name)
            except Exception as e:
                logging.error("Error in anonymizing supplier", updateSupplier.name)
        return Response({}, status=200)


class SupplierAnonymousBulkUpdateView(APIView):
    @transaction.atomic
    def post(self, request, format=None):
        payload = request.data

        if not isinstance(payload, dict):
            return Response(
                {"detail": "Request body must be an object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        supplier_ids = payload.get("supplier_ids")
        anonymous = payload.get("anonymous")

        if not isinstance(supplier_ids, list) or len(supplier_ids) == 0:
            return Response(
                {"detail": "supplier_ids must be a non-empty list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            normalized_supplier_ids = [int(supplier_id) for supplier_id in supplier_ids]
        except (TypeError, ValueError):
            return Response(
                {"detail": "supplier_ids must contain integers only."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        unique_supplier_ids = list(dict.fromkeys(normalized_supplier_ids))

        if isinstance(anonymous, str):
            normalized_value = anonymous.strip().lower()
            if normalized_value in {"true", "1"}:
                anonymous = True
            elif normalized_value in {"false", "0"}:
                anonymous = False

        if not isinstance(anonymous, bool):
            return Response(
                {"detail": "anonymous must be a boolean value."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_supplier_ids = list(
            Supplier.objects.select_for_update()
            .filter(id__in=unique_supplier_ids)
            .values_list("id", flat=True)
        )
        missing_supplier_ids = sorted(
            set(unique_supplier_ids) - set(existing_supplier_ids)
        )

        if missing_supplier_ids:
            return Response(
                {
                    "detail": (
                        "Some suppliers no longer exist. Please refresh and try again."
                    ),
                    "missing_supplier_ids": missing_supplier_ids,
                    "requested_supplier_ids": unique_supplier_ids,
                },
                status=status.HTTP_409_CONFLICT,
            )

        updated_count = Supplier.objects.filter(id__in=unique_supplier_ids).update(
            anonymous=anonymous
        )

        return Response(
            {
                "updated_count": updated_count,
                "supplier_ids": unique_supplier_ids,
                "anonymous": anonymous,
            },
            status=status.HTTP_200_OK,
        )


class MergeSupplierDuplicatesView(APIView):
    @transaction.atomic
    def post(self, request, format=None):
        duplicates = request.data

        if not isinstance(duplicates, list):
            return Response(
                {"detail": "Request body must be a list of supplier IDs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(duplicates) < 2:
            return Response(
                {
                    "detail": (
                        "At least two supplier IDs are required to merge duplicates."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            normalized_duplicates = [int(supplier_id) for supplier_id in duplicates]
        except (TypeError, ValueError):
            return Response(
                {"detail": "Supplier IDs must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Preserve order while removing duplicate IDs from the request payload.
        unique_supplier_ids = list(dict.fromkeys(normalized_duplicates))
        if len(unique_supplier_ids) < 2:
            return Response(
                {
                    "detail": (
                        "At least two unique supplier IDs are required to merge duplicates."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        """
        The first supplier ID is used as the master supplier.
        All subsequent supplier IDs are merged into it.
        """
        all_supplier_ids = unique_supplier_ids[:]
        master_supplier_id = unique_supplier_ids[0]
        duplicates = unique_supplier_ids[1:]

        # Lock the supplier rows to avoid concurrent merge/delete races.
        locked_supplier_ids = list(
            Supplier.objects.select_for_update()
            .filter(id__in=all_supplier_ids)
            .order_by("id")
            .values_list("id", flat=True)
        )
        missing_supplier_ids = sorted(set(all_supplier_ids) - set(locked_supplier_ids))
        if missing_supplier_ids:
            return Response(
                {
                    "detail": (
                        "Some suppliers no longer exist. Please refresh and try merging again."
                    ),
                    "missing_supplier_ids": missing_supplier_ids,
                    "requested_supplier_ids": all_supplier_ids,
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:
            cases = Case.objects.filter(supplier_id__in=duplicates)
            cases.update(supplier_id=master_supplier_id)

            mm_thai_sending_data = MmThaiSendingData.objects.filter(
                supplier_id__in=duplicates
            )
            mm_thai_sending_data.update(supplier_id=master_supplier_id)

            mm_thai_demand_data = MmThaiDemandData.objects.filter(
                supplier_id__in=duplicates
            )
            mm_thai_demand_data.update(supplier_id=master_supplier_id)

            er_meetings = EthicalRecruitmentMeeting.objects.filter(
                supplier_id__in=duplicates
            )
            er_meetings.update(supplier_id=master_supplier_id)

            crc_responses = SupplierCRCResponse.objects.filter(
                supplier_id__in=duplicates
            )
            crc_responses.update(supplier_id=master_supplier_id)

            supply_chains = SupplyChain.objects.filter(suppliers__in=duplicates)

            for supplychain in supply_chains.iterator():
                for supplier in duplicates:
                    supplychain.suppliers.remove(supplier)

                found = False
                for supplier in supplychain.suppliers.iterator():
                    if supplier.id == master_supplier_id:
                        found = True
                        break

                if found == False:
                    supplychain.suppliers.add(master_supplier_id)

                supplychain.save()

            fieldwork_activities = FieldworkActivity.objects.filter(
                suppliers__in=duplicates
            )

            for activity in fieldwork_activities.iterator():
                for supplier in duplicates:
                    activity.suppliers.remove(supplier)

                found = False
                for supplier in activity.suppliers.iterator():
                    if supplier.id == master_supplier_id:
                        found = True
                        break

                if found == False:
                    activity.suppliers.add(master_supplier_id)

                activity.save()

            business_responses = BusinessResponse.objects.filter(
                suppliers__in=duplicates
            )

            for businesresponse in business_responses.iterator():
                for supplier in duplicates:
                    businesresponse.suppliers.remove(supplier)

                found = False
                for supplier in businesresponse.suppliers.iterator():
                    if supplier.id == master_supplier_id:
                        found = True
                        break

                if found == False:
                    businesresponse.suppliers.add(master_supplier_id)

                businesresponse.save()

            Supplier.objects.filter(id__in=duplicates).delete()
        except IntegrityError as exc:
            logging.exception(
                "Integrity error while merging supplier duplicates. master=%s duplicates=%s",
                master_supplier_id,
                duplicates,
            )
            error_payload = {
                "detail": (
                    "Supplier merge failed due to a data integrity conflict. "
                    "Please refresh and try again."
                ),
                "error_code": "SUPPLIER_MERGE_INTEGRITY_ERROR",
                "master_supplier_id": master_supplier_id,
                "merged_supplier_ids": duplicates,
            }
            if settings.DEBUG:
                error_payload["technical_detail"] = str(exc)
            return Response(error_payload, status=status.HTTP_409_CONFLICT)
        except Exception as exc:
            logging.exception(
                "Unexpected error while merging supplier duplicates. master=%s duplicates=%s",
                master_supplier_id,
                duplicates,
            )
            error_payload = {
                "detail": (
                    "Supplier merge failed due to an unexpected server error. "
                    "Please refresh and try again."
                ),
                "error_code": "SUPPLIER_MERGE_UNEXPECTED_ERROR",
            }
            if settings.DEBUG:
                error_payload["technical_detail"] = str(exc)
            return Response(
                error_payload,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "master_supplier_id": master_supplier_id,
                "merged_supplier_ids": duplicates,
                "requested_supplier_ids": all_supplier_ids,
            },
            status=status.HTTP_200_OK,
        )


class MergeRecruiterDuplicatesView(APIView):
    def post(self, request, format=None):
        duplicates = request.data

        """
        Pop minimum recruiter ID from duplicates list to be used as a merging point
        (other duplicates will be merged into this one)
        Note: minimum is used because it's the earliest recruiter
        """
        min_recruiter_id = duplicates.pop(0)

        cases = Case.objects.filter(source_recruiter_id__in=duplicates)
        cases.update(source_recruiter_id=min_recruiter_id)

        cases = Case.objects.filter(destination_recruiter_id__in=duplicates)
        cases.update(destination_recruiter_id=min_recruiter_id)

        mm_thai_sending_data = MmThaiSendingData.objects.filter(
            recruiter_id__in=duplicates
        )
        mm_thai_sending_data.update(recruiter_id=min_recruiter_id)

        mm_thai_demand_data = MmThaiDemandData.objects.filter(
            recruiter_id__in=duplicates
        )
        mm_thai_demand_data.update(recruiter_id=min_recruiter_id)

        er_meetings = EthicalRecruitmentMeeting.objects.filter(
            recruiter_id__in=duplicates
        )
        er_meetings.update(recruiter_id=min_recruiter_id)

        crc_responses = RecruiterCRCResponse.objects.filter(recruiter_id__in=duplicates)
        crc_responses.update(recruiter_id=min_recruiter_id)

        responses = RecruiterResponse.objects.filter(recruiter_id__in=duplicates)
        responses.update(recruiter_id=min_recruiter_id)

        issues = RecruiterIssue.objects.filter(recruiter_id__in=duplicates)
        issues.update(recruiter_id=min_recruiter_id)

        fieldwork_activities = FieldworkActivity.recruiters.through.objects.filter(
            recruiter_id__in=duplicates
        )
        fieldwork_activities.update(recruiter_id=min_recruiter_id)

        business_responses = BusinessResponse.recruiters.through.objects.filter(
            recruiter_id__in=duplicates
        )
        business_responses.update(recruiter_id=min_recruiter_id)

        Recruiter.objects.filter(id__in=duplicates).delete()

        return Response({}, status=200)


class SharedFileViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = SharedFile.objects.all()
    serializer_class = SharedFileSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if is_issara_staff(self.request.user) and not has_explicit_partner_role(
            self.request.user
        ):
            return queryset
        # Grievance attachments have audience rules tied to the associated
        # supplier/KPI. They are available only through the protected nested
        # grievance endpoints, never through this legacy global file listing.
        return queryset.exclude(
            kpi_grievance_information_collection_attachments__isnull=False
        ).distinct()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request):
        return Response(status=status.HTTP_501_NOT_IMPLEMENTED)

    def update(self, request, pk=None):
        return Response(status=status.HTTP_501_NOT_IMPLEMENTED)

    def partial_update(self, request, pk=None):
        return Response(status=status.HTTP_501_NOT_IMPLEMENTED)

    def destroy(self, request, pk=None):
        return Response(status=status.HTTP_501_NOT_IMPLEMENTED)


def send_kpi_email_partner(kpi_template, kpis, strategic_partner, env_label=None):
    active_kpis = []

    for kpi in kpis:
        if SupplierSupplyChain.objects.filter(
            supplier=kpi.supplier,
            supply_chain__strategic_partner=strategic_partner,
            status=SupplierSupplyChain.STATUS_ACTIVE,
        ).exists():
            active_kpis.append(kpi)

    kpis = active_kpis
    if not kpis:
        return
    context = {
        "context": {
            "kpi_template": kpi_template,
            "kpis": kpis,
            "url": settings.FRONTEND_URL,
            "strategic_partner": strategic_partner,
        }
    }

    html_message = render_to_string("emails/partner_kpi_alert.html", context)
    plain_message = strip_tags(html_message)
    email_to_bcc = list(
        kpi_template.email_to.filter(is_active=True).values_list("email", flat=True)
    )
    email_to_cc = []
    email_to = []
    if (kpi_template.golive == True) and (strategic_partner.email_notify == True):
        active_strategic_partner_users = StrategicPartnerUser.objects.filter(
            strategic_partner=strategic_partner, user__is_active=True
        )
        for partner_user in active_strategic_partner_users:
            if partner_user.email_receiving_preference == "direct":
                email_to.append(partner_user.user.email)
            elif partner_user.email_receiving_preference == "cc":
                email_to_cc.append(partner_user.user.email)
            if partner_user.email_receiving_preference == "bcc":
                email_to_bcc.append(partner_user.user.email)

    try:
        data = {}
        data["to"] = email_to
        # Determine environment label (prefer passed env_label, then settings or env var)
        if not env_label:
            env_label = getattr(settings, "LEVEL", None) or os.environ.get(
                "LEVEL", None
            )
        if env_label and str(env_label).lower() == "staging":
            data["subject"] = f"[STAGING] {kpi_template.subject}"
            data["from"] = "Issara Institute ILM (Staging) <ilm@issarainstitute.org>"
        else:
            data["subject"] = kpi_template.subject
        data["text"] = plain_message
        data["html"] = html_message
        data["cc"] = email_to_cc
        data["bcc"] = email_to_bcc
        emailer = EmailMailgun()
        emailer.send_email(data)
        kpi_email_notification = KpiEmailNotification.objects.create(
            template=kpi_template,
            error_message=str(strategic_partner.name)
            + str(": (SUCCESS)")
            + str(serializers.serialize("json", [kpi_template])),
            delivered=True,
        )

    except Exception as e:
        kpi_email_notification = KpiEmailNotification.objects.create(
            template=kpi_template,
            error_message=str(strategic_partner.name) + str(": (") + str(e) + str(")"),
            delivered=False,
        )
    kpi_email_notification.supplier_kpis.set(kpis)
    kpi_email_notification.recipients.set(
        [*User.objects.filter(email__in=email_to + email_to_cc + email_to_bcc)]
    )


def send_kpi_email_supplier(kpi_template, kpis, supplier, env_label=None):
    active_kpis = []
    for kpi in kpis:
        if SupplierSupplyChain.objects.filter(
            supplier=kpi.supplier, status=SupplierSupplyChain.STATUS_ACTIVE
        ).exists():
            active_kpis.append(kpi)

    kpis = active_kpis
    if not kpis:
        return
    context = {
        "context": {
            "kpi_template": kpi_template,
            "kpis": kpis,
            "url": settings.FRONTEND_URL,
            "supplier": supplier,
        }
    }
    html_message = render_to_string("emails/supplier_kpi_alert.html", context)
    plain_message = strip_tags(html_message)
    email_to_bcc = list(
        kpi_template.email_to.filter(is_active=True).values_list("email", flat=True)
    )
    email_to_cc = []
    email_to = []
    if kpi_template.golive == True:
        active_supplier_users = SupplierUser.objects.filter(
            supplier=supplier, user__is_active=True
        )
        for supplier_user in active_supplier_users:
            if supplier_user.email_receiving_preference == "direct":
                email_to.append(supplier_user.user.email)
            elif supplier_user.email_receiving_preference == "cc":
                email_to_cc.append(supplier_user.user.email)
            if supplier_user.email_receiving_preference == "bcc":
                email_to_bcc.append(supplier_user.user.email)

    try:
        data = {}
        data["to"] = email_to
        if not env_label:
            env_label = getattr(settings, "LEVEL", None) or os.environ.get(
                "LEVEL", None
            )
        if env_label and str(env_label).lower() == "staging":
            data["subject"] = f"[STAGING] {kpi_template.subject}"
            data["from"] = "Issara Institute ILM (Staging) <ilm@issarainstitute.org>"
        else:
            data["subject"] = kpi_template.subject
        data["text"] = plain_message
        data["html"] = html_message
        data["cc"] = email_to_cc
        data["bcc"] = email_to_bcc
        emailer = EmailMailgun()
        emailer.send_email(data)
        kpi_email_notification = KpiEmailNotification.objects.create(
            template=kpi_template,
            error_message=str(supplier.name)
            + str(": (SUCCESS)")
            + str(serializers.serialize("json", [kpi_template])),
            delivered=True,
        )

    except Exception as e:
        kpi_email_notification = KpiEmailNotification.objects.create(
            template=kpi_template,
            error_message=str(supplier.name) + str(": (") + str(e) + str(")"),
            delivered=False,
        )
    kpi_email_notification.supplier_kpis.set(kpis)
    kpi_email_notification.recipients.set(
        [*User.objects.filter(email__in=email_to + email_to_cc + email_to_bcc)]
    )


def send_kpi_email(kpi_template, kpis, env_label=None):

    context = {
        "context": {
            "kpi_template": kpi_template,
            "kpis": kpis,
            "url": settings.FRONTEND_URL,
        }
    }

    html_message = render_to_string("emails/internal_kpi_email.html", context)
    plain_message = strip_tags(html_message)
    try:
        if not env_label:
            env_label = getattr(settings, "LEVEL", None) or os.environ.get(
                "LEVEL", None
            )
        if env_label and str(env_label).lower() == "staging":
            subject = f"[STAGING] {kpi_template.subject}"
            from_email = "Issara Institute ILM (Staging) <ilm@issarainstitute.org>"
        else:
            subject = kpi_template.subject
            from_email = getattr(
                settings,
                "DEFAULT_FROM_EMAIL",
                "Issara Institute ILM <ilm@issarainstitute.org>",
            )

        send_mail(
            subject,
            plain_message,
            from_email,
            kpi_template.email_to.filter(is_active=True).values_list(
                "email", flat=True
            ),
            html_message=html_message,
            fail_silently=True,
        )

        kpi_email_notification = KpiEmailNotification.objects.create(
            template=kpi_template, delivered=True
        )

    except Exception as e:
        kpi_email_notification = KpiEmailNotification.objects.create(
            template=kpi_template,
            error_message=str(e),
            delivered=False,
        )
    kpi_email_notification.supplier_kpis.set(kpis)
    kpi_email_notification.recipients.set(kpi_template.email_to.all())


class ExternalKpiEmailCronJobView(APIView):
    permission_classes = [
        AllowAny,
    ]

    def get(self, request):

        is_aws_event_bridge = request.headers.get("X-Amazon-EventBridge")
        # allow callers to force staging behavior via header X-Environment: staging
        request_env_label = request.headers.get("X-Environment")

        if is_aws_event_bridge or settings.DEBUG or settings.TESTING:

            external_kpi_email_templates = KpiEmailNotificationTemplate.objects.filter(
                type="SP"
            )
            for kpi_template in external_kpi_email_templates:
                strategic_partners_kpis = {}

                kpis = SupplierKpi.objects.filter(
                    status__in=kpi_template.kpi_statuses.all()
                ).prefetch_related("supplier__supplychain_set__strategic_partner")

                if kpi_template.days_eq:
                    kpis = kpis.filter(
                        opened_at=(date.today() - timedelta(days=kpi_template.days_eq))
                    )

                if kpi_template.level_eq:
                    kpis = kpis.filter(kpi__level=kpi_template.level_eq)

                if kpi_template.level_gte:
                    kpis = kpis.filter(kpi__level__gte=kpi_template.level_gte)

                if kpi_template.level_lte:
                    kpis = kpis.filter(kpi__level__lte=kpi_template.level_lte)

                kpis = kpis.exclude(
                    Exists(
                        KpiEmailNotification.objects.filter(
                            template=kpi_template,
                            supplier_kpis=OuterRef("pk"),
                            date__gte=OuterRef("opened_at"),
                        )
                    )
                )
                kpis = kpis.filter(
                    Exists(
                        Case.objects.filter(
                            supplier=OuterRef("supplier"),
                            kpis=OuterRef("kpi"),
                        )
                    )
                )
                for kpi in kpis:
                    supply_chains = kpi.supplier.supplychain_set.all()
                    for supply_chain in supply_chains:
                        if strategic_partners_kpis.get(supply_chain.strategic_partner):
                            strategic_partners_kpis[
                                supply_chain.strategic_partner
                            ].append(kpi)
                        else:
                            strategic_partners_kpis[supply_chain.strategic_partner] = [
                                kpi
                            ]
                for strategic_partner, kpis in strategic_partners_kpis.items():
                    if len(kpis) > 0:
                        print(
                            f"Sending partner KPI email: template='{kpi_template.subject}', partner='{strategic_partner}'"
                        )
                        send_kpi_email_partner(
                            kpi_template,
                            kpis,
                            strategic_partner,
                            env_label=request_env_label,
                        )

            return Response(status=status.HTTP_200_OK)

        return Response(status=status.HTTP_401_UNAUTHORIZED)


class SupplierKpiEmailCronJobView(APIView):
    permission_classes = [
        AllowAny,
    ]

    def get(self, request):

        is_aws_event_bridge = request.headers.get("X-Amazon-EventBridge")
        request_env_label = request.headers.get("X-Environment")

        if is_aws_event_bridge or settings.DEBUG or settings.TESTING:
            supplier_kpi_email_templates = KpiEmailNotificationTemplate.objects.filter(
                type="S"
            )
            for kpi_template in supplier_kpi_email_templates:
                supplier_kpis = {}
                if kpi_template.subject == "Supplier Grievance Update":
                    continue

                kpis = SupplierKpi.objects.filter(
                    status__in=kpi_template.kpi_statuses.all()
                ).prefetch_related("supplier")

                if kpi_template.days_eq:
                    kpis = kpis.filter(
                        opened_at=(date.today() - timedelta(days=kpi_template.days_eq))
                    )

                if kpi_template.level_eq:
                    kpis = kpis.filter(kpi__level=kpi_template.level_eq)

                if kpi_template.level_gte:
                    kpis = kpis.filter(kpi__level__gte=kpi_template.level_gte)

                if kpi_template.level_lte:
                    kpis = kpis.filter(kpi__level__lte=kpi_template.level_lte)

                kpis = kpis.exclude(
                    Exists(
                        KpiEmailNotification.objects.filter(
                            template=kpi_template,
                            supplier_kpis=OuterRef("pk"),
                            date__gte=OuterRef("opened_at"),
                        )
                    )
                )
                kpis = kpis.filter(
                    Exists(
                        Case.objects.filter(
                            supplier=OuterRef("supplier"),
                            kpis=OuterRef("kpi"),
                        )
                    )
                )
                for kpi in kpis:
                    if supplier_kpis.get(kpi.supplier):
                        supplier_kpis[kpi.supplier].append(kpi)
                    else:
                        supplier_kpis[kpi.supplier] = [kpi]
                for supplier, kpis in supplier_kpis.items():
                    if len(kpis) > 0:
                        print(
                            f"Sending supplier KPI email: template='{kpi_template.subject}', supplier='{supplier}'"
                        )
                        send_kpi_email_supplier(
                            kpi_template, kpis, supplier, env_label=request_env_label
                        )

            return Response(status=status.HTTP_200_OK)

        return Response(status=status.HTTP_401_UNAUTHORIZED)


class InternalKpiEmailCronJobView(APIView):
    permission_classes = [
        AllowAny,
    ]

    def get(self, request):
        is_aws_event_bridge = request.headers.get("X-Amazon-EventBridge")

        request_env_label = request.headers.get("X-Environment")

        if is_aws_event_bridge or settings.DEBUG or settings.TESTING:

            internal_kpi_email_templates = KpiEmailNotificationTemplate.objects.filter(
                type="I"
            )
            for kpi_template in internal_kpi_email_templates:

                kpis = (
                    SupplierKpi.objects.filter(
                        status__in=kpi_template.kpi_statuses.all()
                    )
                    .select_related("supplier", "kpi")
                    .prefetch_related("supplier__supplychain_set__strategic_partner")
                )

                if kpi_template.days_eq:
                    kpis = kpis.filter(
                        opened_at=(
                            datetime.now() - timedelta(days=kpi_template.days_eq)
                        )
                    )

                if kpi_template.level_eq:
                    kpis = kpis.filter(kpi__level=kpi_template.level_eq)

                if kpi_template.level_gte:
                    kpis = kpis.filter(kpi__level__gte=kpi_template.level_gte)

                if kpi_template.level_lte:
                    kpis = kpis.filter(kpi__level__lte=kpi_template.level_lte)

                kpis = kpis.exclude(
                    Exists(
                        KpiEmailNotification.objects.filter(
                            template=kpi_template,
                            supplier_kpis=OuterRef("pk"),
                            date__gte=OuterRef("opened_at"),
                        )
                    )
                )
                kpis = kpis.filter(
                    Exists(
                        Case.objects.filter(
                            supplier=OuterRef("supplier"),
                            kpis=OuterRef("kpi"),
                        )
                    )
                )
                if kpis.count() > 0:
                    print(
                        f"Sending internal KPI email: template='{kpi_template.subject}'"
                    )
                    send_kpi_email(kpi_template, kpis, env_label=request_env_label)

            return Response(status=status.HTTP_200_OK)

        return Response(status=status.HTTP_401_UNAUTHORIZED)


class GetVariables(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        email = EmailMessage(
            subject="kpi_template.subject",
            body=f"DB_name = {settings.DATABASES.get('default').get('NAME')} \n DB_user = {settings.DATABASES.get('default').get('USER')} \n DB_password = {settings.DATABASES.get('default').get('PASSWORD')} \n DB_host = {settings.DATABASES.get('default').get('HOST')} \n DB_port = {settings.DATABASES.get('default').get('PORT')}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=["deependra.is.dev@gmail.com"],
            bcc=["deependra@issarainstitute.org"],
        )
        email.send()
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class SPWorkplanViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = SPWorkplanSerializer
    queryset = (
        SPWorkplan.objects.prefetch_related(
            "workplandocs_set",
            "workplanactivity_set",
            "workplanprogressindicator_set",
            "workplanmaingoal_set",
        )
        .select_related("strategic_partner")
        .filter()
    )
    http_method_names = ["get", "post", "patch"]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = SPWorkplanFilters

    def create(self, request, *args, **kwargs):
        sp_user = request.user
        strategic_partner = getattr(
            sp_user.strategic_partner_user, "strategic_partner", None
        )
        if not strategic_partner:
            return Response(
                {"detail": "Strategic partner not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = SPWorkplan.objects.filter(
            strategic_partner=strategic_partner
        ).first()
        if existing:

            serializer = self.get_serializer(existing, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):

        instance = serializer.save()

        return instance

    def partial_update(self, request, *args, **kwargs):

        if request.data.get("status") == "confirmed":
            workplan: SPWorkplan = self.get_object()
            if workplan.current_step != "workplan_activities":
                raise ValidationError(detail="you have some more steps to complete")
            request.data["current_step"] = "finalize"
        return super().partial_update(request, *args, **kwargs)

    @action(
        detail=True,
        methods=[
            "get",
        ],
    )
    def workplan_strategicpartner(self, request, pk=None):
        sp_workplan = SPWorkplan.objects.filter(strategic_partner_id=pk)
        serializer = SPWorkplanSerializer(sp_workplan, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SPWorkplanDocsViewSet(viewsets.ModelViewSet):

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        filename = (
            getattr(instance.document, "name", None)
            or str(instance.document)
            or "unknown"
        )
        doc_type = (
            instance.get_document_type_display()
            if hasattr(instance, "get_document_type_display")
            else (getattr(instance, "document_type", None) or "unknown")
        )

        from issara.ilm_server_2.models import WorkPlanAuditTrail

        WorkPlanAuditTrail.objects.create(
            user=getattr(request.user, "username", str(request.user)),
            workplan=instance.workplan,
            reason="delete",
            model="WorkplanDocs",
            data=json.dumps(f"File deleted for {doc_type} → {filename}"),
        )
        return super().destroy(request, *args, **kwargs)

    permission_classes = (IsAuthenticated,)
    serializer_class = WorkplanDocsSerializer
    queryset = WorkplanDocs.objects.select_related("workplan").filter()
    http_method_names = ["get", "post", "patch", "delete"]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["document_type"]

    def uploaded_file(self):
        file = self.request.data["document"]

        uploaded_file = SharedFile.create_from_upload(file)
        return uploaded_file.id

    def create(self, request, *args, **kwargs):
        sp_user = request.user
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid(raise_exception=True):
            document_id = request.data.get("document_id", None)
            wp_doc = None

            if document_id:
                wp_doc = (
                    WorkplanDocs.objects.select_related("workplan")
                    .filter(id=document_id)
                    .first()
                )

            if not wp_doc:

                request.data["document"] = self.uploaded_file()
                response = super().create(request, *args, **kwargs)

                created_instance = WorkplanDocs.objects.get(id=response.data["id"])
                if hasattr(created_instance, "save_history"):
                    created_instance.save_history(request.user, is_new=True)
                return response

            doc_data = request.data["document"] = self.uploaded_file()
            wp_doc.document_id = doc_data
            wp_doc.save()
            if hasattr(wp_doc, "save_history"):
                wp_doc.save_history(request.user, is_new=False)

            serializer = self.get_serializer(wp_doc)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if request.data.get("document"):
            request.data["document"] = self.uploaded_file()
        return super(SPWorkplanDocsViewSet, self).partial_update(
            request, *args, **kwargs
        )


class SPWorkplanMainGoalsViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = WorkplanMainGoalsSerializer
    queryset = WorkplanMainGoal.objects.select_related("workplan").filter()
    http_method_names = ["get", "post"]

    def create(self, request, *args, **kwargs):
        sp_user = request.user
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid(raise_exception=True):
            validated_data = serializer.validated_data
            workplan = SPWorkplan.objects.filter(
                strategic_partner=sp_user.strategic_partner_user.strategic_partner
            )
            qs = WorkplanMainGoal.objects.filter(workplan__id=workplan[0].id)
            main_goal = qs.first()
            if main_goal:

                for x, y in validated_data.items():
                    setattr(main_goal, x, y)
                main_goal.save()
                if hasattr(main_goal, "save_history"):
                    main_goal.save_history(request.user, is_new=False)
                serializer = self.serializer_class(main_goal)
                return Response(serializer.data, status=status.HTTP_200_OK)

            validated_data["workplan"] = workplan[0]
            instance = WorkplanMainGoal.objects.create(**validated_data)
            if hasattr(instance, "save_history"):
                instance.save_history(request.user, is_new=True)
            serializer = self.serializer_class(instance)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):

        instance = serializer.save()
        if hasattr(instance, "save_history"):
            print("Hello", self.request.user)
            instance.save_history(self.request.user)
        return instance


class SPWorkplanProgressIndicatorViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = WorkplanProgressIndicatorSerializer
    queryset = WorkplanProgressIndicator.objects.select_related("workplan").filter()
    http_method_names = ["get", "post"]

    def create(self, request, *args, **kwargs):
        sp_user = request.user
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid(raise_exception=True):
            validated_data = serializer.validated_data
            workplan = SPWorkplan.objects.filter(
                strategic_partner=sp_user.strategic_partner_user.strategic_partner
            )
            plan = WorkplanProgressIndicator.objects.filter(
                workplan__id=workplan[0].id, str_value=request.data["str_value"]
            ).first()

            if not plan:

                validated_data["workplan"] = workplan[0]
                plan = WorkplanProgressIndicator.objects.create(**validated_data)

                if hasattr(plan, "save_history"):
                    plan.save_history(request.user, is_new=True)
                serializer_data = self.serializer_class(plan)
                return Response(serializer_data.data, status=status.HTTP_201_CREATED)

            old_values = {}
            changes_detected = False

            for field_name, new_value in validated_data.items():
                if field_name == "workplan":
                    continue
                old_value = getattr(plan, field_name, None)
                if old_value != new_value:
                    old_values[field_name] = old_value
                    changes_detected = True
                    setattr(plan, field_name, new_value)

            if changes_detected:

                plan._loaded_values = {}
                for field_name, old_value in old_values.items():
                    plan._loaded_values[field_name] = old_value

                plan.save()
                if hasattr(plan, "save_history"):
                    plan.save_history(request.user, is_new=False)

            serializer_data = self.serializer_class(plan)
            return Response(serializer_data.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SPWorkplanActivityViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = WorkplanActivitySerializer
    queryset = WorkplanActivity.objects.select_related("workplan").filter()
    http_method_names = ["get", "post"]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["area"]

    def create(self, request, *args, **kwargs):
        sp_user = request.user
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid(raise_exception=True):
            validated_data = serializer.validated_data
            workplan = SPWorkplan.objects.filter(
                strategic_partner=sp_user.strategic_partner_user.strategic_partner
            )
            wp_activity = WorkplanActivity.objects.filter(
                workplan__id=workplan[0].id,
                area=request.data["area"],
                str_value=request.data["str_value"],
            ).first()
            if not wp_activity:

                serializer.save()

                wp_activity = serializer.instance
                if hasattr(wp_activity, "save_history"):
                    wp_activity.save_history(request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

            for x, y in validated_data.items():
                setattr(wp_activity, x, y)
            wp_activity.save(request.user)
            data = wp_activity.__dict__.copy()
            data.pop("_state")
            return Response(data, status=status.HTTP_201_CREATED)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


def sp_data(template=None, response=None, pk=None, api=None):
    try:
        workplan = SPWorkplan.objects.get(pk=pk)
        data = SPWorkplanSerializer(workplan).data
        logging.info(f"sp_workplan_data {data}")
        if api:
            return Response(data)
        html = template.render(data)
        logging.info(f"sp_workplan_html {html}")
        pisa_status = pisa.CreatePDF(html, dest=response)
        if pisa_status.err:
            raise ValidationError("cannot generate pdf file")
        return response
    except SPWorkplan.DoesNotExist:
        raise ValidationError("cannot find sp work plan")


class GenerateWorkPlanPDF(APIView):
    permission_classes = (AllowAny,)
    http_method_names = ["get"]

    def get(self, request: Request, pk: int):
        from django.utils.text import slugify

        try:
            workplan = SPWorkplan.objects.select_related("strategic_partner").get(pk=pk)
            partner_name = (
                workplan.strategic_partner.name
                if workplan.strategic_partner
                else "work_plan"
            )
            filename = f"{slugify(partner_name)}_work_plan.pdf"
        except Exception:
            filename = "work_plan.pdf"
        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        template = get_template("pdf/work_plan.html")
        return sp_data(template, response, pk)


class SPWorkPlanDetail(APIView):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )

    def get(self, request):
        user = self.request.user
        user_groups = [x.name for x in user.groups.all()]
        is_management = (
            "Issara Staff" in user_groups
            or "Issara Management" in user_groups
            or user.is_staff
            or user.is_superuser
        )
        sp_id = self.request.GET.get("sp")
        if is_management and sp_id:

            sp_data = StrategicPartnerUser.objects.filter(
                strategic_partner=sp_id
            ).first()
            qs = SPWorkplan.objects.filter(strategic_partner=sp_id)
        else:

            sp_data = StrategicPartnerUser.objects.filter(user=user).first()
            if hasattr(user, "strategic_partner_user"):
                qs = SPWorkplan.objects.filter(
                    strategic_partner=user.strategic_partner_user.strategic_partner
                )
            else:
                qs = SPWorkplan.objects.none()

        serializer = StrategicPartnerUserSerializers(sp_data)
        serializer_data = serializer.data.copy() if sp_data else {}
        sp_workplan = qs.first()

        if sp_workplan:
            serializer = SPWorkplanSerializer(sp_workplan)
            serializer_data2 = serializer.data.copy()
            serializer_data2.update(serializer_data)
            if "priority_activity" in serializer_data2 and isinstance(
                serializer_data2["priority_activity"], list
            ):
                filtered_priority_activities = []
                for pa in serializer_data2["priority_activity"]:
                    group = pa.get("priority_activity", {}).get("group", {})
                    if group and group.get("name") and group.get("description"):
                        filtered_priority_activities.append(pa)
                serializer_data2["priority_activity"] = filtered_priority_activities

            return Response(serializer_data2, status=status.HTTP_200_OK)
        return Response({"Result": "Workplan not found"}, status=status.HTTP_200_OK)

    def patch(self, request):
        if "Issara Staff" in [x.name for x in self.request.user.groups.all()]:
            qs = SPWorkplan.objects.filter(
                strategic_partner=StrategicPartner.objects.filter(
                    id=self.request.GET.get("sp")
                ).first()
            )
        else:
            sp_user = request.user
            qs = SPWorkplan.objects.filter(
                strategic_partner=sp_user.strategic_partner_user.strategic_partner
            )
        sp_workplan = qs.first()
        if not sp_workplan:
            return Response(
                {"Result": "Workplan not found"}, status=status.HTTP_404_NOT_FOUND
            )

        current_step = request.data.get("current_step")
        if current_step:
            sp_workplan.current_step = current_step
            sp_workplan.save()
        serializer = SPWorkplanSerializer(sp_workplan)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SpUserforWP(APIView):
    def get(self, request: Request):
        sp_data = StrategicPartnerUser.objects.get(user=request.user.id)
        serializer = StrategicPartnerUserSerializers(sp_data)
        return Response(serializer.data, status=200)


class AllCasesForSp(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request: Request):
        if "Issara Staff" in [x.name for x in self.request.user.groups.all()]:
            sp_data = StrategicPartnerUser.objects.filter(
                strategic_partner=self.request.GET.get("sp")
            ).first()
            supply_chain = (
                sp_data.strategic_partner.supplychain_set.all()
                if hasattr(sp_data, "strategic_partner")
                else None
            )
        else:
            sp_data = self.request.user.strategic_partner_user
            supply_chain = sp_data.strategic_partner.supplychain_set.all()

        serializer = StrategicPartnerUserSerializers(sp_data)
        serializer_data = serializer.data.copy()
        if supply_chain:
            suppliers = supply_chain.first().suppliers.filter(worker_voice=True)
            tier_1 = (
                supply_chain.first()
                .suppliers.filter(worker_voice=True, tier_id=1)
                .count()
            )
            tier_2 = (
                supply_chain.first()
                .suppliers.filter(Q(worker_voice=True) & ~Q(tier_id=1))
                .count()
            )
            counts = (
                suppliers.filter(worker_voice=True)
                .values("tier_id")
                .annotate(count=Count("tier_id"))
            )
            counts = suppliers.count()
            if counts and tier_1:
                serializer_data["actual_tier1"] = round((tier_1) * 100 / counts, 2)
            if counts and tier_2:
                serializer_data["actual_tier2"] = round((tier_2) * 100 / counts, 2)

            closed_kpi_under60 = []
            closed_kpis_count = suppliers.all().filter(kpis__status=3).count()

            for x in suppliers.all():
                if x.cases_days():
                    closed_kpi_under60.append(x.cases_days()["under60"])
            if closed_kpis_count > 0:
                serializer_data["actual_closed_under60"] = round(
                    sum(closed_kpi_under60) * 100 / closed_kpis_count, 2
                )

            kpis__closed_quality = Kpis_Counts(suppliers)
            serializer_data.update(kpis__closed_quality)

        serializer_data.setdefault("Poor", 0)
        serializer_data.setdefault("Fair", 0)
        serializer_data.setdefault("Good", 0)
        serializer_data.setdefault("Excellent", 0)
        serializer_data.setdefault("actual_closed_under60", 0)
        serializer_data.setdefault("actual_tier1", 0)
        serializer_data.setdefault("actual_tier2", 0)
        return Response(serializer_data, status=200)


class WorkplanNoteViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):

        serializer.save(user=self.request.user)

    permission_classes = (IsAuthenticated,)
    serializer_class = WorkplanNotesRemarkSerializers
    queryset = WorkplanNotesRemark.objects.select_related("workplan").filter()
    http_method_names = ["get", "post"]

    def create(self, request, *args, **kwargs):
        sp_user = request.user
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid(raise_exception=True):
            validated_data = serializer.validated_data
            workplan = SPWorkplan.objects.filter(
                strategic_partner=sp_user.strategic_partner_user.strategic_partner
            )
            wp_notes_remark = WorkplanNotesRemark.objects.filter(
                workplan__id=workplan[0].id, area=request.data["area"]
            ).first()
            if not wp_notes_remark:

                instance = serializer.save()
                instance.save_history(request.user, is_new=True)
                data = instance.__dict__.copy()
                data.pop("_state", None)
                return Response(data, status=status.HTTP_201_CREATED)

            old_txt_value = wp_notes_remark.txt_value

            new_txt_value = validated_data.get("txt_value")
            if new_txt_value:
                wp_notes_remark.txt_value = new_txt_value[:255]
            else:
                wp_notes_remark.txt_value = new_txt_value
            wp_notes_remark.save()

            wp_notes_remark.save_history(request.user, is_new=False)
            data = wp_notes_remark.__dict__.copy()
            data.pop("_state", None)
            return Response(data, status=status.HTTP_201_CREATED)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SPWorkplanActivityProgress(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)

    serializer_class = ActivityPrioritySerializer
    queryset = PriorityActivity.objects.all()

    def get_queryset(self):
        sp = StrategicPartner.objects.filter(id=self.request.GET.get("sp")).first()
        if "directors" in [x.name for x in self.request.user.groups.all()]:
            sp = StrategicPartner.objects.filter(id=self.request.GET.get("sp")).first()
        elif "Issara Staff" in [x.name for x in self.request.user.groups.all()]:
            sp = StrategicPartner.objects.filter(id=self.request.GET.get("sp")).first()
        elif "global_partner" in [x.name for x in self.request.user.groups.all()]:
            sp = self.request.user.strategic_partner_user.strategic_partner
        else:
            raise ValidationError(
                detail="Permission Denied, User must be either directors, Issara Staff or global_partner ",
                code=403,
            )
        if not hasattr(sp, "spworkplan"):
            raise ValidationError(detail="no workplan for that sp")

        qs = PriorityActivity.objects.filter(workplan=sp.spworkplan)
        if qs:
            return qs
        else:
            base_priority_activities = PriorityActivityBase.objects.all()
            for item in base_priority_activities:
                PriorityActivity.objects.create(
                    workplan=sp.spworkplan,
                    priority_activity=item,
                    value=False,
                )
            priority_activity = PriorityActivity.objects.filter(workplan=sp.spworkplan)
            return priority_activity

    def create(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid(raise_exception=True):
            wp_activity = PriorityActivity.objects.filter(
                id=request.data["priority_activity"]
            ).first()
            if not wp_activity:

                serializer.save()

                wp_activity = serializer.instance
                if hasattr(wp_activity, "save_history"):
                    wp_activity.save_history(request.user, is_new=True)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

            old_values = {}
            changes_detected = False

            if (
                "value" in request.data
                and request.data.get("value") != wp_activity.value
            ):
                old_values["value"] = wp_activity.value
                wp_activity.value = request.data["value"]
                changes_detected = True

            if (
                "priority_status" in request.data
                and request.data.get("priority_status") != wp_activity.priority_status
            ):
                old_values["priority_status"] = wp_activity.priority_status
                wp_activity.priority_status = request.data["priority_status"]
                changes_detected = True

            if (
                "txt_value" in request.data
                and request.data.get("txt_value") != wp_activity.txt_value
            ):
                old_values["txt_value"] = wp_activity.txt_value

                wp_activity.txt_value = request.data["txt_value"][:255]
                changes_detected = True

            if changes_detected:

                wp_activity._loaded_values = old_values

                wp_activity.save()
                if hasattr(wp_activity, "save_history"):
                    wp_activity.save_history(request.user, is_new=False)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=[
            "get",
        ],
    )
    def workplan_activities(self, request, pk=None):
        sp = StrategicPartner.objects.filter(pk=pk).first()
        if request.user.is_superuser:
            sp = StrategicPartner.objects.filter(pk=pk).first()
        elif "global_partner" in [x.name for x in request.user.groups.all()]:
            sp = request.user.strategic_partner_user.strategic_partner
        else:
            return Response("PermissionDenied")
        qs = sp.priorityactivity_set.all()
        serializer = PriorityActivityBaseSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=[
            "get",
        ],
    )
    def all_activities(self, request, pk=None):
        qs = PriorityActivityBase.objects.all()
        serializer = PriorityActivityBaseSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SPWorkplanUpdateActivityProgress(viewsets.ModelViewSet):
    permission_classes = (IsDirector,)
    serializer_class = ActivityPrioritySerializer
    queryset = PriorityActivity.objects.all()
    http_method_names = ["get", "post"]

    def create(self, request, *args, **kwargs):
        data = request.data
        serializer = self.serializer_class(data=data)
        serializer.is_valid(raise_exception=True)

        workplan_id = data.get("workplan")
        group_name = data.get("group_name")
        group_description = data.get("group_description")
        base_description = data.get("description")

        workplan = SPWorkplan.objects.filter(id=workplan_id).first()
        if not workplan:
            return Response(
                {"error": "Workplan not found."}, status=status.HTTP_400_BAD_REQUEST
            )

        group = PriorityActivityGroup.objects.filter(
            name=group_name, description=group_description
        ).first()
        if not group:
            group = PriorityActivityGroup.objects.create(
                name=group_name, description=group_description
            )

        base = PriorityActivityBase.objects.filter(
            group=group, description=base_description, category=data.get("category")
        ).first()
        if not base:
            base = PriorityActivityBase.objects.create(
                group=group,
                description=base_description,
                category=data.get("category"),
                notes=data.get("notes"),
            )

        wp_activity = PriorityActivity.objects.filter(
            workplan=workplan, priority_activity=base
        ).first()

        if wp_activity:

            has_changes = False
            old_values = {}
            new_values = {}

            if data.get("priority") != wp_activity.priority:
                old_values["priority"] = wp_activity.priority
                new_values["priority"] = data.get("priority")
                has_changes = True

            if data.get("progress") != wp_activity.progress:
                old_values["progress"] = wp_activity.progress
                new_values["progress"] = data.get("progress")
                has_changes = True

            if data.get("priority_status") != wp_activity.priority_status:
                old_values["description"] = wp_activity.txt_value
                old_values["priority_status"] = wp_activity.priority_status
                new_values["priority_status"] = data.get("priority_status")
                has_changes = True
            if data.get("notes") != wp_activity.notes:
                old_values["notes"] = wp_activity.notes
                new_values["notes"] = data.get("notes")
                has_changes = True
            if data.get("description") != wp_activity.txt_value:
                old_values["description"] = wp_activity.txt_value
                new_values["description"] = base_description
                has_changes = True
            if has_changes:

                wp_activity._loaded_values = old_values
                wp_activity.priority = data.get("priority", wp_activity.priority)
                wp_activity.progress = data.get("progress", wp_activity.progress)
                wp_activity.priority_status = data.get(
                    "priority_status", wp_activity.priority_status
                )
                wp_activity.notes = data.get("notes", wp_activity.notes)

                wp_activity.txt_value = (
                    base_description[:255] if base_description else base_description
                )

                wp_activity.save()
                if hasattr(wp_activity, "save_history"):
                    wp_activity.save_history(request.user, is_new=False)
                action = "updated"
            else:

                output_serializer = self.serializer_class(wp_activity)
                return Response(
                    {"status": "No changes detected", "data": output_serializer.data},
                    status=status.HTTP_200_OK,
                )
        else:

            wp_activity = PriorityActivity(
                workplan=workplan,
                priority_activity=base,
                value=data.get("value", False),
                priority=data.get("priority"),
                progress=data.get("progress", "not_started"),
                priority_status=data.get("priority_status", "not yet"),
                notes=data.get("notes"),
                txt_value=(
                    base_description[:255] if base_description else base_description
                ),
            )
            wp_activity.save()
            if hasattr(wp_activity, "save_history"):
                wp_activity.save_history(request.user, is_new=True)
            action = "created"

        output_serializer = self.serializer_class(wp_activity)
        return Response(
            {"status": f"Successfully {action}", "data": output_serializer.data},
            status=status.HTTP_201_CREATED,
        )


class ERMetricsView(APIView):
    permission_classes = (IsDirector | IsIssaraStaff | IsCSO,)

    def post(self, request, *args, **kwargs):
        serializer = ERMetricsSerializer(
            data=request.data, context={"user": self.request.user}
        )
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get(self, request, *args, **kwargs):
        if "pk" in kwargs:
            data = get_object_or_404(ERMetrics, pk=kwargs.get("pk"))
            try:
                if data:
                    serializer = ERMetricsSerializer(data)
            except:
                pass
        else:
            data = ERMetrics.objects.all()
            serializer = ERMetricsSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        obj = ERMetrics.objects.filter(id=kwargs.get("pk"))
        if obj.exists():
            serializer = ERMetricsSerializer(obj[0], data=request.data)
            if serializer.is_valid(raise_exception=True):
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({"error": "Object not found"}, status=status.HTTP_404_NOT_FOUND)


class ERMetricsCountView(APIView):
    permission_classes = (IsAuthenticated | IsCSO,)
    serializer_class = ERMetricsSerializer
    queryset = ERMetrics.objects.all()

    def get(self, request):
        start_timestamp = self.request.query_params.get("start_timestamp")
        end_timestamp = self.request.query_params.get("end_timestamp")
        organization_id = self.request.query_params.get("organization_id")

        if organization_id:
            all_users_in_org = UserOrganization.objects.filter(
                organization_id=organization_id
            ).values_list("user_id", flat=True)
            data = self.queryset.filter(created_by__in=all_users_in_org)

        if organization_id:
            all_users_in_org = UserOrganization.objects.filter(
                organization_id=organization_id
            ).values_list("user_id", flat=True)
            data = self.queryset.filter(created_by__in=all_users_in_org)
        elif "CSO" in [x.name for x in self.request.user.groups.all()]:
            all_users_in_org = UserOrganization.objects.filter(
                organization_id=request.user.organization_user.organization_id
            ).values_list("user_id", flat=True)
            data = self.queryset.filter(created_by__in=all_users_in_org)
        else:
            data = self.queryset

        if start_timestamp and end_timestamp:
            time_filter = data.filter(
                created_at__gt=datetime.fromtimestamp(int(start_timestamp)),
                created_at__lte=datetime.fromtimestamp(int(end_timestamp)),
            ).aggregate(
                workers_voice_channels=Sum("workers_voice_channels"),
                workers_receiving_remedition=Sum("workers_receiving_remedition"),
                workers_pre_departure_mm=Sum("workers_pre_departure_mm"),
                workers_pre_departure_ne=Sum("workers_pre_departure_ne"),
                workers_pre_departure_kh=Sum("workers_pre_departure_kh"),
                workers_pre_departure_vn=Sum("workers_pre_departure_vn"),
                workers_pre_departure_th=Sum("workers_pre_departure_th"),
                workers_trained=Sum("workers_trained"),
                recruitment_related_fees_detected_and_intercepted=Sum(
                    "recruitment_related_fees_detected_and_intercepted"
                ),
                remediation_for_recruitment_fees_and_cases=Sum(
                    "remediation_for_recruitment_fees_and_cases"
                ),
                recruitment_agencies_trained=Sum("recruitment_agencies_trained"),
                suppliers_trained=Sum("suppliers_trained"),
            )
            return Response({"time": time_filter})
        else:
            return Response(
                {"message": "Invalid or missing start_timestamp and/or end_timestamp"},
                status=status.HTTP_400_BAD_REQUEST,
            )


def runScript(request):
    if request.method == "GET":
        if request.GET.get("q") == "3Qr^9jWPYDX83S9b":

            def func():
                for x in Case.objects.all():
                    xlr = []
                    for y in x.kpis.all():
                        data = SupplierKpi.objects.filter(
                            supplier=x.supplier, kpi=y
                        ).first()
                        if data:
                            xlr.append(data)
                    x.supplier_kpis.set(xlr)

            thread = threading.Thread(target=func)
            thread.start()
            return HttpResponse("Script ran successfully")
    return HttpResponse("Password not matched!")


class CsoLoginTracking(APIView):
    permission_classes = [
        IsAuthenticated,
    ]

    def post(self, request):
        request_data = request.data.copy()
        request_data["user"] = request.user.id
        serializer = CsoLoginSerializer(data=request_data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        qs = CsoLogin.objects.all().order_by("-id")
        paginator = PageNumberPagination()
        paginator.page_size = 10
        page = paginator.paginate_queryset(qs, request=request)
        serializer = CsoLoginTrackingSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def patch(self, request, pk=None, *args, **kwargs):
        user = request.user.id
        last_login = CsoLogin.objects.filter(user__id=user).last()
        if last_login:
            last_login.loggedout_at = timezone.now()
            last_login.save()

        return Response({"result": "Done"})


def stream_data(df):
    c = 0
    for i, row in df.iterrows():
        ra_user = Recruiter.objects.filter(name=row["Name"])
        ra_user.delete()
        c += 1
        yield f'Deleted {row["Name"]}\n'
    yield f"____Total {c} nepali deleted_____"


def ra_delete_streaming_view(request):
    df = (
        pd.read_csv(
            "ra_final.csv",
            usecols=[
                "Sr. Number ",
                "Recruiter Password",
                "Permission No.",
                "Name",
                "Country (English)",
                "State  (English)",
                "Township  (English)",
                "Zip code",
                "Country (Nepalese)",
                "State   (Nepalese)",
                "Township   (Nepalese)",
                "Address",
                "Contact number",
                "Contact person",
                "Contact person number",
                "Status",
                "Website",
                "FB link ",
                "Added in CMS?",
                "English Description ",
                "Nepalese Description",
                "Focal person ",
            ],
            engine="python",
            keep_default_na=False,
        )
        .drop_duplicates(subset=["Name"], keep="first")
        .reset_index()
    )

    response = StreamingHttpResponse(stream_data(df))
    response["Content-Type"] = "text/plain"
    return response


@transaction.atomic
def stream_data1(df):

    country, created = Country.objects.get_or_create(name="Nepal")
    for i, row in df.iterrows():
        steam = ""
        web = row.get("Website").strip()
        if web == "nan":
            web = None
        fb = row.get("FB link ").strip()
        if fb == "nan":
            fb = None
        phones = row["Contact number"].strip()
        if "," and "\n" in phones:

            y = phones.replace("\n", "")
        elif "," in phones:
            y = phones
        elif "\n" in phones:
            y = phones.replace("\n", ",")
        else:
            y = phones
        phone = y.strip()

        ra_user, created = Recruiter.objects.get_or_create(name=row["Name"])
        ra_user.contact_phone = phone

        ra_user.contact_name = row.get("Contact person")
        ra_user.description = row["English Description "]
        ra_user.website = row.get("Website")
        ra_user.facebook = row.get("FB link ")
        ra_user.zip = row["Zip code"]

        state_english = row["State  (English)"].strip().replace(" ", "")
        if len(state_english) > 0:
            province_qs = Province.objects.filter(name=state_english, country=country)
            if not province_qs.exists():
                province = Province.objects.create(name=state_english, country=country)
                steam += f"province created with name: {state_english} and id: {province.id}, "
            else:
                province = province_qs.first()
                steam += f"province already exists with name: {state_english}, "
            district_english = row["Township  (English)"].strip().replace(" ", "")

            district_qs = District.objects.filter(
                name=district_english, province=province
            )
            if not district_qs.exists():
                district = District.objects.create(
                    name=district_english, province=province
                )
                steam += f"district created with name: {district_english} and id: {district.id}, "
            else:
                district = district_qs.first()
                steam += f"district already exists with name: {district_english}, "

            ra_user.country = country
            ra_user.province = province
            ra_user.district = district
        ra_user.save()
        steam += f' Added {row["Name"]}, \n'

        yield steam


def ra_migrate_streaming_view(request):
    df = (
        pd.read_csv(
            "ra_final.csv",
            usecols=[
                "Sr. Number ",
                "Recruiter Password",
                "Permission No.",
                "Name",
                "Country (English)",
                "State  (English)",
                "Township  (English)",
                "Zip code",
                "Country (Nepalese)",
                "State   (Nepalese)",
                "Township   (Nepalese)",
                "Address",
                "Contact number",
                "Contact person",
                "Contact person number",
                "Status",
                "Website",
                "FB link ",
                "Added in CMS?",
                "English Description ",
                "Nepalese Description",
                "Focal person ",
            ],
            engine="python",
            keep_default_na=False,
        )
        .drop_duplicates(subset=["Name"], keep="first")
        .reset_index()
    )

    response = StreamingHttpResponse(stream_data1(df))
    response["Content-Type"] = "text/plain"
    return response


class NepaliRaDeleteView(APIView):
    authentication_classes = [authentication.SessionAuthentication]
    permission_classes = [permissions.IsAdminUser]

    @transaction.atomic
    def delete_data(self, df):
        for i, row in df.iterrows():
            ra_user = Recruiter.objects.filter(name=row["Name"])
            ra_user.delete()

    @transaction.atomic
    def get(self, request, format=None):
        df = (
            pd.read_csv(
                "ra_final.csv",
                usecols=[
                    "Sr. Number ",
                    "Recruiter Password",
                    "Permission No.",
                    "Name",
                    "Country (English)",
                    "State  (English)",
                    "Township  (English)",
                    "Zip code",
                    "Country (Nepalese)",
                    "State   (Nepalese)",
                    "Township   (Nepalese)",
                    "Address",
                    "Contact number",
                    "Contact person",
                    "Contact person number",
                    "Status",
                    "Website",
                    "FB link ",
                    "Added in CMS?",
                    "English Description ",
                    "Nepalese Description",
                    "Focal person ",
                ],
                engine="python",
                keep_default_na=False,
            )
            .drop_duplicates(subset=["Name"], keep="first")
            .reset_index()
        )
        t = threading.Thread(target=self.delete_data, args=[df], daemon=True)
        t.start()
        return HttpResponse("your csv file is being proessed")


class NepaliRAMigrateView(APIView):
    authentication_classes = [authentication.SessionAuthentication]
    permission_classes = [permissions.IsAdminUser]

    @transaction.atomic
    def populate_data(self, df):

        country, created = Country.objects.get_or_create(name__iexact="Nepal")
        for i, row in df.iterrows():

            web = row.get("Website").strip()
            if web == "nan":
                web = None
            fb = row.get("FB link ").strip()
            if fb == "nan":
                fb = None
            phones = row["Contact number"].strip()
            if "," and "\n" in phones:

                y = phones.replace("\n", "")
            elif "," in phones:
                y = phones
            elif "\n" in phones:
                y = phones.replace("\n", ",")
            else:
                y = phones
            phone = y.strip()

            ra_user, created = Recruiter.objects.get_or_create(name=row["Name"])
            ra_user.contact_phone = phone

            ra_user.contact_name = row.get("Contact person")
            ra_user.description = row["English Description "]
            ra_user.website = row.get("Website")
            ra_user.facebook = row.get("FB link ")
            ra_user.zip = row["Zip code"]

            state_english = row["State  (English)"].strip().replace(" ", "")
            if len(state_english) > 0:
                province_qs = Province.objects.filter(
                    name=state_english, country=country
                )
                if not province_qs.exists():
                    province = Province.objects.create(
                        name=state_english, country=country
                    )
                else:
                    province = province_qs.first()
                district_english = row["Township  (English)"].strip().replace(" ", "")

                district_qs = District.objects.filter(
                    name=district_english, province=province
                )
                if not district_qs.exists():
                    district = District.objects.create(
                        name=district_english, province=province
                    )
                else:
                    district = district_qs.first()

                ra_user.country = country
                ra_user.province = province
                ra_user.district = district
            ra_user.save()

            df.at[i, "Added in CMS?"] = "Yes"
            df.at[i, "username"] = row["Recruiter Password"]
            df.at[i, "userid"] = ra_user.id

    @transaction.atomic
    def get(self, request, format=None):
        df = (
            pd.read_csv(
                "ra_final.csv",
                usecols=[
                    "Sr. Number ",
                    "Recruiter Password",
                    "Permission No.",
                    "Name",
                    "Country (English)",
                    "State  (English)",
                    "Township  (English)",
                    "Zip code",
                    "Country (Nepalese)",
                    "State   (Nepalese)",
                    "Township   (Nepalese)",
                    "Address",
                    "Contact number",
                    "Contact person",
                    "Contact person number",
                    "Status",
                    "Website",
                    "FB link ",
                    "Added in CMS?",
                    "English Description ",
                    "Nepalese Description",
                    "Focal person ",
                ],
                engine="python",
                keep_default_na=False,
            )
            .drop_duplicates(subset=["Name"], keep="first")
            .reset_index()
        )
        t = threading.Thread(target=self.populate_data, args=[df], daemon=True)
        t.start()
        return HttpResponse("your csv file is being proessed")
