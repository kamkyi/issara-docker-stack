import logging
import time
import requests
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import authentication, exceptions

from issara.middleware import log_access_event

from .supplier_agreements import enforce_supplier_agreement

# Basic in-process cache for JWKS responses (refresh every 4h by default)
_JWKS_CACHE = {"ttl": 4 * 3600, "by_url": {}}
logger = logging.getLogger(__name__)


def _get_jwks(url, force=False):
    if not url:
        return []

    now = int(time.time())
    cache_entry = _JWKS_CACHE["by_url"].get(url)
    if force or not cache_entry or now - cache_entry["fetched_at"] > _JWKS_CACHE["ttl"]:
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        _JWKS_CACHE["by_url"][url] = {
            "keys": resp.json().get("keys", []),
            "fetched_at": now,
        }
        cache_entry = _JWKS_CACHE["by_url"][url]
    return cache_entry["keys"]


def _find_key(kid, keys):
    for k in keys:
        if k.get("kid") == kid:
            return k
    return None


def _fetch_workos_user_email(user_id):
    """
    Fallback email resolver for AuthKit access tokens that don't include `email`.
    """
    if not user_id or not settings.WORKOS_API_KEY:
        return None

    url = f"https://api.workos.com/user_management/users/{user_id}"
    headers = {"Authorization": f"Bearer {settings.WORKOS_API_KEY}"}

    try:
        resp = requests.get(url, headers=headers, timeout=8)
        if resp.status_code != 200:
            logger.warning(
                "WorkOS user lookup failed for %s (status=%s)",
                user_id,
                resp.status_code,
            )
            return None

        data = resp.json()
        return data.get("email")
    except Exception as exc:
        logger.warning("WorkOS user lookup error for %s: %s", user_id, exc)
        return None


def _userinfo_urls_from_issuer(issuer):
    explicit_url = (getattr(settings, "WORKOS_USERINFO_URL", "") or "").strip()
    if explicit_url:
        return [explicit_url]

    if not issuer:
        return [
            "https://api.workos.com/user_management/userinfo",
            "https://api.workos.com/oauth2/userinfo",
        ]

    issuer = issuer.rstrip("/")
    base_url = "https://api.workos.com"
    if "/user_management/" in issuer:
        base_url = issuer.rsplit("/user_management/", 1)[0]

    return [
        f"{base_url}/user_management/userinfo",
        f"{base_url}/oauth2/userinfo",
    ]


def _fetch_email_from_userinfo(access_token, issuer):
    """
    Try OIDC-style userinfo endpoints with the bearer access token.
    """
    if not access_token:
        return None

    headers = {"Authorization": f"Bearer {access_token}"}

    for url in _userinfo_urls_from_issuer(issuer):
        try:
            # WorkOS Connect/AuthKit userinfo is typically POST /oauth2/userinfo.
            for method in ("post", "get"):
                request_fn = getattr(requests, method)
                resp = request_fn(url, headers=headers, timeout=8)
                if resp.status_code != 200:
                    continue

                data = resp.json()
                email = data.get("email")
                if not email and isinstance(data.get("user"), dict):
                    email = data["user"].get("email")
                if email:
                    return email
        except Exception:
            continue

    return None


def _issuer_client_id(issuer):
    if not issuer:
        return ""
    issuer = issuer.rstrip("/")
    if "/user_management/" not in issuer:
        return ""
    return issuer.rsplit("/user_management/", 1)[-1]


ISSARA_INTERNAL_ROLE_SLUGS = ("org-issara-staff", "org-issara-management")


def _token_has_issara_role(claims) -> bool:
    """True when the validated JWT carries an Issara internal role slug."""
    role = claims.get("role")
    roles = claims.get("roles") or []
    if isinstance(role, str) and role in ISSARA_INTERNAL_ROLE_SLUGS:
        return True
    if isinstance(roles, (list, tuple)):
        return any(r in ISSARA_INTERNAL_ROLE_SLUGS for r in roles if isinstance(r, str))
    return False


