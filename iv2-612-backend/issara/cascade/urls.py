from django.urls import path
from supplier.views import HRDropdownViewSet, WorkerContactReasonViewSet
from issara.ilm_server_2.views import (
    StregicPartnerViewSet,
    RecruiterViewSet,
    SupplierViewSet,
)

from .views import (
    WorkplaceDashboardAPIView,
    KPIListBySupplierCategoryAPIView,
    SupplierKpiTimelineChartAPIView,
    SupplierKpiTimelineDataAPIView,
    SupplierMapAPIView,
    SupplierFullDetailAPIView,
    IndustryListAPIView,
    CountryListAPIView,
    SupplierWorkerCountsAPIView,
    WorkerFeedbackAPIView,
    UserListAPIView,
    InteractionChannelListAPIView,
    KpiClosuresByMonthQualityAPIView,
    StrategicPartnerPolicyViewSet,
    SupplierPolicyViewSet,
    StrategicPartnerWorkplanFileViewSet,
    OrganizationProfileAPIView,
    OrganizationProfileOptionsAPIView,
    OrganizationImageListCreateAPIView,
    OrganizationLogoAPIView,
    OrganizationImageDestroyAPIView,
    WorkerVoiceCaseDetailAPIView,
    WorkerVoiceCaseListCreateAPIView,
    CsoCaseManagementContextAPIView,
    CsoCaseManagementListAPIView,
    CsoCaseManagementDetailAPIView,
    CsoCaseManagementHistoryAPIView,
    CsoCaseManagementCyclesAPIView,
    CsoCaseManagementOrganizationsAPIView,
    CsoCaseManagementCallAPIView,
)

POLICY_LIST_ACTIONS = {"get": "list", "post": "create"}
POLICY_DETAIL_ACTIONS = {
    "get": "retrieve",
    "patch": "partial_update",
    "put": "update",
    "delete": "destroy",
}

WORKPLAN_FILE_LIST_ACTIONS = {"get": "list", "post": "create"}
WORKPLAN_FILE_DETAIL_ACTIONS = {
    "get": "retrieve",
    "patch": "partial_update",
    "delete": "destroy",
}

