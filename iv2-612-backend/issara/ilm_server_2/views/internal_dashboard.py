from django.db import connection
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class InternalKpiDashboardView(APIView):
    """Returns internal KPI summary for the Internal team dashboard."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Allow optional filtering by unix timestamps (seconds)
        start_ts = request.GET.get("start_timestamp")
        end_ts = request.GET.get("end_timestamp")

        base_query = """
        SELECT
            sku.id,
            sku.overview_date,
            sku.closed_quality,
            sku.affected_workers,
            sku.supplier_kpi_id,
            sku.closed_at,
            DATE_FORMAT(sku.closed_at, '%%Y-%%m') AS closed_Month_Year,
            sku.opened_at,
            DATE_FORMAT(sku.opened_at, '%%Y-%%m') AS opened_Month_Year,
            sku.closed_notes,
            sku.status_id,
            sku.closure_date,
            sk.kpi_id,
            k.level,
            k.description,
            GROUP_CONCAT(DISTINCT kg.name SEPARATOR ', ') AS kpi_grouping_name,
            sk.supplier_id,
            s.name AS supplier_name,
            COALESCE(sc_data.partner_names, 'No SP') AS strategic_partners,
            COALESCE(sc_data.all_chains, 'Non Supply Chain') AS supply_chain_names,
            COALESCE(sc_data.representative_status, 'No Association') AS supply_chain_status,
            CASE
                WHEN sku.closed_at IS NULL THEN 'OPEN'
                ELSE CAST(DATEDIFF(sku.closed_at, sku.opened_at) AS CHAR)
            END AS days_to_close
        FROM
            supplier_kpi_updates sku
        INNER JOIN
            supplier_kpis sk ON sku.supplier_kpi_id = sk.id
        INNER JOIN
            kpis k ON sk.kpi_id = k.id
        LEFT JOIN
            kpi_groupings kg ON k.id = kg.kpi_id
        INNER JOIN
            suppliers s ON sk.supplier_id = s.id
        LEFT JOIN (
            SELECT
                ssc.supplier_id,
                GROUP_CONCAT(DISTINCT sp.name SEPARATOR ', ') AS partner_names,
                GROUP_CONCAT(DISTINCT sc.name SEPARATOR ', ') AS all_chains,
                CASE
                    WHEN SUM(CASE WHEN ssc.status = 'active' THEN 1 ELSE 0 END) > 0 THEN 'active'
                    ELSE MAX(ssc.status)
                END AS representative_status
            FROM
                ilm_server_2_suppliersupplychain ssc
            JOIN
                supply_chains sc ON ssc.supply_chain_id = sc.id
            JOIN
                strategic_partners sp ON sc.strategic_partner_id = sp.id
            GROUP BY
                ssc.supplier_id
        ) AS sc_data ON s.id = sc_data.supplier_id
        WHERE
            sku.status_id = 3
        """

        params = []
        # Add timestamp filters if provided
        if start_ts:
            try:
                int(start_ts)
                base_query += "\n            AND sku.closed_at >= FROM_UNIXTIME(%s)"
                params.append(start_ts)
            except (TypeError, ValueError):
                pass

        if end_ts:
            try:
                int(end_ts)
                base_query += "\n            AND sku.closed_at <= FROM_UNIXTIME(%s)"
                params.append(end_ts)
            except (TypeError, ValueError):
                pass

        # finalize grouping
        base_query += "\n        GROUP BY\n            sku.id;"

        with connection.cursor() as cursor:
            cursor.execute(base_query, params)
            cols = [c[0] for c in cursor.description] if cursor.description else []
            rows = [dict(zip(cols, row)) for row in cursor.fetchall()]

        return Response(rows)
