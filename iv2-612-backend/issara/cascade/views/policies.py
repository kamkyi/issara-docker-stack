from authkit import WorkOSAuthKitAuthentication
from django.shortcuts import get_object_or_404
from issara.ilm_server_2.models import (
    Policy,
    StrategicPartner,
    StrategicPartnerUser,
    Supplier,
    SupplierUser,
)
from issara.ilm_server_2.permissions import IlmUserGroups
from issara.ilm_server_2.serializers import (
    PolicyReadSerializer,
    PolicyWriteSerializer,
)
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.settings import api_settings

from issara.ilm_server_2.audience import (
    exclude_private_for,
    user_owns_strategic_partner,
    user_owns_supplier,
)

OWNER_KIND_STRATEGIC_PARTNER = "strategic-partner"
OWNER_KIND_SUPPLIER = "supplier"
SAFE_POLICY_ACTIONS = ("list", "retrieve")


class _BasePolicyViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticated]
    owner_kind = None
    owner_url_kwarg = None

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return PolicyReadSerializer
        return PolicyWriteSerializer

    def _owner_id(self):
        return int(self.kwargs[self.owner_url_kwarg])

    def _owner_filter(self):
        owner_id = self._owner_id()
        if self.owner_kind == OWNER_KIND_STRATEGIC_PARTNER:
            return {"strategic_partner_id": owner_id}
        return {"supplier_id": owner_id}

    def _user_role(self, user):
        claims = getattr(user, "claims", None) or {}
        return claims.get("role") or ""

    def _user_can_access_owner(self, user, owner_id):
        # Issara staff can access all policy owners.
        if user.groups.filter(name=IlmUserGroups.ISSRA_STAFF.value).exists():
            return True

        role = self._user_role(user)

        if self.owner_kind == OWNER_KIND_STRATEGIC_PARTNER:
            # Strategic/global partner users can access their SP policies.
            if role in (
                "org-global-partner",
                "org-strategic-partner",
                "org-partner",
            ):
                return True

            # Supplier users are allowed to VIEW Strategic Partner
            # policy/compliance files, but not create/update/delete them.
            if role == "org-supplier":
                return self.action in SAFE_POLICY_ACTIONS

            return StrategicPartnerUser.objects.filter(
                user=user,
                strategic_partner_id=owner_id,
            ).exists()

        if self.owner_kind == OWNER_KIND_SUPPLIER:
            if role == "org-supplier":
                return True

            return SupplierUser.objects.filter(
                user=user,
                supplier_id=owner_id,
            ).exists()

        return False

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        owner_id = self._owner_id()
        if self.owner_kind == OWNER_KIND_STRATEGIC_PARTNER:
            get_object_or_404(StrategicPartner, pk=owner_id)
        else:
            get_object_or_404(Supplier, pk=owner_id)
        if not self._user_can_access_owner(request.user, owner_id):
            self.permission_denied(
                request, message="You do not have access to this company."
            )

    def _user_owns_documents(self):
        """Whether the requester may see this owner's `private` documents.

        Deliberately stricter than `_user_can_access_owner`, which grants
        blanket read access by role for the Member Directory.
        """
        user = self.request.user
        owner_id = self._owner_id()
        if self.owner_kind == OWNER_KIND_STRATEGIC_PARTNER:
            return user_owns_strategic_partner(user, owner_id)
        return user_owns_supplier(user, owner_id)

    def get_queryset(self):
        queryset = (
            Policy.objects.filter(**self._owner_filter(), is_source_hidden=False)
            .prefetch_related("categories")
            .select_related("file")
            .order_by("-created_at")
        )
        return exclude_private_for(queryset, self._user_owns_documents())

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["owner"] = self._owner_filter()
        return ctx

    def create(self, request, *args, **kwargs):
        write = self.get_serializer(data=request.data)
        write.is_valid(raise_exception=True)
        policy = write.save()
        return Response(
            PolicyReadSerializer(policy).data, status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        write = self.get_serializer(instance, data=request.data, partial=partial)
        write.is_valid(raise_exception=True)
        policy = write.save()
        return Response(PolicyReadSerializer(policy).data)


class StrategicPartnerPolicyViewSet(_BasePolicyViewSet):
    owner_kind = OWNER_KIND_STRATEGIC_PARTNER
    owner_url_kwarg = "sp_id"


class SupplierPolicyViewSet(_BasePolicyViewSet):
    owner_kind = OWNER_KIND_SUPPLIER
    owner_url_kwarg = "supplier_id"
