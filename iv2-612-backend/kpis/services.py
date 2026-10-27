from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .constants import ChartColors, KPIUpdateStatus
from .exceptions import InvalidDateFormatError
from .models import SupplierKpi, SupplierKpiUpdate


class KPITimelineService:
    """Service class to handle KPI timeline data processing"""

    def __init__(self, start_time: str, end_time: str):
        self.start_time = self._parse_datetime(start_time)
        self.end_time = self._parse_datetime(end_time)
        self.start_time_str = start_time
        self.end_time_str = end_time

    def _parse_datetime(self, date_str: str) -> datetime:
        """Parse datetime string with proper error handling"""
        try:
            # Try different datetime formats
            formats = ["%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"]

            for fmt in formats:
                try:
                    return timezone.datetime.strptime(date_str, fmt)
                except ValueError:
                    continue

            # If none work, try Django's parse_datetime
            parsed = parse_datetime(date_str)
            if parsed:
                return parsed

            raise InvalidDateFormatError(f"Invalid date format: {date_str}")

        except Exception as e:
            raise InvalidDateFormatError(f"Error parsing date {date_str}: {str(e)}")

    def build_kpi_updates_map(
        self, queryset
    ) -> Dict[int, Dict[str, Dict[str, Optional[str]]]]:
        """Build a map of KPI updates organized by supplier_kpi_id and opened_at"""
        kpi_updates_map = {}

        # Pre-fetch supplier KPI data to avoid N+1 queries
        supplier_kpi_data = self._get_supplier_kpi_data(queryset)

        for kpi_update in queryset:
            if not self._should_include_update(kpi_update, supplier_kpi_data):
                continue

            supplier_kpi_id = kpi_update.supplier_kpi_id
            opened_at = kpi_update.opened_at.isoformat()
            closed_at = self._get_closed_at_value(kpi_update, supplier_kpi_data)

            kpi_updates_map.setdefault(supplier_kpi_id, {})[opened_at] = {
                "closed_at": closed_at
            }

        return kpi_updates_map

    def _get_supplier_kpi_data(self, queryset) -> Dict[int, SupplierKpi]:
        """Pre-fetch supplier KPI data to avoid N+1 queries"""
        supplier_kpi_ids = queryset.values_list("supplier_kpi_id", flat=True)
        return {
            kpi.id: kpi
            for kpi in SupplierKpi.objects.filter(
                id__in=supplier_kpi_ids
            ).select_related("kpi", "status")
        }

    def _should_include_update(
        self, kpi_update, supplier_kpi_data: Dict[int, SupplierKpi]
    ) -> bool:
        """Determine if a KPI update should be included based on business rules"""
        current_kpi = supplier_kpi_data.get(kpi_update.supplier_kpi_id)

        if not current_kpi or not kpi_update.status:
            return False

        # Skip NO_PROGRESS or OLD_UNRESOLVED updates for closed KPIs without closed_at
        if (
            kpi_update.status.id
            in [KPIUpdateStatus.NO_PROGRESS, KPIUpdateStatus.OLD_UNRESOLVED]
            and current_kpi.status.id == KPIUpdateStatus.CLOSED
            and not kpi_update.closed_at
        ):
            return False

        return True

    def _get_closed_at_value(
        self, kpi_update, supplier_kpi_data: Dict[int, SupplierKpi]
    ) -> Optional[str]:
        """Get the appropriate closed_at value based on business rules"""
        current_kpi = supplier_kpi_data.get(kpi_update.supplier_kpi_id)

        if (
            current_kpi
            and current_kpi.status.id == KPIUpdateStatus.OLD_UNRESOLVED
            and not current_kpi.closed_at
        ):
            return (
                kpi_update.overview_date.isoformat()
                if kpi_update.overview_date
                else None
            )

        return kpi_update.closed_at.isoformat() if kpi_update.closed_at else None

    def generate_chart_data(
        self, kpi_updates_map: Dict, supplier_kpi_descriptions: Dict[int, str]
    ) -> List[List]:
        """Generate chart data from KPI updates map"""
        chart_data = []

        for supplier_kpi_id, kpi_history in kpi_updates_map.items():
            name = supplier_kpi_descriptions.get(supplier_kpi_id, "Unknown KPI")
            chart_data.extend(self._generate_timeline_bars(name, kpi_history))

        return chart_data

    def _generate_timeline_bars(
        self, name: str, kpi_history: Dict[str, Dict[str, Optional[str]]]
    ) -> List[List]:
        """Generate timeline bars for a single KPI"""
        bars = []
        sorted_history = dict(sorted(kpi_history.items()))
        previous_bar_end_time = self.start_time

        for index, (opened_at_str, kpi_data) in enumerate(sorted_history.items()):
            opened_at = self._parse_datetime(opened_at_str)

            # Add gap bar if needed
            gap_bar = self._create_gap_bar(name, previous_bar_end_time, opened_at)
            if gap_bar:
                bars.append(gap_bar)

            # Add main KPI bar
            main_bar, bar_end = self._create_main_bar(
                name, opened_at, kpi_data["closed_at"]
            )
            bars.append(main_bar)
            previous_bar_end_time = bar_end

            # Add final bars for the last entry
            if index == len(sorted_history) - 1:
                bars.extend(
                    self._create_final_bars(name, bar_end, kpi_data["closed_at"])
                )

        return bars

    def _create_gap_bar(
        self, name: str, start_time: datetime, end_time: datetime
    ) -> Optional[List]:
        """Create a gap bar between KPI periods"""
        if start_time >= end_time:
            end_time = start_time + timedelta(days=30)

        if end_time > start_time:
            return [name, "", ChartColors.GAP, start_time, end_time]

        return None

    def _create_main_bar(
        self, name: str, opened_at: datetime, closed_at_str: Optional[str]
    ) -> Tuple[List, datetime]:
        """Create the main KPI bar"""
        bar_start = opened_at

        if closed_at_str:
            bar_end = self._parse_datetime(closed_at_str)
            if bar_end.date() > self.end_time.date():
                bar_end = timezone.datetime.combine(
                    self.end_time.date(), timezone.datetime.max.time()
                )
        elif timezone.now().date() < self.end_time.date():
            bar_end = timezone.now()
        else:
            bar_end = timezone.datetime.combine(
                self.end_time.date(), timezone.datetime.max.time()
            )

        if bar_start > bar_end:
            bar_end = bar_start + timedelta(days=30)

        bar = [name, "", ChartColors.OPEN, bar_start, bar_end]
        return bar, bar_end

    def _create_final_bars(
        self, name: str, last_bar_end: datetime, closed_at_str: Optional[str]
    ) -> List[List]:
        """Create final bars for timeline completion"""
        bars = []

        # Determine status color
        status_color = ChartColors.CLOSED if closed_at_str else ChartColors.OPEN

        # Current status bar
        current_end = (
            timezone.now().replace(microsecond=0) + timedelta(hours=1)
            if timezone.now().date() < self.end_time.date()
            else timezone.datetime.combine(
                self.end_time.date(), timezone.datetime.max.time()
            )
            + timedelta(days=1)
        )

        bars.append([name, "", status_color, last_bar_end, current_end])

        # Future timeline bar
        if timezone.now().date() < self.end_time.date():
            future_start = timezone.now().replace(microsecond=0) + timedelta(hours=1)
            future_end = timezone.datetime.combine(
                self.end_time.date(), timezone.datetime.max.time()
            )
            bars.append([name, "", ChartColors.FUTURE, future_start, future_end])

        return bars
