import random
import factory
from issara.ilm_server_2.models import Country


class CountryFactory(factory.django.DjangoModelFactory):
    name = factory.Faker('country')

    class Meta:
        model = Country
