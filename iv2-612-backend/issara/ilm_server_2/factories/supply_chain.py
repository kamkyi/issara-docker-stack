import random
import factory

from issara.ilm_server_2.models import SupplyChain
from .strategic_partner import StrategicPartnerFactory
# from .supplier import FatSupplierFactory


class SupplyChainFactory(factory.django.DjangoModelFactory):
    """Supply chain without any subnested objects"""

    name = factory.Faker("company")
    strategic_partner = factory.SubFactory(StrategicPartnerFactory)

    class Meta:
        model = SupplyChain


class FatSupplyChainFactory(SupplyChainFactory):
    """Supply chain factory that generates suppliers with supplier KPIs """

    @factory.post_generation
    def suppliers(self, create, extracted, **kwargs):
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A list of suppliers were passed in, use them
            for supplier in extracted:
                self.suppliers.add(supplier)
