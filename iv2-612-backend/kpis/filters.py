from datetime import datetime, timedelta

from django.db.models import (
    Case,
    DateTimeField,
    Exists,
    ExpressionWrapper,
    F,
    IntegerField,
    OuterRef,
    Prefetch,
    Q,
    When,
)
from django.db.models.functions import Extract, Now, TruncDate
from django_filters.rest_framework import (
    BaseInFilter,
    BooleanFilter,
    CharFilter,
    DateFilter,
    DateFromToRangeFilter,
    FilterSet,
    NumberFilter,
    NumericRangeFilter,
)
from rest_framework.filters import OrderingFilter

from issara.ilm_server_2.models import Case as CaseModel
from kpis.functions import get_cases_by_organization
from kpis.models import (
    KpiCategoryTranslation,
    KpiTranslation,
    SupplierKpi,
    SupplierKpiUpdate,
    SupplierKpiUpdateStatus,
)
from kpis.utils import annotate_days_active, filter_queryset_by_date
from supply_chains.models import SupplierSupplyChain


class _NumberInFilter(BaseInFilter, NumberFilter):
    pass


class BaseKpiFilterSet(FilterSet):
    """Base filter set for KPI-related filters with common functionality."""

    _CLOSED_STATUS_NAMES = (
        "Closed",
        "Old unresolved",
        "Old, unresolved case",
    )
    _CSO_GROUP_NAME = "CSO"
    _TRUTHY_VALUES = {"1", "true", "t", "yes", "y", "on"}

    def filter_by_show_closed(self, queryset, name, value):
        is_show_closed = value or False
        closed_status_ids = SupplierKpiUpdateStatus.objects.filter(
            name__in=self._CLOSED_STATUS_NAMES
        ).values("id")

        if is_show_closed:
            return queryset.filter(status_id__in=closed_status_ids)

        return queryset.exclude(status_id__in=closed_status_ids)

    def annotate_supply_chain_flags(self, queryset, supplier_id_outer_ref):
        any_supply_chain_exists = SupplierSupplyChain.objects.filter(
            supplier_id=OuterRef(supplier_id_outer_ref)
        )
        active_supply_chain_exists = SupplierSupplyChain.objects.filter(
            supplier_id=OuterRef(supplier_id_outer_ref),
            status=SupplierSupplyChain.STATUS_ACTIVE,
        )
        former_or_inactive_supply_chain_exists = SupplierSupplyChain.objects.filter(
            supplier_id=OuterRef(supplier_id_outer_ref),
            status__in=[
                SupplierSupplyChain.STATUS_FORMER_SUPPLIER,
                SupplierSupplyChain.STATUS_INACTIVE,
            ],
        )
        pre_production_supply_chain_exists = SupplierSupplyChain.objects.filter(
            supplier_id=OuterRef(supplier_id_outer_ref),
            status=SupplierSupplyChain.STATUS_PRE_PROUDCTION,
        )

        return queryset.annotate(
            has_any_supply_chain=Exists(any_supply_chain_exists),
            has_active_supply_chain=Exists(active_supply_chain_exists),
            has_former_or_inactive_supply_chain=Exists(
                former_or_inactive_supply_chain_exists
            ),
            has_pre_production_supply_chain=Exists(pre_production_supply_chain_exists),
        )

    def filter_by_date(self, queryset, name, value):
        return filter_queryset_by_date(queryset, name, value, self.Meta.model)

    def should_show_cso_cases(self) -> bool:
        """
        Controls whether CSO-created cases are considered when evaluating `has_cases`.
        Defaults to False when query param is absent.
        """
        request = getattr(self, "request", None)
        if request is None:
            return False

        raw_value = request.query_params.get("show_cso_cases")
        if raw_value is None:
            return False
        if isinstance(raw_value, bool):
            return raw_value

        return str(raw_value).strip().lower() in self._TRUTHY_VALUES

    def should_filter_cso_only_cases(self) -> bool:
        """
        Controls whether we restrict case matching to only CSO-created cases.
        Defaults to False when query param is absent.
        """
        request = getattr(self, "request", None)
        if request is None:
            return False

        raw_value = request.query_params.get("cso_cases_only")
        if raw_value is None:
            return False
        if isinstance(raw_value, bool):
            return raw_value

        return str(raw_value).strip().lower() in self._TRUTHY_VALUES

    def build_case_exists_subquery(
        self,
        *,
        supplier_outer_ref: str,
        kpi_outer_ref: str,
    ):
        cases_exist = CaseModel.objects.filter(
            kpis__id=OuterRef(kpi_outer_ref),
            supplier_id=OuterRef(supplier_outer_ref),
        )

        if self.should_filter_cso_only_cases():
            cases_exist = cases_exist.filter(
                case_created_by__groups__name=self._CSO_GROUP_NAME
            )
        elif not self.should_show_cso_cases():
            cases_exist = cases_exist.exclude(
                case_created_by__groups__name=self._CSO_GROUP_NAME
            )

        return cases_exist


