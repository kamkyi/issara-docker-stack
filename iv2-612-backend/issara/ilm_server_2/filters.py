import django_filters
from django.db.models import Q
from issara.ilm_server_2.models import SPWorkplan, Supplier, Case, UserTask
import datetime


class UserTaskFilters(django_filters.FilterSet):
    source_id = django_filters.NumberFilter()
    source_type = django_filters.CharFilter(method="filter_source_type")
    done = django_filters.BooleanFilter()
    deadline = django_filters.DateFilter()
    assigned_by_name = django_filters.CharFilter(
        method="filter_assigned_by", field_name="assigned_by__first_name"
    )
    supplier_name = django_filters.CharFilter(method="filter_supplier_name")
    sps_name = django_filters.CharFilter(method="filter_sps_name")
    assigned_to_name = django_filters.CharFilter(
        method="filter_assigned_to", field_name="assigned_to__first_name"
    )
    q = django_filters.CharFilter(method="filter_search", label="Search")

    class Meta:
        model = UserTask
        fields = ("id", "source_id", "source_type", "deadline", "done")

    def filter_source_type(self, queryset, name, value):
        return queryset.filter(source_type__icontains=value)

    def filter_assigned_by(self, queryset, name, value):
        return queryset.filter(
            Q(assigned_by__first_name__icontains=value)
            | Q(assigned_by__last_name__icontains=value)
        )

    def filter_assigned_to(self, queryset, name, value):
        return queryset.filter(
            Q(assigned_users__first_name__icontains=value)
            | Q(assigned_users__last_name__icontains=value)
        ).distinct()

    def filter_supplier_name(self, queryset, name, value):
        return queryset.filter(supplier_name__icontains=value)

    def filter_sps_name(self, queryset, name, value):
        return queryset.filter(sps_name__icontains=value)

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(source_type__icontains=value)
            | Q(assigned_by__first_name__icontains=value)
            | Q(assigned_by__last_name__icontains=value)
            | Q(assigned_users__first_name__icontains=value)
            | Q(assigned_users__last_name__icontains=value)
            | Q(supplier_name__icontains=value)
            | Q(sps_name__icontains=value)
        ).distinct()


class SPWorkplanFilters(django_filters.FilterSet):
    strategic_partner__name = django_filters.CharFilter(lookup_expr="istartswith")
    strategic_partner__id = django_filters.NumberFilter()
    current_step = django_filters.CharFilter(lookup_expr="exact")
    status = django_filters.CharFilter(lookup_expr="exact")
    suggested_date__lte = django_filters.DateFilter(
        field_name="suggested_date", lookup_expr="lte"
    )
    suggested_date__gte = django_filters.DateFilter(
        field_name="suggested_date", lookup_expr="gte"
    )
    created_at__lte = django_filters.DateFilter(
        field_name="created_at", lookup_expr="lte"
    )
    created_at__gte = django_filters.DateFilter(
        field_name="created_at", lookup_expr="gte"
    )

    class Meta:
        model = SPWorkplan
        fields = (
            "strategic_partner",
            "current_step",
            "status",
            "suggested_date__lte",
            "suggested_date__gte",
            "created_at__lte",
            "created_at__gte",
        )
        order_by_field = ("created_at", "suggested_date")


class SupplierFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Supplier

        fields = {
            "name": ["icontains"],
        }


class CaseFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(method="filter_query", label="Search")
    after = django_filters.CharFilter(
        method="filter_date_after", field_name="interacted"
    )
    before = django_filters.CharFilter(
        method="filter_date_before", field_name="interacted"
    )
    supplier_ids = django_filters.CharFilter(
        method="filter_ids", label="Supplier IDs", field_name="supplier__id"
    )
    src_recruiter_ids = django_filters.CharFilter(
        method="filter_ids",
        label="Source Recruiter IDs",
        field_name="source_recruiter__id",
    )
    dest_recruiter_ids = django_filters.CharFilter(
        method="filter_ids",
        label="Destination Recruiter IDs",
        field_name="destination_recruiter__id",
    )

    class Meta:
        model = Case
        fields = []

    def filter_query(self, queryset, name, value):
        search_fields = [
            "id__icontains",
            "supplier__name__icontains",
            "source_recruiter__name__icontains",
            "destination_recruiter__name__icontains",
            "issue_category__name__icontains",
            "kpis__description__icontains",
            "client_nickname__icontains",
            "client_gender__name__icontains",
            "client_nationality__name__icontains",
            "client_origin_province__name__icontains",
            "interactiontype__icontains",
            "client_phonenumber__icontains",
            "interacted__icontains",
            "case_created_by__username__icontains",
        ]

        filters = Q()
        for field in search_fields:
            filters |= Q(**{field: value})

        return queryset.filter(filters)

    def filter_ids(self, queryset, name, value):
        ids = [int(id.strip()) for id in value.strip("()").split(",") if id.strip()]
        return queryset.filter(**{f"{name}__in": ids})

    def filter_date_after(self, queryset, name, value):
        return self.filter_by_date(queryset, name, value, "gte")

    def filter_date_before(self, queryset, name, value):
        return self.filter_by_date(queryset, name, value, "lte")

    def filter_by_date(self, queryset, name, value, lookup_expr):
        try:
            timestamp = int(value) / 1000
            date = datetime.datetime.fromtimestamp(timestamp)
            return queryset.filter(**{f"{name}__{lookup_expr}": date})
        except (ValueError, TypeError):
            return queryset
