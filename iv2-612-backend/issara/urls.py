import json
import sys

import drf_jwt_2fa.urls
from issara import custom_views
from django.conf import settings
from django.conf.urls import include, url
from django.conf.urls.static import static
from django.contrib import admin
from django.core import serializers
from django.urls import include, path
from issara.cascade import urls as cascade_urls
from django.views.decorators.clickjacking import xframe_options_exempt
from issara.grievance import views as grievance_views
from issara.ilm_server_2 import views as legacy_views
from issara.ilm_server_2 import views_optimized
from issara.ilm_server_2.views import internal_dashboard, remediation_metrics
from issara.ilm_server_2.apis import SupplierProgressAPI
from issara.ilm_server_2.goals.views import GoalViewSet
from issara.ilm_server_2.sp.views import (
    ActualStatusPercentageView,
    FieldWorkTrainingView,
    IssuesRelatedView,
    ReimbursementView,
    SPSupplierView,
    SupplierPerformanceView,
)
from issara.middleware import log_access_event
from issara.ilm_server_2.suppliers.views import (
    SupplierActivitySummaryView,
    SupplierFieldWorkTrainingView,
    SupplierListDropDownView,
    SupplierMinimalListView,
)
from kpis import views as kpis_views
from rest_framework import routers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt import serializers as jwt_serializers
from rest_framework_simplejwt import views as jwt_views

router = routers.DefaultRouter()

router.register("howhearissara", legacy_views.HowHearIssaraViewSet)
router.register("personcontacts", legacy_views.PersonContactViewSet)
router.register("newsupdates", legacy_views.NewsUpdateViewSet)
router.register("partnernewsupdates", legacy_views.PartnerMessageBoardViewSet)
router.register(
    "partnermessageboardcomments",
    legacy_views.PartnerMessageBoardCommentViewSet,
)
router.register("suppliernewsupdates", legacy_views.SupplierMessageBoardViewSet)
router.register("strategicpartners", legacy_views.StregicPartnerViewSet)
router.register(
    "strategic-partner-responses", legacy_views.StregicPartnerResponseViewSet
)
router.register("workplaces", legacy_views.WorkPlaceViewSet)
router.register("issuecategories", legacy_views.IssueCategoryViewSet)
router.register("kpicategories", kpis_views.KpiCategoryLegacyViewSet)
router.register("kpis", kpis_views.KpiLegacyViewSet)
router.register("nationalities", legacy_views.NationalityViewSet)
router.register("interactionreasons", legacy_views.InteractionReasonViewSet)
router.register("interactionchannels", legacy_views.InteractionChannelViewSet)
router.register("referralactions", legacy_views.ReferralActionViewSet)
router.register("referralorg", legacy_views.ReferralOrganisationViewSet)
router.register("ethnicities", legacy_views.EthnicityViewSet)
router.register("contracttypes", legacy_views.ContractTypeViewSet)
router.register("documenttypes", legacy_views.DocumentTypeViewSet)
router.register("kpilegalviolations", kpis_views.KpiLegalViolationLegacyViewSet)
router.register("vesseltypes", legacy_views.VesselTypeViewSet)
router.register("industries", legacy_views.IndustryViewSet)
router.register("subindustries", legacy_views.SubIndustryViewSet)
router.register("countries", legacy_views.CountryViewSet)
router.register("provinces", legacy_views.ProvinceViewSet)
router.register("user-tasks", legacy_views.UserTaskViewSet)
router.register("districts", legacy_views.DistrictViewSet)
router.register("recruiters", legacy_views.RecruiterViewSet)
router.register("suppliers", legacy_views.SupplierViewSet)
router.register("all_suppliers", legacy_views.SuppliersListFlatAPI),
router.register("nonsupplychainsuppliers", legacy_views.NonSupplyChainCaseViewSet),

