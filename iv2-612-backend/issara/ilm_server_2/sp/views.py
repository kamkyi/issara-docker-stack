from datetime import datetime
from enum import Enum

from django.db.models import Avg, Count, F, Func, Q, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from issara.ilm_server_2.models import (
    FieldworkActivity,
    Industry,
    Supplier,
    SupplierProgress,
    SupplierProgressItem,
    SupplyChain,
)
from issara.ilm_server_2.suppliers.serializers import (
    SupplierFieldWorkTrainingSerializer,
)
from issara.ilm_server_2.utils import calculate_sp_crc_score
from authkit import WorkOSAuthKitAuthentication
from kpis.models import SupplierKpi
from rest_framework.permissions import IsAuthenticated
from rest_framework.settings import api_settings
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class Progress(Enum):
    GRAY = "GRAY"
    YELLOW = "YELLOW"
    GREEN = "GREEN"


class SupplierProgressItems(Enum):
    ER_3 = "MSA review"
    ER_4 = "RA disclosure"
    ER_6 = "Recruitment surveys"
    ER_7 = "ER trainings"
    WV_1 = "Annual Worker Satisfaction Surveys"
    WV_2 = "Line supervisor training"
    WV_3 = "Ethical Grievance Mechanisms Trainings"


class ExtractYear(Func):
    function = "EXTRACT"
    template = "%(function)s(YEAR from %(expressions)s)"


class ExtractMonth(Func):
    function = "EXTRACT"
    template = "%(function)s(MONTH from %(expressions)s)"


def get_supply_chain(request):
    sp = (
        request.user.strategic_partner_user.strategic_partner.id
        if hasattr(request.user, "strategic_partner_user")
        else None
    )
    if request.query_params.get("sp"):
        sp = request.query_params.get("sp")
    return get_object_or_404(SupplyChain, strategic_partner__id=sp)


class SPSupplierView(APIView):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        supply_chain = get_supply_chain(request)
        result_suppliers = self.calculate_suppliers_by_worker_voice(supply_chain)
        return Response(result_suppliers)

    def calculate_suppliers_by_worker_voice(self, supply_chain: SupplyChain) -> dict:
        suppliers = supply_chain.suppliers.all()

        suppliers_no_worker_voice = suppliers.filter(
            worker_voice_status="no_worker_voice"
        ).values_list("name", flat=True)

        suppliers_with_wv_engagement = suppliers.filter(
            worker_voice_status="worker_voice_with_supplier_engagement"
        ).values_list("name", flat=True)

        suppliers_without_wv_engagement = suppliers.filter(
            worker_voice_status="worker_voice_without_supplier_engagement"
        ).values_list("name", flat=True)

        total_suppliers = suppliers.count()
        wv_count = suppliers.aggregate(
            suppliers_with_wv_engagement_count=Count(
                "id",
                filter=Q(worker_voice_status="worker_voice_with_supplier_engagement"),
            ),
            suppliers_without_wv_engagement_count=Count(
                "id",
                filter=Q(
                    worker_voice_status="worker_voice_without_supplier_engagement"
                ),
            ),
            suppliers_no_worker_voice_count=Count(
                "id", filter=Q(worker_voice_status="no_worker_voice")
            ),
        )

        if total_suppliers == 0:
            wv_engagement_percentage, non_wv_engagement_percentage, no_wv_percentage = (
                0,
                0,
                0,
            )
        else:
            wv_engagement_percentage = round(
                (wv_count["suppliers_with_wv_engagement_count"] / total_suppliers)
                * 100,
                2,
            )
            non_wv_engagement_percentage = round(
                (wv_count["suppliers_without_wv_engagement_count"] / total_suppliers)
                * 100,
                2,
            )
            no_wv_percentage = round(
                (wv_count["suppliers_no_worker_voice_count"] / total_suppliers) * 100, 2
            )

        return {
            "without_worker_voice": list(suppliers_no_worker_voice),
            "worker_voice_with_supplier_engagement": list(suppliers_with_wv_engagement),
            "worker_voice_without_supplier_engagement": list(
                suppliers_without_wv_engagement
            ),
            "wv_engagement_percentage": wv_engagement_percentage,
            "non_wv_engagement_percentage": non_wv_engagement_percentage,
            "no_wv_percentage": no_wv_percentage,
        }


