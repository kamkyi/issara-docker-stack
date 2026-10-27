from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework import filters
from rest_framework.settings import api_settings
from authkit import WorkOSAuthKitAuthentication
from django.contrib.auth.models import User
from django.db.models import Q, Prefetch
from django.core.cache import cache
import hashlib
import json
from django.utils import timezone
from supply_chains.models import SupplierSupplyChain
from .models import (
    WorkerFeedback,
    Grievance,
    WorkerContactReason,
    WorkerContactReasonTranslation,
)
from .serializers import (
    WorkerFeedbackSerializer,
    GrievanceSerializer,
    WorkerContactReasonSerializer,
)
from issara.ilm_server_2.views import (
    SupplierViewSet as LegacySupplierViewSet,
    SuppliersListFlatAPI,
)
from issara.ilm_server_2.models import Supplier, Industry, SubIndustry
import csv
from django.http import HttpResponse
from .serializers import SupplierCsvSerializer
from .cache_keys import (
    WORKER_CONTACT_REASON_LIST,
    WORKER_CONTACT_REASON_ETAG,
    WORKER_CONTACT_REASON_CACHE_VERSION,
    WORKER_FEEDBACK_CACHE_VERSION,
    WORKER_FEEDBACK_CACHE_NAMESPACE,
)


class WorkerFeedbackPagination(LimitOffsetPagination):
    default_limit = 10
    limit_query_param = "limit"
    offset_query_param = "offset"
    max_limit = 100


class SupplierLimitOffsetPagination(LimitOffsetPagination):
    """
    Accepts both limit/offset (current FE) and page_size for backward compatibility.
    """

    default_limit = 10
    limit_query_param = "limit"
    offset_query_param = "offset"
    max_limit = 10000

    def get_limit(self, request):
        # Prefer explicit limit, fall back to legacy page_size param, then default
        raw_limit = request.query_params.get(self.limit_query_param)
        if raw_limit is None:
            raw_limit = request.query_params.get("page_size")

        if raw_limit is None:
            return self.default_limit

        try:
            limit = int(raw_limit)
        except (TypeError, ValueError):
            return self.default_limit

        if self.max_limit is not None:
            return min(limit, self.max_limit)
        return limit

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.count,
                "page_size": self.get_limit(self.request),
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )


