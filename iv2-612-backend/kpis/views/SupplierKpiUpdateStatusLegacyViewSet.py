from kpis.models import SupplierKpiUpdateStatus
from kpis.serializers import SupplierKpiUpdateStatusSerializer
from rest_framework import permissions, viewsets


class SupplierKpiUpdateStatusLegacyViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)

    queryset = SupplierKpiUpdateStatus.objects.all().order_by("-id")
    serializer_class = SupplierKpiUpdateStatusSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)
