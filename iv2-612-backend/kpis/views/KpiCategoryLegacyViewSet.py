from django.db.models import OuterRef, Subquery
from django.db.models.functions import Coalesce
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.views.decorators.http import etag
from django.views.decorators.vary import vary_on_headers
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from authkit import WorkOSAuthKitAuthentication
from issara.ilm_server_2.utils import get_serializer
from kpis.models import KpiCategory, KpiCategoryTranslation
from kpis.serializers import KpiCategorySerializer, KPiCategoryTranslationSerializer
from rest_framework.settings import api_settings


class KpiCategoryLegacyViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (permissions.IsAuthenticated,)

    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = (
        KpiCategory.objects.all().select_related("issue_category").order_by("name")
    )
    default_serializer_class = KpiCategorySerializer
    translation_serializer_class = KPiCategoryTranslationSerializer

    def get_serializer_class(self):
        return get_serializer(self, self.request)

    # Since this kpi category gets updated/created very rarely, value of 24 hrs
    # is acceptable
    @method_decorator(cache_control(max_age=60 * 60 * 24, private=True))
    @method_decorator(vary_on_headers("Authorization"))
    def list(self, request, *args, **kwargs):
        lang = request.query_params.get("lang")
        if lang and lang != "en":
            translation_subquery = KpiCategoryTranslation.objects.filter(
                kpi_category__id=OuterRef("pk"), language__code=lang
            ).values("name")[:1]

            queryset = KpiCategory.objects.annotate(
                translated_name=Coalesce(Subquery(translation_subquery), "name")
            )
        else:
            queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
