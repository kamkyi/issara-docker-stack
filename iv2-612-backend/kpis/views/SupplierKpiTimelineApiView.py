import logging

from django.db.models import Exists, OuterRef, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response

from issara.ilm_server_2.models import Case as CaseModel
from kpis.exceptions import InvalidDateFormatError, MissingRequiredParametersError
from kpis.models import SupplierKpi, SupplierKpiUpdate
from kpis.services import KPITimelineService

logger = logging.getLogger(__name__)


class SupplierKpiTimelineAPIView(generics.ListAPIView):
    """
    API view to retrieve KPI timeline data for suppliers.

    Query Parameters:
    - supplier: Supplier ID (required)
    - category: Category ID (required)
    - startTime: Start time in ISO format (required)
    - endTime: End time in ISO format (required)

    Returns:
    - chartData: List of timeline bars for visualization
    - message: Success message
    """

    serializer_class = None

    def get_queryset(self):
        """Get only open SupplierKpi objects for the supplier and category (closed_at is null)."""
        try:
            params = self._validate_and_extract_params()

            # Parse dates
            start_time = timezone.datetime.strptime(
                params["start_time"], "%Y-%m-%dT%H:%M:%S.%fZ"
            ).date()
            end_time = timezone.datetime.strptime(
                params["end_time"], "%Y-%m-%dT%H:%M:%S.%fZ"
            ).date()

            # Only open KPIs (closed_at is null) and opened before end_time
            queryset = SupplierKpi.objects.filter(
                supplier_id=params["supplier_id"],
                kpi__kpi_category_id=params["category_id"],
                closed_at__isnull=True,
                opened_at__lte=end_time,
            ).select_related("kpi", "status")

            return queryset
        except Exception as e:
            logger.error(f"Error in get_queryset: {str(e)}")
            return SupplierKpi.objects.none()

    def _validate_and_extract_params(self) -> dict:
        """Validate and extract required query parameters"""
        supplier_id = self.request.query_params.get("supplier")
        category_id = self.request.query_params.get("category")
        start_time = self.request.query_params.get("startTime")
        end_time = self.request.query_params.get("endTime")

        if not all([supplier_id, category_id, start_time, end_time]):
            missing = [
                param
                for param, value in [
                    ("supplier", supplier_id),
                    ("category", category_id),
                    ("startTime", start_time),
                    ("endTime", end_time),
                ]
                if not value
            ]
            raise MissingRequiredParametersError(
                f"Missing required parameters: {', '.join(missing)}"
            )

        return {
            "supplier_id": supplier_id,
            "category_id": category_id,
            "start_time": start_time,
            "end_time": end_time,
        }

    def _get_supplier_kpi_descriptions(self, queryset) -> dict:
        """Get supplier KPI descriptions to avoid N+1 queries"""
        return {kpi.id: kpi.kpi.description for kpi in queryset}

    def list(self, request, *args, **kwargs):
        """Generate and return KPI timeline chart data from SupplierKpi objects"""
        try:
            queryset = self.get_queryset()

            if not queryset.exists():
                return Response(
                    {
                        "chartData": [],
                        "message": "No KPI data found for the specified criteria.",
                    }
                )

            # Extract parameters for service
            params = self._validate_and_extract_params()

            # Build chart data: each SupplierKpi as a bar (open or closed)
            chart_data = []
            for kpi in queryset:
                label = kpi.kpi.description or str(kpi.kpi)
                status_str = "Closed" if kpi.closed_at else "Open"
                color = "#4caf50" if kpi.closed_at else "#2196f3"
                start = kpi.opened_at
                end = kpi.closed_at if kpi.closed_at else timezone.now()
                chart_data.append([label, status_str, color, start, end])

            return Response(
                {
                    "chartData": chart_data,
                    "message": "KPI timeline data fetched successfully.",
                }
            )

        except MissingRequiredParametersError as e:
            return Response(
                {"error": str(e), "chartData": []}, status=status.HTTP_400_BAD_REQUEST
            )

        except InvalidDateFormatError as e:
            return Response(
                {"error": str(e), "chartData": []}, status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            print(e)
            logger.error(f"Unexpected error in SupplierKpiTimelineAPIView: {str(e)}")
            return Response(
                {
                    "error": "An unexpected error occurred while processing the request.",
                    "chartData": [],
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
