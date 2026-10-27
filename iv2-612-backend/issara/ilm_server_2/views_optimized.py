from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from kpis.models import SupplierKpi, SupplierKpiUpdate
from issara.ilm_server_2.models import Case, CaseStatus, Supplier
from issara.ilm_server_2.optimized_serializers.supplier_kpi_update_optimized import (
    SupplierKpiUpdateSerializer,
)
from django.db.models import Prefetch, Q


class SupplierKpiOptimizedView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        supplier_id = request.query_params.get("supplier_id")
        if not supplier_id:
            return Response({"error": "supplier_id is required"}, status=400)

        # Return a flat list of SupplierKpiUpdate objects for the supplier

        updates = (
            SupplierKpiUpdate.objects.filter(supplier_kpi__supplier_id=supplier_id)
            .select_related(
                "supplier_kpi",
                "supplier_kpi__supplier",
                "supplier_kpi__kpi",
                "supplier_kpi__kpi__kpi_category",
                "status",
            )
            .prefetch_related("assigned_users", "bhr_focal")
            .order_by("-overview_date", "-id")
        )

        serializer = SupplierKpiUpdateSerializer(
            updates, many=True, context={"request": request}
        )
        return Response(
            {
                "count": updates.count(),
                "next": None,
                "previous": None,
                "results": serializer.data,
            }
        )
