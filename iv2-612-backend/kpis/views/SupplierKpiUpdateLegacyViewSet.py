from django.db import connection, transaction
from django.db.models.expressions import RawSQL
from kpis.functions import get_cases_by_organization
from kpis.models import SupplierKpiUpdate
from kpis.serializers import SupplierKpiUpdateLegacySerializer
from rest_framework import (
    authentication,
    filters,
    generics,
    permissions,
    status,
    viewsets,
)

DB_INFO = connection.get_connection_params()
DB_NAME = DB_INFO["database"]
import logging

logger = logging.getLogger("nameOfTheLogger")
ConsoleOutputHandler = logging.StreamHandler()

logger.addHandler(ConsoleOutputHandler)

logger.warning("Warning.")


class SupplierKpiUpdateLegacyViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    queryset = SupplierKpiUpdate.objects.all()
    serializer_class = SupplierKpiUpdateLegacySerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["lang"] = self.request.query_params.get("lang", "en")
        return context

    def get_sql_annotation(self):
        return RawSQL(
            f"""
            SELECT GROUP_CONCAT(cases_kpis.case_id)
            FROM {DB_NAME}.supplier_kpis temp_supplier_kpis
            LEFT OUTER JOIN {DB_NAME}.cases_kpis ON {DB_NAME}.cases_kpis.kpi_id = temp_supplier_kpis.kpi_id
            LEFT OUTER JOIN {DB_NAME}.cases ON {DB_NAME}.cases.id = {DB_NAME}.cases_kpis.case_id
            WHERE {DB_NAME}.cases.supplier_id = temp_supplier_kpis.supplier_id
            AND {DB_NAME}.supplier_kpi_updates.supplier_kpi_id = temp_supplier_kpis.id
            GROUP BY supplier_kpi_updates.id
            """,
            (),
        )

    def get_cso_supplier_kpis(self, qs):
        organization_id = self.request.user.organization_user.organization_id
        supplier_kpi_ids = get_cases_by_organization(organization_id)

        supplier_kpi_updates = qs.filter(supplier_kpi__id__in=supplier_kpi_ids)
        return supplier_kpi_updates

    def get_issara_supplier_kpis(self, qs, organization_id):
        try:
            organization_id = int(organization_id)
        except ValueError:
            return SupplierKpiUpdate.objects.none()

        supplier_kpi_ids = get_cases_by_organization(organization_id)

        supplier_kpi_updates = qs.filter(supplier_kpi__id__in=supplier_kpi_ids)
        return supplier_kpi_updates

    def get_other_supplier_kpis(self, qs):
        if not (
            self.request.user.is_staff
            or self.request.user.is_superuser
            or "global_partner"
            not in self.request.user.groups.values_list("name", flat=True)
        ):
            if not hasattr(self.request.user, "strategic_partner_user"):
                return SupplierKpiUpdate.objects.none()

            supply_chain_ids = self.request.user.strategic_partner_user.strategic_partner.supplychain_set.values_list(
                "suppliers", flat=True
            )
            supplier_kpi_updates = qs.filter(
                supplier_kpi__supplier__id__in=supply_chain_ids
            )
            return supplier_kpi_updates
        return qs

    def get_queryset(self):
        qs = self.queryset.select_related(
            "status", "supplier_kpi__supplier", "supplier_kpi__kpi__kpi_category"
        ).annotate(
            calls=self.get_sql_annotation(),
        )

        # First, check if supplier_id is provided and filter by it (performance optimization)
        supplier_id = self.request.query_params.get("supplier_id", "").strip()
        if supplier_id:
            try:
                supplier_id = int(supplier_id)
                qs = qs.filter(supplier_kpi__supplier_id=supplier_id)
                return qs  # Return early with supplier-specific filtering
            except ValueError:
                pass  # Invalid supplier_id, continue with normal flow

        if hasattr(self.request, "organization_user"):
            groups = self.request.user.groups.values_list("name", flat=True)
            if "CSO" in groups:
                return self.get_cso_supplier_kpis(qs)

        if "organization_id" in self.request.query_params:
            organization_id = self.request.query_params["organization_id"].strip()
            if organization_id:
                return self.get_issara_supplier_kpis(qs, organization_id)

        return self.get_other_supplier_kpis(qs)
