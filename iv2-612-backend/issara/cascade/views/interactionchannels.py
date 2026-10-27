from authkit import WorkOSAuthKitAuthentication
from django.db.models import OuterRef, Subquery
from django.db.models.functions import Coalesce
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView

from issara.ilm_server_2.cso_audience import requests_cso_audience
from issara.ilm_server_2.models import InteractionChannel, InteractionChannelTranslation
from issara.ilm_server_2.serializers import (
    InteractionChannelSerializer,
    InteractionChannelTranslationSerializer,
)


class InteractionChannelListAPIView(APIView):
    """Cascade endpoint for interaction channels with WorkOS authentication."""

    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self, request):
        # `?cso_only=true` is how a client rendering the CSO Worker Voice UI
        # asks for the CSO channel set even when the token is not a CSO one --
        # the Cascade tester's case. A real CSO is unaffected: `get_for_user`
        # already puts them on that branch.
        return InteractionChannel.get_for_user(
            request.user, cso_audience=requests_cso_audience(request)
        )

    def get(self, request):
        lang = request.query_params.get("lang")

        if lang and lang != "en":
            translation_subquery = InteractionChannelTranslation.objects.filter(
                interaction_channel__id=OuterRef("pk"), language__code=lang
            ).values("name")[:1]
            queryset = self.get_queryset(request).annotate(
                translated_name=Coalesce(Subquery(translation_subquery), "name")
            )
            serializer = InteractionChannelTranslationSerializer(queryset, many=True)
        else:
            queryset = self.get_queryset(request)
            serializer = InteractionChannelSerializer(queryset, many=True)

        return Response(serializer.data)
