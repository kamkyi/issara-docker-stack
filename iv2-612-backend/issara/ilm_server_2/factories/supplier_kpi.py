import random

import factory
import factory.fuzzy
from django.utils import timezone

from issara.ilm_server_2.models import SupplierKpi
from .supplier import SupplierFactory
from .kpi import KPIFactory
from .supplier_kpi_status import SupplierKpiStatusFactory


class SupplierKpiFactory(factory.django.DjangoModelFactory):
    supplier = factory.SubFactory(SupplierFactory)
    kpi = factory.SubFactory(KPIFactory)
    status = factory.SubFactory(SupplierKpiStatusFactory)

    # opened in range: 70 days ago till today
    opened_at = factory.fuzzy.FuzzyDateTime(timezone.now() - timezone.timedelta(days=70), timezone.now())

    class Meta:
        model = SupplierKpi
