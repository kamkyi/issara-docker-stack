import json
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.template.loader import get_template
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView
from authkit import WorkOSAuthKitAuthentication

from issara.ilm_server_2.models import (
    PriorityActivityBase,
    StrategicPartner,
    WorkPlanAuditTrail,
)
from issara.ilm_server_2.utils import EmailMailgun

from .models import WorkplanEmailNotificationLog, WorkplanEmailNotificationSetting
from .serializers import (
    PriorityActivityBaseSerializer,
    WorkPlanAuditTrailSerializer,
    WorkplanEmailNotificationLogSerializer,
    WorkplanEmailNotificationSettingSerializer,
)

today = timezone.now().date()
six_days_ago = today - timedelta(days=6)
User = get_user_model()


class WorkplanEmailNotificationLogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class WorkplanEmailNotificationLogListView(generics.ListAPIView):
    queryset = WorkplanEmailNotificationLog.objects.select_related(
        "setting", "setting__issara_user", "setting__strategic_partner"
    ).order_by("-sent_at")
    serializer_class = WorkplanEmailNotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = WorkplanEmailNotificationLogPagination

    def get_queryset(self):
        qs = super().get_queryset()

        user_id = self.request.query_params.get("issara_user_id")
        if user_id:
            qs = qs.filter(setting__issara_user_id=user_id)
        partner_id = self.request.query_params.get("strategic_partner_id")
        if partner_id:
            qs = qs.filter(setting__strategic_partner_id=partner_id)
        event_type = self.request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)
        return qs


