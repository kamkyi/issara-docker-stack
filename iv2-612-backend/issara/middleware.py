import json
import logging
import time

from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin

# Dedicated logger for structured "who did what, when" events (API access +
# login attempts). Kept separate from the root logger so it can be routed /
# filtered independently in settings.py. Writes JSON lines to stdout, which
# the ECS awslogs driver ships to CloudWatch Logs.
access_logger = logging.getLogger("api.access")


class HealthCheckMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if request.META["PATH_INFO"] == "/ping":
            return HttpResponse("pong")


def get_client_ip(request):
    """
    Best-effort client IP. The app sits behind an ALB (and CloudFront for the
    frontend only, not this API), so prefer X-Forwarded-For when present.
    """
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_access_event(event, request=None, **fields):
    """
    Emit a single structured JSON line to the `api.access` logger.

    CloudWatch Logs Insights auto-parses JSON log lines, so callers can query
    on any of these fields directly, e.g.:
        fields @timestamp, username, path, status
        | filter event = "api_access" and username = "someone@example.org"
    """
    payload = {
        "event": event,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if request is not None:
        payload["ip"] = get_client_ip(request)
        payload["user_agent"] = request.META.get("HTTP_USER_AGENT", "")
    payload.update(fields)
    access_logger.info(json.dumps(payload, default=str))


class APIAccessLogMiddleware(MiddlewareMixin):
    """
    Logs one structured JSON line per API request: which user (if any) hit
    which endpoint, when, with what result and how long it took.

    DRF authenticates the user lazily inside the view (APIView.initial() ->
    perform_authentication()), not in Django's AuthenticationMiddleware, so a
    plain `request.user` read here would usually show AnonymousUser even for
    an authenticated call. The DRF Request object (with `.user` already
    resolved) is exposed via `response.renderer_context["request"]` once
    `finalize_response()` has run, so we read the user from there.
    """

    def process_request(self, request):
        request._access_log_start = time.monotonic()

    def process_response(self, request, response):
        path = request.META.get("PATH_INFO", "")
        if not path.startswith("/api/"):
            return response  # skip static/admin/health-check noise

        started = getattr(request, "_access_log_start", None)
        duration_ms = (
            round((time.monotonic() - started) * 1000, 1) if started else None
        )

        drf_request = getattr(response, "renderer_context", None)
        drf_request = drf_request.get("request") if drf_request else None
        user = getattr(drf_request, "user", None) or getattr(request, "user", None)
        if user is not None and not getattr(user, "is_authenticated", False):
            user = None

        log_access_event(
            "api_access",
            request=request,
            user_id=getattr(user, "id", None),
            username=getattr(user, "username", None) or getattr(user, "email", None),
            method=request.method,
            path=path,
            status=response.status_code,
            duration_ms=duration_ms,
        )
        return response
