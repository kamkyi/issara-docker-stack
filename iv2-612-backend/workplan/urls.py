from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    NotificationSettingViewSet,
    PriorityActivityBaseListView,
    WorkPlanAuditTrailListView,
    SPWorkPlanChangesEmailCronJobView,
    SPWorkPlanChangesWeeklyCronJob,
    WorkplanEmailNotificationLogListView,
    WorkPlanAuditTrailDeleteView,
    WorkplanEmailNotificationLogsDeleteView,
)

app_name = "workplan"
router = DefaultRouter()
router.register(
    r"notification-settings",
    NotificationSettingViewSet,
    basename="notification-settings",
)

urlpatterns = [
    path("", include(router.urls)),
    path(
        "priority-activity-bases/",
        PriorityActivityBaseListView.as_view(),
        name="priority-activity-bases",
    ),
    path("audit-trail/", WorkPlanAuditTrailListView.as_view(), name="audit-trail"),
    path(
        "audit-trail/delete",
        WorkPlanAuditTrailDeleteView.as_view(),
        name="audit-trail-delete",
    ),
    path(
        "sp-workplan-changes-email-cron-job/",
        SPWorkPlanChangesEmailCronJobView.as_view(),
        name="sp-workplan-changes-email-cron-job",
    ),
    path(
        "sp-workplan-changes-weekly-cron-job/",
        SPWorkPlanChangesWeeklyCronJob.as_view(),
        name="sp-workplan-changes-weekly-cron-job",
    ),
    path(
        "email-notification-logs/",
        WorkplanEmailNotificationLogListView.as_view(),
        name="email-notification-logs",
    ),
    path(
        "email-notification-logs/delete",
        WorkplanEmailNotificationLogsDeleteView.as_view(),
        name="email-notification-logs-delete",
    ),
]
