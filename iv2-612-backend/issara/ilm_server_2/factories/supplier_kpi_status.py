import random
import factory

from issara.ilm_server_2.models import SupplierKpiUpdateStatus


statuses = [
    'Old, unresolved case',
	'Closed',
	'Some Progress',
	'No Progress'
]

class SupplierKpiStatusFactory(factory.django.DjangoModelFactory):
    name = factory.Iterator(statuses)

    class Meta:
        model = SupplierKpiUpdateStatus
        django_get_or_create = ('name',)
