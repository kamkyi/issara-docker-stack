from authkit import WorkOSAuthKitAuthentication
from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import DestroyAPIView, ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView

from issara.ilm_server_2.choices import (
    ORGANIZATION_CORE_FOCUS_AREA_CHOICES,
    ORGANIZATION_STAKEHOLDER_GROUP_CHOICES,
    ORGANIZATION_TYPE_CHOICES,
)
from issara.ilm_server_2.models import (
    Language,
    Organization,
    OrganizationImage,
    UserOrganization,
)
from issara.ilm_server_2.serializers import (
    OrganizationImageSerializer,
    OrganizationLogoSerializer,
    OrganizationProfileSerializer,
)

AUTHENTICATION_CLASSES = (WorkOSAuthKitAuthentication,) + tuple(
    api_settings.DEFAULT_AUTHENTICATION_CLASSES
)


def _organization_for(user):
    """The organization the requesting user belongs to, or None.

    Users arriving through WorkOS are normally resolved to a Django user, but
    fall back to a lightweight object with no primary key when no ILM account
    matches -- those have no organization link to follow.
    """
    user_id = getattr(user, "pk", None)
    if not user_id:
        return None

    link = (
        UserOrganization.objects.filter(user_id=user_id)
        .select_related("organization")
        .first()
    )
    return link.organization if link else None


class OrganizationProfileAPIView(RetrieveUpdateAPIView):
    """The requesting CSO user's own organization profile.

    Scoped to the caller's `UserOrganization` link rather than taking an id, so
    a CSO can only ever read or edit their own organization.
    """

    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]
    serializer_class = OrganizationProfileSerializer

    def get_queryset(self):
        return Organization.objects.prefetch_related(
            "core_focus_areas",
            "stakeholder_groups",
            "nace_codes",
            "countries_of_registration",
            "countries_of_operation",
            "languages_supported",
        )

    def get_object(self):
        organization = _organization_for(self.request.user)
        if organization is None:
            return None
        return self.get_queryset().get(pk=organization.pk)

    def _no_organization_response(self):
        return Response(
            {"detail": "This user is not linked to an organization."},
            status=status.HTTP_404_NOT_FOUND,
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance is None:
            return self._no_organization_response()
        return Response(self.get_serializer(instance).data)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance is None:
            return self._no_organization_response()

        serializer = self.get_serializer(
            instance, data=request.data, partial=kwargs.pop("partial", False)
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


def _as_options(choices):
    return [{"value": value, "label": label} for value, label in choices]


class OrganizationProfileOptionsAPIView(APIView):
    """The vocabularies the profile form offers.

    Served from the backend so `choices.py` stays the single source of truth for
    the keys; the CSO UI maps each key onto its own translated label. Languages
    carry their own names because they are reference rows, not a fixed
    vocabulary. Target sectors are absent by design -- NACE codes come from
    cascade-api.
    """

    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response(
            {
                "organization_types": _as_options(ORGANIZATION_TYPE_CHOICES),
                "core_focus_areas": _as_options(ORGANIZATION_CORE_FOCUS_AREA_CHOICES),
                "stakeholder_groups": _as_options(
                    ORGANIZATION_STAKEHOLDER_GROUP_CHOICES
                ),
                "languages": [
                    {"value": code, "label": name}
                    for code, name in Language.objects.filter(
                        is_profile_selectable=True
                    )
                    .order_by("name_en", "code")
                    .values_list("code", "name_en")
                ],
            }
        )


class OrganizationLogoAPIView(APIView):
    """Upload the profile logo for only the caller's linked organization."""

    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        organization = _organization_for(request.user)
        if organization is None:
            raise NotFound("This user is not linked to an organization.")

        serializer = OrganizationLogoSerializer(
            organization,
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        previous_logo = organization.logo
        serializer.save()
        if previous_logo and previous_logo.name != organization.logo.name:
            previous_logo.delete(save=False)

        return Response(serializer.data)


class OrganizationImageListCreateAPIView(ListCreateAPIView):
    """List and upload images for only the caller's linked organization."""

    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = OrganizationImageSerializer

    def _organization(self):
        organization = _organization_for(self.request.user)
        if organization is None:
            raise NotFound("This user is not linked to an organization.")
        return organization

    def get_queryset(self):
        return OrganizationImage.objects.filter(organization=self._organization())

    def perform_create(self, serializer):
        organization = self._organization()
        # Lock the owning row so concurrent uploads cannot both claim the final slot.
        with transaction.atomic():
            organization = Organization.objects.select_for_update().get(
                pk=organization.pk
            )
            if organization.profile_images.count() >= 3:
                raise ValidationError(
                    {"image": "An organization can have at most 3 images."}
                )
            serializer.save(organization=organization)


class OrganizationImageDestroyAPIView(DestroyAPIView):
    """Delete an image only when it belongs to the caller's organization."""

    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = [IsAuthenticated]
    serializer_class = OrganizationImageSerializer

    def get_queryset(self):
        organization = _organization_for(self.request.user)
        if organization is None:
            return OrganizationImage.objects.none()
        return OrganizationImage.objects.filter(organization=organization)

    def perform_destroy(self, instance):
        image = instance.image
        super().perform_destroy(instance)
        image.delete(save=False)
