class KPIUpdateStatus:
    """Constants for KPI Update Status choices"""

    NO_PROGRESS = 1
    IN_PROGRESS = 2
    CLOSED = 3
    OLD_UNRESOLVED = 4


class ChartColors:
    """Constants for chart visualization colors"""

    GAP = "#F0F8FF"  # Light blue for gaps
    OPEN = "#FFC0CB"  # Pink for open KPIs
    CLOSED = "#F0F8FF"  # Light blue for closed KPIs
    FUTURE = "grey"
