from authkit import WorkOSAuthKitAuthentication
from rest_framework import permissions
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView

from supplier.models import WorkerFeedback
from supplier.serializers import WorkerFeedbackSerializer


class WorkerFeedbackPagination(LimitOffsetPagination):
    default_limit = 10
    limit_query_param = "limit"
    offset_query_param = "offset"
    max_limit = 100


class WorkerFeedbackAPIView(APIView):
    """
    Cascade endpoint for worker feedback list.

    Query params:
      - supplier_id (optional)
      - limit / offset
    """

    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (permissions.IsAuthenticated,)
    pagination_class = WorkerFeedbackPagination

    @staticmethod
    def _get_request_param(request, key):
        return request.query_params.get(key) or request.data.get(key)

    def get_queryset(self, request):
        queryset = (
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
            .order_by("-created_at")
        )

        supplier_id = self._get_request_param(request, "supplier_id")
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)

        return queryset

    def get(self, request):
        queryset = self.get_queryset(request)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)

        serializer = WorkerFeedbackSerializer(
            page if page is not None else queryset,
            many=True,
            context={"request": request},
        )

        if page is not None:
            return paginator.get_paginated_response(serializer.data)

        return Response(serializer.data)

    def post(self, request):
        serializer = WorkerFeedbackSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(
            WorkerFeedbackSerializer(instance, context={"request": request}).data,
            status=201,
        )
