from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class RemediationMetricsView(APIView):
    """Returns remediation metrics from closed KPI updates starting from 2026.
    
    Metrics include:
    1. Affected Workers
    2. Remediation for Recruitment Fees and Cases in USD
    
    All currency amounts are converted to USD.
    """

    permission_classes = [AllowAny]

    # Currency conversion rates to USD (approximate rates as of 2026)
    # These should ideally come from a configuration or external service
    CURRENCY_RATES = {
        'baht': 0.029,      # 1 Thai Baht = ~0.029 USD
        'kyat': 0.00048,    # 1 Myanmar Kyat = ~0.00048 USD
        'ringitt': 0.22,    # 1 Malaysian Ringgit = ~0.22 USD
    }

    def get(self, request):
        # Query parameters for date filtering
        # Option 1: Unix timestamps
        start_ts = request.GET.get("start_timestamp")
        end_ts = request.GET.get("end_timestamp")
        
        # Option 2: Year and month (more user-friendly)
        start_year = request.GET.get("start_year")
        start_month = request.GET.get("start_month")
        end_year = request.GET.get("end_year")
        end_month = request.GET.get("end_month")

        base_query = """
        SELECT
            DATE_FORMAT(sku.closed_at, '%%Y-%%m') AS month_year,
            YEAR(sku.closed_at) AS closed_year,
            MONTH(sku.closed_at) AS closed_month,
            SUM(sku.affected_workers) AS affected_workers,
            SUM(CASE 
                WHEN sku.remediation_paid_usd > 0 THEN sku.remediation_paid_usd
                ELSE (
                    (sku.remediation_paid_baht / 32) +    
                    (sku.remediation_paid_kyat / 3500) + 
                    (sku.remediation_paid_ringitt * 0.25)    
                )
            END) AS remediation_paid_usd
        FROM
            supplier_kpi_updates sku
        INNER JOIN (
            SELECT MAX(id) as latest_id
            FROM supplier_kpi_updates
            WHERE status_id = 3
        """

        params = {} # Currency rates are now hardcoded in the query, so remove them from params

        # Default to 2026-01-01 if no filters provided
        has_date_filter = False
        date_filter_query = ""
        
        # Add year/month start filter
        if start_year and start_month:
            try:
                year = int(start_year)
                month = int(start_month)
                if 1 <= month <= 12:
                    date_filter_query += "\n            AND closed_at >= %(start_date)s"
                    params['start_date'] = f"{year:04d}-{month:02d}-01"
                    has_date_filter = True
            except (TypeError, ValueError):
                pass
        elif start_year:
            try:
                year = int(start_year)
                date_filter_query += "\n            AND closed_at >= %(start_date)s"
                params['start_date'] = f"{year:04d}-01-01"
                has_date_filter = True
            except (TypeError, ValueError):
                pass
        
        # Add year/month end filter
        if end_year and end_month:
            try:
                year = int(end_year)
                month = int(end_month)
                if 1 <= month <= 12:
                    # Set to last day of the month
                    if month == 12:
                        next_month_date = f"{year + 1:04d}-01-01"
                    else:
                        next_month_date = f"{year:04d}-{month + 1:02d}-01"
                    date_filter_query += "\n            AND closed_at < %(end_date)s"
                    params['end_date'] = next_month_date
                    has_date_filter = True
            except (TypeError, ValueError):
                pass
        elif end_year:
            try:
                year = int(end_year)
                date_filter_query += "\n            AND closed_at < %(end_date)s"
                params['end_date'] = f"{year + 1:04d}-01-01"
                has_date_filter = True
            except (TypeError, ValueError):
                pass

        # Add timestamp filters if provided (override year/month if both present)
        if start_ts:
            try:
                int(start_ts)
                date_filter_query += "\n            AND closed_at >= FROM_UNIXTIME(%(start_ts)s)"
                params['start_ts'] = start_ts
                has_date_filter = True
            except (TypeError, ValueError):
                pass

        if end_ts:
            try:
                int(end_ts)
                date_filter_query += "\n            AND closed_at <= FROM_UNIXTIME(%(end_ts)s)"
                params['end_ts'] = end_ts
                has_date_filter = True
            except (TypeError, ValueError):
                pass
        
        # If no date filter provided, default to 2026 onwards
        if not has_date_filter:
            date_filter_query += "\n            AND closed_at >= '2026-01-01'"

        # Apply date filters inside subquery for deduplication
        base_query += date_filter_query
        
        # Complete subquery and main query conditions
        base_query += """
            GROUP BY supplier_kpi_id, closed_at
        ) latest ON sku.id = latest.latest_id
        WHERE
            sku.closed_quality IS NOT NULL 
            AND sku.closed_quality != 'Poor'
        GROUP BY 
            month_year, closed_year, closed_month
        ORDER BY
            closed_year DESC, closed_month DESC;
        """

        with connection.cursor() as cursor:
            cursor.execute(base_query, params)
            cols = [c[0] for c in cursor.description] if cursor.description else []
            rows = cursor.fetchall()
            
            # Transform results
            result = []
            for row in rows:
                data = dict(zip(cols, row))
                
                result.append({
                    'month_year': data.get('month_year'),
                    'closed_year': int(data.get('closed_year') or 0),
                    'closed_month': str(data.get('closed_month')).zfill(2),
                    'affected_workers': int(data.get('affected_workers') or 0),
                    'remediation_paid_usd': round(float(data.get('remediation_paid_usd') or 0), 2),
                })

        return Response(result)
