from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.views.decorators.vary import vary_on_headers
from django.views.decorators.http import etag
from django.db.models import Max, Count

from issara.ilm_server_2.models import Industry
from issara.ilm_server_2.serializers import IndustrySerializer


def industry_etag_func(request, *args, **kwargs):
    pk = kwargs.get("pk")
    if pk:
        # Industry model does not have timestamps; use max id as proxy for last change
        latest = Industry.objects.filter(pk=pk).aggregate(latest=Max("id"))
        latest_ts = latest.get("latest")
        if not latest_ts:
            return None
        payload = f"{pk}:{latest_ts}"
    else:
        # Use max id and count since Industry has no updated_at field
        latest = Industry.objects.aggregate(latest=Max("id"), total=Count("id"))
        latest_ts = latest.get("latest")
        if not latest_ts:
            return None
        payload = f"list:{latest_ts}:{latest.get('total')}"
    import hashlib

    return hashlib.md5(str(payload).encode()).hexdigest()


class IndustryListAPIView(ListAPIView):
    """Returns paginated list of industries with caching and ETag."""

    queryset = Industry.objects.all().order_by("name")
    serializer_class = IndustrySerializer
    permission_classes = [AllowAny]

    @method_decorator(
        cache_control(max_age=60 * 15, private=True, must_revalidate=True)
    )
    @method_decorator(vary_on_headers("Authorization"))
    @method_decorator(etag(industry_etag_func))
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        paginated_queryset = self.paginate_queryset(queryset)
        serializer = self.get_serializer(paginated_queryset, many=True)
        return self.get_paginated_response(serializer.data)
