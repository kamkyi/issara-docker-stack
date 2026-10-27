"""AuthKit-compatible, organization-scoped CSO Case Management adapter.

This is intentionally separate from the legacy KPI viewsets. It reuses their
models, filter sets and save signals without changing existing ILM responses.
"""

from authkit import WorkOSAuthKitAuthentication
from django.db import transaction
from django.db.models import Count, Exists, F, OuterRef, Q, Subquery
from django.shortcuts import get_object_or_404
from kpis.filters import SupplierKpiFilterSet, SupplierKpiUpdateFilterSet
from kpis.utils import annotate_days_active
from kpis.models import SupplierKpi, SupplierKpiUpdate, SupplierKpiUpdateStatus
from kpis.serializers import SupplierKpiReadOnlySerializer, SupplierKpiUpdateReadOnlySerializer
from issara.ilm_server_2.pagination import CustomPagination
from rest_framework import permissions, serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework.settings import api_settings

from issara.ilm_server_2.models import Case, Organization, UserOrganization


AUTHENTICATION_CLASSES = (WorkOSAuthKitAuthentication,) + tuple(
    api_settings.DEFAULT_AUTHENTICATION_CLASSES
)
MANAGEMENT_ROLES = {"org-issara-management"}
CSO_ROLES = {"org-cso"}


def _actual_role(user):
    """Use validated AuthKit claims, not client View Mode or query parameters."""
    claims = getattr(user, "claims", {}) or {}
    role = claims.get("role")
    roles = claims.get("roles") or []
    if role in MANAGEMENT_ROLES or any(r in MANAGEMENT_ROLES for r in roles):
        return "management"
    if role in CSO_ROLES or any(r in CSO_ROLES for r in roles):
        return "cso"
    # Preserve compatibility with legacy JWTs without trusting a browser role.
    if getattr(user, "pk", None):
        if user.groups.filter(name="CSO").exists():
            return "cso"
        if user.groups.filter(name__in=["Issara Management", "Issara management"]).exists():
            return "management"
    raise PermissionDenied("Case Management is available only to CSO and Management users.")


def _linked_organization(user):
    if not getattr(user, "pk", None):
        return None
    link = UserOrganization.objects.filter(user_id=user.pk).select_related("organization").first()
    return link.organization if link else None


def _case_scope(organization):
    return Q(case_created_by__organization_user__organization_id=organization.pk) | Q(
        refer_to_org_id=organization.pk
    )


class CsoCaseManagementBase(GenericAPIView):
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = (permissions.IsAuthenticated,)

    @property
    def actual_role(self):
        if not hasattr(self, "_actual_role"):
            self._actual_role = _actual_role(self.request.user)
        return self._actual_role

    @property
    def effective_organization(self):
        if not hasattr(self, "_effective_organization"):
            role = self.actual_role
            linked = _linked_organization(self.request.user)
            selected = self.request.query_params.get("selected_organization_id")
            if role == "cso":
                if selected:
                    raise PermissionDenied("A CSO cannot select another organization.")
                if linked is None:
                    raise PermissionDenied("Your account is not linked to a CSO organization.")
                organization = linked
            elif selected:
                try:
                    organization = Organization.objects.get(pk=int(selected))
                except (ValueError, Organization.DoesNotExist):
                    raise ValidationError({"selected_organization_id": "Select an existing CSO organization."})
            else:
                organization = None
            self._effective_organization = organization
        return self._effective_organization

    def require_organization(self):
        organization = self.effective_organization
        if organization is None:
            raise ValidationError({"organization": "Select a CSO organization before loading cases."})
        return organization

    def visible_kpis(self):
        organization = self.require_organization()
        case_kpi_ids = Case.objects.filter(_case_scope(organization)).values_list(
            "supplier_kpis__id", flat=True
        )
        return SupplierKpi.objects.filter(pk__in=case_kpi_ids).select_related(
            "supplier", "kpi", "kpi__kpi_category", "status"
        ).distinct()

    def visible_calls(self, supplier_kpi):
        organization = self.require_organization()
        calls = Case.objects.filter(
            _case_scope(organization),
            supplier_kpis=supplier_kpi,
        ).distinct()
        if supplier_kpi.opened_at:
            calls = calls.filter(created__gte=supplier_kpi.opened_at)
        return calls


