from distutils.log import error
from .serializers import UserSerializer
import requests
from django.conf import settings
import logging
from typing import Dict
from dataclasses import dataclass
from django.template.loader import get_template
from io import BytesIO
import xhtml2pdf.pisa as pisa
from rest_framework.exceptions import ValidationError
from .models import Supplier, SupplierProgressItem, SupplierProgressItemTranslation
from django.db.models import F, OuterRef, Subquery, Case, When, Value, CharField
from django.db.models.functions import Coalesce

MAILGUN_ROOT_URL = settings.DOMAIN_NAME
MAILGUN_ROOT_URL = settings.ANYMAIL.get("MAILGUN_ROOT_URL")
MAILGUN_DOMAIN_URL = f"{MAILGUN_ROOT_URL}{settings.DOMAIN_NAME}/"
MAILGUN_AUTH = ("api", f"{settings.ANYMAIL.get('MAILGUN_API_KEY')}")


def jwt_response_payload_handler(token, user=None, request=None):
    data = {
        "token": token,
        "user": UserSerializer(user, context={"request": request}).data,
    }
    if user and user.groups.filter(name="global_partner").exists():
        data["redirect_to"] = "https://cascade.issarainstitute.org/"
    return data


class EmailMailgun:
    def __init__(self, end="messages") -> None:
        self.auth = MAILGUN_AUTH
        self.url = f"{MAILGUN_DOMAIN_URL}{end}"
        self.data = {
            "from": f"{settings.DEFAULT_FROM_EMAIL}",
            "bcc": "strategicpartners@issarainstitute.org",
        }
        if settings.TESTING or settings.DEBUG:
            self.data["bcc"] = settings.TEST_EMAIL_RECEIVER

    def send_email(self, data={}, files=[]):
        self.data.update(data)
        res = requests.post(self.url, files=files, auth=self.auth, data=self.data)
        if res.status_code != 200:
            logging.error(res.content)
            res.raise_for_status()
        logging.info(res.content)


def change_workplan_step(instance, step):
    instance.workplan.current_step = step
    instance.workplan.save()
    return


@dataclass
class CreateWorkPlanPDF:
    path: str
    params: Dict

    def render(self):
        template = get_template(self.path)
        html = template.render(self.params)
        response = BytesIO()
        pdf = pisa.pisaDocument(BytesIO(html.encode("UTF-8")), response)
        if not pdf.err:
            return response
        else:
            raise ValidationError("pdf render error")


def progress_fields(pk, lang=None):
    supplier = Supplier.objects.get(pk=pk)
    qs = supplier.supplier_progress

    if qs.count != 11:
        supplier.supplier_progress.set(SupplierProgressItem.objects.all())

    # Get translation if lang is provided and not English
    if lang and lang != "en":
        # Create a subquery to get the translated name
        translation_subquery = SupplierProgressItemTranslation.objects.filter(
            supplier_progress_item__id=OuterRef("pk"), language__code=lang
        ).values("name")[:1]

        # Annotate with translated name, falling back to original name
        progress_data = qs.annotate(
            category=F(
                "supplierprogress__supplier_progress_item__supplier_progress_category__progress_category"
            ),
            subcategory=F(
                "supplierprogress__supplier_progress_item__supplier_progress_category__subcategory"
            ),
            label=Coalesce(
                Subquery(translation_subquery),
                F("supplierprogress__supplier_progress_item__name"),
            ),
            key=F("supplierprogress"),
            value=F("supplierprogress__progress"),
        ).values("category", "subcategory", "label", "key", "value")
    else:
        # Default behavior for English or no lang specified
        progress_data = qs.annotate(
            category=F(
                "supplierprogress__supplier_progress_item__supplier_progress_category__progress_category"
            ),
            subcategory=F(
                "supplierprogress__supplier_progress_item__supplier_progress_category__subcategory"
            ),
            label=F("supplierprogress__supplier_progress_item__name"),
            key=F("supplierprogress"),
            value=F("supplierprogress__progress"),
        ).values("category", "subcategory", "label", "key", "value")

    data = {}
    for xl in progress_data:
        if xl["category"] not in data:
            _xl = xl.copy()
            _xl.pop("category")
            data.update({xl["category"]: [_xl]})
        else:
            _xl = xl.copy()
            _xl.pop("category")
            data[xl["category"]].append(_xl)

    return data


def get_serializer(view, request, *args, **kwargs):
    lang = request.query_params.get("lang")
    if lang and lang != "" and lang != "en":
        return view.translation_serializer_class
    return view.default_serializer_class


def calculate_sp_crc_score(supply_chain, industries=False):
    if supply_chain is None:
        raise ValueError("supply_chain is None. Cannot calculate CRC score.")
    suppliers = supply_chain.suppliers if not industries else supply_chain
    quality_score = []
    timeliness_score = []
    openness_score = []

    for supplier in suppliers.prefetch_related("crc_scores").all():

        for crc in supplier.crc_scores.all():

            quality_attributes = [
                crc.avg_worker_response_feedback,
                crc.avg_worker_recruitment_mngmt_feedback,
                crc.issara_tech_assessment_response_quality_hr,
                crc.issara_tech_assessment_response_quality_production,
                crc.issara_tech_assessment_response_quality_sr_mngmt,
            ]

            quality_attributes = [x if x is not None else 0 for x in quality_attributes]
            quality_score.append(sum(quality_attributes) / len(quality_attributes))

            timeliness_attributes = [
                crc.duration_of_time_taken_to_respond,
                crc.duration_of_time_taken_to_revert_on_action_plan,
                crc.duration_of_time_taken_to_resolve_issues,
            ]
            timeliness_attributes = [
                x if x is not None else 0 for x in timeliness_attributes
            ]
            timeliness_score.append(
                sum(timeliness_attributes) / len(timeliness_attributes)
            )

            openness_attributes = [
                crc.site_cooperation_with_ethicall_distribution,
                crc.business_attitude_toward_suggested_remedies,
                crc.business_attitude_toward_capacity_and_risks,
                crc.business_attitude_toward_promoting_worker_voice,
                crc.business_attitude_toward_worker_treatment,
                crc.business_attitude_toward_issara,
            ]
            openness_attributes = [
                x if x is not None else 0 for x in openness_attributes
            ]
            openness_score.append(sum(openness_attributes) / len(openness_attributes))

    data = {
        "_quality_score": (
            round(sum(quality_score) / len(quality_score), 2) if quality_score else 0
        ),
        "_timeliness_score": (
            round(sum(timeliness_score) / len(timeliness_score), 2)
            if timeliness_score
            else 0
        ),
        "_openness_score": (
            round(sum(openness_score) / len(openness_score), 2) if openness_score else 0
        ),
    }

    return data
