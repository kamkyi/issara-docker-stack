from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.settings import api_settings
from django.db.models import OuterRef
from kpis.models import Kpi
from authkit import WorkOSAuthKitAuthentication


# The Social Responsibility Overview filter sends ISO2 country codes (e.g. "TH",
# "KH"), but the Country model only has a `name` column. Map codes to names so
# the country filter resolves. Mirrors the frontend COUNTRY_OPTIONS labels.
ISO2_TO_COUNTRY_NAME = {
    "AU": "Australia",
    "BD": "Bangladesh",
    "KH": "Cambodia",
    "CN": "China",
    "HK": "Hong Kong",
    "IN": "India",
    "ID": "Indonesia",
    "JP": "Japan",
    "KR": "South Korea",
    "LA": "Laos",
    "MY": "Malaysia",
    "MM": "Myanmar",
    "NP": "Nepal",
    "NZ": "New Zealand",
    "PK": "Pakistan",
    "PH": "Philippines",
    "SG": "Singapore",
    "LK": "Sri Lanka",
    "TW": "Taiwan",
    "TH": "Thailand",
    "GB": "United Kingdom",
    "US": "United States",
    "VN": "Vietnam",
}


class SupplierKpiTimelineChartAPIView(APIView):
    """
    Returns processed chart data for Supplier KPIs Timeline Chart.
    Query params: supplier_id, kpi_category_id, start_time, end_time,
    country, industry
    """

    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        from kpis.models import SupplierKpi, SupplierKpiUpdate
        import datetime
        import pytz
        from email.utils import parsedate_to_datetime
        from issara.ilm_server_2.models import Case, Supplier

        supplier_id = request.query_params.get("supplier_id")
        kpi_category_id = request.query_params.get("kpi_category_id")
        start_time = request.query_params.get("start_time")
        end_time = request.query_params.get("end_time")
        country = request.query_params.get("country")
        industry = request.query_params.get("industry")

        # Resolve country/industry filters to a concrete set of supplier ids so
        # the timeline can be narrowed the same way the rest of the Social
        # Responsibility Overview page is. Values may be comma-separated and may
        # be ids or names (mirrors views/supplier_map.py).
        def split_csv(value):
            if not value:
                return []
            return [part.strip() for part in str(value).split(",") if part.strip()]

        demographic_supplier_ids = None
        country_values = split_csv(country)
        industry_values = split_csv(industry)
        if country_values or industry_values:
            supplier_qs = Supplier.objects.all()
            if country_values:
                numeric = [v for v in country_values if v.isdigit()]
                # Resolve ISO2 codes (e.g. "TH") to country names; pass through
                # any value that is already a full name.
                names = [
                    ISO2_TO_COUNTRY_NAME.get(v.upper(), v)
                    for v in country_values
                    if not v.isdigit()
                ]
                from django.db.models import Q

                country_q = Q()
                if numeric:
                    country_q |= Q(country_id__in=numeric)
                if names:
                    country_q |= Q(country__name__in=names)
                supplier_qs = supplier_qs.filter(country_q)
            if industry_values:
                numeric = [v for v in industry_values if v.isdigit()]
                names = [v for v in industry_values if not v.isdigit()]
                from django.db.models import Q

                industry_q = Q()
                if numeric:
                    industry_q |= Q(industries__id__in=numeric)
                if names:
                    industry_q |= Q(industries__name__in=names)
                supplier_qs = supplier_qs.filter(industry_q)
            demographic_supplier_ids = list(
                supplier_qs.values_list("id", flat=True).distinct()
            )

        def parse_flexible_date(date_str):
            if not date_str:
                return None
            try:
                return parsedate_to_datetime(date_str)
            except Exception:
                pass
            try:
                return datetime.datetime.fromisoformat(date_str)
            except Exception:
                pass
            try:
                from dateutil import parser

                return parser.parse(date_str)
            except Exception:
                return None

        filter_start = parse_flexible_date(start_time)
        filter_end = parse_flexible_date(end_time)
        if (start_time and not filter_start) or (end_time and not filter_end):
            return Response(
                {"detail": "Invalid date format. Use ISO or common web formats."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        skpi_filter = {}
        if supplier_id:
            skpi_filter["supplier_id"] = supplier_id
        if demographic_supplier_ids is not None:
            skpi_filter["supplier_id__in"] = demographic_supplier_ids
        if kpi_category_id:
            skpi_filter["kpi__kpi_category_id"] = kpi_category_id

        update_filter = {}
        if supplier_id:
            update_filter["supplier_kpi__supplier_id"] = supplier_id
        if demographic_supplier_ids is not None:
            update_filter["supplier_kpi__supplier_id__in"] = demographic_supplier_ids
        if kpi_category_id:
            update_filter["supplier_kpi__kpi__kpi_category_id"] = kpi_category_id
        supplier_kpi_updates = SupplierKpiUpdate.objects.filter(**update_filter)

        header = [
            "kpi_id",
            "kpi_name",
            "supplier_id",
            "supplier_name",
            "status",
            "opened_at",
            "closed_at",
            "duration_days",
            "color",
            "tooltip",
            "calls",
            "bar_type",
        ]

        chart_data_rows = []
        kpi_types = (
            Kpi.objects.filter(kpi_category_id=kpi_category_id)
            if kpi_category_id
            else Kpi.objects.all()
        )

        def ensure_datetime(dt):
            if dt is None:
                return None
            if isinstance(dt, datetime.datetime):
                return dt
            if isinstance(dt, datetime.date):
                return datetime.datetime(dt.year, dt.month, dt.day, tzinfo=pytz.UTC)
            return None

        kpi_events = {}
        for update in supplier_kpi_updates:
            skpi = update.supplier_kpi
            related_cases = Case.objects.filter(supplier=skpi.supplier, kpis=skpi.kpi)
            calls = list(related_cases.values_list("id", flat=True))
            setattr(skpi, "calls", calls)
            if not (calls and len(calls) > 0):
                continue
            kpi_name = (
                skpi.description
                if hasattr(skpi, "description") and skpi.description
                else (
                    skpi.kpi.description
                    if skpi.kpi and skpi.kpi.description
                    else f"KPI {skpi.kpi_id}"
                )
            )
            opened_at = ensure_datetime(update.opened_at)
            closed_at = ensure_datetime(update.closed_at)
            status_name = (
                getattr(skpi.status, "name", None)
                if getattr(skpi, "status", None)
                else None
            )
            if status_name and status_name.lower() == "closed" and not closed_at:
                continue

            if not opened_at:
                continue
            if filter_start and filter_end:
                if not (filter_start < opened_at < filter_end):
                    continue
            elif filter_start:
                if not (opened_at > filter_start):
                    continue
            elif filter_end:
                if not (opened_at < filter_end):
                    continue

            end_date = closed_at if closed_at else datetime.datetime.now(pytz.UTC)
            if filter_end and end_date > filter_end:
                end_date = filter_end
            if filter_start and end_date < filter_start:
                continue
            color = "#4682B4" if closed_at else "#FFC0CB"
            opened_str = opened_at.strftime("%Y-%m-%d") if opened_at else ""
            duration_days = (end_date - opened_at).days if opened_at and end_date else 0
            if closed_at:
                closed_str = end_date.strftime("%Y-%m-%d") if end_date else ""
                tooltip = f"<div><b>{kpi_name}</b><br>Opened At: {opened_str}<br>Closed At: {closed_str}<br>Duration: {duration_days}d</div>"
            else:
                closed_str = ""
                tooltip = f"<div><b>{kpi_name}</b><br>Opened At: {opened_str}<br>Duration: {duration_days}d</div>"
            bar_row = [
                skpi.kpi.id if skpi.kpi else None,
                kpi_name,
                getattr(skpi.supplier, "id", None),
                str(skpi.supplier) if skpi.supplier else None,
                status_name,
                opened_str,
                closed_str,
                duration_days,
                color,
                tooltip,
                calls,
                "real",
            ]
            if kpi_name not in kpi_events:
                kpi_events[kpi_name] = []
            kpi_events[kpi_name].append(bar_row)

        placeholder_date = (
            filter_start if filter_start else datetime.datetime.now(pytz.UTC)
        )
        placeholder_str = placeholder_date.strftime("%Y-%m-%d")
        for kpi in kpi_types:
            kpi_name = kpi.description
            bars = kpi_events.get(kpi_name)
            if not bars:
                continue
            dummy_row = [
                kpi.id,
                kpi_name,
                None,
                None,
                None,
                placeholder_str,
                placeholder_str,
                0,
                "opacity: 0",
                "",
                [],
                "dummy",
            ]
            bars_sorted = sorted(bars, key=lambda b: b[5])
            chart_data_rows.append(dummy_row)
            for bar_row in bars_sorted:
                chart_data_rows.append(bar_row)

        chart_data = [header] + chart_data_rows
        return Response({"chartData": chart_data}, status=status.HTTP_200_OK)
