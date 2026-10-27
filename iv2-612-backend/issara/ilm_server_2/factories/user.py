import random
import factory
from django.contrib.auth.models import User
from issara.ilm_server_2.models import StrategicPartnerUser 


from .strategic_partner import StrategicPartnerFactory


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Faker('user_name')
    email = factory.Faker('email')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')

class UserWithPasswordFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Faker('user_name')
    email = factory.Faker('email')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    password = factory.PostGenerationMethodCall('set_password', 'pass')


class PartnerUserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = StrategicPartnerUser

    user = factory.SubFactory(UserFactory)
    strategic_partner = factory.SubFactory(StrategicPartnerFactory)
    email_notify = True

