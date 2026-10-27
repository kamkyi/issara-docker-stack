from django.db.models import Count, F, OuterRef, Subquery
from django_filters.rest_framework import DjangoFilterBackend
from issara.ilm_server_2.pagination import CustomPagination
from kpis.filters import SupplierKpiUpdateFilterSet
from kpis.models import SupplierKpiUpdate
from kpis.serializers import (
    SupplierKpiCycleSerializer,
    SupplierKpiUpdateDefaultSerializer,
    SupplierKpiUpdateReadOnlySerializer,
)
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response


class SupplierKpiUpdateViewset(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    pagination_class = CustomPagination
    serializer_class = SupplierKpiUpdateDefaultSerializer
    filter_backends = SearchFilter, OrderingFilter, DjangoFilterBackend
    filterset_class = SupplierKpiUpdateFilterSet
    _main_fields = [
        "supplier_kpi__supplier__name",
        "status__name",
        "supplier_kpi__kpi__description",
        "supplier_kpi__kpi__level",
        "assigned_to__email",
        "bhr_focal__email",
    ]
    search_fields = _main_fields + [
        "supplier_kpi__kpi__kpi_category__name",
        "supplier_kpi__kpi__kpi_category__kpicategorytranslation__name",
        "supplier_kpi__kpi__kpitranslation__description",
    ]
    ordering_fields = _main_fields + [
        "opened_at",
        "closed_at",
        "closure_date",
        "id",
        "affected_workers",
        "supplier_kpi",
        "closed_quality",
        "description",
        "category",
        "supplier_kpi__supplier__name",
        "supplier_kpi__kpi__description",
        "supplier_kpi__kpi__kpi_category",
        "supplier_kpi__kpi__level",
    ]
    ordering = ["-opened_at"]

    queryset = SupplierKpiUpdate.objects.select_related(
        "status",
        "assigned_to",
        "supplier_kpi__supplier",
        "supplier_kpi__kpi__kpi_category",
    ).prefetch_related(
        "bhr_focal",
        "assigned_users",
        "supplier_kpi__kpi__kpitranslation_set",
        "supplier_kpi__kpi__kpi_category__kpicategorytranslation_set",
    )

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return SupplierKpiUpdateReadOnlySerializer
        if self.action == "cycles":
            return SupplierKpiCycleSerializer
        return super().get_serializer_class()

    def _get_filtered_queryset_without_ordering(self):
        queryset = self.get_queryset()
        for backend in self.filter_backends:
            if backend is OrderingFilter:
                continue
            queryset = backend().filter_queryset(self.request, queryset, self)
        return queryset

    @action(methods=["GET"], detail=False, url_path="cycles")
    def cycles(self, request, *args, **kwargs):
        queryset = self._get_filtered_queryset_without_ordering()

        cycle_updates = SupplierKpiUpdate.objects.filter(
            supplier_kpi_id=OuterRef("supplier_kpi_id"),
            opened_at=OuterRef("opened_at"),
        )
        cycle_count_subquery = (
            cycle_updates.values("supplier_kpi_id", "opened_at")
            .annotate(total=Count("id"))
            .values("total")[:1]
        )

        queryset = (
            queryset.annotate(
                cycle_latest_update_id=Subquery(
                    cycle_updates.order_by("-id").values("id")[:1]
                ),
                cycle_update_count=Subquery(cycle_count_subquery),
            )
            .filter(id=F("cycle_latest_update_id"))
            .order_by(
                *(
                    OrderingFilter().get_ordering(request, queryset, self)
                    or self.ordering
                )
            )
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
