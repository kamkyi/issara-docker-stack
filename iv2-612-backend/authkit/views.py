"""
WorkOS Authentication Views

This module provides authentication endpoints for WorkOS integration:

1. authkit_callback - Handles OAuth callback and creates/updates WorkOS users
2. authkit_logout - Authenticated logout that revokes WorkOS session and clears tokens
3. authkit_logout_public - Public logout endpoint for cases where JWT might be expired

Logout Endpoints:
- POST /authkit/logout/ - Requires authentication, accepts workos_user_id or email in request body
- POST /authkit/logout-public/ - No authentication required, requires workos_user_id or email in request body

Both logout endpoints perform:
1. Server-side WorkOS session revocation (if access token available)
2. Local token cleanup (access_token and refresh_token cleared)
3. Proper logging and error handling
"""

import logging
import requests
import time

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import WorkOSUser
from rest_framework_jwt.settings import api_settings
from rest_framework.settings import api_settings as drf_api_settings
from authkit import WorkOSAuthKitAuthentication
from issara.ilm_server_2.serializers import UserSerializer

logger = logging.getLogger(__name__)
User = get_user_model()

jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER
jwt_payload_handler = api_settings.JWT_PAYLOAD_HANDLER

WORKOS_API = settings.WORKOS_API


def exchange_code_for_token(code: str):
    """
    Exchange AuthKit code for tokens using WorkOS HTTP API.
    Returns user info, access_token, refresh_token, and authentication_method.
    """
    headers = {
        "Authorization": f"Bearer {settings.WORKOS_API_KEY}",
        "Content-Type": "application/json",
    }

    body = {
        "client_id": settings.WORKOS_CLIENT_ID,
        "client_secret": settings.WORKOS_API_KEY,
        "code": code,
        "grant_type": "authorization_code",
    }

    response = requests.post(WORKOS_API, json=body, headers=headers)

    if response.status_code != 200:
        error_data = (
            response.json()
            if response.headers.get("content-type") == "application/json"
            else response.text
        )
        logger.error("WorkOS token exchange failed: %s", error_data)
        raise Exception(f"WorkOS API error: {error_data}")

    data = response.json()

    return data