class SPWorkPlanChangesWeeklyCronJob(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        is_aws_event_bridge = request.headers.get("X-Amazon-EventBridge")
        today = timezone.now().date()
        six_days_ago = today - timedelta(days=6)
        failed = False

        # Only run manually
        # Todo once the schedule task it set up on AWS, remove the is None check

        if is_aws_event_bridge or settings.DEBUG or settings.TESTING:
            emailer = EmailMailgun()

            notification_settings = WorkplanEmailNotificationSetting.objects.filter(
                notify_on_workplan_change=True
            ).select_related("issara_user", "strategic_partner")

            audit_trails = WorkPlanAuditTrail.objects.filter(
                created_at__date__gte=six_days_ago, created_at__date__lte=today
            )

            # Extended mapping for commonly-used indicator keys -> human labels
            field_label_map = {
                "openness_to_reform": "Openness to Reform",
                "communication_disclosure_recruitment_agencies_note": "Communications: Disclosure of Recruitment Agencies Used",
                "integrated_commercial_processes": "Integrated Commercial Processes",
                "management_living_working_conditions": "Management of Living/Working Conditions",
                "grievance_mechanisms": "Grievance Mechanisms",
                "bonus_incentive_systems": "Bonus and Incentive Systems",
                "dorm_canteen_conditions": "Dormitory and Canteen Conditions",
                "human_resources_processes": "Human Resources Processes",
                "partial_progress": "Partial Progress",
                "completed": "Completed",
                "not_started": "Not Started",
                "in_progress": "In Progress",
                "status": "Status",
                "progress": "Progress",
                "notes": "Notes",
                "comment": "Comment",
                "description": "Description",
            }

            def humanize_field(name):
                try:
                    if not name:
                        return name
                    if name in field_label_map:
                        return field_label_map[name]
                    # fallback: replace underscores and title-case
                    return str(name).replace("_", " ").title()
                except Exception:
                    return name

            # Group by Issara user + SP combo
            grouped_settings = {}
            for setting in notification_settings:
                if (
                    not setting.issara_user
                    or not setting.issara_user.email
                    or not setting.strategic_partner
                ):
                    continue

                key = f"{setting.issara_user.id}_{setting.strategic_partner.id}"
                grouped_settings.setdefault(
                    key,
                    {
                        "issara_user": setting.issara_user,
                        "strategic_partner": setting.strategic_partner,
                        "settings": [],
                    },
                )["settings"].append(setting)

            # Process per Issara user + SP
            for group_key, group_data in grouped_settings.items():
                issara_user = group_data["issara_user"]
                strategic_partner = group_data["strategic_partner"]

                try:
                    # Collect all SP user emails to filter audit trails
                    sp_user_emails = [
                        s.sp_user.email
                        for s in group_data["settings"]
                        if hasattr(s, "sp_user") and s.sp_user and s.sp_user.email
                    ]
                    if not sp_user_emails:
                        continue

                    # Filter audit logs for those SP users
                    sp_audit_trails = audit_trails.filter(user__in=sp_user_emails)
                    if not sp_audit_trails.exists():
                        continue

                    # ---- Build date-based structure (no user grouping) ----
                    workplan_id = str(strategic_partner.id)  # each SP has one workplan

                    # date_groups_map = { "YYYY-MM-DD": {...} }
                    date_groups_map = {}

                    for rec in sp_audit_trails.order_by("created_at"):
                        raw = rec.data
                        try:
                            parsed = json.loads(raw)
                        except Exception:
                            parsed = raw

                        if isinstance(parsed, str) and parsed.strip().startswith(
                            ("[", "{")
                        ):
                            try:
                                parsed = json.loads(parsed)
                            except Exception:
                                pass

                        items = (
                            parsed if isinstance(parsed, (list, tuple)) else [parsed]
                        )

                        canonical = []

                        # Try to detect if this is a structured change with field-old-new pattern
                        if isinstance(items, list) and len(items) >= 3:
                            # Check if it follows the pattern: [field_name, old_value, new_value]
                            # or if it's a list of such triplets
                            try:
                                # If it's exactly 3 items, treat as single change
                                if len(items) == 3 and isinstance(items[0], str):
                                    canonical.append(
                                        {
                                            "type": "change",
                                            "field": humanize_field(items[0]),
                                            "old": items[1],
                                            "new": items[2],
                                        }
                                    )
                                # If it's multiple of 3, might be multiple changes
                                elif len(items) % 3 == 0:
                                    for i in range(0, len(items), 3):
                                        if i + 2 < len(items) and isinstance(
                                            items[i], str
                                        ):
                                            canonical.append(
                                                {
                                                    "type": "change",
                                                    "field": humanize_field(items[i]),
                                                    "old": items[i + 1],
                                                    "new": items[i + 2],
                                                }
                                            )
                                        else:
                                            break
                                else:
                                    # Fall back to individual processing
                                    for item in items:
                                        if isinstance(item, dict) and item.get("type"):
                                            if isinstance(item.get("field"), str):
                                                item["field"] = humanize_field(
                                                    item.get("field")
                                                )
                                            canonical.append(item)
                                        elif isinstance(item, (list, tuple)):
                                            if len(item) == 2:
                                                canonical.append(
                                                    {
                                                        "type": "single",
                                                        "field": humanize_field(
                                                            item[0]
                                                        ),
                                                        "value": item[1],
                                                    }
                                                )
                                            elif len(item) == 3:
                                                canonical.append(
                                                    {
                                                        "type": "change",
                                                        "field": humanize_field(
                                                            item[0]
                                                        ),
                                                        "old": item[1],
                                                        "new": item[2],
                                                    }
                                                )
                                            else:
                                                canonical.append(
                                                    {"type": "other", "raw": item}
                                                )
                                        else:
                                            canonical.append(
                                                {"type": "other", "raw": item}
                                            )
                            except:
                                # If parsing fails, fall back to original logic
                                for item in items:
                                    if isinstance(item, dict) and item.get("type"):
                                        if isinstance(item.get("field"), str):
                                            item["field"] = humanize_field(
                                                item.get("field")
                                            )
                                        canonical.append(item)
                                    elif isinstance(item, (list, tuple)):
                                        if len(item) == 2:
                                            canonical.append(
                                                {
                                                    "type": "single",
                                                    "field": humanize_field(item[0]),
                                                    "value": item[1],
                                                }
                                            )
                                        elif len(item) == 3:
                                            canonical.append(
                                                {
                                                    "type": "change",
                                                    "field": humanize_field(item[0]),
                                                    "old": item[1],
                                                    "new": item[2],
                                                }
                                            )
                                        else:
                                            canonical.append(
                                                {"type": "other", "raw": item}
                                            )
                                    else:
                                        canonical.append({"type": "other", "raw": item})
                        else:
                            # Original logic for non-list or short lists
                            for item in items:
                                if isinstance(item, dict) and item.get("type"):
                                    if isinstance(item.get("field"), str):
                                        item["field"] = humanize_field(
                                            item.get("field")
                                        )
                                    canonical.append(item)
                                elif isinstance(item, (list, tuple)):
                                    if len(item) == 2:
                                        canonical.append(
                                            {
                                                "type": "single",
                                                "field": humanize_field(item[0]),
                                                "value": item[1],
                                            }
                                        )
                                    elif len(item) == 3:
                                        canonical.append(
                                            {
                                                "type": "change",
                                                "field": humanize_field(item[0]),
                                                "old": item[1],
                                                "new": item[2],
                                            }
                                        )
                                    else:
                                        canonical.append({"type": "other", "raw": item})
                                else:
                                    canonical.append({"type": "other", "raw": item})

                        change_date = rec.created_at.date()
                        date_key = change_date.strftime("%Y-%m-%d")

                        # Ensure date key exists
                        if date_key not in date_groups_map:
                            date_groups_map[date_key] = {
                                "date": change_date,
                                "change_count": 0,
                                "workplans": [],
                            }

                        # Each record belongs to the single SP workplan
                        date_groups_map[date_key]["workplans"].append(
                            {
                                "workplan_id": workplan_id,
                                "change_count": len(canonical),
                                "changes": canonical,
                            }
                        )
                        date_groups_map[date_key]["change_count"] += len(canonical)

                    # Sort newest → oldest
                    date_groups = sorted(
                        date_groups_map.values(), key=lambda x: x["date"], reverse=True
                    )

                    total_changes = sum(d["change_count"] for d in date_groups)
                    total_workplans = len(
                        {w["workplan_id"] for d in date_groups for w in d["workplans"]}
                    )

                    # ---- Render HTML using the new weekly template ----
                    html_template = get_template(
                        "emails/sp_workplan_changes_weekly.html"
                    )
                    context = {
                        "issara_user": issara_user,
                        "strategic_partner": strategic_partner,
                        "date_groups": date_groups,
                        "total_changes": total_changes,
                        "total_workplans": total_workplans,
                        "date_range": f"{six_days_ago.strftime('%B %d, %Y')} - {today.strftime('%B %d, %Y')}",
                    }
                    html_message = html_template.render(context)

                except Exception as template_error:
                    import traceback

                    traceback.print_exc()
                    html_message = f"<html><body><h1>Workplan Changes</h1><p>Error rendering template: {template_error}</p></body></html>"

                # ---- Send Email ----
                try:
                    email_data = {
                        "to": issara_user.email,
                        "subject": f"Weekly Workplan Changes - {strategic_partner.name}",
                        "html": html_message,
                        "text": f"Workplan changes from {strategic_partner.name} in the last 7 days.",
                    }
                    emailer.send_email(email_data)

                    for setting in group_data["settings"]:
                        WorkplanEmailNotificationLog.objects.create(
                            setting=setting,
                            event_type="workplan_change",
                            details="Email sent successfully",
                        )

                except Exception as e:
                    failed = True
                    for setting in group_data["settings"]:
                        WorkplanEmailNotificationLog.objects.create(
                            setting=setting,
                            event_type="workplan_change",
                            details=f"Email send failed: {str(e)}",
                        )

        if failed:
            return Response(
                {"detail": "Some or all emails failed to send."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": "Emails sent successfully."}, status=status.HTTP_200_OK
        )


class SPWorkPlanChangesEmailCronJobView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        is_aws_event_bridge = request.headers.get("X-Amazon-EventBridge")

        failed = False

        if is_aws_event_bridge or settings.DEBUG or settings.TESTING:
            emailer = EmailMailgun()

            notification_settings = WorkplanEmailNotificationSetting.objects.filter(
                notify_on_workplan_change=True
            ).select_related("issara_user", "strategic_partner")

            audit_trails = WorkPlanAuditTrail.objects.filter(
                created_at__date__gte=six_days_ago, created_at__date__lte=today
            )

            grouped_settings = {}
            for setting in notification_settings:
                if (
                    not setting.issara_user
                    or not setting.issara_user.email
                    or not setting.strategic_partner
                ):
                    continue

                key = f"{setting.issara_user.id}_{setting.strategic_partner.id}"
                if key not in grouped_settings:
                    grouped_settings[key] = {
                        "issara_user": setting.issara_user,
                        "strategic_partner": setting.strategic_partner,
                        "settings": [],
                    }
                grouped_settings[key]["settings"].append(setting)

            for group_key, group_data in grouped_settings.items():
                issara_user = group_data["issara_user"]
                strategic_partner = group_data["strategic_partner"]

                try:

                    sp_user_emails = []
                    for setting in group_data["settings"]:
                        if (
                            hasattr(setting, "sp_user")
                            and setting.sp_user
                            and setting.sp_user.email
                        ):
                            sp_user_emails.append(setting.sp_user.email)

                    if not sp_user_emails:
                        continue

                    sp_audit_trails = audit_trails.filter(user__in=sp_user_emails)

                    if not sp_audit_trails.exists():
                        continue

                    sp_users_data = {}

                    for rec in sp_audit_trails.order_by("created_at"):
                        sp_user_email = rec.user

                        if sp_user_email not in sp_users_data:

                            sp_user_obj = None
                            for setting in group_data["settings"]:
                                if (
                                    hasattr(setting, "sp_user")
                                    and setting.sp_user
                                    and setting.sp_user.email == sp_user_email
                                ):
                                    sp_user_obj = setting.sp_user
                                    break

                            sp_users_data[sp_user_email] = {
                                "sp_user": sp_user_obj,
                                "workplan_groups": {},
                                "total_changes": 0,
                            }

                        raw = rec.data
                        parsed = None

                        try:
                            parsed = json.loads(raw)
                        except Exception:
                            parsed = raw

                        if isinstance(parsed, str) and parsed.strip().startswith(
                            ("[", "{")
                        ):
                            try:
                                parsed = json.loads(parsed)
                            except Exception:
                                pass

                        items = (
                            parsed if isinstance(parsed, (list, tuple)) else [parsed]
                        )

                        canonical = []
                        for item in items:
                            if isinstance(item, dict) and item.get("type"):
                                canonical.append(item)
                                continue

                            if isinstance(item, (list, tuple)):
                                if len(item) == 2:
                                    canonical.append(
                                        {
                                            "type": "single",
                                            "field": item[0],
                                            "value": item[1],
                                        }
                                    )
                                    continue
                                if len(item) == 3:
                                    canonical.append(
                                        {
                                            "type": "change",
                                            "field": item[0],
                                            "old": item[1],
                                            "new": item[2],
                                        }
                                    )
                                    continue

                                canonical.append({"type": "other", "raw": item})
                                continue

                            canonical.append({"type": "other", "raw": item})

                        workplan_id = str(rec.workplan)
                        user_data = sp_users_data[sp_user_email]

                        if workplan_id not in user_data["workplan_groups"]:
                            user_data["workplan_groups"][workplan_id] = {
                                "workplan_id": workplan_id,
                                "date_groups": {},
                                "change_count": 0,
                                "latest_change": rec.created_at,
                            }

                        change_date = rec.created_at.date()
                        date_key = change_date.strftime("%Y-%m-%d")

                        if (
                            date_key
                            not in user_data["workplan_groups"][workplan_id][
                                "date_groups"
                            ]
                        ):
                            user_data["workplan_groups"][workplan_id]["date_groups"][
                                date_key
                            ] = {
                                "date": change_date,
                                "changes": [],
                                "change_count": 0,
                            }

                        user_data["workplan_groups"][workplan_id]["date_groups"][
                            date_key
                        ]["changes"].extend(canonical)
                        user_data["workplan_groups"][workplan_id]["date_groups"][
                            date_key
                        ]["change_count"] += len(canonical)
                        user_data["workplan_groups"][workplan_id][
                            "change_count"
                        ] += len(canonical)
                        user_data["total_changes"] += len(canonical)

                        if (
                            rec.created_at
                            > user_data["workplan_groups"][workplan_id]["latest_change"]
                        ):
                            user_data["workplan_groups"][workplan_id][
                                "latest_change"
                            ] = rec.created_at

                    for user_email, user_data in sp_users_data.items():
                        organized_workplans = []
                        for workplan in user_data["workplan_groups"].values():
                            date_groups_list = []
                            for date_key in sorted(
                                workplan["date_groups"].keys(), reverse=True
                            ):
                                date_groups_list.append(
                                    workplan["date_groups"][date_key]
                                )
                            workplan["date_groups"] = date_groups_list
                            organized_workplans.append(workplan)

                        organized_workplans.sort(
                            key=lambda x: x["latest_change"], reverse=True
                        )
                        user_data["workplans"] = organized_workplans

                    total_changes = sum(
                        user_data["total_changes"]
                        for user_data in sp_users_data.values()
                    )
                    total_workplans = sum(
                        len(user_data["workplans"])
                        for user_data in sp_users_data.values()
                    )

                    html_template = get_template(
                        "emails/workplan_change_notification.html"
                    )
                    context = {
                        "issara_user": issara_user,
                        "strategic_partner": strategic_partner,
                        "sp_users_data": sp_users_data,
                        "total_changes": total_changes,
                        "total_workplans": total_workplans,
                        "date_range": f"{six_days_ago.strftime('%B %d, %Y')} - {today.strftime('%B %d, %Y')}",
                    }
                    html_message = html_template.render(context)
                except Exception as template_error:

                    import traceback

                    traceback.print_exc()
                    html_message = f"<html><body><h1>Workplan Changes</h1><p>Error rendering template: {template_error}</p></body></html>"

                try:
                    email_data = {
                        "to": issara_user.email,
                        "subject": f"Weekly Workplan Changes - {strategic_partner.name}",
                        "html": html_message,
                        "text": f"Workplan changes from {strategic_partner.name} in the last 7 days.",
                    }
                    emailer.send_email(email_data)

                    for setting in group_data["settings"]:
                        WorkplanEmailNotificationLog.objects.create(
                            setting=setting,
                            event_type="workplan_change",
                            details="Email sent successfully",
                        )
                except Exception as e:
                    failed = True

                    for setting in group_data["settings"]:
                        WorkplanEmailNotificationLog.objects.create(
                            setting=setting,
                            event_type="workplan_change",
                            details=f"Email send failed: {str(e)}",
                        )

        if failed:
            return Response(
                {"detail": "Some or all emails failed to send."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(
            {"detail": "Emails sent successfully."}, status=status.HTTP_200_OK
        )


class PriorityActivityBaseListView(generics.ListAPIView):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    queryset = PriorityActivityBase.objects.filter(group__name__isnull=False).exclude(
        group__name=""
    )
    serializer_class = PriorityActivityBaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None


class WorkPlanAuditTrailPagination(PageNumberPagination):
    page_size = 20


class NotificationSettingPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class WorkPlanAuditTrailListView(generics.ListAPIView):
    serializer_class = WorkPlanAuditTrailSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = WorkPlanAuditTrailPagination

    def get_queryset(self):
        qs = WorkPlanAuditTrail.objects.all().order_by("-id")
        partner_id = self.request.query_params.get("strategic_partner_id")
        if partner_id:
            qs = qs.filter(workplan__strategic_partner_id=partner_id)
        return qs


class NotificationSettingViewSet(viewsets.ModelViewSet):
    queryset = WorkplanEmailNotificationSetting.objects.select_related(
        "issara_user", "strategic_partner"
    ).all()
    serializer_class = WorkplanEmailNotificationSettingSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NotificationSettingPagination

    def get_queryset(self):
        qs = super().get_queryset()

        user_id = self.request.query_params.get("issara_user_id")
        if user_id:
            qs = qs.filter(issara_user_id=user_id)

        user_email = self.request.query_params.get("issara_user_email")
        if user_email:
            qs = qs.filter(issara_user__email__iexact=user_email)

        partner_id = self.request.query_params.get("strategic_partner_id")
        if partner_id:
            qs = qs.filter(strategic_partner_id=partner_id)

        user_id_old = self.request.query_params.get("issara_user")
        if user_id_old and not user_id:
            qs = qs.filter(issara_user_id=user_id_old)

        partner_id_old = self.request.query_params.get("strategic_partner")
        if partner_id_old and not partner_id:
            qs = qs.filter(strategic_partner_id=partner_id_old)

        return qs.order_by("-created_at")

    @action(detail=False, methods=["post"])
    def toggle(self, request):
        user_id = request.data.get("issara_user_id")
        partner_id = request.data.get("strategic_partner_id")

        if not user_id or not partner_id:
            return Response({"error": "user_id and partner_id required"}, status=400)

        setting, created = WorkplanEmailNotificationSetting.objects.get_or_create(
            issara_user_id=user_id,
            strategic_partner_id=partner_id,
            defaults=request.data,
        )

        if not created:
            for key, value in request.data.items():
                if hasattr(setting, key):
                    setattr(setting, key, value)
            setting.save()

        return Response(self.get_serializer(setting).data)

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        users = User.objects.filter(is_active=True).values(
            "id", "username", "email", "first_name", "last_name"
        )
        partners = StrategicPartner.objects.filter(is_active=True).values(
            "id", "name", "focal_point_email"
        )
        settings = {
            f"{s.issara_user_id}_{s.strategic_partner_id}": {
                "notify_on_workplan_change": s.notify_on_workplan_change,
                "notify_on_document_upload": s.notify_on_document_upload,
            }
            for s in self.get_queryset()
        }

        return Response(
            {
                "users": list(users),
                "strategic_partners": list(partners),
                "settings": settings,
            }
        )


class WorkPlanAuditTrailDeleteView(generics.DestroyAPIView):
    queryset = WorkPlanAuditTrail.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        count, _ = self.get_queryset().delete()
        return Response(
            {"detail": f"Deleted {count} audit trail records."},
            status=status.HTTP_200_OK,
        )


class WorkplanEmailNotificationLogsDeleteView(generics.DestroyAPIView):
    queryset = WorkplanEmailNotificationLog.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        count, _ = self.get_queryset().delete()
        return Response(
            {"detail": f"Deleted {count} email notification log records."},
            status=status.HTTP_200_OK,
        )
