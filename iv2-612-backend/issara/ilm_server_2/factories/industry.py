import random
import factory
from issara.ilm_server_2.models import Industry


class IndustryFactory(factory.django.DjangoModelFactory):
    name = factory.Sequence(lambda n: 'industry_%d' % (n + 1))

    class Meta:
        model = Industry