urlpatterns = [
    path(
        "cso-case-management/context/",
        CsoCaseManagementContextAPIView.as_view(),
        name="cascade-cso-case-management-context",
    ),
    path(
        "cso-case-management/organizations/",
        CsoCaseManagementOrganizationsAPIView.as_view(),
        name="cascade-cso-case-management-organizations",
    ),
    path(
        "cso-case-management/kpis/",
        CsoCaseManagementListAPIView.as_view(),
        name="cascade-cso-case-management-kpis",
    ),
    path(
        "cso-case-management/kpis/<int:pk>/",
        CsoCaseManagementDetailAPIView.as_view(),
        name="cascade-cso-case-management-kpi-detail",
    ),
    path(
        "cso-case-management/kpis/<int:pk>/updates/",
        CsoCaseManagementHistoryAPIView.as_view(),
        name="cascade-cso-case-management-kpi-history",
    ),
    path(
        "cso-case-management/kpis/<int:kpi_pk>/calls/<int:call_pk>/",
        CsoCaseManagementCallAPIView.as_view(),
        name="cascade-cso-case-management-call-detail",
    ),
    path(
        "cso-case-management/cycles/",
        CsoCaseManagementCyclesAPIView.as_view(),
        name="cascade-cso-case-management-cycles",
    ),
    path(
        "cascade_workplace/",
        WorkplaceDashboardAPIView.as_view(),
        name="cascade-workplace-dashboard",
    ),
    path(
        "kpis/",
        KPIListBySupplierCategoryAPIView.as_view(),
        name="kpi-list-by-supplier-category",
    ),
    path(
        "supplier_kpi_timeline_chart/",
        SupplierKpiTimelineChartAPIView.as_view(),
        name="supplier-kpi-timeline-chart",
    ),
    path(
        "supplier_kpi_timeline_data/",
        SupplierKpiTimelineDataAPIView.as_view(),
        name="supplier-kpi-timeline-data",
    ),
    path(
        "kpi_closures_by_month_quality/",
        KpiClosuresByMonthQualityAPIView.as_view(),
        name="kpi-closures-by-month-quality",
    ),
    path(
        "suppliers_map/",
        SupplierMapAPIView.as_view(),
        name="suppliers-map",
    ),
    path(
        "supplier_full_detail/",
        SupplierFullDetailAPIView.as_view(),
        name="supplier-full-detail",
    ),
    path(
        "supplier_worker_counts/",
        SupplierWorkerCountsAPIView.as_view(),
        name="supplier-worker-counts",
    ),
    path(
        "worker-feedback/",
        WorkerFeedbackAPIView.as_view(),
        name="cascade-worker-feedback",
    ),
    path(
        "countries/",
        CountryListAPIView.as_view(),
        name="countries-list",
    ),
    path(
        "industries/",
        IndustryListAPIView.as_view(),
        name="industries-list",
    ),
    path(
        "interactionchannels/",
        InteractionChannelListAPIView.as_view(),
        name="cascade-interactionchannels",
    ),
    # UserListAPIView was imported here but never routed, so every caller of
    # `/cascade/users/` -- the Worker Voice officer dropdowns among them -- got
    # a 404. It is the only endpoint that scopes the user list to the caller's
    # CSO organization.
    path(
        "users/",
        UserListAPIView.as_view(),
        name="cascade-users",
    ),
    path(
        "supplier/worker-contact-reasons/",
        WorkerContactReasonViewSet.as_view({"get": "list"}),
        name="cascade-supplier-worker-contact-reasons",
    ),
    path(
        "supplier/hr-dropdown/",
        HRDropdownViewSet.as_view({"get": "list"}),
        name="cascade-supplier-hr-dropdown",
    ),
    path(
        "strategic-partners/<int:sp_id>/policies/",
        StrategicPartnerPolicyViewSet.as_view(POLICY_LIST_ACTIONS),
        name="cascade-strategic-partner-policy-list",
    ),
    path(
        "strategic-partners/<int:sp_id>/policies/<int:pk>/",
        StrategicPartnerPolicyViewSet.as_view(POLICY_DETAIL_ACTIONS),
        name="cascade-strategic-partner-policy-detail",
    ),
    path(
        "suppliers/<int:supplier_id>/policies/",
        SupplierPolicyViewSet.as_view(POLICY_LIST_ACTIONS),
        name="cascade-supplier-policy-list",
    ),
    path(
        "suppliers/<int:supplier_id>/policies/<int:pk>/",
        SupplierPolicyViewSet.as_view(POLICY_DETAIL_ACTIONS),
        name="cascade-supplier-policy-detail",
    ),
    path(
        "strategic-partners/<int:pk>/image/",
        StregicPartnerViewSet.as_view(
            {"get": "image", "post": "image", "delete": "image"}
        ),
        name="cascade-strategic-partner-image",
    ),
    path(
        "recruiters/<int:pk>/image/",
        RecruiterViewSet.as_view(
            {"get": "image", "post": "image", "delete": "image"}
        ),
        name="cascade-recruiter-image",
    ),
    path(
        "suppliers/<int:pk>/image/",
        SupplierViewSet.as_view(
            {"get": "image", "post": "image", "delete": "image"}
        ),
        name="cascade-supplier-image",
    ),
    path(
        "strategic-partners/<int:sp_id>/workplan-files/",
        StrategicPartnerWorkplanFileViewSet.as_view(WORKPLAN_FILE_LIST_ACTIONS),
        name="cascade-strategic-partner-workplan-file-list",
    ),
    path(
        "strategic-partners/<int:sp_id>/workplan-files/<int:pk>/",
        StrategicPartnerWorkplanFileViewSet.as_view(WORKPLAN_FILE_DETAIL_ACTIONS),
        name="cascade-strategic-partner-workplan-file-detail",
    ),
    path(
        "organizations/me/",
        OrganizationProfileAPIView.as_view(),
        name="cascade-organization-profile",
    ),
    path(
        "organizations/profile-options/",
        OrganizationProfileOptionsAPIView.as_view(),
        name="cascade-organization-profile-options",
    ),
    path(
        "organizations/me/images/",
        OrganizationImageListCreateAPIView.as_view(),
        name="cascade-organization-images",
    ),
    path(
        "organizations/me/logo/",
        OrganizationLogoAPIView.as_view(),
        name="cascade-organization-logo",
    ),
    path(
        "organizations/me/images/<int:pk>/",
        OrganizationImageDestroyAPIView.as_view(),
        name="cascade-organization-image-detail",
    ),
    path(
        "worker-voice-calls/",
        WorkerVoiceCaseListCreateAPIView.as_view(),
        name="cascade-worker-voice-calls",
    ),
    path(
        "worker-voice-calls/<int:pk>/",
        WorkerVoiceCaseDetailAPIView.as_view(),
        name="cascade-worker-voice-call-detail",
    ),
]
