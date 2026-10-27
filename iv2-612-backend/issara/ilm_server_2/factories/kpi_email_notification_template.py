import random
import factory
from issara.ilm_server_2.models import KpiEmailNotificationTemplate


class KpiEmailNotificationTemplateFactory(factory.django.DjangoModelFactory):
    type = factory.Iterator(['I', 'SP'])

    # conditions
    days_eq = None
    # days_gt = None
    # days_lt = None

    # email
    subject = ''
    text = ''
    golive = False

    class Meta:
        model = KpiEmailNotificationTemplate

    @factory.post_generation
    def kpi_statuses(self, create, extracted, **kwargs):
        if not create:
            # Simple build, do nothing.
            return
        if extracted:
            # A list of statuses were passed in, use them
            for kpi_status in extracted:
                self.kpi_statuses.add(kpi_status)

    @factory.post_generation
    def email_to(self, create, extracted, **kwargs):
        if not create:
            # Simple build, do nothing.
            return
        if extracted:
            # A list of emails were passed in, use them
            for user in extracted:
                self.email_to.add(user)