@api_view(["POST"])
@permission_classes([AllowAny])
def authkit_callback(request):
    """
    AuthKit callback: Exchange code → Create/Update WorkOS User → Issue JWT

    This creates a separate WorkOS user record without touching existing Django users.
    WorkOS users table serves as the central source of truth for WorkOS authentication.
    """
    code = request.data.get("code")
    if not code:
        return Response({"error": "Missing code"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        token_data = exchange_code_for_token(code)
        user_info = token_data.get("user")

        if not user_info:
            return Response({"error": "No user info in WorkOS response"}, status=400)

        workos_user_id = user_info.get("id")
        email = user_info.get("email")
        first_name = user_info.get("first_name") or ""
        last_name = user_info.get("last_name") or ""
        email_verified = user_info.get("email_verified", False)
        profile_picture_url = user_info.get("profile_picture_url", "")
        last_sign_in_at = user_info.get("last_sign_in_at")
        locale = user_info.get("locale", "")
        external_id = user_info.get("external_id")

        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        authentication_method = token_data.get("authentication_method")

        if not email or not workos_user_id:
            return Response(
                {"error": "Email and WorkOS user ID are required"}, status=400
            )

        workos_last_sign_in = None
        if last_sign_in_at:
            workos_last_sign_in = parse_datetime(last_sign_in_at)

        try:
            django_user = User.objects.get(email=email)
            django_user_created = False
        except User.DoesNotExist:
            try:
                django_user = User.objects.get(username=email)
                django_user_created = False
            except User.DoesNotExist:

                django_user = User.objects.create(
                    username=email,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=True,
                    is_staff=True,
                    is_superuser=True,
                )
                django_user_created = True

        if not django_user_created:

            django_user.first_name = first_name
            django_user.last_name = last_name
            django_user.is_active = True
            django_user.is_staff = True
            django_user.is_superuser = True
            django_user.save(
                update_fields=[
                    "first_name",
                    "last_name",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                ]
            )

        try:
            workos_user = WorkOSUser.objects.get(workos_user_id=workos_user_id)
            created = False
        except WorkOSUser.DoesNotExist:
            try:

                workos_user = WorkOSUser.objects.get(email=email)

                workos_user.workos_user_id = workos_user_id
                created = False
            except WorkOSUser.DoesNotExist:

                workos_user = WorkOSUser.objects.create(
                    workos_user_id=workos_user_id,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    email_verified=email_verified,
                    profile_picture_url=profile_picture_url,
                    locale=locale,
                    external_id=external_id,
                    authentication_method=authentication_method,
                    access_token=access_token,
                    refresh_token=refresh_token,
                    workos_last_sign_in_at=workos_last_sign_in,
                    is_active=True,
                    linked_django_user=django_user,
                )
                created = True

        if not created:

            workos_user.email = email
            workos_user.first_name = first_name
            workos_user.last_name = last_name
            workos_user.email_verified = email_verified
            workos_user.profile_picture_url = profile_picture_url
            workos_user.locale = locale
            workos_user.external_id = external_id
            workos_user.authentication_method = authentication_method
            workos_user.access_token = access_token
            workos_user.refresh_token = refresh_token
            workos_user.workos_last_sign_in_at = workos_last_sign_in
            workos_user.linked_django_user = django_user
            workos_user.save(
                update_fields=[
                    "workos_user_id",
                    "email",
                    "first_name",
                    "last_name",
                    "email_verified",
                    "profile_picture_url",
                    "locale",
                    "external_id",
                    "authentication_method",
                    "access_token",
                    "refresh_token",
                    "workos_last_sign_in_at",
                    "linked_django_user",
                ]
            )

        workos_user.update_last_login()

        from datetime import timedelta

        exp_time = timezone.now() + timedelta(days=1)

        payload = {
            "user_id": django_user.id,
            "username": django_user.username,
            "email": django_user.email,
            "exp": int(time.mktime(exp_time.timetuple())),
        }

        token = jwt_encode_handler(payload)

        return Response(
            {
                "user": {
                    "id": django_user.id,
                    "username": django_user.username,
                    "first_name": django_user.first_name,
                    "last_name": django_user.last_name,
                    "email": django_user.email,
                    "full_name": f"{django_user.first_name} {django_user.last_name}".strip(),
                    "email_verified": workos_user.email_verified,
                    "profile_picture_url": workos_user.profile_picture_url,
                    "locale": workos_user.locale,
                    "auth_source": "workos",
                    "authentication_method": workos_user.authentication_method,
                },
                "token": token,
                "workos_user_id": workos_user_id,
                "workos_access_token": access_token,
                "is_new_user": created or django_user_created,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.exception("WorkOS authentication error")
        return Response({"error": f"Authentication failed: {str(e)}"}, status=400)


def revoke_workos_token(access_token: str):
    """
    Revoke WorkOS access token on the WorkOS server.

    According to WorkOS documentation, we should call the logout endpoint
    or revoke the session using the AuthKit management API.
    """
    headers = {
        "Authorization": f"Bearer {settings.WORKOS_API_KEY}",
        "Content-Type": "application/json",
    }

    base_api = WORKOS_API.rstrip("/")
    if "/oauth/token" in base_api:

        base_url = base_api.replace("/oauth/token", "")
        revoke_url = f"{base_url}/user_management/sessions/logout"
    else:

        revoke_url = f"{base_api}/logout"

    body = {
        "session_id": access_token,
    }

    try:
        response = requests.post(revoke_url, json=body, headers=headers)

        if response.status_code in [200, 204]:
            logger.info("WorkOS session logged out successfully")
            return True
        else:
            error_data = (
                response.json()
                if response.headers.get("content-type") == "application/json"
                else response.text
            )
            logger.warning("WorkOS session logout failed: %s", error_data)
            return False

    except Exception as e:
        logger.error("Error logging out WorkOS session: %s", str(e))
        return False


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def authkit_logout(request):
    """
    WorkOS logout endpoint: Revoke tokens and deactivate user session.

    This performs server-side logout by:
    1. Revoking the WorkOS access token on WorkOS servers
    2. Clearing local access/refresh tokens
    3. Marking the user session as logged out

    Expects either:
    - workos_user_id in request data, OR
    - email in request data to find the WorkOS user, OR
    - Will attempt to use the authenticated user's email
    """
    try:

        workos_user_id = request.data.get("workos_user_id")
        email = request.data.get("email")

        if not workos_user_id and not email and hasattr(request.user, "email"):
            email = request.user.email
        elif not workos_user_id and not email and hasattr(request.user, "username"):

            email = request.user.username

        workos_user = None
        try:
            if workos_user_id:
                workos_user = WorkOSUser.objects.get(workos_user_id=workos_user_id)
            elif email:
                workos_user = WorkOSUser.objects.get(email=email)
            else:
                return Response(
                    {
                        "error": "WorkOS user identifier (workos_user_id or email) is required"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except WorkOSUser.DoesNotExist:
            return Response(
                {"error": "WorkOS user not found"}, status=status.HTTP_404_NOT_FOUND
            )

        revoke_success = True
        if workos_user.access_token:
            revoke_success = revoke_workos_token(workos_user.access_token)

        workos_user.access_token = ""
        workos_user.refresh_token = ""
        workos_user.save(update_fields=["access_token", "refresh_token"])

        logger.info(
            "WorkOS user logged out: %s (token_revoked=%s)",
            workos_user.email,
            revoke_success,
        )

        response_data = {
            "message": "Successfully logged out",
            "token_revoked": revoke_success,
            "user_email": workos_user.email,
        }

        if not revoke_success:
            response_data["warning"] = (
                "Local logout completed, but token revocation on WorkOS server failed"
            )

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception("WorkOS logout error")
        return Response(
            {"error": f"Logout failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def authkit_logout_public(request):
    """
    Public WorkOS logout endpoint that doesn't require authentication.

    This is useful for cases where the JWT token might be expired
    but the client still needs to clear the server-side session.

    Requires either workos_user_id or email in request data.
    """
    try:
        workos_user_id = request.data.get("workos_user_id")
        email = request.data.get("email")

        if not workos_user_id and not email:
            return Response(
                {"error": "Either workos_user_id or email is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if workos_user_id:
                workos_user = WorkOSUser.objects.get(workos_user_id=workos_user_id)
            else:
                workos_user = WorkOSUser.objects.get(email=email)
        except WorkOSUser.DoesNotExist:

            return Response({"message": "Logout completed"}, status=status.HTTP_200_OK)

        revoke_success = True
        if workos_user.access_token:
            revoke_success = revoke_workos_token(workos_user.access_token)

        workos_user.access_token = ""
        workos_user.refresh_token = ""
        workos_user.save(update_fields=["access_token", "refresh_token"])

        logger.info(
            "WorkOS user logged out (public): %s (token_revoked=%s)",
            workos_user.email,
            revoke_success,
        )

        return Response(
            {"message": "Logout completed", "token_revoked": revoke_success},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.exception("WorkOS public logout error")

        return Response({"message": "Logout completed"}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes(
    (WorkOSAuthKitAuthentication,)
    + tuple(drf_api_settings.DEFAULT_AUTHENTICATION_CLASSES)
)
@permission_classes([IsAuthenticated])
def authkit_user_info(request):
    """
    Look up an ILM Django user profile by email/username.

    A valid AuthKit token is required for access.
    This endpoint only queries ILM Django user tables and does not look up WorkOSUser.
    """
    request_email = ""
    if request.method in ("POST", "PUT", "PATCH"):
        request_email = request.data.get("email") or ""

    auth_email = ""
    if isinstance(request.auth, dict):
        auth_email = request.auth.get("email") or request.auth.get("upn") or ""

    lookup_email = (
        request_email
        or request.query_params.get("email")
        or getattr(request.user, "email", "")
        or getattr(request.user, "username", "")
        or auth_email
        or ""
    ).strip()
    if not lookup_email:
        return Response(
            {"error": "Email is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    django_user = (
        User.objects.filter(
            Q(email__iexact=lookup_email) | Q(username__iexact=lookup_email)
        )
        .select_related(
            "strategic_partner_user__strategic_partner",
            "supplier_user__supplier",
            "organization_user__organization",
        )
        .prefetch_related("groups")
        .first()
    )
    if not django_user:
        return Response(
            {"error": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(UserSerializer(django_user).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def authkit_health(request):
    """
    Lightweight health check for AuthKit endpoints.
    """
    return Response({"status": "ok"}, status=status.HTTP_200_OK)
