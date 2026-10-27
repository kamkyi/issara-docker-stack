from datetime import datetime, timedelta

from django.db.models import (
    Case,
    DateTimeField,
    ExpressionWrapper,
    F,
    IntegerField,
    Q,
    When,
)
from django.db.models.functions import Now, TruncDate


def annotate_days_active(queryset):
    """
    Add days_active annotation to a queryset.

    This calculates how many days a KPI has been active by:
    - For closed KPIs: the difference between closed_at and opened_at
    - For open KPIs: the difference between current date and opened_at
    """
    return queryset.annotate(
        closed_date=TruncDate("closed_at"),
        days_active=Case(
            When(
                closed_at__isnull=False,
                then=ExpressionWrapper(
                    (F("closed_date") - F("opened_at")) / timedelta(days=1),
                    output_field=IntegerField(),
                ),
            ),
            When(
                closed_at__isnull=True,
                then=ExpressionWrapper(
                    (TruncDate(Now()) - F("opened_at")) / timedelta(days=1),
                    output_field=IntegerField(),
                ),
            ),
            default=0,
            output_field=IntegerField(),
        ),
    )


def filter_queryset_by_date(queryset, name, value, model):
    """
    Generic date filter that works for both DateField and DateTimeField.

    Supported formats:
    - YYYY        -> Filters between the start and end of the year.
    - YYYY-MM     -> Filters between the start and end of the month.
    - YYYY-MM-DD  -> Filters on that specific day.
    """
    try:
        model_field = model._meta.get_field(name)

        if len(value) == 10:  # Format: YYYY-MM-DD
            date = datetime.strptime(value, "%Y-%m-%d").date()
            if isinstance(model_field, DateTimeField):
                return queryset.filter(Q(**{f"{name}__date": date}))
            return queryset.filter(Q(**{name: date}))

        elif len(value) == 7:  # Format: YYYY-MM
            date = datetime.strptime(value, "%Y-%m").date()
            start_date = date.replace(day=1)
            if date.month == 12:
                end_date = date.replace(month=12, day=31)
            else:
                next_month = date.replace(month=date.month + 1, day=1)
                end_date = next_month - timedelta(days=1)

            if isinstance(model_field, DateTimeField):
                return queryset.filter(
                    Q(**{f"{name}__date__range": (start_date, end_date)})
                )
            return queryset.filter(Q(**{f"{name}__range": (start_date, end_date)}))

        elif len(value) == 4:  # Format: YYYY
            year = int(value)
            start_date = datetime(year, 1, 1).date()
            end_date = datetime(year, 12, 31).date()

            if isinstance(model_field, DateTimeField):
                return queryset.filter(
                    Q(**{f"{name}__date__range": (start_date, end_date)})
                )
            return queryset.filter(Q(**{f"{name}__range": (start_date, end_date)}))

    except ValueError:
        return queryset  # If parsing fails, return unfiltered queryset

    return queryset
