import logging
import threading

from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from kpis.models import KpiEmailNotification, KpiEmailNotificationTemplate

from .models import Grievance

logger = logging.getLogger(__name__)


def send_email_notification_to_issara(grievance_id):
    try:
        grievance = Grievance.objects.get(id=grievance_id)
    except Grievance.DoesNotExist:
        logger.error(f"Grievance with ID {grievance_id} does not exist.")
        return

    kpi_template = KpiEmailNotificationTemplate.objects.filter(
        subject="Supplier Grievance Update",
        type="S",
        kpi_statuses__name="Some Progress",
    ).first()

    if not kpi_template:
        logger.error(
            "No matching KpiEmailNotificationTemplate found for the given criteria."
        )
        return

    context_data = {
        "context": {
            "kpi_template": kpi_template,
            "kpi_id": grievance.supplier_kpi.id,
            "supplier": {"name": grievance.supplier_kpi.supplier.name},
        }
    }

    html_message = render_to_string("emails/supplier_kpi_alert.html", context_data)
    plain_message = strip_tags(html_message)

    email_to = list(kpi_template.email_to.values_list("email", flat=True))

    email_data = {
        "to": email_to,
        "subject": kpi_template.subject,
        "text": plain_message,
        "html": html_message,
    }

    def send_email_thread(data):
        try:
            send_mail(
                data["subject"],
                data["text"],
                None,
                data["to"],
                html_message=data["html"],
                fail_silently=True,
            )
            logger.info(f"Email sent successfully for grievance ID {grievance_id}.")
            create_email_notification(
                email_data, grievance, kpi_template, delivered=True
            )
        except Exception as e:
            logger.error(
                f"Error while sending email for grievance ID {grievance_id}: {e}"
            )
            create_email_notification(
                email_data,
                grievance,
                kpi_template,
                delivered=False,
                error_message=str(e),
            )

    thread = threading.Thread(target=send_email_thread, args=(email_data,))
    thread.start()


def create_email_notification(
    email_data, grievance, kpi_template, delivered, error_message=None
):
    try:
        notification = KpiEmailNotification.objects.create(
            template=kpi_template,
            error_message=(
                str(grievance.supplier_kpi.supplier.name)
                + (": (SUCCESS)" if delivered else f": ({error_message})")
            ),
            delivered=delivered,
        )
        notification.supplier_kpis.set([grievance.supplier_kpi])
        notification.recipients.set(User.objects.filter(email__in=email_data["to"]))
        logger.info(f"KpiEmailNotification created for grievance ID {grievance.id}.")
    except Exception as e:
        logger.error(f"Error while creating KpiEmailNotification: {e}")