class SupplierKpiOrderingFilter(OrderingFilter):
    def filter_queryset(self, request, queryset, view):
        """
        DRF expects `filter_queryset()`, not `filter()`
        """
        ordering = self.get_ordering(request, queryset, view)
        if not ordering:
            return queryset

        if any(v in ["days_active", "-days_active"] for v in ordering):
            # sort queryset by days_active
            return annotate_days_active(queryset).order_by(*ordering)

        return super().filter_queryset(request, queryset, view)


class SupplierKpiFilterSet(BaseKpiFilterSet):
    kpi__kpi_category_id = NumberFilter(
        field_name="kpi__kpi_category__id", label="KPI Category ID"
    )
    lang = CharFilter(method="filter_by_language", label="Language Filter")
    organization_id = NumberFilter(
        method="filter_by_organization_id", label="Filter by organization_id"
    )
    show_closed = BooleanFilter(method="filter_by_show_closed", label="Show closed?")
    days_open = NumericRangeFilter(method="filter_by_days_open", label="Days Open")
    days_active = NumberFilter(method="filter_by_days_active", label="Days Active")
    suppliers = _NumberInFilter(
        field_name="supplier__id",
        lookup_expr="in",
        label="Suppliers | Use ?supplier_in=1,2,3 | Can not render as CSV",
    )
    opened_at_range = DateFromToRangeFilter(field_name="opened_at")
    has_cases = BooleanFilter(method="filter_by_has_cases", label="Has cases?")
    cso_cases_only = BooleanFilter(
        method="filter_by_cso_cases_only", label="CSO cases only?"
    )
    show_cso_cases = BooleanFilter(
        method="filter_by_show_cso_cases", label="Show CSO cases?"
    )
    assigned_to__email = CharFilter(
        field_name="assigned_to__email", lookup_expr="icontains"
    )
    assigned_users__email = CharFilter(
        field_name="assigned_users__email", lookup_expr="icontains"
    )
    bhr_focal__email = CharFilter(
        field_name="bhr_focal__email", lookup_expr="icontains"
    )
    status = CharFilter(field_name="status__name__icontains", label="Status")
    kpi__kpi_category = CharFilter(
        field_name="kpi__kpi_category__name", lookup_expr="icontains", label="Category"
    )
    kpi__description = CharFilter(
        field_name="kpi__description", lookup_expr="icontains", label="Description"
    )
    supplier__name = CharFilter(
        "supplier__name", lookup_expr="icontains", label="Supplier"
    )
    country = CharFilter("country", lookup_expr="icontains")
    status__name = CharFilter("status__name", lookup_expr="icontains")
    closed_at = CharFilter(method="filter_by_date", label="Filter by closed_at")
    opened_at = CharFilter(method="filter_by_date", label="Filter by opened_at")
    closure_date = CharFilter(method="filter_by_date", label="Filter by closure_date")
    closed_quality = CharFilter("closed_quality", lookup_expr="icontains")
    supply_chain = BooleanFilter(method="filter_supply_chain")
    non_supply_chain = BooleanFilter(method="filter_non_supply_chain")
    pre_production_supply_chain = BooleanFilter(
        method="filter_pre_production_supply_chain"
    )
    former_supply_chain = BooleanFilter(method="filter_former_supply_chain")

    class Meta:
        model = SupplierKpi
        fields = [
            "lang",
            "supplier",
            "kpi",
            "id",
            "kpi__level",
            "assigned_to__email",
            "affected_workers",
            "opened_at",
            "kpi__kpi_category_id",
        ]

    def filter_by_has_cases(self, queryset, name: str, value: bool):
        cases_exist = self.build_case_exists_subquery(
            supplier_outer_ref="supplier_id",
            kpi_outer_ref="kpi_id",
        )

        queryset = queryset.annotate(has_cases=Exists(cases_exist))
        if value:
            return queryset.filter(has_cases=True)
        return queryset.filter(has_cases=False)

    def filter_by_show_cso_cases(self, queryset, name, value):
        # This flag is consumed by `filter_by_has_cases`; keep no-op here.
        return queryset

    def filter_by_cso_cases_only(self, queryset, name, value):
        # This flag is consumed by `filter_by_has_cases`; keep no-op here.
        return queryset

    def filter_by_language(self, queryset, name: str, value: str):
        lang_code = value or "en"
        filtered_category_translations = Prefetch(
            "kpi__kpi_category__kpicategorytranslation_set",
            queryset=KpiCategoryTranslation.objects.filter(language__code=lang_code),
            to_attr="filtered_category_translations",
        )
        filtered_kpi_translations = Prefetch(
            "kpi__kpitranslation_set",
            queryset=KpiTranslation.objects.filter(language__code=lang_code),
            to_attr="filtered_kpi_translations",
        )

        return queryset.prefetch_related(
            filtered_category_translations, filtered_kpi_translations
        )

    def filter_by_days_open(self, queryset, name, value):
        queryset = annotate_days_active(queryset)
        if value.start is not None and value.stop is not None:
            return queryset.filter(days_active__range=(value.start, value.stop))
        elif value.start is not None:
            return queryset.filter(days_active__gte=value.start)
        elif value.stop is not None:
            return queryset.filter(days_active__lte=value.stop)

        return queryset

    def filter_by_organization_id(self, queryset, name, value):
        supplier_kpi_ids = get_cases_by_organization(value)
        return queryset.filter(id__in=supplier_kpi_ids)

    def filter_by_days_active(self, queryset, name, value):
        return annotate_days_active(queryset).filter(days_active=value)

    def filter_supply_chain_status(self, queryset, name, value):
        """Filter suppliers based on supply chain status"""
        if value == "in_supply_chain":
            return queryset.filter(
                supplier__suppliersupplychain__isnull=False
            ).distinct()
        elif value == "not_in_supply_chain":
            return queryset.filter(
                supplier__suppliersupplychain__isnull=True
            ).distinct()
        return queryset  # 'all' or any other value returns unfiltered

    def filter_supply_chain(self, queryset, name, value):
        """Filter SupplierKpis whose supplier has any supply chain membership."""
        if value:
            queryset = self.annotate_supply_chain_flags(queryset, "supplier_id")
            return queryset.filter(has_any_supply_chain=True)
        return queryset

    def filter_non_supply_chain(self, queryset, name, value):
        """Filter SupplierKpis whose supplier has no supply chain membership."""
        if value:
            queryset = self.annotate_supply_chain_flags(queryset, "supplier_id")
            return queryset.filter(has_any_supply_chain=False)
        return queryset

    def filter_pre_production_supply_chain(self, queryset, name, value):
        """Filter SupplierKpis whose supplier is pre-production in a supply chain."""
        if value:
            queryset = self.annotate_supply_chain_flags(queryset, "supplier_id")
            return queryset.filter(has_pre_production_supply_chain=True)
        return queryset

    def filter_former_supply_chain(self, queryset, name, value):
        """Filter SupplierKpis whose supplier is former or inactive in a supply chain."""
        if value:
            queryset = self.annotate_supply_chain_flags(queryset, "supplier_id")
            return queryset.filter(has_former_or_inactive_supply_chain=True)
        return queryset


