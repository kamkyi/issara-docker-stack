from datetime import datetime, timedelta

from django.urls import reverse
from django.core import mail
from django.conf import settings

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
import issara.ilm_server_2.fixtures as fixtures
import issara.ilm_server_2.factories as factories


# initialize the APIClient app
client = APIClient()


class KpiEmailNotificationTest(APITestCase):
    """Test module for internal kpi alert cron API"""

    def setUp(self):
        # statuses
        self.statuses = factories.SupplierKpiStatusFactory.create_batch(4)

        # users
        self.user1 = factories.UserFactory(email="andrei@issarainstitute.org")
        self.user2 = factories.UserFactory(email="pete@issarainstitute.org")

    def test_internal_kpi_email_notifications(self):
        # kpi email template
        template = factories.KpiEmailNotificationTemplateFactory.create(
            type="I",
            kpi_statuses=SupplierKpiUpdateStatus.objects.exclude(name="Closed"),
            days_eq=10,
            level_gte=1,
            level_lte=4,
            subject="ILM Heads-Up: Cases changing black to yellow",
            text=(
                """
            Dear ILM Management Team,

            Please be advised of the following black “safe space” cases reaching Day 10 today, meaning that they will transition to yellow “early efforts” cases in 5 days if they are not resolved by then

            {{kpis}}

            You’re doing great!
            """
            ),
            email_to=[self.user1, self.user2],
        )

        no_progress_kpi = factories.SupplierKpiFactory(
            status__name="No Progress",
            kpi__level=1,
            opened_at=(datetime.now() - timedelta(days=template.days_eq)),
        )
        some_progress_kpi = factories.SupplierKpiFactory(
            status__name="Some Progress",
            kpi__level=3,
            opened_at=(datetime.now() - timedelta(days=template.days_eq)),
        )

        response = client.get(reverse("internal-kpi-email-cron"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[-1].subject, template.subject)
        self.assertEqual(
            mail.outbox[-1].to, list(template.email_to.values_list("email", flat=True))
        )

        notifications = KpiEmailNotification.objects.all()
        self.assertEqual(notifications.count(), 1)
        self.assertEqual(notifications.last().template, template)
        self.assertEqual(
            list(notifications.last().supplier_kpis.all()),
            [no_progress_kpi, some_progress_kpi],
        )
        self.assertEqual(
            list(notifications.last().recipients.all()), list(template.email_to.all())
        )

        # test if send the same notification second time
        response = client.get(reverse("internal-kpi-email-cron"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # outbox should contain only previos email, thus new email wasn't sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(notifications.count(), 1)

    def test_internal_kpi_email_notifications_not_matching_filters(self):
        template = factories.KpiEmailNotificationTemplateFactory.create(
            type="I",
            kpi_statuses=SupplierKpiUpdateStatus.objects.exclude(name="Closed"),
            days_eq=10,
            subject="ILM Heads-Up: Cases changing black to yellow",
            text=(
                """
            Dear ILM Management Team,

            Please be advised of the following black “safe space” cases reaching Day 10 today, meaning that they will transition to yellow “early efforts” cases in 5 days if they are not resolved by then

            {{kpis}}

            You’re doing great!
            """
            ),
            email_to=[self.user1, self.user2],
        )

        kpi_before_one_day = factories.SupplierKpiFactory(
            status__name="Some Progress",
            opened_at=(datetime.now() - timedelta(days=template.days_eq - 1)),
        )
        kpi_after_one_day = factories.SupplierKpiFactory(
            status__name="Some Progress",
            opened_at=(datetime.now() - timedelta(days=template.days_eq + 1)),
        )

        response = client.get(reverse("internal-kpi-email-cron"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

        notifications = KpiEmailNotification.objects.all()
        self.assertEqual(notifications.count(), 0)

    def test_internal_kpi_email_notification_closed(self):
        template = factories.KpiEmailNotificationTemplateFactory.create(
            type="I",
            kpi_statuses=SupplierKpiUpdateStatus.objects.filter(name="Closed"),
            subject="ILM Heads-Up: Case closed",
            text=(
                """
            Dear ILM Management Team,

            Please be advised of the following black “safe space” cases reaching Day 10 today, meaning that they will transition to yellow “early efforts” cases in 5 days if they are not resolved by then

            {{kpis}}

            You’re doing great!
            """
            ),
            email_to=[self.user1, self.user2],
        )

        closed_kpi_1 = factories.SupplierKpiFactory(status__name="Closed")
        closed_kpi_2 = factories.SupplierKpiFactory(status__name="Closed")

        response = client.get(reverse("internal-kpi-email-cron"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

        notifications = KpiEmailNotification.objects.all()

        self.assertEqual(notifications.count(), 1)
        self.assertEqual(notifications.last().template, template)
        self.assertEqual(
            list(notifications.last().supplier_kpis.all()), [closed_kpi_1, closed_kpi_2]
        )
        self.assertEqual(
            list(notifications.last().recipients.all()), list(template.email_to.all())
        )

        # check that dupllicate notification won't be sent
        response = client.get(reverse("internal-kpi-email-cron"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

        # assume the closed kpi was reopened and closed again in the future,
        # we should get the notification again
        closed_kpi_1.opened_at += timedelta(days=80)
        closed_kpi_1.save()

        response = client.get(reverse("internal-kpi-email-cron"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(notifications.count(), 2)
        self.assertEqual(notifications.last().template, template)
        self.assertEqual(list(notifications.last().supplier_kpis.all()), [closed_kpi_1])
        self.assertEqual(
            list(notifications.last().recipients.all()), list(template.email_to.all())
        )

    def test_level_eq_true(self):
        # kpi email template
        template = factories.KpiEmailNotificationTemplateFactory.create(
            type="I",
            kpi_statuses=SupplierKpiUpdateStatus.objects.exclude(name="Closed"),
            level_eq=2,
            subject="subject",
            text="text",
            email_to=[self.user1, self.user2],
        )

        no_progress_kpi = factories.SupplierKpiFactory(
            status__name="No Progress",
            kpi__level=2,
        )

        response = client.get(reverse("internal-kpi-email-cron"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

        notifications = KpiEmailNotification.objects.all()
        self.assertEqual(notifications.count(), 1)

    def test_level_eq_false(self):
        # kpi email template
        template = factories.KpiEmailNotificationTemplateFactory.create(
            type="I",
            kpi_statuses=SupplierKpiUpdateStatus.objects.exclude(name="Closed"),
            level_eq=2,
            subject="subject",
            text="text",
            email_to=[self.user1, self.user2],
        )

        no_progress_kpi = factories.SupplierKpiFactory(
            status__name="No Progress",
            kpi__level=1,
        )

        response = client.get(reverse("internal-kpi-email-cron"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

        notifications = KpiEmailNotification.objects.all()
        self.assertEqual(notifications.count(), 0)

    def test_level_gte_true(self):
        # kpi email template
        template = factories.KpiEmailNotificationTemplateFactory.create(
            type="I",
            kpi_statuses=SupplierKpiUpdateStatus.objects.exclude(name="Closed"),
            level_gte=2,
            subject="subject",
            text="text",
            email_to=[self.user1, self.user2],
        )

        no_progress_kpi = factories.SupplierKpiFactory(
            status__name="No Progress",
            kpi__level=3,
        )

        response = client.get(reverse("internal-kpi-email-cron"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

        notifications = KpiEmailNotification.objects.all()
        self.assertEqual(notifications.count(), 1)

    def test_level_gte_false(self):
        # kpi email template
        template = factories.KpiEmailNotificationTemplateFactory.create(
            type="I",
            kpi_statuses=SupplierKpiUpdateStatus.objects.exclude(name="Closed"),
            level_gte=2,
            subject="subject",
            text="text",
            email_to=[self.user1, self.user2],
        )

        no_progress_kpi = factories.SupplierKpiFactory(
            status__name="No Progress",
            kpi__level=1,
        )

        response = client.get(reverse("internal-kpi-email-cron"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

        notifications = KpiEmailNotification.objects.all()
        self.assertEqual(notifications.count(), 0)

    def test_level_lte_true(self):
        # kpi email template
        template = factories.KpiEmailNotificationTemplateFactory.create(
            type="I",
            kpi_statuses=SupplierKpiUpdateStatus.objects.exclude(name="Closed"),
            level_lte=2,
            subject="subject",
            text="text",
            email_to=[self.user1, self.user2],
        )

        no_progress_kpi = factories.SupplierKpiFactory(
            status__name="No Progress",
            kpi__level=1,
        )

        response = client.get(reverse("internal-kpi-email-cron"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

        notifications = KpiEmailNotification.objects.all()
        self.assertEqual(notifications.count(), 1)

    def test_level_lte_false(self):
        # kpi email template
        template = factories.KpiEmailNotificationTemplateFactory.create(
            type="I",
            kpi_statuses=SupplierKpiUpdateStatus.objects.exclude(name="Closed"),
            level_lte=2,
            subject="subject",
            text="text",
            email_to=[self.user1, self.user2],
        )

        no_progress_kpi = factories.SupplierKpiFactory(
            status__name="No Progress",
            kpi__level=3,
        )

        response = client.get(reverse("internal-kpi-email-cron"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

        notifications = KpiEmailNotification.objects.all()
        self.assertEqual(notifications.count(), 0)
