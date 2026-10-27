import hashlib

from django.db import models
from django.db.models import Count, F, Max, OuterRef, Prefetch, Q, Subquery
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.views.decorators.http import etag
from django.views.decorators.vary import vary_on_headers
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.settings import api_settings

from authkit import WorkOSAuthKitAuthentication
from issara.ilm_server_2.models import Case, SupplierSupplyChain, SupplierUser
from issara.ilm_server_2.pagination import CustomPagination
from kpis.filters import SupplierKpiFilterSet, SupplierKpiOrderingFilter
from kpis.models import Kpi, SupplierKpi, SupplierKpiUpdate
from kpis.serializers import SupplierKpiDefaultSerializer, SupplierKpiReadOnlySerializer


def supplier_kpi_etag_func(request, *args, **kwargs):
    viewset = request.parser_context["view"]

    if viewset.action == "list":
        queryset = viewset.filter_queryset(viewset.get_queryset())
        supplier_kpi_ids = queryset.values_list("pk", flat=True)
        if not supplier_kpi_ids.exists():
            return None
        latest_update = SupplierKpi.history.model.objects.filter(
            id__in=supplier_kpi_ids
        ).aggregate(latest_update=Max("history_date"))["latest_update"]
    elif viewset.action == "retrieve":
        try:
            supplier_kpi = viewset.get_object()
            # Check if history exists before accessing latest()
            if supplier_kpi.history.exists():
                latest_update = supplier_kpi.history.latest().history_date
            else:
                return None
        except (SupplierKpi.DoesNotExist, AttributeError):
            return None
    else:
        return None

    if latest_update:
        return hashlib.md5(str(latest_update).encode()).hexdigest()
    return None


class SupplierKpiViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    serializer_class = SupplierKpiDefaultSerializer
    pagination_class = CustomPagination

    queryset = (
        SupplierKpi.objects.select_related(
            "supplier",
            "status",
            "assigned_to",
            "kpi",
            "kpi__kpi_category",
            "kpi__kpi_recommended_remediation",
            "kpi__kpi_systems_change",
            "kpi__kpi_legal_violation",
        )
        .prefetch_related(
            "kpi__kpitranslation_set",
            "kpi__kpi_category__kpicategorytranslation_set",
            "bhr_focal",
            "assigned_users",
            Prefetch(
                "updates",
                queryset=SupplierKpiUpdate.objects.only("id", "supplier_kpi_id"),
            ),
            Prefetch(
                "supplier__cases",
                queryset=Case.objects.select_related("country").only(
                    "id", "country", "supplier_id", "country__name"
                ),
                to_attr="prefetched_cases",
            ),
            Prefetch(
                "supplier__suppliersupplychain_set",
                queryset=SupplierSupplyChain.objects.select_related("supply_chain"),
                to_attr="prefetched_supply_chains",
            ),
            Prefetch(
                "supplier__supplier_for_user",
                queryset=SupplierUser.objects.select_related("user")
                .prefetch_related("user__groups")
                .filter(user__is_active=True, user__groups__name__in=["Supplier"])
                .only(
                    "user",
                    "user__email",
                    "user__first_name",
                    "user__last_name",
                ),
                to_attr="prefetched_supplier_users",
            ),
        )
        .annotate(
            country=Subquery(
                Case.objects.filter(
                    kpis__id=OuterRef("kpi__id"), supplier__id=OuterRef("supplier__id")
                )
                .order_by("country__name")
                .values("country__name")[:1]
            ),
            # Add annotation to identify if supplier is in a supply chain
            is_in_supply_chain=models.Exists(
                SupplierSupplyChain.objects.filter(supplier_id=OuterRef("supplier__id"))
            ),
        )
    )

    filter_backends = [SearchFilter, SupplierKpiOrderingFilter, DjangoFilterBackend]
    filterset_class = SupplierKpiFilterSet
    _main_fields = [
        "supplier__name",
        "status__name",
        "kpi__description",
        "kpi__level",
        "assigned_to__email",
    ]
    search_fields = _main_fields + [
        "kpi__kpi_category__name",
        "kpi__kpi_category__kpicategorytranslation__name",
        "kpi__case__country__name",
        "kpi__kpitranslation__description",
        "supplier__supplier_for_user__user__groups",
        "supplier__supplier_for_user__user__email",
        "supplier__supplier_for_user__user__first_name",
        "supplier__supplier_for_user__user__last_name",
    ]
    ordering_fields = _main_fields + [
        "opened_at",
        "closed_at",
        "id",
        "affected_workers",
        "supplier__name",
        "kpi__description",
        "kpi__kpi_category",
        "kpi__level",
        "country",
        "days_active",
        "closed_at",
        "closure_date",
        "closed_quality",
    ]
    ordering = ["opened_at"]

    @action(methods=["GET"], detail=False, url_path="closure-stats")
    def closure_stats(self, request):
        """
        Returns deduplicated KPI update records (one per supplier_kpi_id + closed_at,
        taking the latest update id), matching the SQL join and select.
        """
        from django.db.models import F, Value, Func, CharField, Max, Subquery, OuterRef
        from kpis.models import SupplierKpiUpdate

        # Deduplicate: keep only the latest update per (supplier_kpi_id, closed_at),
        # matching the logic in RemediationMetricsView.
        latest_ids = (
            SupplierKpiUpdate.objects.filter(status_id=3)
            .values("supplier_kpi_id", "closed_at")
            .annotate(latest_id=Max("id"))
            .values("latest_id")
        )

        qs = (
            SupplierKpiUpdate.objects.select_related("supplier_kpi__kpi")
            .filter(id__in=latest_ids)
            .annotate(
                supplier_id=F("supplier_kpi__supplier_id"),
                kpi_id=F("supplier_kpi__kpi_id"),
                level=F("supplier_kpi__kpi__level"),
                closed_Month_Year=Func(
                    F("closed_at"),
                    Value("%Y-%m"),
                    function="DATE_FORMAT",
                    output_field=CharField(),
                ),
                opened_Month_Year=Func(
                    F("opened_at"),
                    Value("%Y-%m"),
                    function="DATE_FORMAT",
                    output_field=CharField(),
                ),
            )
        )

        # Apply optional filters from query params: start_timestamp, end_timestamp, suppliers
        start_ts = request.GET.get("start_timestamp")
        end_ts = request.GET.get("end_timestamp")
        suppliers_param = request.GET.get("suppliers") or request.GET.get("supplier_in")

        if start_ts:
            try:
                start_int = int(start_ts)
                from datetime import datetime

                qs = qs.filter(closed_at__gte=datetime.fromtimestamp(start_int))
            except (TypeError, ValueError):
                pass

        if end_ts:
            try:
                end_int = int(end_ts)
                from datetime import datetime

                qs = qs.filter(closed_at__lte=datetime.fromtimestamp(end_int))
            except (TypeError, ValueError):
                pass

        if suppliers_param:
            try:
                supplier_ids = [int(x) for x in suppliers_param.split(",") if x.strip()]
                if supplier_ids:
                    qs = qs.filter(supplier_kpi__supplier__id__in=supplier_ids)
            except ValueError:
                pass

        qs = qs.values(
            "id",
            "overview_date",
            "closed_quality",
            "affected_workers",
            "supplier_kpi_id",
            "closed_at",
            "closed_Month_Year",
            "opened_at",
            "opened_Month_Year",
            "closed_notes",
            "status_id",
            "closure_date",
            "supplier_id",
            "kpi_id",
            "level",
            "remediation_paid_usd",
            "remediation_paid_baht",
            "remediation_paid_kyat",
            "remediation_paid_ringitt",
        )

        results = list(qs)

        # --- DEBUG LOGGING (uncomment to enable) ---
        # import logging
        # logger = logging.getLogger(__name__)
        # logger.info(
        #     "[closure-stats] filters: start_ts=%s end_ts=%s suppliers=%s | total records returned: %d",
        #     start_ts,
        #     end_ts,
        #     suppliers_param,
        #     len(results),
        # )
        # total_kpis = 0
        # total_workers = 0
        # total_usd = 0.0
        # quality_counts = {}
        # for item in results:
        #     quality = item.get("closed_quality") or "Unknown"
        #     quality_counts[quality] = quality_counts.get(quality, 0) + 1
        #     total_kpis += 1
        #     total_workers += item.get("affected_workers") or 0
        #     usd = item.get("remediation_paid_usd") or 0
        #     baht = item.get("remediation_paid_baht") or 0
        #     kyat = item.get("remediation_paid_kyat") or 0
        #     ringgit = item.get("remediation_paid_ringitt") or 0
        #     total_usd += usd if usd > 0 else (baht / 32 + kyat / 3500 + ringgit * 0.25)
        #     logger.debug(
        #         "[closure-stats] KPI id=%s supplier_kpi_id=%s kpi_id=%s closed_at=%s quality=%s "
        #         "affected_workers=%s usd=%s baht=%s kyat=%s ringgit=%s",
        #         item.get("id"),
        #         item.get("supplier_kpi_id"),
        #         item.get("kpi_id"),
        #         item.get("closed_at"),
        #         quality,
        #         item.get("affected_workers"),
        #         item.get("remediation_paid_usd"),
        #         item.get("remediation_paid_baht"),
        #         item.get("remediation_paid_kyat"),
        #         item.get("remediation_paid_ringitt"),
        #     )
        # logger.info(
        #     "[closure-stats] summary: total_kpis=%d total_affected_workers=%d total_usd=%.2f quality_breakdown=%s",
        #     total_kpis,
        #     total_workers,
        #     total_usd,
        #     quality_counts,
        # )
        # --- END DEBUG LOGGING ---

        return Response(results)

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return SupplierKpiReadOnlySerializer

        return super().get_serializer_class()

    # @method_decorator(cache_control(max_age=60 * 15, private=True, no_cache=True))
    # @method_decorator(vary_on_headers("Authorization"))
    # @method_decorator(etag(supplier_kpi_etag_func))
    def list(self, request, *args, **kwargs):
        # Prefetch active calls for the page in bulk to avoid N+1 queries in
        # `SupplierKpiReadOnlySerializer.get_active_calls`.
        queryset = self.filter_queryset(self.get_queryset())

        # Use pagination if enabled; operate on the page items only.
        page = self.paginate_queryset(queryset)
        items = list(page) if page is not None else list(queryset)

        if items:
            supplier_kpi_ids = [it.id for it in items]

            # Fetch latest closed history row per supplier_kpi in bulk to avoid N+1.
            history_model = SupplierKpi.history.model
            latest_closed_rows = (
                history_model.objects.filter(
                    id__in=supplier_kpi_ids, closed_at__isnull=False
                )
                .values("id")
                .annotate(latest_history_date=Max("history_date"))
            )
            latest_closed_map = {
                row["id"]: row["latest_history_date"].date()
                for row in latest_closed_rows
                if row.get("latest_history_date")
            }
            today = timezone.now().date()

            # Collect candidate kpi_ids and supplier_ids for case query
            kpi_ids = set([it.kpi_id for it in items if hasattr(it, "kpi_id")])
            supplier_ids = set(
                [it.supplier_id for it in items if hasattr(it, "supplier_id")]
            )

            if kpi_ids and supplier_ids:
                # Build a map of kpi_id -> level to avoid per-row subqueries
                kpi_levels = dict(
                    Kpi.objects.filter(id__in=kpi_ids).values_list("id", "level")
                )

                cases_qs = (
                    Case.objects.filter(
                        kpis__id__in=kpi_ids, supplier_id__in=supplier_ids
                    )
                    .select_related(
                        "interaction_issara_staff",
                        "next_steps_issara_staff",
                        "source_recruiter",
                        "destination_recruiter",
                    )
                    .annotate(
                        issara_user=F("interaction_issara_staff__email"),
                        next_steps_issara_user=F("next_steps_issara_staff__email"),
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
                        "description",
                        "interaction_summary",
                        "referral_notes",
                        "next_steps",
                        "issara_user",
                        "next_steps_issara_user",
                        "source_recruiter_name",
                        "destination_recruiter_name",
                        "kpis__id",
                        "supplier_id",
                    )
                    .distinct()
                )

                cases = list(cases_qs)

                # group cases by (kpi_id, supplier_id) and inject kpi_level
                grouped = {}
                for c in cases:
                    kpi_fk = c.get("kpis__id")
                    c["kpi_level"] = kpi_levels.get(kpi_fk)
                    key = (kpi_fk, c.get("supplier_id"))
                    grouped.setdefault(key, []).append(c)

                # attach filtered active calls per SupplierKpi instance
                for it in items:
                    key = (it.kpi_id, it.supplier_id)
                    all_cases = grouped.get(key, [])
                    boundary_date = latest_closed_map.get(it.id)
                    if boundary_date:
                        filtered = [
                            c
                            for c in all_cases
                            if c.get("created") is None
                            or (
                                c.get("created") >= boundary_date
                                and c.get("created") <= today
                            )
                        ]
                    else:
                        filtered = all_cases

                    # remove grouping keys from payload to match serializer expectations
                    for rec in filtered:
                        rec.pop("kpis__id", None)
                        rec.pop("supplier_id", None)
                        rec["supplier_kpi_id"] = it.id

                    setattr(it, "prefetched_active_calls", filtered)

        # Serialize and return the prepared items so serializers see
        # `prefetched_active_calls` we attached above and avoid N+1.
        serializer = self.get_serializer(items, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    # @method_decorator(cache_control(max_age=60 * 15, private=True, no_cache=True))
    # @method_decorator(vary_on_headers("Authorization"))
    # @method_decorator(etag(supplier_kpi_etag_func))
    def retrieve(self, request, *args, **kwargs):
        # For single-object retrieval, compute active_calls once and attach
        instance = self.get_object()

        try:
            # A call belongs to this KPI cycle only if it happened on or after
            # the cycle opened. Bounding by the KPI's own `opened_at` keeps the
            # bound in place even when the KPI has no `SupplierKpiUpdate` rows.
            boundary = instance.opened_at

            cases_qs = (
                Case.objects.filter(
                    kpis__id=instance.kpi_id, supplier_id=instance.supplier_id
                )
                .select_related(
                    "interaction_issara_staff",
                    "next_steps_issara_staff",
                    "source_recruiter",
                    "destination_recruiter",
                )
                .annotate(
                    issara_user=F("interaction_issara_staff__email"),
                    next_steps_issara_user=F("next_steps_issara_staff__email"),
                    kpi_level=Subquery(
                        Kpi.objects.filter(id=instance.kpi_id).values("level")[:1]
                    ),
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
                    "description",
                    "interaction_summary",
                    "referral_notes",
                    "next_steps",
                    "issara_user",
                    "next_steps_issara_user",
                    "kpi_level",
                    "source_recruiter_name",
                    "destination_recruiter_name",
                )
                .distinct()
            )

            if boundary:
                cases_qs = cases_qs.filter(created__gte=boundary)

            setattr(instance, "prefetched_active_calls", list(cases_qs))
        except Exception:
            setattr(instance, "prefetched_active_calls", [])

        return super().retrieve(request, *args, **kwargs)

    @action(methods=["GET"], detail=True, url_path="calls")
    def get_calls(self, request, pk=None):
        supplier_kpi = SupplierKpi.objects.filter(id=pk).first()
        supplier_id = supplier_kpi.supplier.id
        kpi_id = supplier_kpi.kpi.id

        qs = (
            Case.objects.filter(
                kpis__id=kpi_id,
                supplier_id=supplier_id,
            )
            .prefetch_related(
                Prefetch(
                    "kpis",
                    queryset=Kpi.objects.filter(id=kpi_id),
                    to_attr="filtered_kpis",
                )
            )
            .select_related(
                "interaction_issara_staff",
                "next_steps_issara_staff",
                "source_recruiter",
                "destination_recruiter",
            )
            .annotate(
                issara_user=F("interaction_issara_staff__email"),
                next_steps_issara_user=F("next_steps_issara_staff__email"),
                kpi_level=Subquery(Kpi.objects.filter(id=kpi_id).values("level")[:1]),
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
                "interaction_summary",
                "referral_notes",
                "next_steps",
            )
            .distinct()
        )

        # Same cycle bound as `retrieve()`: a call belongs to this KPI cycle
        # only if it happened on or after the cycle opened.
        if supplier_kpi.opened_at:
            qs = qs.filter(created__gte=supplier_kpi.opened_at)

        return Response(qs, 200)

    @action(methods=["GET"], detail=True, url_path="destination-recruiters")
    def get_destination_recruiters(self, request, pk=None):
        supplier_kpi = SupplierKpi.objects.filter(id=pk).first()
        supplier_id = supplier_kpi.supplier.id
        kpi_id = supplier_kpi.kpi.id

        qs = (
            Case.objects.filter(
                kpis__id=kpi_id,
                supplier_id=supplier_id,
                destination_recruiter__isnull=False,
            )
            .values("destination_recruiter", "destination_recruiter__name")
            .annotate(count=Count("id"))
        )

        return Response(qs, 200)

    @action(methods=["GET"], detail=True, url_path="source-recruiters")
    def get_source_recruiters(self, request, pk=None):
        supplier_kpi = SupplierKpi.objects.filter(id=pk).first()
        supplier_id = supplier_kpi.supplier.id
        kpi_id = supplier_kpi.kpi.id

        qs = (
            Case.objects.filter(
                kpis__id=kpi_id,
                supplier_id=supplier_id,
                source_recruiter__isnull=False,
            )
            .values("source_recruiter", "source_recruiter__name")
            .annotate(count=Count("id"))
        )

        return Response(qs, 200)

    @action(methods=["GET"], detail=False, url_path="summary")
    def summary(self, request):
        """
        Returns a summary of KPIs per kpi_category, optionally filtered.
        It will aggregate the data from already filtered queryset,
        NOTE if you need additional filters, modify filterset class
        """
        qs = self.filter_queryset(self.get_queryset()).order_by()
        summary_data = (
            qs.annotate(name=F("kpi__kpi_category__name"))
            .values("name")
            .annotate(value=Count("id"))
            .values("name", "value")
            .order_by("-value")
        )
        return Response(summary_data)

    @action(methods=["GET"], detail=False, url_path="open-closed-summary")
    def open_closed_summary(self, request):
        """
        Returns a summary of KPIs per kpi_category,
        calculating open and closed cases
        NOTE if you need additional filters, modify filterset class
        """
        qs = self.filter_queryset(self.get_queryset()).order_by()
        summary_data = (
            qs.annotate(name=F("kpi__kpi_category__name"))
            .values("name")
            .annotate(
                open_cases=Count("id", filter=Q(status__in=[1, 2])),
                closed_cases=Count("id", filter=Q(status__in=[3, 4])),
            )
            .values("name", "open_cases", "closed_cases")
            .order_by("name")
        )
        return Response(summary_data)

    # Add this filter to expose the supply chain parameters in the API
    @action(methods=["GET"], detail=False, url_path="filter-options")
    def get_filter_options(self, request):
        """Return filter options including supply chain filters"""
        return Response(
            {
                "filters": {
                    "supply_chain": {"label": "Supply Chain", "type": "boolean"},
                    "non_supply_chain": {
                        "label": "Non-Supply Chain",
                        "type": "boolean",
                    },
                    # Add other filter options as needed
                }
            },
            200,
        )