class SupplierListViewSet(SuppliersListFlatAPI):
    """Supplier list with pagination using the flat serializer."""

    # Lean queryset: only fields needed for the flat list plus minimal prefetches.
    queryset = (
        Supplier.objects.only(
            "id",
            "name",
            "anonymous",
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
            "country_id",
            "province_id",
            "district_id",
            "lng",
            "lat",
            "worker_voice",
            "worker_voice_status",
            "updated_at",
        )
        .select_related("country", "province", "district")
        .prefetch_related(
            Prefetch(
                "suppliersupplychain_set",
                queryset=SupplierSupplyChain.objects.select_related(
                    "supply_chain"
                ).only(
                    "supplier_id", "supply_chain_id", "status", "supply_chain__name"
                ),
            ),
            Prefetch("industries", queryset=Industry.objects.only("id")),
            Prefetch("subindustries", queryset=SubIndustry.objects.only("id")),
        )
        .order_by("name")
    )
    pagination_class = SupplierLimitOffsetPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = [
        "name",
        "country__name",
        "province__name",
        "district__name",
        "updated_at",
        "anonymous",
        "industries__name",
        "subindustries__name",
        "lat",
        "lng",
    ]
    ordering = ["name"]
    http_method_names = ["get"]

    def get_queryset(self):
        queryset = super().get_queryset()

        supplier_id = self.request.query_params.get("supplier_id")
        strategic_partner_ids = self.request.query_params.getlist(
            "strategic_partner_id"
        )
        if not strategic_partner_ids:
            raw_ids = self.request.query_params.get("strategic_partner_ids")
            if raw_ids:
                strategic_partner_ids = [i for i in raw_ids.split(",") if i]
        country_id = self.request.query_params.get("country_id")
        country_name = self.request.query_params.get("country_name")
        name = self.request.query_params.get("name")
        anonymous = self.request.query_params.get("anonymous")
        province_id = self.request.query_params.get("province_id")
        province_name = self.request.query_params.get("province_name")
        district_id = self.request.query_params.get("district_id")
        district_name = self.request.query_params.get("district_name")
        industry_id = self.request.query_params.get("industry_id")
        industry_name = self.request.query_params.get("industry_name")
        subindustry_id = self.request.query_params.get("subindustry_id")
        subindustry_name = self.request.query_params.get("subindustry_name")
        supply_chain_active = self.request.query_params.get("supply_chain_active")
        supply_chain_former = self.request.query_params.get("supply_chain_former")

        if supplier_id:
            queryset = queryset.filter(pk=supplier_id)

        if strategic_partner_ids:
            queryset = queryset.filter(
                suppliersupplychain__supply_chain__strategic_partner_id__in=strategic_partner_ids
            )

        if country_id:
            queryset = queryset.filter(country_id=country_id)
        if country_name:
            queryset = queryset.filter(country__name__icontains=country_name)

        if name:
            queryset = queryset.filter(name__icontains=name)

        if anonymous is not None:
            if anonymous.lower() == "true":
                queryset = queryset.filter(anonymous=True)
            elif anonymous.lower() == "false":
                queryset = queryset.filter(anonymous=False)

        if province_id:
            queryset = queryset.filter(province_id=province_id)
        if province_name:
            queryset = queryset.filter(province__name__icontains=province_name)

        if district_id:
            queryset = queryset.filter(district_id=district_id)
        if district_name:
            queryset = queryset.filter(district__name__icontains=district_name)

        if industry_id:
            queryset = queryset.filter(industries__id=industry_id)
        if industry_name:
            queryset = queryset.filter(industries__name__icontains=industry_name)

        if subindustry_id:
            queryset = queryset.filter(subindustries__id=subindustry_id)
        if subindustry_name:
            queryset = queryset.filter(subindustries__name__icontains=subindustry_name)

        if supply_chain_active:
            queryset = queryset.filter(
                suppliersupplychain__supply_chain__name__icontains=supply_chain_active,
                suppliersupplychain__status__iexact="active",
            )

        if supply_chain_former:
            queryset = queryset.filter(
                suppliersupplychain__supply_chain__name__icontains=supply_chain_former,
                suppliersupplychain__status__icontains="former",
            )

        return queryset.distinct()


