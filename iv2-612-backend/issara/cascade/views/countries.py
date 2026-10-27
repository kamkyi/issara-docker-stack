from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.views.decorators.vary import vary_on_headers
from django.views.decorators.http import etag

from issara.ilm_server_2.models import Country
from issara.ilm_server_2.serializers import CountrySerializer
from issara.ilm_server_2.views import country_etag_func


class CountryListAPIView(ListAPIView):
    """Returns paginated list of countries in standard DRF format with caching/ETag."""

    queryset = Country.objects.all().order_by("name")
    serializer_class = CountrySerializer
    permission_classes = [AllowAny]

    @method_decorator(
        cache_control(max_age=60 * 15, private=True, must_revalidate=True)
    )
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(country_etag_func))
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)