class ActualStatusPercentageView(APIView):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        supply_chain = get_supply_chain(request)
        result_bar_chart = self.calculate_actual_status_percentage(supply_chain)
        return Response(result_bar_chart)

    def calculate_actual_status_percentage(self, supply_chain: SupplyChain) -> dict:
        progress_text = {
            "GRAY": "not_yet_initiated",
            "YELLOW": "partial_progress",
            "GREEN": "completed",
        }

        suppliers = supply_chain.suppliers.all()
        supplier_progress = SupplierProgress.objects.filter(
            supplier__in=suppliers
        ).prefetch_related("supplier_progress_item")
        supplier_progress_items = SupplierProgressItem.objects.all().values_list(
            "name", flat=True
        )

        progress_data = {}
        for progress_name in supplier_progress_items:
            progress_data[progress_name] = supplier_progress.aggregate(
                not_yet_initiated=Count(
                    "id",
                    filter=Q(
                        supplier_progress_item__name=progress_name,
                        progress=Progress.GRAY.value,
                    ),
                ),
                partial_progress=Count(
                    "id",
                    filter=Q(
                        supplier_progress_item__name=progress_name,
                        progress=Progress.YELLOW.value,
                    ),
                ),
                completed_ongoing=Count(
                    "id",
                    filter=Q(
                        supplier_progress_item__name=progress_name,
                        progress=Progress.GREEN.value,
                    ),
                ),
                total=Count("id", filter=Q(supplier_progress_item__name=progress_name)),
            )

            total = progress_data[progress_name].pop("total", 0)
            if total > 0:
                progress_data[progress_name] = {
                    k: round((v / total) * 100, 2)
                    for k, v in progress_data[progress_name].items()
                }
            progress_data[progress_name]["suppliers"] = {
                progress_text[i.value]: list(
                    supplier_progress.filter(
                        supplier_progress_item__name=progress_name, progress=i.value
                    ).values_list("supplier__name", flat=True)
                )
                for i in Progress
            }

        return progress_data


class SupplierPerformanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        def get_avg_score(supply_chain, filter_by_industry=False):
            return {
                "total_avg_score": calculate_sp_crc_score(
                    supply_chain, filter_by_industry
                ),
            }

        other_industry_id = request.query_params.get("industry_id")
        if other_industry_id:
            industry = get_object_or_404(Industry, pk=other_industry_id)
            suppliers = Supplier.objects.filter(industries=industry)
            return Response(get_avg_score(suppliers, True))
        supply_chain = get_supply_chain(request)
        return Response(get_avg_score(supply_chain))

    def calculate_avg(self, sum_value, question_count):
        avg_value = sum_value / question_count if sum_value else 0
        return min(avg_value, 5)

    def calculate_timeseries_performance(self, supply_chain):
        # Fetch all CRC scores for each supplier
        monthly_scores = (
            supply_chain.suppliers.prefetch_related("crc_scores")
            .values(
                "crc_scores__created_at",
                "crc_scores__supplier",
            )
            .annotate(
                year=ExtractYear(F("crc_scores__created_at")),
                month=ExtractMonth(F("crc_scores__created_at")),
                quality_sum=Avg(
                    Coalesce(F("crc_scores__avg_worker_response_feedback"), 0)
                    + Coalesce(
                        F("crc_scores__avg_worker_recruitment_mngmt_feedback"), 0
                    )
                    + Coalesce(
                        F("crc_scores__issara_tech_assessment_response_quality_hr"), 0
                    )
                    + Coalesce(
                        F(
                            "crc_scores__issara_tech_assessment_response_quality_production"
                        ),
                        0,
                    )
                    + Coalesce(
                        F(
                            "crc_scores__issara_tech_assessment_response_quality_sr_mngmt"
                        ),
                        0,
                    )
                ),
                timeliness_sum=Sum(
                    Coalesce(F("crc_scores__duration_of_time_taken_to_respond"), 0)
                    + Coalesce(
                        F(
                            "crc_scores__duration_of_time_taken_to_revert_on_action_plan"
                        ),
                        0,
                    )
                    + Coalesce(
                        F("crc_scores__duration_of_time_taken_to_resolve_issues"), 0
                    )
                ),
                openness_sum=Sum(
                    Coalesce(
                        F("crc_scores__site_cooperation_with_ethicall_distribution"), 0
                    )
                    + Coalesce(
                        F("crc_scores__business_attitude_toward_suggested_remedies"), 0
                    )
                    + Coalesce(
                        F("crc_scores__business_attitude_toward_capacity_and_risks"), 0
                    )
                    + Coalesce(
                        F(
                            "crc_scores__business_attitude_toward_promoting_worker_voice"
                        ),
                        0,
                    )
                    + Coalesce(
                        F("crc_scores__business_attitude_toward_worker_treatment"), 0
                    )
                    + Coalesce(F("crc_scores__business_attitude_toward_issara"), 0)
                ),
            )
            .order_by("year", "month")
        )

        monthly_averages = {}
        # Calculate averages by month,year
        for score in monthly_scores:
            year, month = score["year"], score["month"]

            # Calculate averages for each supplier
            quality_avg = self.calculate_avg(score["quality_sum"], 5)
            timeliness_avg = self.calculate_avg(score["timeliness_sum"], 3)
            openness_avg = self.calculate_avg(score["openness_sum"], 6)

            # Accumulate into monthly_averages
            month_key = (year, month)
            if month_key not in monthly_averages:
                monthly_averages[month_key] = {
                    "quality_sum": 0,
                    "timeliness_sum": 0,
                    "openness_sum": 0,
                    "supplier_count": 0,
                }

            monthly_averages[month_key]["quality_sum"] += quality_avg
            monthly_averages[month_key]["timeliness_sum"] += timeliness_avg
            monthly_averages[month_key]["openness_sum"] += openness_avg
            monthly_averages[month_key]["supplier_count"] += 1

        # Sort and calculate
        result = dict(dates=[], quality=[], timeliness=[], openness=[])
        for month_key in sorted(k for k in monthly_averages.keys() if None not in k):
            year, month = month_key
            scores = monthly_averages[month_key]
            supplier_count = scores["supplier_count"]

            # Calculate total averages
            result["dates"].append(datetime(year, month, 1).strftime("%Y-%m"))
            result["quality"].append(round(scores["quality_sum"] / supplier_count, 2))
            result["timeliness"].append(
                round(scores["timeliness_sum"] / supplier_count, 2)
            )
            result["openness"].append(round(scores["openness_sum"] / supplier_count, 2))

        return result


