from authkit import WorkOSAuthKitAuthentication
from django.contrib.auth.models import User
from rest_framework import permissions
from rest_framework.settings import api_settings
from rest_framework.generics import ListAPIView

from issara.ilm_server_2.cso_audience import use_cso_audience
from issara.ilm_server_2.models import UserOrganization
from issara.ilm_server_2.serializers import UserSerializer
from issara.ilm_server_2.utilities import Concat


class UserListAPIView(ListAPIView):
    """
    Cascade endpoint that returns the user list.
    Mirrors GET /api/v2/users/.
    """

    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_queryset(self):
        # Every consumer of this endpoint is a people-picker -- the Worker
        # Voice officer dropdowns and the Issara staff assignment dropdown --
        # and a deactivated account cannot be assigned work, so it is filtered
        # out at the fetch rather than in each dropdown. Editing an older case
        # whose officer has since left therefore asks for a current one.
        base_qs = User.objects.filter(is_active=True).order_by("id").select_related(
            "strategic_partner_user__strategic_partner",
            "supplier_user__supplier",
            "organization_user__organization",
        )
        # The CSO-facing rule is "the officers of my own organization". It is a
        # rule about the *audience*, not about who is signed in, so it applies
        # to a client rendering the CSO Worker Voice UI too (`?cso_only=true`,
        # see `cso_audience`) -- and it applies to that caller's *own*
        # organization. Nothing here adopts another organization: an Issara
        # Management tester in CSO view gets Issara Institute's officers, which
        # is exactly what a CSO account in Issara Institute already gets.
        #
        # The organization is read through `UserOrganization` rather than the
        # `organization_user` descriptor, which raises for an account with no
        # link. There is a live CSO user in that state, and unlinked Management
        # accounts exist too; a people-picker with nothing to offer is an empty
        # list, not a 500.
        if use_cso_audience(self.request):
            link = UserOrganization.objects.filter(
                user_id=self.request.user.pk
            ).first()
            if link is None:
                return base_qs.none()
            return base_qs.filter(
                organization_user__organization_id=link.organization_id
            ).annotate(_groups=Concat("groups__name"))
        return base_qs.exclude(groups__name="CSO").annotate(_groups=Concat("groups__name"))

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"supplier": True})
        return context
