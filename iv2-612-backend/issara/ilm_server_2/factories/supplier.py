import random
import factory

from issara.ilm_server_2.models import Supplier
from .industry import IndustryFactory
from .subindustry import SubIndustryFactory
from .country import CountryFactory
from .province import ProvinceFactory
from .district import DistrictFactory
from .supply_chain import SupplyChainFactory


class SupplierFactory(factory.django.DjangoModelFactory):
    name = factory.Faker('company')
    address = factory.Faker('address')
    contact_name = factory.Faker('first_name')
    contact_phone = factory.Faker('phone_number')
    contact_email = factory.Faker('email')

    industry = factory.SubFactory(IndustryFactory)
    subindustry = factory.SubFactory(SubIndustryFactory)
    country = factory.SubFactory(CountryFactory)
    province = factory.SubFactory(ProvinceFactory)
    district = factory.SubFactory(DistrictFactory)

    class Meta:
        model = Supplier


class FatSupplierFactory(SupplierFactory):
    kpis = factory.RelatedFactoryList(
        "issara.ilm_server_2.factories.supplier_kpi.SupplierKpiFactory",
        factory_related_name="supplier",
        size=5,
    )
