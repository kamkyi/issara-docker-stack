from kpis.models import KpiLegalViolation
from kpis.serializers import KpiLegalViolationSerializer
from rest_framework import permissions, viewsets


class KpiLegalViolationLegacyViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)

    queryset = KpiLegalViolation.objects.all().select_related("country").order_by("-id")
    serializer_class = KpiLegalViolationSerializer

    def get_serializer_context(self):
        context = super(KpiLegalViolationLegacyViewSet, self).get_serializer_context()
        context.update(
            {"country_name": True}
        )  # Pass the context to get the country name instead of pk
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)
