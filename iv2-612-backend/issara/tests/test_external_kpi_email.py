import random

from datetime import datetime, timedelta

from django.conf import settings
from django.core import mail
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from issara.ilm_server_2.models import (
    IssueCategory,
    Kpi,
    SupplyChain,
    SupplierKpi,
    SupplierKpiUpdateStatus,
    KpiEmailNotification,
    KpiEmailNotificationTemplate,
)
import issara.ilm_server_2.factories as factories
import issara.ilm_server_2.fixtures as fixtures


client = APIClient()


class ExternalKpiEmailNotificationTest(APITestCase):
    """Test module for external kpi alert cron API"""

    def setUp(self):
        # create fat suppliers
        self.suppliers = factories.FatSupplierFactory.create_batch(5)
        self.strategicPartner = factories.StrategicPartnerFactory.create(email_notify=True)

        # create fat supply chain
        self.supply_chain = factories.FatSupplyChainFactory(strategic_partner=self.strategicPartner, suppliers=self.suppliers)

        # create 4 statuses ['Old, unresolved case', 'Closed', 'Some Progress', 'No Progress']
        self.statuses = factories.SupplierKpiStatusFactory.create_batch(4)

        # create users
        self.users = factories.UserFactory.create_batch(5)

        self.partnerUsers = factories.PartnerUserFactory.create_batch(5, strategic_partner=self.strategicPartner)

        self.partnerUserEmails = []

        for partnerUser in self.partnerUsers:
            self.partnerUserEmails.append(partnerUser.user.email)

    def test_send_kpi_email_partner_recipients_golive_is_false(self):
        """Tests that emails are not sent to Strategic partners if golive is False"""

        # create simple 15 days SP template
        template = factories.KpiEmailNotificationTemplateFactory.create(
            type="SP",
            golive=False,
            kpi_statuses=SupplierKpiUpdateStatus.objects.all(),
            days_eq=15,
            level_gte=1,
            level_lte=4,
            subject="SP 15 days",
            text=("""{{kpis}} You’re doing great!"""),
            email_to=self.users,
        )

        # update supplier KPIs' opened date to match the template
        SupplierKpi.objects.update(
            opened_at=timezone.now() - timezone.timedelta(template.days_eq)
        )

        response = client.get(reverse("external-kpi-email-cron"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # only one email sent
        self.assertEqual(len(mail.outbox), 1)
        # recipients are email_to, because golive is set to False
        self.assertEqual(
            mail.outbox[-1].to, list(template.email_to.values_list("email", flat=True))
        )

    def test_no_days_eq_golive_is_false(self):
        template = factories.KpiEmailNotificationTemplateFactory.create(
            type="SP",
            kpi_statuses=SupplierKpiUpdateStatus.objects.all(),
            level_gte=1,
            level_lte=4,
            subject="SP No Days None days level 3/4",
            text=("""{{kpis}} You’re doing great!"""),
            email_to=self.users,
        )

        # update supplier KPIs' opened date to match the template
        SupplierKpi.objects.update(
            opened_at=timezone.now() - timezone.timedelta(60)
        )

        response = client.get(reverse("external-kpi-email-cron"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(len(mail.outbox), 1)


        #golive is false so only reipients should be the template.email_to

        self.assertEqual(
            mail.outbox[-1].to,
            list(template.email_to.values_list("email", flat=True))
        )

    def test_send_kpi_email_partner_recipients_golive_is_true(self):
        """Tests that emails are sent to Strategic partners if golive is True"""

        # create simple 15 days SP template
        template = factories.KpiEmailNotificationTemplateFactory.create(
            type="SP",
            golive=True,
            kpi_statuses=SupplierKpiUpdateStatus.objects.all(),
            days_eq=15,
            level_gte=1,
            level_lte=4,
            subject="SP 15 days",
            text=("""{{kpis}} You’re doing great!"""),
            email_to=self.users,
        )

        # update supplier KPIs' opened date to match the template
        SupplierKpi.objects.update(
            opened_at=timezone.now() - timezone.timedelta(template.days_eq)
        )

        response = client.get(reverse("external-kpi-email-cron"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # only one email sent
        self.assertEqual(len(mail.outbox), 1)

        # recipients are email_to + strategic partner email
        strategic_partner_emails = self.partnerUserEmails

        self.assertEqual(
            mail.outbox[-1].to,
            list(template.email_to.values_list("email", flat=True))
            + list(strategic_partner_emails),
        )

    def test_sequence_5_15_20_30_60_70(self):
        """Consecutive emails after 15, 30 and 60 days retrospectively"""

        # create simple 15 days SP template
        template_15 = factories.KpiEmailNotificationTemplateFactory.create(
            type="SP",
            kpi_statuses=SupplierKpiUpdateStatus.objects.all(),
            days_eq=15,
            level_gte=1,
            level_lte=4,
            subject="SP 15 days",
            text=("""{{kpis}} You’re doing great!"""),
            email_to=self.users,
        )

        # create simple 30 days SP template
        template_30 = factories.KpiEmailNotificationTemplateFactory.create(
            type="SP",
            kpi_statuses=SupplierKpiUpdateStatus.objects.all(),
            days_eq=30,
            level_gte=1,
            level_lte=4,
            subject="SP 30 days",
            text=("""{{kpis}} You’re doing great!"""),
            email_to=self.users,
        )

        # # create simple 60 days SP template
        template_60 = factories.KpiEmailNotificationTemplateFactory.create(
            type="SP",
            kpi_statuses=SupplierKpiUpdateStatus.objects.all(),
            days_eq=60,
            level_gte=1,
            level_lte=4,
            subject="SP 60 days",
            text=("""{{kpis}} You’re doing great!"""),
            email_to=self.users,
        )


       

        # update supplier KPIs' opened date to not match any template
        SupplierKpi.objects.update(
            opened_at=timezone.now() - timezone.timedelta(5)
        )
        # on day 5: no emails should be sent, no notifications created
        # total after: emails == 0, notifications == 0
        response = client.get(reverse("external-kpi-email-cron"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(KpiEmailNotification.objects.count(), 0)

        # update supplier KPIs' opened date to match the 15 days template
        SupplierKpi.objects.update(
            opened_at=timezone.now() - timezone.timedelta(template_15.days_eq)
        )
        # on day 15: one email should be sent, one notification created
        # total after: emails == 1, notifications == 1
        response = client.get(reverse("external-kpi-email-cron"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(KpiEmailNotification.objects.count(), 1)

        # update supplier KPIs' opened date to not match any template
        SupplierKpi.objects.update(
            opened_at=timezone.now() - timezone.timedelta(20)
        )
        # on day 20, no emails should be sent, no notifications created
        # total after: emails == 1, notifications == 1
        response = client.get(reverse("external-kpi-email-cron"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(KpiEmailNotification.objects.count(), 1)

        # update supplier KPIs' opened date to match the 30 days template
        SupplierKpi.objects.update(
            opened_at=timezone.now() - timezone.timedelta(template_30.days_eq)
        )
        # on day 30, one email should be sent, one notification created
        # total after: emails == 2, notifications == 2
        response = client.get(reverse("external-kpi-email-cron"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(KpiEmailNotification.objects.count(), 2)

        # update supplier KPIs' opened date to match the 60 days template
        SupplierKpi.objects.update(
            opened_at=timezone.now() - timezone.timedelta(template_60.days_eq)
        )
        # on day 60, one email should be sent, one notification created
        # total after: emails == 3, notifications == 3
        response = client.get(reverse("external-kpi-email-cron"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 3)
        self.assertEqual(KpiEmailNotification.objects.count(), 3)

        # update supplier KPIs' opened date to not match any template (beyound 60)
        SupplierKpi.objects.update(
            opened_at=timezone.now() - timezone.timedelta(70)
        )
        # on day 70, no emails should be sent, no notifications created
        # total after: emails == 3, notifications == 3
        response = client.get(reverse("external-kpi-email-cron"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 3)
        self.assertEqual(KpiEmailNotification.objects.count(), 3)
