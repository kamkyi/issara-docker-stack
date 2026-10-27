import random
import factory
from issara.ilm_server_2.models import District
from .province import ProvinceFactory


class DistrictFactory(factory.django.DjangoModelFactory):
    name = factory.Faker('city')
    province = factory.SubFactory(ProvinceFactory)

    class Meta:
        model = District
