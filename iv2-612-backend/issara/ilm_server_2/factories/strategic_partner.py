import random
import factory

from issara.ilm_server_2.models import StrategicPartner
from .country import CountryFactory


class StrategicPartnerFactory(factory.django.DjangoModelFactory):
    name = factory.Faker('company')
    address = factory.Faker('address')
    focal_point_name = factory.Faker('first_name')
    focal_point_phone_number = factory.Faker('phone_number')
    focal_point_email = factory.Faker('email')
    email_notify = factory.Faker('email_notify')

    country = factory.SubFactory(CountryFactory)

    class Meta:
        model = StrategicPartner
