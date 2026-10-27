import random
import factory
from issara.ilm_server_2.models import Province
from .country import CountryFactory


class ProvinceFactory(factory.django.DjangoModelFactory):
    name = factory.Faker('state')
    country = factory.SubFactory(CountryFactory)

    class Meta:
        model = Province
