import random
import factory
from issara.ilm_server_2.models import Kpi
from .kpi_category import KPICategoryFactory


class KPIFactory(factory.django.DjangoModelFactory):
    description = factory.Sequence(lambda n: "kpi_%d" % (n + 1))
    level = factory.LazyAttribute(lambda x: random.randrange(1, 4))
    kpi_category = factory.SubFactory(KPICategoryFactory)

    class Meta:
        model = Kpi
