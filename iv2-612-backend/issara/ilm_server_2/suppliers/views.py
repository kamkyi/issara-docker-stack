from django.contrib.auth.models import Group
from django.db.models import F, OuterRef, Subquery
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework.mixins import ListModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.settings import api_settings
from rest_framework.viewsets import GenericViewSet
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from authkit import WorkOSAuthKitAuthentication
from issara.ilm_server_2.models import (
    Supplier,
    SupplierSupplyChain,
    SupplierActivitySummary,
    FieldworkActivity,
    FieldworkActivityTypeTranslation,
)
from issara.ilm_server_2.suppliers.serializers import (
    SupplierListDropDownSerializer,
    SupplierActivitySummarySerializer,
    SupplierFieldWorkTrainingSerializer,
)
from issara.ilm_server_2.pagination import CustomCursorPagination
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.views.decorators.vary import vary_on_headers
from django.views.decorators.http import etag
import hashlib
from django.db.models import Max, Prefetch

from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.views.decorators.vary import vary_on_headers
from django.views.decorators.http import etag


class SupplierListDropDownCursorPagination(CustomCursorPagination):
    def get_page_size(self, request):
        page_size = super().get_page_size(request)
        selected_ids = set(request.query_params.getlist("id"))

        if selected_ids:
            return max(page_size, len(selected_ids))

        return page_size