class CsoKpiSerializer(SupplierKpiReadOnlySerializer):
    """Reuse the legacy translation helpers, but omit its unscoped calls/PII."""
    can_edit = serializers.BooleanField(read_only=True, default=False)

    class Meta(SupplierKpiReadOnlySerializer.Meta):
        fields = (
            "id", "supplier", "supplier_name", "kpi", "category", "description",
            "level", "status", "status_name", "opened_at", "closed_at",
            "closure_date", "closed_quality", "affected_workers", "days_open",
            "open", "retaliation", "retaliation_cso", "hide", "closed_notes",
            "remediation_issara_recommendation", "remediation_progress",
            "remediation_aligned", "remediation_business_steps_taken",
            "remediation_business_steps_remaining", "remediation_payment_deadline",
            "remediation_owed_baht", "remediation_owed_kyat",
            "remediation_owed_ringitt", "remediation_owed_usd",
            "remediation_paid_baht", "remediation_paid_kyat",
            "remediation_paid_ringitt", "remediation_paid_usd",
            "remediation_workers_paid", "remediation_documents_owed",
            "remediation_documents_provided", "remediation_documents_deadline",
            "systems_change_issara_recommendation", "systems_change_progress",
            "systems_change_aligned", "systems_change_business_steps_taken",
            "systems_change_business_steps_remaining", "systems_change_deadline",
            "next_description", "deadline", "issue_escalated_to_buyer", "can_edit",
        )


class CsoKpiHistorySerializer(SupplierKpiUpdateReadOnlySerializer):
    class Meta(SupplierKpiUpdateReadOnlySerializer.Meta):
        fields = (
            "id", "supplier_kpi", "supplier", "supplier_name", "category", "description",
            "level", "status", "status_name", "opened_at", "closed_at",
            "closure_date", "closed_quality", "closed_notes", "affected_workers",
            "retaliation", "retaliation_cso",
            "remediation_issara_recommendation", "remediation_progress",
            "remediation_aligned", "remediation_business_steps_taken",
            "remediation_business_steps_remaining", "remediation_payment_deadline",
            "remediation_owed_baht", "remediation_owed_kyat",
            "remediation_owed_ringitt", "remediation_owed_usd",
            "remediation_paid_baht", "remediation_paid_kyat",
            "remediation_paid_ringitt", "remediation_paid_usd",
            "remediation_workers_paid", "remediation_documents_owed",
            "remediation_documents_provided", "remediation_documents_deadline",
            "systems_change_issara_recommendation", "systems_change_progress",
            "systems_change_aligned", "systems_change_business_steps_taken",
            "systems_change_business_steps_remaining", "systems_change_deadline",
            "next_description", "deadline", "issue_escalated_to_buyer",
        )