router.register("supplier-kpis", legacy_views.SupplierKpiViewSet)
router.register("supplierkpis", kpis_views.SupplierKpiViewSet)
router.register("supplier-kpi-updates", kpis_views.SupplierKpiUpdateLegacyViewSet)
router.register("supplierkpiupdates", kpis_views.SupplierKpiUpdateViewset)
router.register(
    "supplierkpiupdatestatuses", kpis_views.SupplierKpiUpdateStatusLegacyViewSet
)
router.register("users", legacy_views.UserViewSet)
router.register("sp_users", legacy_views.SPUserViewSet)
router.register("userpartnerlogins", legacy_views.UserLoginView)
router.register("groups", legacy_views.GroupViewSet)
router.register("casestatuses", legacy_views.CaseStatusViewSet)
router.register("clientstatuses", legacy_views.ClientStatusViewSet)
router.register("clienttypes", legacy_views.ClientTypeViewSet)
router.register("supplychains", legacy_views.SupplyChainViewSet)
router.register("casecategories", legacy_views.CaseCategoryViewSet)
router.register("cases", legacy_views.CaseViewSet)
router.register("cases_deep", legacy_views.CaseDeepViewSet)
router.register("business-responses", legacy_views.BusinessResponseViewSet)
router.register(
    "business-response-interaction-types",
    legacy_views.BusinessResponseInteractionTypeViewSet,
)
router.register("supplier-crc-scores", legacy_views.SupplierCRCResponseViewSet)
router.register("recruiter-crc-scores", legacy_views.RecruiterCRCResponseViewSet)
router.register("fieldwork-activities", legacy_views.FieldworkActivityViewSet)
router.register("fieldwork-types", legacy_views.GroupedFieldworkActivityTypeViewSet)
router.register(
    "fieldwork-primary-focuses", legacy_views.FieldworkActivityPrimaryFocusViewSet
)
router.register("monthly-worker-voice", legacy_views.MonthlyWorkerVoiceViewSet)
router.register(
    "ethical-recruitment-meetings", legacy_views.EthicalRecruitmentMeetingViewSet
)
router.register("factorytypes", legacy_views.FactoryTypeViewSet)
router.register("mmthaidemanddata", legacy_views.MmThaiDemandDataViewSet)
router.register("mm-thai-sending-data-raw", legacy_views.MmThaiSendingDataViewSet)
router.register("shared-files", legacy_views.SharedFileViewSet)
router.register(
    "strategic-partner-docs", legacy_views.StregicPartnerReferenceDocsViewSet
)
router.register(
    "grievance-mechanism-reviews", legacy_views.GrievanceMechanismReviewViewSet
)
router.register("sp-workplans", legacy_views.SPWorkplanViewSet)
router.register("sp-workplan-docs", legacy_views.SPWorkplanDocsViewSet)
router.register("sp-workplan-main-goals", legacy_views.SPWorkplanMainGoalsViewSet)
router.register(
    "sp-workplan-progress-indicators", legacy_views.SPWorkplanProgressIndicatorViewSet
)
router.register("sp-workplan-activity", legacy_views.SPWorkplanActivityViewSet)
router.register("sp-workplan-notes_and_remarks", legacy_views.WorkplanNoteViewSet)
router.register("supplierlogins", legacy_views.SupplierUserLoginView)
router.register("activity_progress", legacy_views.SPWorkplanActivityProgress)
router.register(
    "update_activity_progress", legacy_views.SPWorkplanUpdateActivityProgress
)
router.register("supplier_list_dropdown", SupplierListDropDownView)
router.register(
    "strategic_partner_list_dropdown",
    legacy_views.StrategicPartnerListDropDownView,
    basename="strategic_partner_list_dropdown",
)
router.register("goals", GoalViewSet)
router.register("grievance", grievance_views.GrievanceViewSet)


class TokenObtainPairPatchedSerializer(jwt_serializers.TokenObtainPairSerializer):
    def validate(self, attrs):
        request = self.context.get("request")
        attempted_username = attrs.get(self.username_field)

        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            log_access_event(
                "login_failure",
                request=request,
                username=attempted_username,
                auth_method="password",
            )
            raise

        data["user"] = {
            "username": self.user.username,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
        }

        data["token"] = data["access"]

        log_access_event(
            "login_success",
            request=request,
            user_id=self.user.id,
            username=self.user.username,
            auth_method="password",
        )

        return data


class TokenObtainPairPatchedView(jwt_views.TokenObtainPairView):
    """
    Takes a set of user credentials and returns an access and refresh JSON web
    token pair to prove the authentication of those credentials.
    """

    serializer_class = TokenObtainPairPatchedSerializer


