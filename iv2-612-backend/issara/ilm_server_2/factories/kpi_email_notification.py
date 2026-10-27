import random
import factory
from issara.ilm_server_2.models import KpiEmailNotification
from .supplier_kpi import SupplierKpiFactory
from .kpi_email_notification_template import KpiEmailNotificationTemplateFactory


class KpiEmailNotificationFactory(factory.django.DjangoModelFactory):
    type = factory.SubFactory(KpiEmailNotificationTemplateFactory)
    supplier_kpi = factory.SubFactory(SupplierKpiFactory)

    class Meta:
        model = KpiEmailNotification