class CsoKpiPatchSerializer(serializers.ModelSerializer):
    """A narrow write surface; legacy full-record PUT remains unchanged."""
    closed_at = serializers.DateTimeField(
        input_formats=["%Y-%m-%d", "iso-8601"], required=False, allow_null=True
    )

    class Meta:
        model = SupplierKpi
        fields = (
            "status", "opened_at", "closed_at", "closed_quality", "closed_notes",
            "affected_workers", "retaliation", "retaliation_cso", "hide",
            "remediation_issara_recommendation", "remediation_progress",
            "remediation_aligned", "remediation_business_steps_taken",
            "remediation_business_steps_remaining", "remediation_payment_deadline",
            "remediation_owed_baht", "remediation_owed_kyat",
            "remediation_owed_ringitt", "remediation_owed_usd",
            "remediation_paid_baht", "remediation_paid_kyat",
            "remediation_paid_ringitt", "remediation_paid_usd",
            "remediation_workers_paid", "remediation_documents_owed",
            "remediation_documents_provided", "remediation_documents_deadline",
            "systems_change_issara_recommendation", "systems_change_progress",
            "systems_change_aligned", "systems_change_business_steps_taken",
            "systems_change_business_steps_remaining", "systems_change_deadline",
            "next_description", "deadline", "issue_escalated_to_buyer",
        )

    def validate(self, attrs):
        instance = self.instance
        if not attrs.get("opened_at", instance.opened_at):
            raise serializers.ValidationError({"opened_at": "An opening date is required."})
        if attrs.get("retaliation", instance.retaliation) is None:
            raise serializers.ValidationError({"retaliation": "Answer the worker retaliation question."})
        if attrs.get("retaliation_cso", instance.retaliation_cso) is None:
            raise serializers.ValidationError({"retaliation_cso": "Answer the CSO retaliation question."})
        status_value = attrs.get("status", instance.status)
        status_name = (status_value.name if status_value else "").strip().lower()
        closed = status_name in {"closed", "old unresolved", "old, unresolved case", "closed unresolved"}
        was_closed = (instance.status.name if instance.status else "").strip().lower() in {
            "closed", "old unresolved", "old, unresolved case", "closed unresolved"
        }
        if was_closed and not closed and status_value != instance.status:
            raise serializers.ValidationError({"status": "A new case must reopen a closed KPI."})
        closed_at = attrs.get("closed_at", instance.closed_at)
        if closed and not closed_at:
            raise serializers.ValidationError({"closed_at": "A closure date is required."})
        if closed and not attrs.get("closed_quality", instance.closed_quality):
            attrs["closed_quality"] = "Poor"
        if attrs.get("remediation_progress", instance.remediation_progress) is None:
            raise serializers.ValidationError({"remediation_progress": "Select remediation progress."})
        paid_local = sum(
            attrs.get(name, getattr(instance, name)) or 0
            for name in ("remediation_paid_baht", "remediation_paid_kyat", "remediation_paid_ringitt")
        )
        paid_usd = attrs.get("remediation_paid_usd", instance.remediation_paid_usd) or 0
        if paid_local > 0 and paid_usd <= 0:
            raise serializers.ValidationError({"remediation_paid_usd": "Enter the USD payment total."})
        return attrs

    def update(self, instance, validated_data):
        status_value = validated_data.get("status", instance.status)
        status_name = (status_value.name if status_value else "").strip().lower()
        closed = status_name in {"closed", "old unresolved", "old, unresolved case", "closed unresolved"}
        instance.open = not closed
        if not closed:
            validated_data["closed_at"] = None
            validated_data["closed_quality"] = None
            validated_data["closed_notes"] = None
            instance.closure_date = None
        return super().update(instance, validated_data)


class CsoCaseManagementContextAPIView(CsoCaseManagementBase):
    def get(self, request):
        organization = self.effective_organization
        return Response({
            "actual_role": self.actual_role,
            "effective_organization": (
                {"id": organization.pk, "name": organization.name} if organization else None
            ),
            "selection_required": organization is None,
            "can_select_organization": self.actual_role == "management",
            "statuses": list(SupplierKpiUpdateStatus.objects.order_by("id").values("id", "name")),
        })


class CsoCaseManagementOrganizationsAPIView(CsoCaseManagementBase):
    """Use the same complete organization set as Legacy's referral picker."""

    def get(self, request):
        if self.actual_role != "management":
            raise PermissionDenied("Only Management can select an organization.")
        return Response(list(Organization.objects.order_by("name", "id").values("id", "name")))


class _EffectiveParamsRequest:
    """Exposes the adapter's effective filter params as ``query_params``.

    ``SupplierKpiFilterSet.should_show_cso_cases`` / ``should_filter_cso_only_cases``
    read their flags off ``request.query_params`` rather than off the filter set's
    own ``data`` (kpis/filters.py:99-131), so a flag we only put in ``data`` is
    silently ignored. Wrapping the request is how the adapter opts in without
    editing the legacy filter set, which other screens still depend on. Every
    other attribute is proxied straight through to the real request.
    """

    def __init__(self, request, params):
        self._request = request
        self.query_params = params

    def __getattr__(self, name):
        # Guard the recursion: __getattr__ runs for anything not found normally,
        # including `_request` itself before __init__ has set it (a copy or an
        # unpickle), which would otherwise recurse until the stack blew.
        if name == "_request":
            raise AttributeError(name)
        return getattr(self._request, name)