class SupplierListDropDownView(ListModelMixin, GenericViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    queryset = Supplier.objects.order_by("name")
    pagination_class = SupplierListDropDownCursorPagination
    serializer_class = SupplierListDropDownSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        """
        Returns the queryset of suppliers based on user permissions.
        """
        user = self.request.user
        if user.is_staff or user.is_superuser:
            queryset = self.queryset
        else:
            queryset = self._get_queryset_by_group(user)
            if queryset is None:
                return Supplier.objects.none()

        queryset = self._filter_by_query_params(queryset)
        return queryset

    def _get_queryset_by_group(self, user):
        groups = set(user.groups.values_list("name", flat=True))

        if "global_partner" in groups or "Strategic_partner" in groups:
            if hasattr(user, "strategic_partner_user"):
                return (
                    self.queryset.filter(
                        supplychain__strategic_partner=user.strategic_partner_user.strategic_partner
                    )
                    .exclude(
                        suppliersupplychain__status=SupplierSupplyChain.STATUS_FORMER_SUPPLIER
                    )
                    .distinct()
                )
            return None

        if "SupplierHR" in groups:
            if hasattr(user, "supplier_user"):
                supplier_id = user.supplier_user.supplier.id
                return self.queryset.filter(id=supplier_id)
            return None

        # CSO officers log a call against whichever supplier the worker names,
        # so the picker has to offer the whole list -- a worker can report on a
        # workplace the organization has never had a case about before.
        #
        # This is not a widening of what a CSO may read: `SupplierViewSet`
        # already returns every supplier to any authenticated non-staff,
        # non-`global_partner` user, and the legacy call wizard leans on that
        # (`RequiredCallFields.fetchSupplierById` reads `/suppliers/{id}` for
        # the country/province/district auto-fill). This branch only stops the
        # dropdown returning nothing while the detail endpoint returns
        # everything, and it hands back strictly less -- id and name.
        if "CSO" in groups:
            return self.queryset

        return None

    def _filter_by_query_params(self, queryset):
        """
        Applies optional filters from query params (?name=, ?id=)
        """
        name = self.request.query_params.get("name")
        if name:
            queryset = queryset.filter(name__icontains=name)

        ids = self.request.query_params.getlist("id", None)
        if ids:
            queryset = queryset.filter(id__in=ids)

        return queryset

    @method_decorator(cache_control(max_age=60 * 5, private=True))
    @method_decorator(vary_on_headers("Authorization"))
    def list(self, request, *args, **kwargs):

        queryset = self.filter_queryset(self.get_queryset())
        total_count = queryset.count()

        response = super().list(request, *args, **kwargs)

        if isinstance(response.data, dict):
            response.data["total_count"] = total_count
        else:

            response.data = {"results": response.data, "total_count": total_count}

        return response


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


class SupplierActivitySummaryView(APIView):
    permission_classes = (IsAuthenticated,)
    queryset = SupplierActivitySummary.objects.all()
    serializer_class = SupplierActivitySummarySerializer

    def get(self, request, supplier_id):
        """
        Returns the supplier activity summary of the given supplier id.
        """
        supplier = get_object_or_404(Supplier, pk=supplier_id)
        try:
            supplier_activity_summary = self.queryset.get(supplier=supplier)
            return Response(
                SupplierActivitySummarySerializer(supplier_activity_summary).data
            )
        except SupplierActivitySummary.DoesNotExist:
            return Response({}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, supplier_id):
        """
        Creates a new supplier activity summary for the given supplier id.
        """
        supplier = get_object_or_404(Supplier, pk=supplier_id)
        data = request.data.copy()
        data["supplier"] = supplier.id
        serializer = self.serializer_class(data=data)

        if serializer.is_valid():
            serializer.save(supplier=supplier)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, supplier_id):
        """
        Updates an existing supplier activity summary for the given supplier id.
        """
        supplier = get_object_or_404(Supplier, pk=supplier_id)
        supplier_activity_summary = get_object_or_404(self.queryset, supplier=supplier)
        serializer = self.serializer_class(
            supplier_activity_summary, data=request.data, partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SupplierFieldWorkTrainingView(APIView):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (IsAuthenticated,)
    serializer_class = SupplierFieldWorkTrainingSerializer

    def get(self, request, supplier_id):
        """
        Returns the supplier trainings with optional language translation.
        Use ?language=th or ?lang=th for Thai translations, etc.
        """
        supplier = get_object_or_404(Supplier, pk=supplier_id)

        # Check for language parameter (support both 'lang' and 'language')
        lang = request.query_params.get("language") or request.query_params.get("lang")

        if lang and lang != "en":
            # Create subquery for translated fieldwork type name
            translation_subquery = FieldworkActivityTypeTranslation.objects.filter(
                fieldwork_activity_type__id=OuterRef("fieldwork_type__id"),
                language__code=lang,
            ).values("name")[:1]

            list_of_trainings = (
                FieldworkActivity.objects.filter(
                    suppliers=supplier, fieldwork_type__category__name="Training"
                )
                .order_by("-fieldwork_date")
                .select_related(
                    "fieldwork_type__category", "fieldwork_type", "training_name"
                )
                .annotate(
                    name=Coalesce(
                        Subquery(translation_subquery), F("fieldwork_type__name")
                    )
                )
                .values("id", "fieldwork_date", "name", "training_name")
            )
        else:
            # Default English response
            list_of_trainings = (
                FieldworkActivity.objects.filter(
                    suppliers=supplier, fieldwork_type__category__name="Training"
                )
                .order_by("-fieldwork_date")
                .select_related(
                    "fieldwork_type__category", "fieldwork_type", "training_name"
                )
                .annotate(name=F("fieldwork_type__name"))
                .values("id", "fieldwork_date", "name", "training_name")
            )

        return Response(self.serializer_class(list_of_trainings, many=True).data)


class SupplierMinimalListView(APIView):
    """Return a minimal supplier list for dropdowns.

    Supports `fields` query param (comma-separated). Default: id,name,anonymous.
    Honors basic name/id filters and user group restrictions (similar to
    `SupplierListDropDownView`). Returns an unpaginated JSON list.
    """

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        allowed_fields = {
            "id",
            "name",
            "anonymous",
            "country",
            "province",
            "district",
        }

        fields_param = request.query_params.get("fields")
        if fields_param:
            requested = [f.strip() for f in fields_param.split(",") if f.strip()]
            fields = [f for f in requested if f in allowed_fields]
            if not fields:
                fields = ["id", "name", "anonymous"]
        else:
            fields = ["id", "name", "anonymous"]

        queryset = Supplier.objects.order_by("name")

        user = request.user
        if not (user.is_staff or user.is_superuser):
            groups = set(user.groups.values_list("name", flat=True))
            if "global_partner" in groups or "Strategic_partner" in groups:
                if hasattr(user, "strategic_partner_user"):
                    queryset = (
                        queryset.filter(
                            supplychain__strategic_partner=user.strategic_partner_user.strategic_partner
                        )
                        .exclude(
                            suppliersupplychain__status=SupplierSupplyChain.STATUS_FORMER_SUPPLIER
                        )
                        .distinct()
                    )
                else:
                    queryset = Supplier.objects.none()
            elif "SupplierHR" in groups:
                if hasattr(user, "supplier_user"):
                    supplier_id = user.supplier_user.supplier.id
                    queryset = queryset.filter(id=supplier_id)
                else:
                    queryset = Supplier.objects.none()

        # Apply optional filters
        name = request.query_params.get("name")
        if name:
            queryset = queryset.filter(name__icontains=name)

        ids = request.query_params.getlist("id", None)
        if ids:
            queryset = queryset.filter(id__in=ids)

        # Return values list (no pagination)
        results = list(queryset.values(*fields))
        return Response(results)