def _resolve_django_user(claims, user_id, email, ilm_user_id_hint=None):
    """
    Resolve to an ILM Django user when possible so existing group-based
    view logic keeps working with AuthKit tokens. `ilm_user_id_hint` is the
    value of the `X-ILM-User-Id` request header (already verified to come
    alongside a JWT-validated internal-role token; see `get_user`).
    """
    UserModel = get_user_model()

    # 1) Direct numeric user id hints. The `X-ILM-User-Id` header hint is
    # honoured here only when the validated JWT carries an Issara internal
    # role slug — preventing privilege escalation from non-staff tokens.
    candidate_ids = []
    for raw in (claims.get("user_id"), user_id):
        if isinstance(raw, int):
            candidate_ids.append(raw)
        elif isinstance(raw, str) and raw.isdigit():
            candidate_ids.append(int(raw))
    if ilm_user_id_hint is not None and _token_has_issara_role(claims):
        candidate_ids.append(ilm_user_id_hint)
    if candidate_ids:
        user = UserModel.objects.filter(id__in=candidate_ids).first()
        if user:
            return user

    # 2) Link through WorkOS user profile.
    workos_profile = None
    workos_user_id = claims.get("sub") or user_id
    if workos_user_id:
        try:
            from authkit.models import WorkOSUser

            workos_profile = (
                WorkOSUser.objects.select_related("linked_django_user")
                .filter(workos_user_id=str(workos_user_id))
                .first()
            )
            if workos_profile and workos_profile.linked_django_user:
                return workos_profile.linked_django_user
        except Exception as exc:
            logger.debug("WorkOS->Django user resolution failed: %s", exc)

    # 3) Email/username lookup. Fall back to the WorkOSUser row's stored
    # email when the JWT carries no email (common for AuthKit access tokens),
    # and persist the resulting link so subsequent requests skip this path.
    identifiers = []
    for raw in (
        email,
        claims.get("email"),
        claims.get("upn"),
        claims.get("preferred_username"),
        claims.get("username"),
        getattr(workos_profile, "email", None) if workos_profile else None,
    ):
        value = (raw or "").strip()
        if value and value not in identifiers:
            identifiers.append(value)

    for identifier in identifiers:
        user = UserModel.objects.filter(
            Q(email__iexact=identifier) | Q(username__iexact=identifier)
        ).first()
        if user:
            if workos_profile and not workos_profile.linked_django_user_id:
                try:
                    workos_profile.linked_django_user = user
                    workos_profile.save(update_fields=["linked_django_user"])
                except Exception as exc:
                    logger.debug(
                        "Failed to auto-link WorkOS profile %s -> django user %s: %s",
                        workos_profile.workos_user_id,
                        user.id,
                        exc,
                    )
            return user

    return None


def _jwks_urls_from_issuer(issuer):
    """
    Build fallback JWKS URL candidates from token issuer.
    """
    if not issuer:
        return []

    issuer = issuer.rstrip("/")
    if "/user_management/" not in issuer:
        return []

    base_url, client_id = issuer.rsplit("/user_management/", 1)
    if not client_id:
        return []

    return [
        f"{base_url}/sso/jwks/{client_id}",
        f"{base_url}/user_management/jwks/{client_id}",
        f"{issuer}/jwks",
    ]


def _candidate_jwks_urls(token_issuer):
    urls = []
    configured = getattr(settings, "WORKOS_JWKS_URL", "")
    if configured:
        urls.append(configured)

    urls.extend(_jwks_urls_from_issuer(token_issuer))

    # Preserve order, remove duplicates.
    deduped = []
    seen = set()
    for url in urls:
        if url and url not in seen:
            deduped.append(url)
            seen.add(url)
    return deduped


def _resolve_signing_key(kid, token_issuer):
    """
    Find the signing key by trying configured + issuer-derived JWKS URLs.
    """
    attempted = []
    urls = _candidate_jwks_urls(token_issuer)

    for url in urls:
        try:
            keys = _get_jwks(url)
            key = _find_key(kid, keys)
            attempted.append(url)
            if key:
                return key, attempted
        except Exception as exc:
            logger.warning("JWKS fetch failed for %s: %s", url, exc)
            attempted.append(url)

    # One forced refresh pass for rotated keys.
    for url in urls:
        try:
            keys = _get_jwks(url, force=True)
            key = _find_key(kid, keys)
            if key:
                return key, attempted
        except Exception:
            continue

    return None, attempted