def _legacy_case_management_params(request):
    """The query legacy `/admin/businesskpiupdates` issues for a CSO user.

    `KpiUpdates.js` pins `show_cso_cases` to `isCsoUser` and hides the toggle for
    CSO users (`SupplierKpiFilters.js:77`), and never sends `cso_cases_only` --
    that flag belongs to the separate `/admin/cso-businesskpiupdates` screen.
    `has_cases=true` keeps legacy's supplier + KPI-definition liveness recheck,
    which is what excludes stale `Case.supplier_kpis` links.
    """
    params = request.query_params.copy()
    # Ownership scoping is applied by visible_kpis() instead: passing
    # organization_id would route through get_cases_by_organization, which
    # intersects against a 24h file-cached "all_cases" snapshot that is never
    # invalidated, so a newly linked KPI silently disappears. The predicate is
    # identical either way. See kpis/functions.py:7.
    params.pop("organization_id", None)
    params.pop("selected_organization_id", None)
    params.pop("cso_cases_only", None)
    params["has_cases"] = "true"
    params["show_cso_cases"] = "true"
    if "show_closed" not in params:
        params["show_closed"] = "false"
    return params


# Ordering is applied here rather than by the legacy DRF `SupplierKpiOrderingFilter`
# backend: this adapter drives `SupplierKpiFilterSet` directly and never runs the
# view's filter-backend chain, so an `ordering` query parameter would otherwise be
# silently ignored. Allowlisted, so an arbitrary column cannot be sorted on.
KPI_ORDERING_FIELDS = {
    "id", "supplier__name", "kpi__kpi_category", "kpi__level", "affected_workers",
    "opened_at", "closed_at", "status__name", "days_active",
}
CYCLE_ORDERING_FIELDS = {
    "id", "supplier_kpi", "supplier_kpi__supplier__name",
    "supplier_kpi__kpi__kpi_category", "supplier_kpi__kpi__level",
    "opened_at", "closed_at", "status__name",
}
DEFAULT_ORDERING = ("-opened_at", "-id")


def _requested_ordering(request, allowed):
    """Return the validated `ordering` terms, or () when none apply."""
    raw = request.query_params.get("ordering") or ""
    terms = []
    for term in raw.split(","):
        term = term.strip()
        if not term:
            continue
        if term.lstrip("-") in allowed:
            terms.append(term)
    return tuple(terms)


def _apply_ordering(queryset, terms):
    if not terms:
        return queryset.order_by(*DEFAULT_ORDERING)
    if any(term.lstrip("-") == "days_active" for term in terms):
        # Legacy annotates before sorting on this one (kpis/filters.py:165).
        queryset = annotate_days_active(queryset)
    # `id` breaks ties so paging cannot repeat or skip a row.
    return queryset.order_by(*terms, "-id")


