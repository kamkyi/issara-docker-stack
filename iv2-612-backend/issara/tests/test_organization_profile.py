import io
import tempfile

from django.contrib.auth.models import User
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIRequestFactory, force_authenticate
from PIL import Image

from issara.cascade.views import (
    OrganizationImageDestroyAPIView,
    OrganizationImageListCreateAPIView,
    OrganizationLogoAPIView,
    OrganizationProfileAPIView,
    OrganizationProfileOptionsAPIView,
)

from issara.ilm_server_2.models import (
    Country,
    Language,
    Organization,
    OrganizationImage,
    OrganizationNaceCode,
    UserOrganization,
)
from issara.ilm_server_2.serializers import OrganizationProfileSerializer


class OrganizationProfileSerializerTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="WageIndicator")
        self.thailand = Country.objects.create(name="Thailand")
        self.nepal = Country.objects.create(name="Nepal")
        self.english, _ = Language.objects.update_or_create(
            code="en",
            defaults={
                "name": "English",
                "name_en": "English",
                "is_profile_selectable": True,
            },
        )
        self.thai, _ = Language.objects.update_or_create(
            code="th",
            defaults={
                "name": "ไทย",
                "name_en": "Thai",
                "is_profile_selectable": True,
            },
        )

    def test_profile_defaults_to_empty(self):
        data = OrganizationProfileSerializer(self.organization).data

        self.assertEqual(data["name"], "WageIndicator")
        self.assertIsNone(data["logo"])
        self.assertIsNone(data["organization_type"])
        self.assertEqual(data["core_focus_areas"], [])
        self.assertEqual(data["stakeholder_groups"], [])
        self.assertEqual(data["nace_codes"], [])

    def test_update_writes_every_profile_field(self):
        serializer = OrganizationProfileSerializer(
            self.organization,
            data={
                "description": "Wage transparency for migrant workers.",
                "website": "https://wageindicator.org",
                "organization_type": "international_ngo",
                "countries_of_registration": [self.nepal.id],
                "countries_of_operation": [self.thailand.id, self.nepal.id],
                "languages_supported": ["en", "th"],
                "core_focus_areas": ["living_wage", "forced_labor"],
                "stakeholder_groups": ["cross_border_migrant_workers"],
                "nace_codes": ["A", "02.20"],
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        organization = serializer.save()

        self.assertEqual(organization.organization_type, "international_ngo")
        self.assertEqual(
            list(organization.countries_of_registration.values_list("id", flat=True)),
            [self.nepal.id],
        )
        self.assertEqual(organization.countries_of_operation.count(), 2)
        self.assertEqual(
            sorted(organization.languages_supported.values_list("code", flat=True)),
            ["en", "th"],
        )
        self.assertEqual(
            sorted(organization.core_focus_areas.values_list("focus_area", flat=True)),
            ["forced_labor", "living_wage"],
        )
        self.assertEqual(
            sorted(organization.nace_codes.values_list("code", flat=True)),
            ["02.20", "A"],
        )

    def test_set_valued_fields_are_replaced_not_appended(self):
        OrganizationNaceCode.objects.create(organization=self.organization, code="A")

        serializer = OrganizationProfileSerializer(
            self.organization, data={"nace_codes": ["02.20"]}, partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        organization = serializer.save()

        self.assertEqual(
            list(organization.nace_codes.values_list("code", flat=True)), ["02.20"]
        )

    def test_omitted_set_valued_field_is_left_alone(self):
        OrganizationNaceCode.objects.create(organization=self.organization, code="A")

        serializer = OrganizationProfileSerializer(
            self.organization, data={"description": "Unchanged sectors."}, partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        organization = serializer.save()

        self.assertEqual(
            list(organization.nace_codes.values_list("code", flat=True)), ["A"]
        )

    def test_duplicate_selections_are_collapsed(self):
        serializer = OrganizationProfileSerializer(
            self.organization,
            data={"nace_codes": ["A", "A", "02.20"]},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        organization = serializer.save()

        self.assertEqual(organization.nace_codes.count(), 2)

    def test_malformed_nace_code_is_rejected(self):
        serializer = OrganizationProfileSerializer(
            self.organization, data={"nace_codes": ["A2.2.0"]}, partial=True
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("nace_codes", serializer.errors)

    def test_unknown_focus_area_is_rejected(self):
        serializer = OrganizationProfileSerializer(
            self.organization, data={"core_focus_areas": ["space_travel"]}, partial=True
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("core_focus_areas", serializer.errors)

    def test_general_workers_is_a_valid_stakeholder_group(self):
        serializer = OrganizationProfileSerializer(
            self.organization,
            data={"stakeholder_groups": ["general_workers"]},
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        organization = serializer.save()
        self.assertEqual(
            list(
                organization.stakeholder_groups.values_list(
                    "stakeholder_group", flat=True
                )
            ),
            ["general_workers"],
        )

    def test_operational_only_language_is_not_valid_for_a_profile(self):
        Language.objects.update_or_create(
            code="mm",
            defaults={
                "name": "Burmese",
                "name_en": "Burmese",
                "is_operational": True,
                "is_profile_selectable": False,
            },
        )
        serializer = OrganizationProfileSerializer(
            self.organization,
            data={"languages_supported": ["mm"]},
            partial=True,
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("languages_supported", serializer.errors)


class OrganizationProfileAPITests(TestCase):
    """Views are exercised directly, as elsewhere in this suite: the debug
    toolbar middleware is active under the local settings and breaks full
    request/response cycles in tests."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.profile_view = OrganizationProfileAPIView.as_view()
        self.options_view = OrganizationProfileOptionsAPIView.as_view()
        self.url = reverse("cascade-organization-profile")

        self.organization = Organization.objects.create(name="WageIndicator")
        self.other_organization = Organization.objects.create(name="Pourakhi Nepal")

        self.user = User.objects.create_user(username="cso@example.org")
        UserOrganization.objects.create(
            user=self.user, organization=self.organization
        )

    def _get(self, user=None):
        request = self.factory.get(self.url)
        if user is not None:
            force_authenticate(request, user=user)
        return self.profile_view(request)

    def _patch(self, data, user=None):
        request = self.factory.patch(self.url, data, format="json")
        if user is not None:
            force_authenticate(request, user=user)
        return self.profile_view(request)

    def test_urls_are_wired(self):
        self.assertEqual(self.url, "/cascade/organizations/me/")
        self.assertEqual(
            reverse("cascade-organization-profile-options"),
            "/cascade/organizations/profile-options/",
        )

    def test_requires_authentication(self):
        # 403 rather than 401: no configured authenticator sets a
        # WWW-Authenticate header, so DRF reports permission denied.
        self.assertEqual(self._get().status_code, 403)

    def test_returns_the_callers_own_organization(self):
        response = self._get(user=self.user)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.organization.id)
        self.assertEqual(response.data["name"], "WageIndicator")

    def test_user_without_an_organization_gets_404(self):
        unlinked = User.objects.create_user(username="unlinked@example.org")

        self.assertEqual(self._get(user=unlinked).status_code, 404)

    def test_patch_updates_only_the_callers_organization(self):
        response = self._patch(
            {
                "organization_type": "national_ngo",
                "core_focus_areas": ["gender"],
                "nace_codes": ["C"],
            },
            user=self.user,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["organization_type"], "national_ngo")
        self.assertEqual(response.data["core_focus_areas"], ["gender"])
        self.assertEqual(response.data["nace_codes"], ["C"])

        self.other_organization.refresh_from_db()
        self.assertIsNone(self.other_organization.organization_type)

    def test_patch_rejects_a_malformed_nace_code(self):
        response = self._patch({"nace_codes": ["A2.2.0"]}, user=self.user)

        self.assertEqual(response.status_code, 400)
        self.assertIn("nace_codes", response.data)

    def test_name_is_editable(self):
        # The profile form carries Organization Name as an editable required
        # field, so a CSO can correct its own organization's name.
        response = self._patch({"name": "WageIndicator Foundation"}, user=self.user)

        self.assertEqual(response.status_code, 200)
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.name, "WageIndicator Foundation")

    def test_options_endpoint_lists_the_vocabularies(self):
        request = self.factory.get(reverse("cascade-organization-profile-options"))
        force_authenticate(request, user=self.user)

        response = self.options_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["organization_types"]), 6)
        self.assertEqual(len(response.data["core_focus_areas"]), 7)
        self.assertEqual(len(response.data["stakeholder_groups"]), 8)
        self.assertEqual(
            response.data["stakeholder_groups"][-1],
            {"value": "general_workers", "label": "General workers"},
        )
        self.assertEqual(
            response.data["core_focus_areas"][0],
            {"value": "human_rights", "label": "Human rights"},
        )

    def test_options_endpoint_lists_languages_from_the_reference_table(self):
        Language.objects.update_or_create(
            code="th",
            defaults={
                "name": "ไทย",
                "name_en": "Thai",
                "is_profile_selectable": True,
            },
        )
        Language.objects.update_or_create(
            code="en",
            defaults={
                "name": "English",
                "name_en": "English",
                "is_profile_selectable": True,
            },
        )
        Language.objects.update_or_create(
            code="mm",
            defaults={
                "name": "Burmese",
                "name_en": "Burmese",
                "is_operational": True,
                "is_profile_selectable": False,
            },
        )
        Language.objects.update_or_create(
            code="fr",
            defaults={
                "name": "French",
                "name_en": "French",
                "is_operational": False,
                "is_profile_selectable": True,
            },
        )
        Language.objects.update_or_create(
            code="my",
            defaults={
                "name": "Burmese",
                "name_en": "Burmese",
                "is_operational": False,
                "is_profile_selectable": True,
            },
        )

        request = self.factory.get(reverse("cascade-organization-profile-options"))
        force_authenticate(request, user=self.user)

        with self.assertNumQueries(1):
            response = self.options_view(request)

        languages = response.data["languages"]
        self.assertIn({"value": "en", "label": "English"}, languages)
        self.assertIn({"value": "fr", "label": "French"}, languages)
        self.assertIn({"value": "my", "label": "Burmese"}, languages)
        self.assertNotIn({"value": "mm", "label": "Burmese"}, languages)


class OrganizationImageAPITests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.list_view = OrganizationImageListCreateAPIView.as_view()
        self.detail_view = OrganizationImageDestroyAPIView.as_view()
        self.organization = Organization.objects.create(name="WageIndicator")
        self.other_organization = Organization.objects.create(name="Other CSO")
        self.user = User.objects.create_user(username="images@example.org")
        UserOrganization.objects.create(user=self.user, organization=self.organization)

        # The production field uses S3 explicitly; API tests keep files isolated
        # locally and never contact external storage.
        self.temp_media = tempfile.TemporaryDirectory()
        image_field = OrganizationImage._meta.get_field("image")
        self.original_storage = image_field.storage
        image_field.storage = FileSystemStorage(location=self.temp_media.name)

    def tearDown(self):
        OrganizationImage._meta.get_field("image").storage = self.original_storage
        self.temp_media.cleanup()

    def _image(self, name="organization.png"):
        # Valid 1x1 PNG, sufficient for DRF ImageField/Pillow validation.
        content = io.BytesIO()
        Image.new("RGB", (1, 1), color="white").save(content, format="PNG")
        return SimpleUploadedFile(
            name,
            content.getvalue(),
            content_type="image/png",
        )

    def _request(self, method, user=None, data=None):
        url = reverse("cascade-organization-images")
        request = getattr(self.factory, method)(url, data=data, format="multipart")
        if user is not None:
            force_authenticate(request, user=user)
        return self.list_view(request)

    def test_image_urls_are_wired(self):
        self.assertEqual(
            reverse("cascade-organization-images"),
            "/cascade/organizations/me/images/",
        )
        self.assertEqual(
            reverse("cascade-organization-image-detail", kwargs={"pk": 9}),
            "/cascade/organizations/me/images/9/",
        )

    def test_list_requires_authentication(self):
        self.assertEqual(self._request("get").status_code, 403)

    def test_upload_and_list_are_scoped_to_callers_organization(self):
        OrganizationImage.objects.create(
            organization=self.other_organization, image="organizations/other.jpg"
        )
        response = self._request(
            "post", user=self.user, data={"image": self._image()}
        )
        self.assertEqual(response.status_code, 201, response.data)
        created = OrganizationImage.objects.get(pk=response.data["id"])
        self.assertEqual(created.organization, self.organization)

        response = self._request("get", user=self.user)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [row["id"] for row in response.data["results"]], [created.id]
        )

    def test_fourth_image_is_rejected(self):
        for index in range(3):
            OrganizationImage.objects.create(
                organization=self.organization, image=f"organizations/{index}.jpg"
            )

        response = self._request(
            "post", user=self.user, data={"image": self._image("fourth.png")}
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.organization.profile_images.count(), 3)

    def test_cannot_delete_another_organizations_image(self):
        other_image = OrganizationImage.objects.create(
            organization=self.other_organization, image="organizations/other.jpg"
        )
        request = self.factory.delete(
            reverse("cascade-organization-image-detail", kwargs={"pk": other_image.id})
        )
        force_authenticate(request, user=self.user)

        response = self.detail_view(request, pk=other_image.id)

        self.assertEqual(response.status_code, 404)
        self.assertTrue(OrganizationImage.objects.filter(pk=other_image.id).exists())

    def test_deletes_own_image(self):
        image = OrganizationImage.objects.create(
            organization=self.organization, image="organizations/own.jpg"
        )
        request = self.factory.delete(
            reverse("cascade-organization-image-detail", kwargs={"pk": image.id})
        )
        force_authenticate(request, user=self.user)

        response = self.detail_view(request, pk=image.id)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(OrganizationImage.objects.filter(pk=image.id).exists())


class OrganizationLogoAPITests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = OrganizationLogoAPIView.as_view()
        self.url = reverse("cascade-organization-logo")
        self.organization = Organization.objects.create(name="WageIndicator")
        self.other_organization = Organization.objects.create(name="Other CSO")
        self.user = User.objects.create_user(username="logo@example.org")
        UserOrganization.objects.create(user=self.user, organization=self.organization)

        self.temp_media = tempfile.TemporaryDirectory()
        logo_field = Organization._meta.get_field("logo")
        self.original_storage = logo_field.storage
        logo_field.storage = FileSystemStorage(location=self.temp_media.name)

    def tearDown(self):
        Organization._meta.get_field("logo").storage = self.original_storage
        self.temp_media.cleanup()

    def _image(self, name="logo.png"):
        content = io.BytesIO()
        Image.new("RGB", (2, 1), color="teal").save(content, format="PNG")
        return SimpleUploadedFile(
            name,
            content.getvalue(),
            content_type="image/png",
        )

    def _post(self, data, user=None):
        request = self.factory.post(self.url, data=data, format="multipart")
        if user is not None:
            force_authenticate(request, user=user)
        return self.view(request)

    def test_logo_url_is_wired(self):
        self.assertEqual(self.url, "/cascade/organizations/me/logo/")

    def test_upload_requires_authentication(self):
        self.assertEqual(self._post({"logo": self._image()}).status_code, 403)

    def test_upload_is_scoped_to_callers_organization(self):
        response = self._post(
            {
                "logo": self._image(),
                "organization": self.other_organization.id,
            },
            user=self.user,
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.organization.refresh_from_db()
        self.other_organization.refresh_from_db()
        self.assertTrue(self.organization.logo.name.startswith("organizations/"))
        self.assertIsNotNone(response.data["logo"])
        self.assertFalse(bool(self.other_organization.logo))

    def test_upload_replaces_and_deletes_the_previous_logo(self):
        first_response = self._post({"logo": self._image("first.png")}, self.user)
        self.assertEqual(first_response.status_code, 200, first_response.data)
        self.organization.refresh_from_db()
        first_name = self.organization.logo.name
        storage = self.organization.logo.storage
        self.assertTrue(storage.exists(first_name))

        second_response = self._post(
            {"logo": self._image("second.png")}, self.user
        )

        self.assertEqual(second_response.status_code, 200, second_response.data)
        self.organization.refresh_from_db()
        self.assertNotEqual(self.organization.logo.name, first_name)
        self.assertFalse(storage.exists(first_name))

    def test_invalid_file_type_is_rejected(self):
        text_file = SimpleUploadedFile(
            "logo.txt", b"not an image", content_type="text/plain"
        )

        response = self._post({"logo": text_file}, self.user)

        self.assertEqual(response.status_code, 400)
        self.assertIn("logo", response.data)

    def test_user_without_an_organization_gets_404(self):
        unlinked = User.objects.create_user(username="unlinked-logo@example.org")

        response = self._post({"logo": self._image()}, unlinked)

        self.assertEqual(response.status_code, 404)