class WorkOSAuthKitAuthentication(authentication.BaseAuthentication):
    """
    DRF authentication class that:
    - extracts Bearer token
    - verifies RS256 signature using WorkOS client-scoped JWKS
    - validates issuer (`iss`) and expiration (`exp`)
    - attaches a lightweight request.user
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            unverified_header = jwt.get_unverified_header(raw_token)
        except JWTError as exc:
            raise exceptions.AuthenticationFailed(f"Invalid JWT header: {exc}")

        # Only process WorkOS-style RS256 tokens.
        if "kid" not in unverified_header or unverified_header.get("alg") != "RS256":
            return None

        expected_iss = (getattr(settings, "WORKOS_ISSUER", "") or "").rstrip("/")
        if not expected_iss:
            # Keep legacy auth stable when WorkOS is not configured.
            return None

        try:
            jwt.get_unverified_claims(raw_token)
        except JWTError:
            # Not a claims shape we can safely treat as WorkOS; allow fallback auth.
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
        except exceptions.AuthenticationFailed as exc:
            log_access_event(
                "login_failure",
                request=request,
                auth_method="workos",
                reason=str(exc),
            )
            raise

        user = self.get_user(validated_token, raw_token, request=request)
        enforce_supplier_agreement(validated_token, request.path)
        return (
            user,
            validated_token,
        )

    def get_header(self, request):
        raw_auth = authentication.get_authorization_header(request)
        if not raw_auth:
            return None  # let other auth backends run, or be unauthenticated

        try:
            auth = raw_auth.decode("utf-8").strip()
        except UnicodeDecodeError:
            return None

        parts = auth.split(None, 1)
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None  # let other auth backends run, or be unauthenticated

        return parts[1].strip()

    def get_raw_token(self, header):
        return header

    def get_validated_token(self, token):
        expected_iss = (getattr(settings, "WORKOS_ISSUER", "") or "").rstrip("/")

        # 1) Read header to get KID
        try:
            header = jwt.get_unverified_header(token)
            kid = header.get("kid")
            if not kid:
                raise exceptions.AuthenticationFailed("Missing 'kid' in token header.")
            unverified_claims = jwt.get_unverified_claims(token)
            token_iss = unverified_claims.get("iss")
        except JWTError as e:
            raise exceptions.AuthenticationFailed(f"Invalid JWT header: {e}")

        if not expected_iss:
            raise exceptions.AuthenticationFailed("WORKOS_ISSUER is not configured.")
        if not token_iss:
            raise exceptions.AuthenticationFailed(
                "Token is missing issuer (iss) claim."
            )

        token_iss = token_iss.rstrip("/")
        decode_issuer = expected_iss if token_iss == expected_iss else token_iss

        # 2) Resolve key from JWKS (with one automatic refresh on miss)
        key, attempted_jwks_urls = _resolve_signing_key(kid, token_iss)
        if not key:
            attempted_urls = (
                ", ".join(attempted_jwks_urls) if attempted_jwks_urls else "none"
            )
            raise exceptions.AuthenticationFailed(
                f"Unknown signing key (kid). Tried JWKS URLs: {attempted_urls}"
            )

        # 3) Verify & decode
        try:
            claims = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                issuer=decode_issuer,
                options={
                    "verify_aud": False,  # WorkOS access tokens typically don’t set 'aud'
                },
            )
        except ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Token expired.")
        except JWTError as e:
            raise exceptions.AuthenticationFailed(f"Invalid token: {e}")

        return claims

    def get_user(self, validated_token, raw_token=None, request=None):
        # 4) Build request.user from ILM Django user when possible; fallback to lightweight.
        user_id = validated_token.get("sub") or validated_token.get("user_id")
        token_iss = validated_token.get("iss")
        email = (
            validated_token.get("email")
            or validated_token.get("upn")
            or _fetch_email_from_userinfo(raw_token, token_iss)
            or _fetch_workos_user_email(user_id)
        )

        # Trusted only when the token carries an Issara internal role slug —
        # see `_resolve_django_user`. Lets the frontend supply the linked
        # Django user id when the WorkOS API / WorkOSUser table can't.
        ilm_user_id_hint = None
        if request is not None:
            raw_hint = request.META.get("HTTP_X_ILM_USER_ID")
            if isinstance(raw_hint, str) and raw_hint.isdigit():
                ilm_user_id_hint = int(raw_hint)

        django_user = _resolve_django_user(
            validated_token, user_id, email, ilm_user_id_hint=ilm_user_id_hint
        )
        # Low-noise diagnostic trail (kept at DEBUG so it doesn't hit the
        # Slack WARNING+ handler on every single authenticated API call).
        # The `api.access` events below are what should be queried for
        # "who logged in / who called what" reporting.
        logger.debug(
            "AUTHKIT META user_id=%s username=%s email=%s claims_sub=%s",
            getattr(django_user, "id", None),
            getattr(django_user, "username", None),
            email,
            validated_token.get("sub"),
        )

        if django_user:
            # Attach claims for consumers that need token metadata.
            setattr(django_user, "claims", validated_token)
            log_access_event(
                "login_success",
                request=request,
                user_id=django_user.id,
                username=getattr(django_user, "username", None),
                email=email,
                auth_method="workos",
            )
            return django_user

        # Keep legacy views stable by returning a real Django user object when possible.
        if email:
            UserModel = get_user_model()
            created = False
            try:
                django_user = UserModel.objects.filter(
                    Q(email__iexact=email) | Q(username__iexact=email)
                ).first()
                if not django_user:
                    django_user = UserModel.objects.create(
                        username=email,
                        email=email,
                        is_active=True,
                    )
                    created = True
            except Exception:
                django_user = None

            if django_user:
                setattr(django_user, "claims", validated_token)
                log_access_event(
                    "login_success",
                    request=request,
                    user_id=django_user.id,
                    username=getattr(django_user, "username", None),
                    email=email,
                    auth_method="workos",
                    account_created=created,
                )
                return django_user

        log_access_event(
            "login_failure",
            request=request,
            auth_method="workos",
            email=email,
            reason="no_matching_ilm_account",
        )

        class WorkOSUser:
            is_authenticated = True

            def __init__(self, user_id, email, claims):
                self.id = user_id
                self.email = email
                self.claims = claims

            def __str__(self):  # nice for logs
                return self.email or self.id or "workos-user"

        return WorkOSUser(user_id=user_id, email=email, claims=validated_token)
