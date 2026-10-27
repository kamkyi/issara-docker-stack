from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from issara.ilm_server_2.models import Case


def get_cached_cases():
    cache_key = "all_cases"
    cases = cache.get(cache_key)
    if cases is None:
        cases = (
            Case.objects.all().values_list("supplier_kpis__id", flat=True).distinct()
        )
        cache.set(cache_key, cases, timeout=settings.CACHE_TIMEOUT)
    return cases


def get_cases_by_organization(organization_id):
    all_cases = get_cached_cases()
    organization_cases = (
        Case.objects.filter(
            Q(case_created_by__organization_user__organization_id=organization_id)
            | Q(refer_to_org_id=organization_id)
        )
        .values_list("supplier_kpis__id", flat=True)
        .distinct()
    )

    # Filter cached cases by organization
    filtered_cases = set(all_cases).intersection(set(organization_cases))
    return list(filtered_cases)
