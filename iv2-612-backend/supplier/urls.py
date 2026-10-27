from rest_framework import routers
from django.urls import path
from .views import (
    WorkerFeedbackViewSet,
    GrievanceViewSet,
    HRDropdownViewSet,
    WorkerContactReasonViewSet,
    SupplierListViewSet,
    SupplierDetailViewSet,
    SupplierCsvExportView,
)

router = routers.DefaultRouter()
router.register(r"worker-feedback", WorkerFeedbackViewSet, basename="workerfeedback")
router.register(r"grievances", GrievanceViewSet, basename="grievance")
router.register(r"hr-dropdown", HRDropdownViewSet, basename="hr-dropdown")
router.register(
    r"worker-contact-reasons",
    WorkerContactReasonViewSet,
    basename="worker-contact-reason",
)
router.register(r"supplier-list", SupplierListViewSet, basename="supplier-list")
router.register(r"supplier-detail", SupplierDetailViewSet, basename="supplier-detail")

urlpatterns = [
    *router.urls,
    path(
        "export-csv/",
        SupplierCsvExportView.as_view(),
        name="supplier-list-export-csv",
    ),
]
