import random
import factory
from issara.ilm_server_2.models import KpiCategory
from .issue_category import IssueCategoryFactory


class KPICategoryFactory(factory.django.DjangoModelFactory):
    name = factory.Sequence(lambda n: 'kpi_category_%d' % (n + 1))
    issue_category = factory.SubFactory(IssueCategoryFactory)

    class Meta:
        model = KpiCategory
