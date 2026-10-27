from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.settings import api_settings
from django.db.models import Prefetch
from authkit import WorkOSAuthKitAuthentication


class SupplierKpiTimelineDataAPIView(APIView):
    """
    Returns detailed rows for supplier KPI timeline data.
    Query params: supplier_id, kpi_category_id, start_time, end_time
    """

    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        from kpis.models import SupplierKpiUpdate, Kpi
        from issara.ilm_server_2.models import SupplierSupplyChain, Case
        from django.utils.dateparse import parse_datetime, parse_date
        import datetime
        import pytz

        supplier_id = request.query_params.get("supplier_id")
        kpi_category_id = request.query_params.get("kpi_category_id")
        start_time = request.query_params.get("start_time")
        end_time = request.query_params.get("end_time")

        def to_datetime(d):
            if d is None:
                return None
            if isinstance(d, datetime.datetime):
                return d if d.tzinfo else d.replace(tzinfo=pytz.UTC)
            if isinstance(d, datetime.date):
                return datetime.datetime(d.year, d.month, d.day, tzinfo=pytz.UTC)
            try:
                dt = parse_datetime(d)
                if dt:
                    return dt if dt.tzinfo else dt.replace(tzinfo=pytz.UTC)
            except Exception:
                pass
            try:
                d2 = parse_date(d)
                if d2:
                    return datetime.datetime(d2.year, d2.month, d2.day, tzinfo=pytz.UTC)
            except Exception:
                pass
            return None

        filter_start = to_datetime(start_time)
        filter_end = to_datetime(end_time)

        update_filter = {}
        if supplier_id:
            update_filter["supplier_kpi__supplier_id"] = supplier_id
        if kpi_category_id:
            update_filter["supplier_kpi__kpi__kpi_category_id"] = kpi_category_id

        updates = SupplierKpiUpdate.objects.filter(**update_filter).select_related(
            "supplier_kpi",
            "supplier_kpi__supplier",
            "supplier_kpi__kpi",
            "supplier_kpi__status",
        )

        now = datetime.datetime.now(pytz.UTC)
        ytd_start = datetime.datetime(now.year, 1, 1, tzinfo=pytz.UTC)

        rows = []
        for u in updates:
            skpi = u.supplier_kpi
            related_case_ids = Case.objects.filter(
                supplier=skpi.supplier, kpis=skpi.kpi
            ).values_list("id", flat=True)
            if not related_case_ids:
                continue

            opened_dt = to_datetime(u.opened_at)
            closed_dt = to_datetime(u.closed_at)

            if filter_start or filter_end:
                if filter_end and opened_dt and opened_dt > filter_end:
                    continue
                if filter_start and closed_dt and closed_dt < filter_start:
                    continue

            supplier_obj = getattr(skpi, "supplier", None)
            supplier_name = getattr(supplier_obj, "name", None)

            sc = (
                SupplierSupplyChain.objects.filter(supplier=supplier_obj)
                .select_related("supply_chain")
                .first()
            )
            supply_chain_name = None
            if sc and getattr(sc, "supply_chain", None):
                supply_chain_name = getattr(sc.supply_chain, "name", None)

            strategic_partner_name = None
            sp = getattr(supplier_obj, "strategic_partner", None)
            if sp:
                strategic_partner_name = (
                    getattr(sp, "name", None) if hasattr(sp, "name") else str(sp)
                )

            kpi_grouping = None
            if getattr(skpi, "kpi", None):
                kpi = skpi.kpi
                grp = getattr(kpi, "kpi_groupings", None)
                if grp:
                    first_grp = grp.first()
                    if first_grp:
                        kpi_grouping = getattr(first_grp, "name", None)

            days_taken_to_close = None
            if opened_dt and closed_dt:
                days_taken_to_close = (closed_dt.date() - opened_dt.date()).days

            active_start = opened_dt
            active_end = closed_dt or now
            days_open_ytd = None
            if active_start and active_end:
                overlap_start = max(active_start, ytd_start)
                overlap_end = min(active_end, now)
                if overlap_end >= overlap_start:
                    days_open_ytd = (overlap_end.date() - overlap_start.date()).days

            row = {
                "id": u.id,
                "supplier_id": getattr(supplier_obj, "id", None),
                "supplier_name": supplier_name,
                "supply_chain_name": supply_chain_name,
                "strategic_partner_name": strategic_partner_name,
                "status": (
                    getattr(skpi.status, "name", None)
                    if getattr(skpi, "status", None)
                    else None
                ),
                "supplier_kpi_id": skpi.id,
                "KPI Level": (
                    getattr(skpi.kpi, "level", None)
                    if getattr(skpi, "kpi", None)
                    else None
                ),
                "KPI Description": (
                    getattr(skpi.kpi, "description", None)
                    if getattr(skpi, "kpi", None)
                    else None
                ),
                "KPI Grouping": kpi_grouping,
                "closed_at": closed_dt.isoformat() if closed_dt else None,
                "closed_Month_Year": closed_dt.strftime("%Y-%m") if closed_dt else None,
                "opened_at": opened_dt.isoformat() if opened_dt else None,
                "opened_Month_Year": opened_dt.strftime("%Y-%m") if opened_dt else None,
                "status_id": getattr(skpi, "status_id", None),
                "# of days taken to close": days_taken_to_close,
                "# of days open (YTD)": days_open_ytd,
                "closed_quality": getattr(u, "closed_quality", None),
                "affected_workers": getattr(u, "affected_workers", None),
                "closed_notes": getattr(u, "closed_notes", None),
            }
            rows.append(row)

        return Response({"rows": rows}, status=status.HTTP_200_OK)
