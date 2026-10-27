from collections import defaultdict
from datetime import datetime, time

from authkit import WorkOSAuthKitAuthentication
from django.db.models import (
    Case,
    Count,
    Exists,
    F,
    FloatField,
    OuterRef,
    Subquery,
    Sum,
    Value,
    When,
)
from django.db.models.expressions import ExpressionWrapper
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView

from issara.ilm_server_2.models import Case as CaseModel
from issara.ilm_server_2.models import Supplier
from kpis.models import SupplierKpi, SupplierKpiUpdate
from supply_chains.models import SupplierSupplyChain


CLOSED_STATUS_NAMES = ("Closed",)


QUALITY_KEYS = ("poor", "fair", "good", "excellent")
QUALITY_LABELS = {
    "poor": "Poor",
    "fair": "Fair",
    "good": "Good",
    "excellent": "Excellent",
}


def _parse_ids(*values):
    ids = []
    for raw in values:
        if not raw:
            continue
        if isinstance(raw, (list, tuple)):
            ids.extend(_parse_ids(*raw))
            continue
        for part in str(raw).split(","):
            part = part.strip()
            if not part:
                continue
            try:
                ids.append(int(part))
            except (TypeError, ValueError):
                continue
    return list(dict.fromkeys(ids))


def _parse_datetime_param(value, end_of_day=False):
    if not value:
        return None

    parsed_datetime = parse_datetime(value)
    if parsed_datetime:
        if timezone.is_naive(parsed_datetime):
            return timezone.make_aware(parsed_datetime)
        return parsed_datetime

    parsed_date = parse_date(value)
    if parsed_date:
        parsed_time = time.max if end_of_day else time.min
        return timezone.make_aware(datetime.combine(parsed_date, parsed_time))

    return None


def _normalize_quality(value):
    if not value:
        return None

    normalized = str(value).strip().lower()
    if normalized == "okay":
        return "fair"
    if normalized in QUALITY_KEYS:
        return normalized
    return None


def _empty_quality_totals():
    return {
        key: {
            "label": QUALITY_LABELS[key],
            "kpis": 0,
            "affectedWorkers": 0,
            "remediationUsd": 0.0,
        }
        for key in QUALITY_KEYS
    }


def _empty_month_bucket(month):
    bucket = {"month": month}
    for key in QUALITY_KEYS:
        bucket[key] = 0
        bucket[f"{key}Workers"] = 0
        bucket[f"{key}RemediationUsd"] = 0.0
    return bucket