class IssuesRelatedView(APIView):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        supply_chain = get_supply_chain(request)
        result_reported_issues, result_issues_quality = self.calculate_issues_duration(
            supply_chain
        )
        return Response(
            {
                "issue_duration": result_reported_issues,
                "issue_quality": result_issues_quality,
            }
        )

    def calculate_issues_duration(self, supply_chain: SupplyChain) -> tuple:
        suppliers = supply_chain.suppliers.all()
        kpi_cases = SupplierKpi.objects.filter(
            supplier__in=suppliers, status__name="Closed"
        )

        result_closed_quality = self.calculate_kpi_quality_percentage(kpi_cases)
        total_closed = kpi_cases.count()

        if total_closed == 0:
            return (
                dict(percentage_under_60=0, percentage_over_60=0),
                result_closed_quality,
            )

        kpi_duration = kpi_cases.values_list("opened_at", "closed_at")
        under_60_days = sum(
            1
            for opened_at, closed_at in kpi_duration
            if (closed_at.date() - opened_at).days <= 60
        )
        over_60_days = total_closed - under_60_days

        result_duration_percentage = {
            "percentage_under_60": round((under_60_days / total_closed) * 100, 2),
            "percentage_over_60": round((over_60_days / total_closed) * 100, 2),
        }

        return result_duration_percentage, result_closed_quality

    def calculate_kpi_quality_percentage(self, cases) -> dict:
        quality_counts = cases.values("closed_quality").annotate(
            count=Count("closed_quality")
        )
        total_closed = cases.count()

        return {
            quality["closed_quality"]: round((quality["count"] / total_closed) * 100, 2)
            for quality in quality_counts
        }


class ReimbursementView(APIView):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        supply_chain = get_supply_chain(request)
        impact_indicator_4, impact_indicator_5 = self.calculate_reimbursement(
            supply_chain
        )
        return Response(
            {
                "impact_indicator_4": impact_indicator_4,
                "impact_indicator_5": impact_indicator_5,
            }
        )

    def calculate_reimbursement(self, supply_chain: SupplyChain) -> dict:
        suppliers = supply_chain.suppliers.all().prefetch_related("activity_summary")

        result_num_of_eligible_workers_reimbursed = suppliers.aggregate(
            total_reimbursement=Sum("num_workers_reimbursed_recruitment_fees"),
            total_remaining_reimbursement=Sum(
                "remain_num_workers_owed_recruitment_fee_reimbursement"
            ),
        )
        result_money_owed_vs_reimbursed = suppliers.aggregate(
            reimbursed=Sum("activity_summary__reimbursement"),
            total_agree_in_process=Sum(
                "activity_summary__reimbursement_agreed_in_process"
            ),
            total_not_agree=Sum("activity_summary__reimbursement_not_agreed"),
        )

        return (
            result_num_of_eligible_workers_reimbursed,
            result_money_owed_vs_reimbursed,
        )


class FieldWorkTrainingView(APIView):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = [IsAuthenticated]
    serializer_class = SupplierFieldWorkTrainingSerializer

    def get(self, request: Request) -> Response:
        supply_chain = get_supply_chain(request)
        supplier_list = supply_chain.suppliers.all().values_list("id", flat=True)
        trainings = (
            FieldworkActivity.objects.filter(
                suppliers__in=supplier_list, fieldwork_type__category__name="Training"
            )
            .order_by("-fieldwork_date")
            .select_related(
                "fieldwork_type__category", "fieldwork_type", "training_name"
            )
            .annotate(name=F("fieldwork_type__name"))
            .values("id", "fieldwork_date", "name", "training_name")
            .distinct()[:10]
        )
        return Response(self.serializer_class(trainings, many=True).data)
