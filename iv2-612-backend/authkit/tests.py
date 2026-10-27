"""
Tests for WorkOS authentication views
"""

from types import SimpleNamespace
from unittest.mock import patch, Mock
from django.test import SimpleTestCase, TestCase
from django.test import override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import exceptions
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework import status
from .authentication import WorkOSAuthKitAuthentication
from .models import WorkOSUser
from .supplier_agreements import enforce_supplier_agreement
from issara.ilm_server_2.models import Supplier, SupplierLicenseAgreement

User = get_user_model()


class SupplierAgreementPolicyTests(SimpleTestCase):
    @patch("authkit.supplier_agreements.supplier_has_active_agreement")
    def test_supplier_without_active_agreement_is_blocked(self, has_agreement):
        has_agreement.return_value = False

        with self.assertRaises(exceptions.PermissionDenied):
            enforce_supplier_agreement(
                {"sub": "user_supplier", "role": "org-supplier"},
                "/api/v2/supplierkpis/",
            )

        has_agreement.assert_called_once_with("user_supplier")

    @patch("authkit.supplier_agreements.supplier_has_active_agreement")
    def test_supplier_with_active_agreement_is_allowed(self, has_agreement):
        has_agreement.return_value = True

        enforce_supplier_agreement(
            {"sub": "user_supplier", "role": "org-supplier"},
            "/api/v2/supplierkpis/",
        )

    @patch("authkit.supplier_agreements.supplier_has_active_agreement")
    def test_non_supplier_and_authkit_paths_are_exempt(self, has_agreement):
        enforce_supplier_agreement(
            {"sub": "user_partner", "role": "org-strategic-partner"},
            "/api/v2/supplierkpis/",
        )
        enforce_supplier_agreement(
            {"sub": "user_supplier", "role": "org-supplier"},
            "/authkit/user-info/",
        )

        has_agreement.assert_not_called()


@override_settings(SUPPLIER_AGREEMENT_VERSION="cascade-full-access-v1.0")
class SupplierAgreementAccessTests(TestCase):
    def setUp(self):
        self.supplier = Supplier.objects.create(name="Supplier One")
        self.claims = {"sub": "user_supplier", "role": "org-supplier"}

    def make_agreement(self, **kwargs):
        defaults = {
            "supplier": self.supplier,
            "signer_name": "Supplier User",
            "signer_email": "supplier@example.test",
            "signer_workos_user_id": "user_supplier",
            "agreement_version": "cascade-full-access-v1.0",
            "agreement_text": "Agreement text",
            "agreement_text_hash": "a" * 64,
            "signed_at": timezone.now(),
        }
        defaults.update(kwargs)
        return SupplierLicenseAgreement.objects.create(**defaults)

    def assert_agreement_required(self, claims=None):
        with self.assertRaises(exceptions.PermissionDenied) as caught:
            enforce_supplier_agreement(
                claims or self.claims,
                "/api/v2/supplierkpis/",
            )
        self.assertEqual(
            caught.exception.detail["code"],
            "supplier_agreement_required",
        )

    def test_active_agreement_allows_supplier_dashboard_access(self):
        self.make_agreement()

        enforce_supplier_agreement(self.claims, "/api/v2/supplierkpis/")

    def test_other_supplier_users_do_not_inherit_the_agreement(self):
        self.make_agreement()

        self.assert_agreement_required(
            {"sub": "user_other", "role": "org-supplier"}
        )

    def test_revoked_agreement_blocks_dashboard_access(self):
        self.make_agreement(revoked_at=timezone.now())

        self.assert_agreement_required()

    def test_deleted_agreement_blocks_dashboard_access(self):
        agreement = self.make_agreement()
        agreement.delete()

        self.assert_agreement_required()

    def test_non_supplier_roles_are_not_checked(self):
        for role in (
            "org-issara-staff",
            "org-global-partner",
            "org-strategic-partner",
            "org-recruitment-agency",
            "org-cso",
        ):
            enforce_supplier_agreement(
                {"sub": "user_without_agreement", "role": role},
                "/api/v2/supplierkpis/",
            )

    def test_authentication_endpoints_remain_available_for_supplier(self):
        enforce_supplier_agreement(self.claims, "/authkit/user-info/")


class WorkOSLogoutTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.workos_user = WorkOSUser.objects.create(
            workos_user_id="user_test_123",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            access_token="test_access_token_123",
            refresh_token="test_refresh_token_123",
            is_active=True,
        )

    @patch("authkit.views.revoke_workos_token")
    def test_workos_logout_public_with_email(self, mock_revoke):
        """Test public logout endpoint with email"""
        mock_revoke.return_value = True

        data = {"email": "test@example.com"}

        response = self.client.post("/authkit/logout-public/", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Logout completed")
        self.assertTrue(response.data["token_revoked"])

        self.workos_user.refresh_from_db()
        self.assertEqual(self.workos_user.access_token, "")
        self.assertEqual(self.workos_user.refresh_token, "")

    @patch("authkit.views.revoke_workos_token")
    def test_workos_logout_public_with_workos_user_id(self, mock_revoke):
        """Test public logout endpoint with workos_user_id"""
        mock_revoke.return_value = True

        data = {"workos_user_id": "user_test_123"}

        response = self.client.post("/authkit/logout-public/", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Logout completed")

        self.workos_user.refresh_from_db()
        self.assertEqual(self.workos_user.access_token, "")
        self.assertEqual(self.workos_user.refresh_token, "")

    def test_workos_logout_public_missing_identifier(self):
        """Test public logout endpoint without required identifiers"""
        response = self.client.post("/authkit/logout-public/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_workos_logout_public_user_not_found(self):
        """Test public logout endpoint with non-existent user"""
        data = {"email": "nonexistent@example.com"}

        response = self.client.post("/authkit/logout-public/", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Logout completed")

    @patch("authkit.views.revoke_workos_token")
    def test_workos_logout_token_revocation_failure(self, mock_revoke):
        """Test logout behavior when WorkOS token revocation fails"""
        mock_revoke.return_value = False

        data = {"email": "test@example.com"}

        response = self.client.post("/workos/logout-public/", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Logout completed")
        self.assertFalse(response.data["token_revoked"])

        self.workos_user.refresh_from_db()
        self.assertEqual(self.workos_user.access_token, "")
        self.assertEqual(self.workos_user.refresh_token, "")


class WorkOSTokenRevocationTestCase(TestCase):
    @patch("authkit.views.requests.post")
    @patch("authkit.views.settings")
    def test_revoke_workos_token_success(self, mock_settings, mock_post):
        """Test successful token revocation"""
        from authkit.views import revoke_workos_token

        mock_settings.WORKOS_API_KEY = "test_api_key"
        mock_settings.WORKOS_API = "https://api.workos.com/oauth/token"

        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        result = revoke_workos_token("test_access_token")

        self.assertTrue(result)
        self.assertTrue(mock_post.called)

    @patch("authkit.views.requests.post")
    @patch("authkit.views.settings")
    def test_revoke_workos_token_failure(self, mock_settings, mock_post):
        """Test failed token revocation"""
        from authkit.views import revoke_workos_token

        mock_settings.WORKOS_API_KEY = "test_api_key"
        mock_settings.WORKOS_API = "https://api.workos.com/oauth/token"

        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.headers.get.return_value = "application/json"
        mock_response.json.return_value = {"error": "Invalid token"}
        mock_post.return_value = mock_response

        result = revoke_workos_token("invalid_token")

        self.assertFalse(result)
        self.assertTrue(mock_post.called)


class AuthKitUserInfoTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="user1@example.com",
            email="user1@example.com",
            password="secret123",
        )
        self.other_user = User.objects.create_user(
            username="user2@example.com",
            email="user2@example.com",
            password="secret123",
        )

    def test_user_info_lookup_by_input_email(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/authkit/user-info/", {"email": "user2@example.com"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.other_user.id)
        self.assertEqual(response.data["email"], "user2@example.com")
        self.assertNotIn("exists", response.data)
        self.assertNotIn("roles", response.data)
        self.assertNotIn("user", response.data)

    def test_user_info_lookup_by_query_email_with_get(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/authkit/user-info/?email=user2@example.com")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.other_user.id)
        self.assertEqual(response.data["email"], "user2@example.com")

    def test_user_info_falls_back_to_authenticated_user_email(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/authkit/user-info/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["email"], "user1@example.com")

    def test_user_info_returns_404_when_not_found(self):
        token_user = SimpleNamespace(is_authenticated=True, email="user1@example.com")
        self.client.force_authenticate(user=token_user)

        response = self.client.post(
            "/authkit/user-info/", {"email": "missing@example.com"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "User not found.")
        self.assertNotIn("exists", response.data)


class WorkOSAuthHeaderParsingTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth = WorkOSAuthKitAuthentication()

    def test_get_header_accepts_lowercase_bearer(self):
        request = self.factory.get(
            "/api/v2/nationalities/",
            HTTP_AUTHORIZATION="bearer test.lowercase.token",
        )

        token = self.auth.get_header(request)

        self.assertEqual(token, "test.lowercase.token")

    def test_get_header_accepts_mixed_case_bearer(self):
        request = self.factory.get(
            "/api/v2/nationalities/",
            HTTP_AUTHORIZATION="BeArEr test.mixedcase.token",
        )

        token = self.auth.get_header(request)

        self.assertEqual(token, "test.mixedcase.token")

    def test_get_header_rejects_non_bearer_scheme(self):
        request = self.factory.get(
            "/api/v2/nationalities/",
            HTTP_AUTHORIZATION="Token should.not.pass",
        )

        token = self.auth.get_header(request)

        self.assertIsNone(token)
