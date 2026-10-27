from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework.settings import api_settings
from django.db.models import Sum, Count
from authkit import WorkOSAuthKitAuthentication
from issara.ilm_server_2.models import (
    Supplier,
    Case,
    CaseInteraction,
    Ethnicity,
    MonthlyWorkerVoice,
    CaseCategory,
)
from kpis.models import Kpi, KpiCategory


class WorkplaceDashboardAPIView(APIView):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        supplier_id = request.query_params.get("supplier_id")
        query = request.query_params.get("q")
        filter_by = request.query_params.get("filter_by")
        supplier_filter = {}
        case_supplier_filter = {}
        if supplier_id:
            supplier_filter = {"id": supplier_id}
            case_supplier_filter = {"supplier_id": supplier_id}

        from supplier.models import TotalNumberOfWorkers
        
        worker_count_filter = {}
        if supplier_id:
            worker_count_filter["supplier_id"] = supplier_id
        
        worker_count = (
            TotalNumberOfWorkers.objects.filter(**worker_count_filter).aggregate(
                total=Sum("total_num_workers")
            )["total"]
            or 0
        )
        case_count = Case.objects.filter(**case_supplier_filter).count()
        response_count = (
            CaseInteraction.objects.filter(
                case__supplier_id=supplier_id if supplier_id else None
            ).count()
            if supplier_id
            else CaseInteraction.objects.count()
        )

        gender = [
            {
                "name": "Male",
                "value": TotalNumberOfWorkers.objects.filter(**worker_count_filter).aggregate(
                    total=Sum("total_num_men_workers")
                )["total"]
                or 0,
            },
            {
                "name": "Female",
                "value": TotalNumberOfWorkers.objects.filter(**worker_count_filter).aggregate(
                    total=Sum("total_num_women_workers")
                )["total"]
                or 0,
            },
        ]
        nationality = [
            {
                "name": "Burmese",
                "value": TotalNumberOfWorkers.objects.filter(**worker_count_filter).aggregate(
                    total=Sum("total_num_myanmar_workers")
                )["total"]
                or 0,
            },
            {
                "name": "Cambodian",
                "value": TotalNumberOfWorkers.objects.filter(**worker_count_filter).aggregate(
                    total=Sum("total_num_cambodian_workers")
                )["total"]
                or 0,
            },
            {
                "name": "Lao",
                "value": TotalNumberOfWorkers.objects.filter(**worker_count_filter).aggregate(
                    total=Sum("total_num_lao_workers")
                )["total"]
                or 0,
            },
            {
                "name": "Thai",
                "value": TotalNumberOfWorkers.objects.filter(**worker_count_filter).aggregate(
                    total=Sum("total_num_thai_workers")
                )["total"]
                or 0,
            },
        ]

        ethnicity_counts = (
            Case.objects.filter(**case_supplier_filter)
            .values("client_ethnicity_id")
            .annotate(count=Count("id"))
        )
        ethnicity = []
        for item in ethnicity_counts:
            eth_id = item["client_ethnicity_id"]
            count = item["count"]
            eth_name = None
            if eth_id:
                eth_obj = Ethnicity.objects.filter(id=eth_id).first()
                eth_name = eth_obj.name if eth_obj else str(eth_id)
            ethnicity.append({"name": eth_name, "value": count})

        cases_by_category = []
        for cat in CaseCategory.objects.all():
            open_cases = Case.objects.filter(
                case_category=cat,
                case_status__name__iexact="Open",
                **case_supplier_filter,
            ).count()
            closed_cases = Case.objects.filter(
                case_category=cat,
                case_status__name__iexact="Closed",
                **case_supplier_filter,
            ).count()
            cases_by_category.append(
                {
                    "category": cat.name,
                    "open_cases": open_cases,
                    "closed_cases": closed_cases,
                }
            )

        # KPI by category
        kpi_count_filter = None
        description_filter = None
        if filter_by == "kpi_count" and query not in [None, ""]:
            try:
                kpi_count_filter = int(str(query).strip())
            except (TypeError, ValueError):
                # Invalid numeric filter should produce no KPI category matches.
                kpi_count_filter = "__invalid__"
        elif filter_by == "description" and query not in [None, ""]:
            description_filter = str(query).strip()

        kpi_by_category = []
        for kpi_cat in KpiCategory.objects.all():
            supplier_case_ids = Case.objects.filter(**case_supplier_filter).values_list(
                "id", flat=True
            )
            kpi_ids = Case.objects.filter(id__in=supplier_case_ids).values_list(
                "kpis", flat=True
            )
            kpi_queryset = Kpi.objects.filter(id__in=kpi_ids, kpi_category=kpi_cat).distinct()

            if filter_by == "description" and description_filter:
                kpi_queryset = kpi_queryset.filter(description__icontains=description_filter)

            kpi_count = kpi_queryset.count()

            if filter_by == "kpi_count":
                if kpi_count_filter == "__invalid__" or kpi_count != kpi_count_filter:
                    continue
            elif filter_by == "description" and description_filter and kpi_count == 0:
                continue

            kpi_by_category.append(
                {
                    "category": kpi_cat.name,
                    "kpi_count": kpi_count,
                }
            )

        cases_closed = Case.objects.filter(
            case_status__name__iexact="Closed", **case_supplier_filter
        )
        monthly_data = []
        closure_times = []
        for case in cases_closed:
            if case.created and case.last_modified:
                closure_time = (case.last_modified - case.created).days
                closure_times.append(closure_time)
                month = case.last_modified.strftime("%Y-%m")
                monthly_data.append(
                    {
                        "month": month,
                        "closed_cases": 1,
                        "avg_closure_time": closure_time,
                    }
                )
        avg_closure_time = (
            sum(closure_times) / len(closure_times) if closure_times else 0
        )

        remediation_quality = {
            "poor": cases_closed.filter(rating_dest_employer=1).count(),
            "fair": cases_closed.filter(rating_dest_employer=2).count(),
            "good": cases_closed.filter(rating_dest_employer=3).count(),
            "very_good": cases_closed.filter(rating_dest_employer=4).count(),
            "excellent": cases_closed.filter(rating_dest_employer=5).count(),
        }

        channels_count = (
            Supplier.objects.filter(**supplier_filter).aggregate(
                total=Sum("num_of_workers_access_to_issara_wv_channels")
            )["total"]
            or 0
        )
        monthly_voice = [
            {
                "month": mv.month_year.strftime("%Y-%m") if mv.month_year else None,
                "count": mv.mm_hotline_total or 0,
            }
            for mv in MonthlyWorkerVoice.objects.all()
            if mv.month_year is not None
        ]

        return Response(
            {
                "main_stats": {
                    "worker_count": worker_count,
                    "case_count": case_count,
                    "response_count": response_count,
                },
                "demographics": {
                    "gender": gender,
                    "nationality": nationality,
                    "ethnicity": ethnicity,
                },
                "cases_by_category": cases_by_category,
                "kpi_by_category": kpi_by_category,
                "time_to_case_closure": {
                    "monthly": monthly_data,
                    "average_closure_time": avg_closure_time,
                },
                "remediation_quality": remediation_quality,
                "worker_voice": {
                    "channels_count": channels_count,
                    "monthly": monthly_voice,
                },
            }
        )