class CsoCaseManagementListAPIView(CsoCaseManagementBase):
    pagination_class = CustomPagination

    def get(self, request):
        organization = self.require_organization()
        params = _legacy_case_management_params(request)
        queryset = SupplierKpiFilterSet(
            data=params,
            queryset=self.visible_kpis(),
            request=_EffectiveParamsRequest(request, params),
        ).qs
        queryset = _apply_ordering(
            queryset, _requested_ordering(request, KPI_ORDERING_FIELDS)
        )
        if self.actual_role == "cso":
            owned_cases = Case.objects.filter(
                supplier_kpis__id=OuterRef("pk"),
                case_created_by__organization_user__organization=organization,
                created__gte=OuterRef("opened_at"),
            )
            queryset = queryset.annotate(can_edit=Exists(owned_cases))
        search = request.query_params.get("search", "").strip()
        if search:
            id_match = Q(pk=int(search)) if search.isdigit() else Q(pk__isnull=True)
            queryset = queryset.filter(
                Q(supplier__name__icontains=search)
                | Q(kpi__description__icontains=search)
                | Q(kpi__kpi_category__name__icontains=search)
                | id_match
            ).distinct()
        page = self.paginate_queryset(queryset)
        serializer = CsoKpiSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class CsoCaseManagementDetailAPIView(CsoCaseManagementBase):
    def get_object(self):
        return get_object_or_404(self.visible_kpis(), pk=self.kwargs["pk"])

    def get(self, request, pk):
        kpi = self.get_object()
        calls = self.visible_calls(kpi).values(
            "id", "created", "interacted", "client_nickname", "client_phonenumber",
            "interaction_summary", "description", "referral_notes", "next_steps",
        )
        data = dict(CsoKpiSerializer(kpi).data)
        data["calls"] = list(calls)
        owned_calls = self.visible_calls(kpi).filter(
            case_created_by__organization_user__organization=self.require_organization()
        )
        owned = owned_calls.exists()
        data["can_edit"] = self.actual_role == "cso" and owned
        return Response(data)

    @transaction.atomic
    def patch(self, request, pk):
        if self.actual_role != "cso":
            raise PermissionDenied("Management CSO View is read-only.")
        kpi = get_object_or_404(self.visible_kpis().select_for_update(), pk=pk)
        if not self.visible_calls(kpi).filter(
            case_created_by__organization_user__organization=self.require_organization()
        ).exists():
            raise PermissionDenied("A referred-only KPI cannot be edited.")
        serializer = CsoKpiPatchSerializer(kpi, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save(kpi_update_source="supplierkpiupdateform")
        data = dict(CsoKpiSerializer(updated).data)
        # `CsoKpiSerializer.can_edit` is a plain read-only field defaulting to
        # False -- the list view supplies it as an annotation and the detail view
        # computes it below. Without this the PATCH response would answer
        # `can_edit: false` to the very user who just edited the record, and any
        # client merging the response into its cache would hide its own Edit
        # action. Reaching this line already proves the permission holds.
        data["can_edit"] = True
        return Response(data)


class CsoCaseManagementHistoryAPIView(CsoCaseManagementBase):
    def get(self, request, pk):
        kpi = get_object_or_404(self.visible_kpis(), pk=pk)
        history = SupplierKpiUpdate.objects.filter(supplier_kpi=kpi).select_related(
            "supplier_kpi__supplier", "supplier_kpi__kpi__kpi_category", "status"
        ).order_by("-opened_at", "-id")[:50]
        return Response(CsoKpiHistorySerializer(history, many=True).data)


class CsoCaseManagementCallAPIView(CsoCaseManagementBase):
    """Read one call already visible through this organization-scoped KPI."""

    def get(self, request, kpi_pk, call_pk):
        from issara.cascade.views.worker_voice_calls import WorkerVoiceCaseSerializer

        kpi = get_object_or_404(self.visible_kpis(), pk=kpi_pk)
        call = get_object_or_404(self.visible_calls(kpi), pk=call_pk)
        # Match Facelift's five-step, read-only Worker Voice viewer while using
        # the Case Management organization selected by Management. The ordinary
        # Worker Voice endpoint resolves only the caller's own linked org.
        return Response(WorkerVoiceCaseSerializer(
            call,
            context={"request": request, "viewer_organization": self.require_organization()},
        ).data)


class CsoCaseManagementCyclesAPIView(CsoCaseManagementBase):
    pagination_class = CustomPagination

    def get(self, request):
        organization = self.require_organization()
        params = _legacy_case_management_params(request)
        queryset = SupplierKpiUpdateFilterSet(
            data=params,
            queryset=SupplierKpiUpdate.objects.filter(supplier_kpi__in=self.visible_kpis()),
            request=_EffectiveParamsRequest(request, params),
        ).qs.select_related(
            "supplier_kpi__supplier", "supplier_kpi__kpi__kpi_category", "status"
        )
        cycle_updates = SupplierKpiUpdate.objects.filter(
            supplier_kpi_id=OuterRef("supplier_kpi_id"), opened_at=OuterRef("opened_at")
        )
        cycle_count = cycle_updates.values("supplier_kpi_id", "opened_at").annotate(
            total=Count("id")
        ).values("total")[:1]
        queryset = queryset.annotate(
            cycle_latest_update_id=Subquery(cycle_updates.order_by("-id").values("id")[:1]),
            cycle_update_count=Subquery(cycle_count),
        ).filter(id=F("cycle_latest_update_id"))
        # Ordered after the latest-row-per-cycle filter and before pagination,
        # so sorting cannot change which row represents a cycle.
        queryset = _apply_ordering(
            queryset, _requested_ordering(request, CYCLE_ORDERING_FIELDS)
        )
        page = self.paginate_queryset(queryset)
        rows = CsoKpiHistorySerializer(page, many=True).data
        for row, item in zip(rows, page):
            row["cycle_update_count"] = item.cycle_update_count
        return self.get_paginated_response(rows)