class KpiClosuresByMonthQualityAPIView(APIView):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (permissions.IsAuthenticated,)

    def _resolve_supplier_ids(self, request):
        query_params = request.query_params
        has_supplier_filter = False

        supplier_ids = _parse_ids(
            query_params.getlist("supplier_id"),
            query_params.getlist("supplierId"),
            query_params.getlist("suppliers"),
        )
        country_ids = _parse_ids(
            query_params.getlist("country"),
            query_params.getlist("countries"),
        )
        industry_ids = _parse_ids(
            query_params.getlist("industry"),
            query_params.getlist("industries"),
        )
        subindustry_ids = _parse_ids(
            query_params.getlist("sub_industry"),
            query_params.getlist("subIndustry"),
            query_params.getlist("subIndustries"),
            query_params.getlist("subindustries"),
        )
        partner_ids = _parse_ids(
            query_params.getlist("partner_id"),
            query_params.getlist("partnerId"),
            query_params.getlist("strategic_partner_id"),
        )

        supplier_qs = Supplier.objects.all()
        if supplier_ids:
            has_supplier_filter = True
            supplier_qs = supplier_qs.filter(id__in=supplier_ids)
        if country_ids:
            has_supplier_filter = True
            supplier_qs = supplier_qs.filter(country_id__in=country_ids)
        if industry_ids:
            has_supplier_filter = True
            supplier_qs = supplier_qs.filter(industries__id__in=industry_ids)
        if subindustry_ids:
            has_supplier_filter = True
            supplier_qs = supplier_qs.filter(subindustries__id__in=subindustry_ids)
        if partner_ids:
            has_supplier_filter = True
            supplier_qs = supplier_qs.filter(
                suppliersupplychain__supply_chain__strategic_partner_id__in=partner_ids,
                suppliersupplychain__status__in=(
                    SupplierSupplyChain.STATUS_ACTIVE,
                    SupplierSupplyChain.STATUS_INACTIVE,
                ),
            )

        if not has_supplier_filter:
            return None

        return list(supplier_qs.values_list("id", flat=True).distinct())

    def get(self, request):
        start = _parse_datetime_param(
            request.query_params.get("start_time") or request.query_params.get("from")
        )
        end = _parse_datetime_param(
            request.query_params.get("end_time") or request.query_params.get("to"),
            end_of_day=True,
        )

        supplier_ids = self._resolve_supplier_ids(request)
        if supplier_ids == []:
            return Response(
                {
                    "monthlyQuality": [],
                    "totalsByQuality": _empty_quality_totals(),
                    "grandTotal": {
                        "kpis": 0,
                        "affectedWorkers": 0,
                        "remediationUsd": 0.0,
                    },
                    "qualityOrder": list(QUALITY_KEYS),
                }
            )

        cases_exist = CaseModel.objects.filter(
            kpis__id=OuterRef("kpi_id"),
            supplier_id=OuterRef("supplier_id"),
        )

        supplier_kpis = SupplierKpi.objects.filter(
            status__name__in=CLOSED_STATUS_NAMES,
            closed_at__isnull=False,
        )
        if start:
            supplier_kpis = supplier_kpis.filter(closed_at__gte=start)
        if end:
            supplier_kpis = supplier_kpis.filter(closed_at__lte=end)

        if supplier_ids is not None:
            supplier_kpis = supplier_kpis.filter(supplier_id__in=supplier_ids)

        supplier_kpis = supplier_kpis.annotate(
            has_cases=Exists(cases_exist)
        ).filter(has_cases=True)

        latest_update_ids = (
            supplier_kpis.annotate(
                latest_update_id=Subquery(
                    SupplierKpiUpdate.objects.filter(
                        supplier_kpi_id=OuterRef("pk"),
                        status_id=OuterRef("status_id"),
                    )
                    .order_by("-id")
                    .values("id")[:1]
                )
            )
            .exclude(latest_update_id__isnull=True)
            .values("latest_update_id")
        )

        qs = SupplierKpiUpdate.objects.filter(id__in=latest_update_ids)

        local_currency_usd = ExpressionWrapper(
            Coalesce(F("remediation_paid_baht"), Value(0)) / Value(32.0)
            + Coalesce(F("remediation_paid_kyat"), Value(0)) / Value(3500.0)
            + Coalesce(F("remediation_paid_ringitt"), Value(0)) * Value(0.25),
            output_field=FloatField(),
        )
        remediation_usd = Case(
            When(
                remediation_paid_usd__gt=0,
                then=Coalesce(F("remediation_paid_usd"), Value(0)),
            ),
            default=local_currency_usd,
            output_field=FloatField(),
        )

        rows = (
            qs.annotate(month=TruncMonth("supplier_kpi__closed_at"))
            .values("month", "closed_quality")
            .annotate(
                kpis=Count("id"),
                affected_workers=Coalesce(Sum("affected_workers"), Value(0)),
                remediation_usd=Coalesce(
                    Sum(remediation_usd),
                    Value(0.0),
                    output_field=FloatField(),
                ),
            )
            .order_by("month", "closed_quality")
        )

        monthly = defaultdict(lambda: None)
        totals_by_quality = _empty_quality_totals()
        grand_total = {"kpis": 0, "affectedWorkers": 0, "remediationUsd": 0.0}

        for row in rows:
            quality = _normalize_quality(row["closed_quality"])
            month_value = row["month"]
            if not quality or not month_value:
                continue

            month = month_value.strftime("%Y-%m")
            if monthly[month] is None:
                monthly[month] = _empty_month_bucket(month)

            kpis = int(row["kpis"] or 0)
            affected_workers = int(row["affected_workers"] or 0)
            remediation_total = round(float(row["remediation_usd"] or 0), 2)

            monthly[month][quality] += kpis
            monthly[month][f"{quality}Workers"] += affected_workers
            monthly[month][f"{quality}RemediationUsd"] = round(
                monthly[month][f"{quality}RemediationUsd"] + remediation_total,
                2,
            )

            totals_by_quality[quality]["kpis"] += kpis
            totals_by_quality[quality]["affectedWorkers"] += affected_workers
            totals_by_quality[quality]["remediationUsd"] = round(
                totals_by_quality[quality]["remediationUsd"] + remediation_total,
                2,
            )
            grand_total["kpis"] += kpis
            grand_total["affectedWorkers"] += affected_workers
            grand_total["remediationUsd"] = round(
                grand_total["remediationUsd"] + remediation_total,
                2,
            )

        return Response(
            {
                "monthlyQuality": [
                    monthly[month] for month in sorted(monthly.keys()) if monthly[month]
                ],
                "totalsByQuality": totals_by_quality,
                "grandTotal": grand_total,
                "qualityOrder": list(QUALITY_KEYS),
            }
        )
