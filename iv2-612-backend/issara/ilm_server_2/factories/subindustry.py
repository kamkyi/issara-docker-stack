import random
import factory
from issara.ilm_server_2.models import SubIndustry
from .industry import IndustryFactory


class SubIndustryFactory(factory.django.DjangoModelFactory):
    name = factory.Sequence(lambda n: 'subindustry_%d' % (n + 1))
    industry = factory.SubFactory(IndustryFactory)

    class Meta:
        model = SubIndustry