class SupplierDetailViewSet(LegacySupplierViewSet):
    """Retrieve a single supplier with the same payload as the legacy supplier list/detail."""

    pagination_class = None
    http_method_names = ["get", "head", "options"]

    def list(self, request, *args, **kwargs):
        return Response(
            {"detail": 'Method "GET" not allowed.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class WorkerFeedbackViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = [IsAuthenticated]
    serializer_class = WorkerFeedbackSerializer
    pagination_class = WorkerFeedbackPagination

    def _cache_version(self):
        version = cache.get(WORKER_FEEDBACK_CACHE_VERSION)
        if not version:
            version = int(timezone.now().timestamp())
            cache.set(WORKER_FEEDBACK_CACHE_VERSION, version)
        return version

    def _etag_from_data(self, data, version):
        try:
            digest = hashlib.md5(
                json.dumps({"version": version, "data": data}, sort_keys=True).encode(
                    "utf-8"
                )
            ).hexdigest()
            return f'W/"{digest}"'
        except Exception:
            return None

    def get_queryset(self):
        """
        Optimized queryset with proper prefetching to reduce database queries
        """
        current_user = self.request.user
        if not hasattr(current_user, "supplier_user"):
            raise PermissionDenied("User is not associated with any supplier")

        supplier_id = current_user.supplier_user.supplier_id
        return (
            WorkerFeedback.objects.select_related(
                "nationality",
                "case_call_type",
                "supplier",
                "hr_staff",
                "contact_reason",
                "worker_voice_channel",
                "gender",
                "case_status",
            )
            .prefetch_related(
                "issue_categories",
                "selected_kpis",
                "kpi_categories",
                "additional_attachments",
                "next_steps_for_company_staff",
            )
            .filter(supplier_id=supplier_id)
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        version = self._cache_version()
        query_hash = hashlib.md5(
            json.dumps(sorted(request.query_params.items())).encode("utf-8")
        ).hexdigest()
        cache_key = (
            f"{WORKER_FEEDBACK_CACHE_NAMESPACE}:list:"
            f"{request.user.id}:{version}:{query_hash}"
        )

        cached = cache.get(cache_key)
        if cached:
            etag = cached.get("etag")
            if (
                etag
                and request.META.get("HTTP_IF_NONE_MATCH")
                and request.META["HTTP_IF_NONE_MATCH"] == etag
            ):
                return Response(status=status.HTTP_304_NOT_MODIFIED)
            response = Response(cached["data"])
            if etag:
                response["ETag"] = etag
            return response

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            payload = self.get_paginated_response(serializer.data).data
        else:
            serializer = self.get_serializer(queryset, many=True)
            payload = serializer.data

        etag = self._etag_from_data(payload, version)
        cache.set(cache_key, {"data": payload, "etag": etag})

        response = Response(payload)
        if etag:
            response["ETag"] = etag
        return response

    def retrieve(self, request, *args, **kwargs):
        version = self._cache_version()
        lookup = kwargs.get(self.lookup_field or "pk")
        cache_key = (
            f"{WORKER_FEEDBACK_CACHE_NAMESPACE}:detail:"
            f"{request.user.id}:{version}:{lookup}"
        )

        cached = cache.get(cache_key)
        if cached:
            etag = cached.get("etag")
            if (
                etag
                and request.META.get("HTTP_IF_NONE_MATCH")
                and request.META["HTTP_IF_NONE_MATCH"] == etag
            ):
                return Response(status=status.HTTP_304_NOT_MODIFIED)
            response = Response(cached["data"])
            if etag:
                response["ETag"] = etag
            return response

        instance = self.get_object()
        serializer = self.get_serializer(instance)
        payload = serializer.data

        etag = self._etag_from_data(payload, version)
        cache.set(cache_key, {"data": payload, "etag": etag})

        response = Response(payload)
        if etag:
            response["ETag"] = etag
        return response


class WorkerContactReasonViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only list of worker contact reasons for dropdowns.
    """

    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    serializer_class = WorkerContactReasonSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        lang_code = (
            self.request.query_params.get("lang", "en").lower()
            if hasattr(self, "request") and self.request
            else "en"
        )
        language_codes = ["en"]
        if lang_code and lang_code not in language_codes:
            language_codes.append(lang_code)

        translations_prefetch = Prefetch(
            "translations",
            queryset=WorkerContactReasonTranslation.objects.filter(
                language__code__in=language_codes
            ).select_related("language"),
        )

        return (
            WorkerContactReason.objects.filter(is_active=True)
            .order_by("sort_order", "name")
            .prefetch_related(translations_prefetch)
        )

    def _compute_etag(self, data):
        """
        Build a weak ETag from the serialized list payload.
        """
        try:
            digest = hashlib.md5(
                json.dumps(data, sort_keys=True).encode("utf-8")
            ).hexdigest()
            return f'W/"{digest}"'
        except Exception:
            return None

    def list(self, request, *args, **kwargs):
        lang_code = request.query_params.get("lang", "en").lower()
        version = cache.get(WORKER_CONTACT_REASON_CACHE_VERSION)
        if not version:
            version = int(timezone.now().timestamp())
            cache.set(WORKER_CONTACT_REASON_CACHE_VERSION, version)

        list_key = f"{WORKER_CONTACT_REASON_LIST}:{lang_code}:{version}"
        etag_key = f"{WORKER_CONTACT_REASON_ETAG}:{lang_code}:{version}"

        cached_data = cache.get(list_key)
        cached_etag = cache.get(etag_key)

        if cached_data is None:
            queryset = self.get_queryset()
            serializer = self.get_serializer(
                queryset, many=True, context={"request": request}
            )
            cached_data = serializer.data
            cached_etag = self._compute_etag(cached_data)

            # Cache both payload and etag; rely on signals to invalidate on writes.
            cache.set(list_key, cached_data, None)
            cache.set(etag_key, cached_etag, None)

        # Conditional GET handling
        incoming_etag = request.META.get("HTTP_IF_NONE_MATCH")
        if incoming_etag and cached_etag and incoming_etag == cached_etag:
            return Response(status=status.HTTP_304_NOT_MODIFIED)

        response = Response(cached_data)
        if cached_etag:
            response["ETag"] = cached_etag
        return response


class GrievancePagination(LimitOffsetPagination):
    default_limit = 10
    limit_query_param = "limit"
    offset_query_param = "offset"
    max_limit = 100


class GrievanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CRUD operations on Grievance model
    Provides: GET, POST, PUT, PATCH, DELETE endpoints
    """

    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = [IsAuthenticated]
    serializer_class = GrievanceSerializer
    pagination_class = GrievancePagination

    def _require_supplier_id(self):
        current_user = self.request.user
        if not hasattr(current_user, "supplier_user"):
            raise PermissionDenied("User is not associated with any supplier")
        return current_user.supplier_user.supplier_id

    def get_queryset(self):
        """
        Optimized queryset with proper prefetching to reduce database queries
        """
        supplier_id = self._require_supplier_id()
        return (
            Grievance.objects.select_related(
                "worker_feedback",
                "worker_feedback__supplier",
                "worker_feedback__case_status",
                "worker_feedback__hr_staff",
            )
            .prefetch_related("information_collection_attachments")
            .filter(worker_feedback__supplier_id=supplier_id)
            .order_by("-created_at")
        )

    def create(self, request, *args, **kwargs):
        """
        Create a new grievance form
        POST /api/supplier/grievances/
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        grievance = serializer.save()

        return Response(
            {
                "success": True,
                "message": "Grievance form created successfully",
                "data": GrievanceSerializer(grievance).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        """
        Update an existing grievance form (full update)
        PUT /api/supplier/grievances/{id}/
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        grievance = serializer.save()

        return Response(
            {
                "success": True,
                "message": "Grievance form updated successfully",
                "data": GrievanceSerializer(grievance).data,
            }
        )

    def partial_update(self, request, *args, **kwargs):
        """
        Partially update an existing grievance form
        PATCH /api/supplier/grievances/{id}/
        """
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """
        Delete a grievance form
        DELETE /api/supplier/grievances/{id}/
        """
        instance = self.get_object()
        instance.delete()

        return Response(
            {"success": True, "message": "Grievance form deleted successfully"},
            status=status.HTTP_204_NO_CONTENT,
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Get a specific grievance form
        GET /api/supplier/grievances/{id}/
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        return Response({"success": True, "data": serializer.data})

    def list(self, request, *args, **kwargs):
        """
        List all grievance forms with pagination and filtering
        GET /api/supplier/grievances/
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Apply filtering based on query parameters
        worker_feedback_id = request.query_params.get("worker_feedback_id")
        is_complete = request.query_params.get("is_complete")
        supplier_id = request.query_params.get("supplier_id")

        if worker_feedback_id:
            queryset = queryset.filter(worker_feedback_id=worker_feedback_id)

        if supplier_id:
            queryset = queryset.filter(worker_feedback__supplier_id=supplier_id)

        if is_complete is not None:
            # Filter by completion status
            if is_complete.lower() == "true":
                complete_grievances = []
                for grievance in queryset:
                    if grievance.is_complete():
                        complete_grievances.append(grievance.id)
                queryset = queryset.filter(id__in=complete_grievances)
            elif is_complete.lower() == "false":
                incomplete_grievances = []
                for grievance in queryset:
                    if not grievance.is_complete():
                        incomplete_grievances.append(grievance.id)
                queryset = queryset.filter(id__in=incomplete_grievances)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(
                {"success": True, "data": serializer.data}
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data})

    @action(detail=True, methods=["get"])
    def completion_status(self, request, pk=None):
        """
        Get completion status of a specific grievance form
        GET /api/supplier/grievances/{id}/completion_status/
        """
        grievance = self.get_object()

        # Get all field completion status
        completion_data = {
            "is_complete": grievance.is_complete(),
            "step_completion": {
                "information_collection": all(
                    [
                        grievance.issara_context,
                        grievance.check_with_hr,
                        grievance.repeat_issue,
                    ]
                ),
                "safeguarding": all(
                    [
                        grievance.zero_tolerance,
                        grievance.reviewed_individual,
                        grievance.involved_in_grievance,
                    ]
                ),
                "ethical_investigation": all(
                    [
                        grievance.ethical_reviewed,
                        grievance.professional_ensured,
                        grievance.impartial_ensured,
                    ]
                ),
                "worker_communication": bool(grievance.investigation_their_wellbeing),
                "monitoring": bool(
                    grievance.remediation or grievance.system_strengthening
                ),
                "training": bool(grievance.trainings),
            },
            "missing_fields": [],
        }

        # Check for missing required fields
        required_fields = [
            "issara_context",
            "check_with_hr",
            "repeat_issue",
            "zero_tolerance",
            "reviewed_individual",
            "involved_in_grievance",
            "ethical_reviewed",
            "professional_ensured",
            "impartial_ensured",
            "investigation_their_wellbeing",
        ]

        for field in required_fields:
            if not getattr(grievance, field):
                completion_data["missing_fields"].append(field)

        return Response({"success": True, "data": completion_data})

    @action(detail=False, methods=["get"])
    def by_worker_feedback(self, request):
        """
        Get grievance form by worker feedback ID
        GET /api/supplier/grievances/by_worker_feedback/?worker_feedback_id={id}
        """
        worker_feedback_id = request.query_params.get("worker_feedback_id")

        if not worker_feedback_id:
            return Response(
                {"success": False, "error": "worker_feedback_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            grievance = self.get_queryset().get(worker_feedback_id=worker_feedback_id)
            serializer = self.get_serializer(grievance)

            return Response({"success": True, "data": serializer.data})

        except Grievance.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "error": "Grievance form not found for this worker feedback",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=["post"])
    def create_or_update(self, request):
        """
        Create a new grievance or update existing one based on worker_feedback_id
        POST /api/supplier/grievances/create_or_update/
        """
        worker_feedback_id = request.data.get("worker_feedback_id")

        if not worker_feedback_id:
            return Response(
                {"success": False, "error": "worker_feedback_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        supplier_id = self._require_supplier_id()

        if not WorkerFeedback.objects.filter(
            id=worker_feedback_id, supplier_id=supplier_id
        ).exists():
            return Response(
                {
                    "success": False,
                    "error": "Worker feedback not found for this supplier",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            # Try to get existing grievance
            grievance = self.get_queryset().get(worker_feedback_id=worker_feedback_id)
            serializer = self.get_serializer(grievance, data=request.data, partial=True)
            action_message = "updated"

        except Grievance.DoesNotExist:
            # Create new grievance
            serializer = self.get_serializer(data=request.data)
            action_message = "created"

        serializer.is_valid(raise_exception=True)
        grievance = serializer.save()

        return Response(
            {
                "success": True,
                "message": f"Grievance form {action_message} successfully",
                "data": GrievanceSerializer(grievance).data,
            },
            status=(
                status.HTTP_200_OK
                if action_message == "updated"
                else status.HTTP_201_CREATED
            ),
        )


class HRDropdownViewSet(viewsets.ViewSet):
    """
    ViewSet to get HR users within the same supplier with pagination
    GET /api/supplier/hr-dropdown/
    """

    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """
        Returns current user + colleagues in SupplierHR group from same supplier with pagination
        """
        try:
            current_user = request.user

            # Check if current user has supplier_user relationship
            if not hasattr(current_user, "supplier_user"):
                return Response(
                    {
                        "success": False,
                        "error": "User is not associated with any supplier",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Get the supplier of the current user
            supplier_id = current_user.supplier_user.supplier.id
            current_supplier = current_user.supplier_user.supplier

            # Handle query parameters for filtering and pagination
            search = request.query_params.get("search", "")
            cursor = request.query_params.get("cursor", None)
            ids = request.query_params.getlist("id", None)

            # Base queryset: current user + colleagues in SupplierHR
            hr_users_queryset = (
                User.objects.filter(
                    Q(id=current_user.id)  # Always include current user
                    | Q(
                        supplier_user__supplier_id=supplier_id,
                        groups__name="SupplierHR",
                        is_active=True,
                    )
                )
                .exclude(
                    Q(supplier_user__supplier_id=supplier_id, groups__name="SupplierHR")
                    & Q(id=current_user.id)  # Avoid duplicate current user
                )
                .distinct()
                .order_by("first_name", "last_name", "username")
            )

            # Apply search filter
            if search:
                hr_users_queryset = hr_users_queryset.filter(
                    Q(first_name__icontains=search)
                    | Q(last_name__icontains=search)
                    | Q(username__icontains=search)
                )

            if ids:
                hr_users_queryset = hr_users_queryset.filter(id__in=ids)

            limit = 20
            offset = 0

            if cursor:
                try:
                    offset = int(cursor)
                except (ValueError, TypeError):
                    offset = 0

            total_count = hr_users_queryset.count()
            paginated_users = hr_users_queryset[offset : offset + limit]

            hr_users_data = []
            for user in paginated_users:
                full_name = f"{user.first_name} {user.last_name}".strip()
                if not full_name:
                    full_name = user.username

                hr_users_data.append(
                    {
                        "id": user.id,
                        "username": user.username,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "full_name": full_name,
                        "email": user.email,
                    }
                )

            next_cursor = None
            if offset + limit < total_count:
                next_cursor = offset + limit

            next_url = None
            if next_cursor is not None:
                base_url = f"{request.scheme}://{request.get_host()}{request.path}"
                next_url = f"{base_url}?cursor={next_cursor}"
                if search:
                    next_url += f"&search={search}"

            return Response(
                {
                    "success": True,
                    "results": hr_users_data,
                    "next": next_url,
                    "count": total_count,
                    "data": {
                        "supplier_id": current_supplier.id,
                        "supplier_name": current_supplier.name,
                        "hr_users": hr_users_data,
                        "total_count": len(hr_users_data),
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"success": False, "error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SupplierCsvExportView(APIView):
    """
    Standalone CSV export for suppliers.

    - Lives under /api/v2/suppliers/export-csv/
    - Does NOT touch existing all_suppliers views / ETag code
    - Uses select_related / prefetch_related to avoid N+1
    - Exports names (country, province, district, industries, subindustries)
      instead of IDs.
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Supplier.objects.select_related(
            "country",
            "province",
            "district",
        ).prefetch_related(
            "industries",
            "subindustries",
            "suppliersupplychain_set__supply_chain",
        )

    def get(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = SupplierCsvSerializer(qs, many=True)
        data = serializer.data

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="suppliers_export.csv"'

        writer = csv.writer(response)

        # ---------- CSV HEADER (customise labels as you like) ----------
        header = [
            "ID",
            "Supplier Name",
            "Anonymous",
            "Country",
            "Province",
            "District",
            "Latitude",
            "Longitude",
            "Industries",
            "Subindustries",
            "Worker Voice",
            "Worker Voice Status",
            "Worker Voice Rolled Out",
            "Thai Workers",
            "Cambodian Workers",
            "Myanmar Workers",
            "Lao Workers",
            "Vietnamese Workers",
            "Nepalese Workers",
            "Bangladeshi Workers",
            "Indonesian Workers",
            "Malaysian Workers",
            "Indian Workers",
            "Pakistani Workers",
            "Sri Lankan Workers",
            "Supply Chains",  # flattened: "Name1 (status1); Name2 (status2)"
        ]
        writer.writerow(header)

        # ---------- ROWS ----------
        for item in data:
            industries_str = "; ".join(item.get("industries_names") or [])
            subindustries_str = "; ".join(item.get("subindustries_names") or [])

            supply_chains = item.get("supply_chains") or []
            supply_chains_str = "; ".join(
                f"{sc.get('name', '')} ({sc.get('status', '')})"
                for sc in supply_chains
                if sc.get("name")
            )

            row = [
                item.get("id"),
                item.get("name"),
                item.get("anonymous"),
                item.get("country_name") or "",
                item.get("province_name") or "",
                item.get("district_name") or "",
                item.get("lat") or "",
                item.get("lng") or "",
                industries_str,
                subindustries_str,
                item.get("worker_voice"),
                item.get("worker_voice_status") or "",
                item.get("is_worker_voice_rolled_out"),
                item.get("total_num_thai_workers"),
                item.get("total_num_cambodian_workers"),
                item.get("total_num_myanmar_workers"),
                item.get("total_num_lao_workers"),
                item.get("total_num_vietnamese_workers"),
                item.get("total_num_nepalese_workers"),
                item.get("total_num_bangladeshi_workers"),
                item.get("total_num_indonesian_workers"),
                item.get("total_num_malaysian_workers"),
                item.get("total_num_indian_workers"),
                item.get("total_num_pakistani_workers"),
                item.get("total_num_sri_lankan_workers"),
                supply_chains_str,
            ]

            writer.writerow(row)

        return response