class SupplierKpiUpdateFilterSet(BaseKpiFilterSet):
    lang = CharFilter(method="filter_by_language", label="Filter by language_code")
    supply_chain__in = _NumberInFilter(
        field_name="supplier_kpi__supplier__supplychain__id",
        lookup_expr="in",
        label="Supply chain | Use ?supply_chain__in=1,2,3 | Can not render as CSV",
    )
    organization_id = NumberFilter(
        method="filter_by_organization_id", label="Filter by organization_id"
    )
    show_closed = BooleanFilter(method="filter_by_show_closed", label="Show closed?")
    has_cases = BooleanFilter(method="filter_by_has_cases", label="Has cases?")
    cso_cases_only = BooleanFilter(
        method="filter_by_cso_cases_only", label="CSO cases only?"
    )
    show_cso_cases = BooleanFilter(
        method="filter_by_show_cso_cases", label="Show CSO cases?"
    )
    suppliers = _NumberInFilter(
        field_name="supplier_kpi__supplier__id",
        lookup_expr="in",
        label="Suppliers | Use ?supplier_in=1,2,3 | Can not render as CSV",
    )
    status = CharFilter(field_name="status__name", label="Status")
    supplier_kpi__kpi__description = CharFilter(
        field_name="supplier_kpi__kpi__description",
        lookup_expr="icontains",
        label="Description",
    )
    supplier_kpi__kpi__kpi_category = CharFilter(
        field_name="supplier_kpi__kpi__kpi_category__name",
        lookup_expr="icontains",
        label="Category",
    )
    supplier_kpi__supplier__name = CharFilter(
        field_name="supplier_kpi__supplier__name",
        lookup_expr="icontains",
        label="Supplier",
    )
    status__name = CharFilter("status__name", lookup_expr="icontains")
    closed_at = CharFilter(method="filter_by_date", label="Filter by closed_at")
    opened_at = CharFilter(method="filter_by_date", label="Filter by opened_at")
    opened_at_range = DateFromToRangeFilter(field_name="opened_at")
    closure_date = CharFilter(method="filter_by_date", label="Filter by closure_date")
    closed_quality = CharFilter("closed_quality", lookup_expr="icontains")
    supply_chain = BooleanFilter(method="filter_supply_chain", label="Supply Chain")
    non_supply_chain = BooleanFilter(
        method="filter_non_supply_chain", label="Non Supply Chain"
    )
    pre_production_supply_chain = BooleanFilter(
        method="filter_pre_production_supply_chain", label="Pre-Production Supply Chain"
    )
    former_supply_chain = BooleanFilter(
        method="filter_former_supply_chain", label="Former / Inactive Supply Chain"
    )

    def filter_by_language(self, queryset, name, value):
        lang_code = value or "en"
        filtered_category_translations = Prefetch(
            "supplier_kpi__kpi__kpi_category__kpicategorytranslation_set",
            queryset=KpiCategoryTranslation.objects.filter(language__code=lang_code),
            to_attr="filtered_category_translations",
        )
        filtered_kpi_translations = Prefetch(
            "supplier_kpi__kpi__kpitranslation_set",
            queryset=KpiTranslation.objects.filter(language__code=lang_code),
            to_attr="filtered_kpi_translations",
        )

        return queryset.prefetch_related(
            filtered_category_translations, filtered_kpi_translations
        )

    def filter_by_organization_id(self, queryset, name, value):
        supplier_kpi_ids = get_cases_by_organization(value)
        return queryset.filter(supplier_kpi__id__in=supplier_kpi_ids)

    def filter_by_has_cases(self, queryset, name, value):
        cases_exist = self.build_case_exists_subquery(
            supplier_outer_ref="supplier_kpi__supplier_id",
            kpi_outer_ref="supplier_kpi__kpi_id",
        )
        queryset = queryset.annotate(has_cases=Exists(cases_exist))

        if value:
            return queryset.filter(has_cases=True)
        return queryset.filter(has_cases=False)

    def filter_by_show_cso_cases(self, queryset, name, value):
        # This flag is consumed by `filter_by_has_cases`; keep no-op here.
        return queryset

    def filter_by_cso_cases_only(self, queryset, name, value):
        # This flag is consumed by `filter_by_has_cases`; keep no-op here.
        return queryset

    class Meta:
        model = SupplierKpiUpdate
        fields = [
            "id",
            "lang",
            "supplier_kpi",
            "affected_workers",
            "supplier_kpi__kpi__level",
        ]

    def filter_supply_chain(self, queryset, name, value):
        """
        Filter SupplierKpiUpdates whose supplier has any supply chain membership.
        """
        if value:
            queryset = self.annotate_supply_chain_flags(
                queryset, "supplier_kpi__supplier_id"
            )
            return queryset.filter(has_any_supply_chain=True)
        return queryset

    def filter_non_supply_chain(self, queryset, name, value):
        """
        Filter SupplierKpiUpdates whose supplier has no supply chain membership.
        """
        if value:
            queryset = self.annotate_supply_chain_flags(
                queryset, "supplier_kpi__supplier_id"
            )
            return queryset.filter(has_any_supply_chain=False)
        return queryset

    def filter_pre_production_supply_chain(self, queryset, name, value):
        """
        Filter SupplierKpiUpdates whose supplier is pre-production in a supply chain.
        """
        if value:
            queryset = self.annotate_supply_chain_flags(
                queryset, "supplier_kpi__supplier_id"
            )
            return queryset.filter(has_pre_production_supply_chain=True)
        return queryset

    def filter_former_supply_chain(self, queryset, name, value):
        """
        Filter SupplierKpiUpdates whose supplier is former or inactive in a supply chain.
        """
        if value:
            queryset = self.annotate_supply_chain_flags(
                queryset, "supplier_kpi__supplier_id"
            )
            return queryset.filter(has_former_or_inactive_supply_chain=True)
        return queryset