urlpatterns = [
    path("delete-nepali-stream", legacy_views.ra_delete_streaming_view),
    path("api/v2/workplan/", include("workplan.urls")),
    path("migrate-nepali-stream", legacy_views.ra_migrate_streaming_view),
    path("migrate-nepali/", legacy_views.NepaliRAMigrateView.as_view()),
    path("delete-nepali/", legacy_views.NepaliRaDeleteView.as_view()),
    path("invalidate-cache", legacy_views.InvalidateCacheView.as_view()),
    path("two_factor_auth/get-code/", custom_views.custom_obtain_code_token),
    path("two_factor_auth/", include("issara.custom_urls")),
    path("hello", legacy_views.HelloView.as_view(), name="hello"),
    path("admin/", admin.site.urls),
    path(
        "api/v2/suppliers/minimal/",
        SupplierMinimalListView.as_view(),
        name="suppliers-minimal-v2",
    ),
    path("api/v2/", include(router.urls)),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    path(
        "api-auth-user/password_reset/",
        include("django_rest_passwordreset.urls", namespace="password_reset"),
    ),
    path(
        "api-auth-user/change_password/<int:pk>/",
        legacy_views.ChangePasswordView.as_view(),
        name="api_auth_change_password",
    ),
    path(
        "api/v3/supplier-kpi-updates/",
        views_optimized.SupplierKpiOptimizedView.as_view(),
        name="supplierkpis-optimized",
    ),
    path(
        "api/v2/token/", TokenObtainPairPatchedView.as_view(), name="token_obtain_pair"
    ),
    path(
        "api/token/refresh/",
        jwt_views.TokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path(
        "api/v2/cases_lean", legacy_views.CaseLeanViewSet.as_view(), name="cases-lean"
    ),
    path(
        "api/v2/supplierkpis_raw",
        legacy_views.SupplierKpiRawViewSet.as_view(),
        name="supplierkpis-raw",
    ),
    path(
        "api/v2/metrics/workers",
        legacy_views.MetricsWorkersView.as_view(),
        name="metrics-workers",
    ),
    path(
        "api/v2/metrics/interactions",
        legacy_views.MetricsInteractionsView.as_view(),
        name="metrics-interactions",
    ),
    path(
        "api/v2/metrics/crc-scores",
        legacy_views.MetricsCRCScoresView.as_view(),
        name="metrics-crc-scores",
    ),
    path(
        "api/v2/metrics/monthly-worker-voice",
        legacy_views.MetricsMonthlyWorkerVoiceView.as_view(),
        name="metrics-monthly-worker-voice",
    ),
    path("api/v2/me", legacy_views.CurrentUserView.as_view(), name="me"),
    path(
        "api/v2/increment-client-version",
        legacy_views.IncrementClientVersionView.as_view(),
        name="increment-client-version",
    ),
    path(
        "api/v2/merge-supplier-duplicates",
        legacy_views.MergeSupplierDuplicatesView.as_view(),
        name="merge-supplier-duplicates",
    ),
    path(
        "api/v2/merge-recruiter-duplicates",
        legacy_views.MergeRecruiterDuplicatesView.as_view(),
        name="merge-recruiter-duplicates",
    ),
    path(
        "api/v2/app-engine/cron/internal-kpi-email",
        legacy_views.InternalKpiEmailCronJobView.as_view(),
        name="internal-kpi-email-cron",
    ),
    path(
        "api/v2/app-engine/cron/external-kpi-email",
        legacy_views.ExternalKpiEmailCronJobView.as_view(),
        name="external-kpi-email-cron",
    ),
    path(
        "api/v2/app-engine/cron/supplier-kpi-email",
        legacy_views.SupplierKpiEmailCronJobView.as_view(),
        name="supplier-kpi-email",
    ),
    path(
        "api/v3/internal-dashboard/kpi-summary/",
        internal_dashboard.InternalKpiDashboardView.as_view(),
        name="internal-kpi-summary",
    ),
    path(
        "api/v3/internal-dashboard/remediation-metrics/",
        remediation_metrics.RemediationMetricsView.as_view(),
        name="remediation-metrics",
    ),
    path(
        "api/v3/internal-dashboard/monthly-worker-voice-tracking/",
        legacy_views.MonthlyWorkerVoiceTrackingMetricsView.as_view(),
        name="monthly-worker-voice-tracking",
    ),
    path(
        "api/v2/supplierkpiupdatebatchdelete",
        legacy_views.DeleteSupplierKpiBatchUpdateView.as_view(),
        name="supplier-kpi-update-batchdelete",
    ),
    path(
        "api/v2/supplierbatchupdate",
        legacy_views.SupplierBatchUpdateView.as_view(),
        name="supplier-batch-update",
    ),
    path(
        "api/v2/suppliers/set-anonymous",
        legacy_views.SupplierAnonymousBulkUpdateView.as_view(),
        name="suppliers-set-anonymous",
    ),
    path(
        "api/v2/removesupplierkpis",
        legacy_views.DeleteSupplierKpiUpdateView.as_view(),
        name="supplier-kpi-remove",
    ),
    path(
        "api/v2/supplier-progress/<int:pk>",
        SupplierProgressAPI.as_view(),
        name="supplier-progress",
    ),
    path(
        "api/v2/supplier/<int:supplier_id>/activity-summary",
        SupplierActivitySummaryView.as_view(),
        name="supplier-activity-summary",
    ),
    path(
        "api/v2/supplier/<int:supplier_id>/trainings",
        SupplierFieldWorkTrainingView.as_view(),
        name="supplier-trainings",
    ),
    path(
        "api/v3/suppliers/minimal/",
        SupplierMinimalListView.as_view(),
        name="suppliers-minimal",
    ),
    path(
        "api/v2/work_plan_pdf/<int:pk>",
        legacy_views.GenerateWorkPlanPDF.as_view(),
        name="workplan_pdf",
    ),
    path(
        "api/v2/sp_work_plan/",
        legacy_views.SPWorkPlanDetail.as_view(),
        name="sp_workplan",
    ),
    path(
        "api/v2/sp_for_spuser/",
        legacy_views.SpUserforWP.as_view(),
        name="sp_for_spuser",
    ),
    path("api/v2/all_cases/", legacy_views.AllCasesForSp.as_view(), name="all_calses"),
    path("api/v2/er-metrics/", legacy_views.ERMetricsView.as_view(), name="er-metrics"),
    path(
        "api/v2/er-metrics/<int:pk>/",
        legacy_views.ERMetricsView.as_view(),
        name="er-metrics-update",
    ),
    path(
        "api/v2/er-metrics-count/",
        legacy_views.ERMetricsCountView.as_view(),
        name="er-metrics-count",
    ),
    path("run-script", legacy_views.runScript, name="run-script"),
    path(
        "api/v2/cso-logins/",
        legacy_views.CsoLoginTracking.as_view(),
        name="cso-login-tracking",
    ),
    path(
        "api/v2/sp-progress-dashboard/suppliers/",
        SPSupplierView.as_view(),
        name="sp_progress_suppliers",
    ),
    path(
        "api/v2/sp-progress-dashboard/wv-bar-chart/",
        ActualStatusPercentageView.as_view(),
        name="sp_progress_bar_chart",
    ),
    path(
        "api/v2/sp-progress-dashboard/supplier-performances/",
        SupplierPerformanceView.as_view(),
        name="sp_progress_supplier_performance",
    ),
    path(
        "api/v2/sp-progress-dashboard/issues/",
        IssuesRelatedView.as_view(),
        name="sp_progress_issues",
    ),
    path(
        "api/v2/sp-progress-dashboard/worker-reimbursement/",
        ReimbursementView.as_view(),
        name="sp_progress_reimbursement",
    ),
    path(
        "api/v2/supply-chain/trainings/",
        FieldWorkTrainingView.as_view(),
        name="supply-chain-trainings",
    ),
    path(
        "api/v2/supplier-kpis/<int:skpi_id>/grievance/",
        grievance_views.GrievanceViewSet.as_view({"get": "retrieve", "post": "create"}),
        name="supplier-kpi-grievance",
    ),
    path(
        "api/v2/supplier-kpis/<int:skpi_id>/grievance/<int:pk>/",
        grievance_views.GrievanceViewSet.as_view(
            {"put": "update", "patch": "partial_update"}
        ),
        name="supplier-kpi-grievance",
    ),
    path(
        "api/v2/supplier-kpis/<int:skpi_id>/grievance/<int:pk>/information_collection_attachments/",
        grievance_views.GrievanceViewSet.as_view(
            {"post": "information_collection_attachments"}
        ),
        name="supplier-kpi-grievance-information-collection-attachments",
    ),
    path(
        "api/v2/supplier-kpis/<int:skpi_id>/grievance/<int:pk>/information_collection_attachments/<int:attachment_id>/download/",
        grievance_views.GrievanceViewSet.as_view(
            {"get": "download_information_collection_attachment"}
        ),
        name="supplier-kpi-grievance-attachment-download",
    ),
    path(
        "api/v2/supplier-kpis/<int:skpi_id>/grievance/<int:pk>/history/",
        grievance_views.GrievanceViewSet.as_view({"get": "history"}),
        name="supplier-kpi-grievance-history",
    ),
    path("api/v2/supplier/", include("supplier.urls")),
    path(
        "api/v2/supplier-kpis-timeline/",
        kpis_views.SupplierKpiTimelineAPIView.as_view(),
        name="supplier-kpis-timeline",
    ),
    # WorkOS AuthKit endpoints exposed at root-level paths
    path("authkit/", include("authkit.urls")),
    # cascade path for backend data
    path("cascade/", include(cascade_urls)),
]


if settings.DEBUG:
    import debug_toolbar

    urlpatterns += [
        path("__debug__/", include(debug_toolbar.urls)),
    ]

    # Serve user-uploaded media from the local FileSystemStorage during dev.
    # Production uses S3 via PrivateStorage, so this is a no-op there.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


def trigger_error(request):
    division_by_zero = 1 / 0


urlpatterns += [
    path("sentry-debug/", trigger_error),
]
