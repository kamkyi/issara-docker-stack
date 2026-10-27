import json
import os
import uuid
from datetime import date

from django.apps import apps
from django.conf import settings
from django.contrib.auth.models import User
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
    RegexValidator,
)
from django.db import models
from django.forms import ValidationError
from django.utils import timezone
from issara.ilm_server_2.eti_base_codes.models import EtiBaseCode
from issara.ilm_server_2.storages import PublicStorage
from simple_history.models import HistoricalRecords  # Disabled

from .choices import (
    EMAIL_RECEIVING_PREFERENCE,
    ORGANIZATION_CORE_FOCUS_AREA_CHOICES,
    ORGANIZATION_STAKEHOLDER_GROUP_CHOICES,
    ORGANIZATION_TYPE_CHOICES,
    PROGRESS_ACTIVITY_STATUS,
    REASON_CHOICE,
    SHARED_FILE_PERMISSION_BOTH,
    SHARED_FILE_PERMISSIONS,
    SHARED_FILE_TYPES,
    SPWORKPLAN_ACTIVITY_AREAS,
    SPWORKPLAN_ACTIVITY_PRIORITY_STATUS,
    SPWORKPLAN_DOCUMENT_TYPES,
    SPWORKPLAN_FP_TITLES,
    SPWORKPLAN_PROGRESS_ACTIVITY_AREAS,
    SPWORKPLAN_STATUSES,
    SPWORKPLAN_STEPS,
    SUPPLIER_ACTIVITY_CHOICES,
    SUPPLIER_PROGRESSS_CHOICES,
    TASK_SOURCE_TYPE,
)
from .enums import CaseRiskLevel
from .utilities import SPWorkplanAuditTrailMixin, SupplierInformation, get_type_path
from supply_chains.models import SupplyChain, SupplierSupplyChain


class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, editable=False)
    updated_at = models.DateTimeField(auto_now=True, editable=False)

    class Meta:
        abstract = True


class Language(BaseModel):
    code = models.CharField(
        max_length=4,
        unique=True,
        null=False,
        blank=False,
        db_index=True,
    )
    name = models.CharField(max_length=100, null=False, blank=False)
    name_en = models.CharField(max_length=200, null=False, blank=False)
    # Operational languages back existing translation and Marketplace flows.
    # Profile languages are the ISO 639-1 catalog offered only to CSOs.
    is_operational = models.BooleanField(default=True)
    is_profile_selectable = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.name

    class Meta:
        db_table = "languages"


class SharedFile(models.Model):
    def get_upload_path(instance, filename):
        path = os.path.join(get_type_path(instance.type), "shared", filename)
        return path

    @classmethod
    def create_from_upload(cls, uploaded_file, **extra_fields):
        shared = cls.objects.create(
            name=extra_fields.pop("name", uploaded_file.name),
            type=extra_fields.pop("type", "O"),
            size=extra_fields.pop(
                "size", str(getattr(uploaded_file, "size", "") or "")
            ),
            **extra_fields,
        )
        shared.file_path = uploaded_file
        shared.save(update_fields=["file_path"])
        return shared

    name = models.CharField(max_length=256)
    sort_number = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(
        max_length=20,
        choices=SHARED_FILE_TYPES,
        default="O",
    )
    file_path = models.FileField(
        blank=True,
        null=True,
        upload_to=get_upload_path,
    )
    permission = models.CharField(
        max_length=20,
        choices=SHARED_FILE_PERMISSIONS,
        default=SHARED_FILE_PERMISSION_BOTH,
    )
    size = models.CharField(max_length=20, default="", blank=True)

    created_at = models.DateField(blank=True, null=True, auto_now_add=True)

    class Meta:
        managed = True
        verbose_name = "Reference Document"
        verbose_name_plural = "Reference Documents"
        db_table = "shared_files"

    def __str__(self):
        return self.name


class NewsUpdate(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    title = models.CharField(max_length=1024, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)
    sort_number = models.IntegerField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "NewsUpdates"
        managed = True
        db_table = "news_updates"

    def __str__(self):
        return self.name


class PersonContact(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    email = models.CharField(max_length=1024, blank=True, null=True)
    phone = models.CharField(max_length=1024, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)

    class Meta:
        verbose_name_plural = "PersonContacts"
        managed = True
        db_table = "person_contacts"

    def __str__(self):
        return self.name


class OrganizationOnly(models.Model):
    cso_only = models.BooleanField(default=False)
    hide_for_cso = models.BooleanField(default=False)

    class Meta:
        abstract = True


class ReferralAction(OrganizationOnly):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Referral Actions"
        managed = True
        db_table = "referral_actions"

    def __str__(self):
        return self.name


class ReferralActionTranslation(models.Model):
    referral_action = models.ForeignKey(
        ReferralAction, null=False, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=200, null=False, blank=False)

    class Meta:
        db_table = "referral_action_translations"
        unique_together = (
            "referral_action",
            "language",
        )

    def __str__(self):
        return self.name


class Referral(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    created = models.DateField(blank=True, null=True, auto_now_add=True)
    last_modified = models.DateField(blank=True, null=True, auto_now=True)

    referral_actions = models.ManyToManyField(ReferralAction, blank=True)

    class Meta:
        verbose_name_plural = "Referrals"
        managed = True
        db_table = "referrals"

    def __str__(self):
        return self.name


class CaseCategory(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    supplier_only = models.BooleanField(default=False)
    hide_for_supplier = models.BooleanField(default=False)

    @classmethod
    def get_for_user(cls, user):
        """Filter case categories based on user type"""
        queryset = cls.objects.all()

        # Check if user is a supplier
        if hasattr(user, "supplier_user"):
            # For suppliers: exclude hide_for_supplier=True, include supplier_only=True
            queryset = queryset.exclude(hide_for_supplier=True)
        else:
            # For non-suppliers: exclude supplier_only=True
            queryset = queryset.exclude(supplier_only=True)

        return queryset.order_by("name")

    class Meta:
        db_table = "case_categories"
        verbose_name = "Case Category"
        verbose_name_plural = "Case Categories"

    def __str__(self):
        return self.name


class CaseCategoryTranslation(models.Model):
    case_category = models.ForeignKey(
        CaseCategory, null=False, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=200, null=False, blank=False)

    class Meta:
        db_table = "case_categories_translations"
        unique_together = (
            "case_category",
            "language",
        )

    def __str__(self):
        return self.name


class ClientStatus(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Client Statuses"
        managed = True
        db_table = "client_statuses"

    def __str__(self):
        return self.name


class ClientStatusTranslation(models.Model):
    client_status = models.ForeignKey(
        ClientStatus, null=False, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=200, null=False, blank=False)

    class Meta:
        db_table = "client_status_translations"
        unique_together = (
            "client_status",
            "language",
        )

    def __str__(self):
        return self.name


class ClientType(OrganizationOnly):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Client Types"
        managed = True
        db_table = "client_types"

    def __str__(self):
        return self.name


class ClientTypeTranslation(models.Model):
    client_type = models.ForeignKey(
        ClientType, null=False, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=200, null=False, blank=False)

    class Meta:
        db_table = "client_type_translations"
        unique_together = (
            "client_type",
            "language",
        )

    def __str__(self):
        return self.name


class FactoryType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Factory Types"
        managed = True
        db_table = "factory_types"

    def __str__(self):
        return self.name


class Broker(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Brokers"
        managed = True
        db_table = "brokers"

    def __str__(self):
        return self.name


class Gender(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Genders"
        managed = True
        db_table = "genders"

    def __str__(self):
        return self.name


class CaseStatus(OrganizationOnly):
    """Case outcome states, audience-flagged like the other lookup tables.

    The ILM 1 rows carry neither flag, so Issara staff and CSO users both keep
    seeing exactly what they always have. The risk-level statuses added for the
    CSO Worker Voice form are `cso_only`, which keeps them out of the legacy
    ILM dropdown without hiding cases that already point at the shared rows.
    """

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Case Statuses"
        managed = True
        db_table = "case_statuses"

    def __str__(self):
        return self.name


class HowHearIssara(OrganizationOnly):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        managed = True
        db_table = "how_hear_issara"

    def __str__(self):
        return self.name


class HowHearIssaraTranslation(models.Model):
    how_hear_issara = models.ForeignKey(
        HowHearIssara, null=False, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=200, null=False, blank=False)

    class Meta:
        db_table = "how_hear_issara_translations"
        unique_together = (
            "how_hear_issara",
            "language",
        )

    def __str__(self):
        return self.name


class WorkPlace(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        managed = True
        db_table = "workplaces"

    def __str__(self):
        return self.name


class IssueCategory(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Issue categories"
        managed = True
        db_table = "issue_categories"

    def __str__(self):
        return self.name


class IssueCategoryTranslation(models.Model):
    issue_category = models.ForeignKey(
        IssueCategory, null=False, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=200, null=False, blank=False)

    class Meta:
        db_table = "issue_category_translations"
        unique_together = (
            "issue_category",
            "language",
        )

    def __str__(self):
        return self.name


class InteractionReason(OrganizationOnly):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        managed = True
        db_table = "interaction_reasons"

    def __str__(self):
        return self.name


class InteractionReasonTranslation(models.Model):
    interaction_reason = models.ForeignKey(
        InteractionReason, null=False, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=200, null=False, blank=False)

    class Meta:
        db_table = "interaction_reasons_translations"
        unique_together = (
            "interaction_reason",
            "language",
        )

    def __str__(self):
        return self.name


class InteractionChannel(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    supplier_only = models.BooleanField(default=False)
    hide_for_supplier = models.BooleanField(default=False)
    cso_only = models.BooleanField(default=False)
    hide_for_cso = models.BooleanField(default=False)

    @classmethod
    def get_for_user(cls, user, cso_audience=False):
        """Filter interaction channels based on user type.

        `cso_audience` is set by a client rendering the CSO Worker Voice UI
        (`?cso_only=true`, see `cso_audience.use_cso_audience`) so that the
        Cascade tester reviews the channel list a CSO officer actually gets.
        It only widens the CSO branch to non-CSO callers; the supplier test
        stays first, so a supplier account is never moved off its own branch by
        the parameter.
        """
        queryset = cls.objects.all()

        # Check if user is a supplier
        if hasattr(user, "supplier_user"):
            # For suppliers: exclude hide_for_supplier=True
            queryset = queryset.exclude(hide_for_supplier=True).exclude(cso_only=True)
        elif cso_audience or user.groups.filter(name="CSO").exists():
            # CSO partners log Worker Voice calls and need their own channel
            # set, so filter them on the CSO flags. Supplier-only channels are
            # excluded too: they are a company's internal grievance routes and
            # are never a channel a worker reaches a CSO through.
            queryset = queryset.exclude(hide_for_cso=True).exclude(
                supplier_only=True
            )
        else:
            # For non-suppliers: exclude supplier_only=True
            queryset = queryset.exclude(supplier_only=True).exclude(cso_only=True)

        return queryset.order_by("name")

    class Meta:
        managed = True
        db_table = "interaction_channels"

    def __str__(self):
        return self.name


class InteractionChannelTranslation(models.Model):
    interaction_channel = models.ForeignKey(
        InteractionChannel, null=True, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=200, null=False, blank=False)

    class Meta:
        db_table = "interaction_channel_translations"
        unique_together = (
            "interaction_channel",
            "language",
        )

    def __str__(self):
        return self.name


class ContractType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        managed = True
        db_table = "contract_types"

    def __str__(self):
        return self.name


class DocumentType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        managed = True
        db_table = "document_types"

    def __str__(self):
        return self.name


class VesselType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        managed = True
        db_table = "vessel_types"
        indexes = [
            models.Index(fields=["id"]),
        ]

    def __str__(self):
        return self.name


class Industry(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Industries"
        managed = True
        db_table = "industries"

    def __str__(self):
        return self.name


class SubIndustry(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    industry = models.ForeignKey(
        Industry, on_delete=models.CASCADE, null=False, blank=False
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "SubIndustries"
        managed = True
        db_table = "subindustries"

    def __str__(self):
        return self.name


class Country(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, db_index=True)
    lng = models.CharField(max_length=20, blank=True, null=True)
    lat = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Countries"
        managed = True
        db_table = "countries"

    def __str__(self):
        return self.name


class Province(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    gis_code = models.CharField(blank=True, null=True, max_length=100)
    crossing = models.IntegerField(blank=True, null=True)
    lng = models.CharField(max_length=20, blank=True, null=True)
    lat = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    country = models.ForeignKey(Country, on_delete=models.CASCADE, null=True)

    class Meta:
        managed = True
        db_table = "provinces"

    def __str__(self):
        return self.name


class District(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    lng = models.CharField(max_length=20, blank=True, null=True)
    lat = models.CharField(max_length=20, blank=True, null=True)

    gis_code = models.CharField(blank=True, null=True, max_length=100)
    crossing = models.IntegerField(blank=True, null=True)
    province = models.ForeignKey(Province, on_delete=models.CASCADE, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Districts"
        managed = True
        db_table = "districts"

    def __str__(self):
        return self.name


class Nationality(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    imageicon = models.ForeignKey(
        SharedFile, on_delete=models.SET_NULL, blank=True, null=True
    )

    class Meta:
        verbose_name_plural = "Nationalities"
        managed = True
        db_table = "nationalities"

    def __str__(self):
        return self.name


class Ethnicity(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    nationality = models.ForeignKey(Nationality, on_delete=models.CASCADE, null=True)

    country = models.ForeignKey(Country, on_delete=models.CASCADE, null=True)

    class Meta:
        verbose_name_plural = "Ethnicities"
        managed = True
        db_table = "ethnicities"

    def __str__(self):
        return self.name


class SupplierTier(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)

    class Meta:
        db_table = "supplier_tiers"

    def __str__(self):
        return self.name


class Supplier(models.Model, SupplierInformation):
    TRACK_MARKETPLACE = "MARKETPLACE"
    TRACK_FULL = "FULL"
    TRACK_SELECTION_CHOICES = (
        (TRACK_MARKETPLACE, "CASCADE Marketplace"),
        (TRACK_FULL, "Full CASCADE Access"),
    )

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    anonymous = models.BooleanField(default=False, blank=True, null=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)
    tier = models.ForeignKey(
        SupplierTier, on_delete=models.SET_NULL, blank=True, null=True
    )
    address = models.CharField(max_length=500, blank=True, null=True)
    zipcode = models.CharField(max_length=20, blank=True, null=True)
    gps = models.CharField(max_length=1024, blank=True, null=True)
    vessel_number = models.CharField(max_length=100, blank=True, null=True)
    fishing_gear_liscense_number = models.CharField(
        max_length=100, blank=True, null=True
    )
    contact_name = models.CharField(max_length=1024, blank=True, null=True)
    contact_phone = models.CharField(max_length=100, blank=True, null=True)
    contact_email = models.CharField(max_length=250, blank=True, null=True)
    name_harvesting_business = models.CharField(max_length=100, blank=True, null=True)
    num_vessels_sourced_from = models.IntegerField(blank=True, null=True)
    total_num_workers = models.IntegerField(blank=True, null=True)
    total_num_men_workers = models.IntegerField(blank=True, null=True)
    total_num_women_workers = models.IntegerField(blank=True, null=True)
    total_num_thai_workers = models.IntegerField(blank=True, null=True)
    total_num_cambodian_workers = models.IntegerField(blank=True, null=True)
    total_num_myanmar_workers = models.IntegerField(blank=True, null=True)
    total_num_lao_workers = models.IntegerField(blank=True, null=True)
    total_num_vietnamese_workers = models.IntegerField(blank=True, null=True)
    total_num_nepalese_workers = models.IntegerField(blank=True, null=True)
    total_num_bangladeshi_workers = models.IntegerField(blank=True, null=True)
    total_num_indonesian_workers = models.IntegerField(blank=True, null=True)
    total_num_malaysian_workers = models.IntegerField(blank=True, null=True)
    total_num_indian_workers = models.IntegerField(blank=True, null=True)
    total_num_pakistani_workers = models.IntegerField(blank=True, null=True)
    total_num_sri_lankan_workers = models.IntegerField(blank=True, null=True)
    num_of_workers_access_to_issara_wv_channels = models.IntegerField(
        blank=True, null=True
    )
    date_of_most_recent_recruitment_survey = models.DateField(blank=True, null=True)
    date_of_most_recent_worker_satisfaction_survey = models.DateField(
        blank=True, null=True
    )
    num_workers_reimbursed_recruitment_fees = models.IntegerField(blank=True, null=True)
    remain_num_workers_owed_recruitment_fee_reimbursement = models.IntegerField(
        blank=True, null=True
    )
    total_amt_recruitment_fee_reimbursed_to_workers = models.DecimalField(
        max_digits=11, decimal_places=2, blank=True, null=True
    )
    remain_amt_owed_recruitment_fee_reimbursement_to_workers = models.DecimalField(
        max_digits=11, decimal_places=2, blank=True, null=True
    )
    hiring_practice = models.TextField(blank=True, null=True)
    other = models.TextField(blank=True, null=True)

    vessel_type = models.ForeignKey(
        VesselType, on_delete=models.CASCADE, null=True, blank=True
    )

    industries = models.ManyToManyField(
        Industry, related_name="industries", through="SupplierIndustry"
    )
    subindustries = models.ManyToManyField(
        SubIndustry, related_name="subindustries", through="SupplierSubIndustry"
    )
    country = models.ForeignKey(
        Country, on_delete=models.CASCADE, null=True, blank=True
    )
    province = models.ForeignKey(
        Province, on_delete=models.CASCADE, null=True, blank=True
    )
    district = models.ForeignKey(
        District, on_delete=models.CASCADE, null=True, blank=True
    )

    golden_dreams_employer_id = models.IntegerField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    website = models.TextField(blank=True, null=True)
    lng = models.TextField(blank=True, null=True)
    lat = models.TextField(blank=True, null=True)

    NO_WORKER_VOICE = "no_worker_voice"
    WORKER_VOICE_WITH_ENGAGEMENT = "worker_voice_with_supplier_engagement"
    WORKER_VOICE_WITHOUT_ENGAGEMENT = "worker_voice_without_supplier_engagement"

    WORKER_VOICE_STATUS_CHOICES = [
        (NO_WORKER_VOICE, "No Worker Voice"),
        (WORKER_VOICE_WITH_ENGAGEMENT, "Worker Voice with Supplier Engagement"),
        (WORKER_VOICE_WITHOUT_ENGAGEMENT, "Worker Voice without Supplier Engagement"),
    ]

    worker_voice = models.BooleanField(null=True, default=None)
    is_worker_voice_rolled_out = models.BooleanField(default=None, null=True)

    worker_voice_status = models.CharField(
        max_length=50,
        choices=WORKER_VOICE_STATUS_CHOICES,
        default=NO_WORKER_VOICE,
    )

    additional_contacts = models.ManyToManyField(PersonContact, blank=True)
    reports = models.ManyToManyField(SharedFile, blank=True)

    supplier_progress = models.ManyToManyField(
        to="SupplierProgressItem", through="SupplierProgress", blank=True
    )
    recruiter = models.ManyToManyField(
        "ilm_server_2.Recruiter",
        blank=True,
        through="SupplierRecruiters",
    )
    updated_at = models.DateTimeField(auto_now=True)
    # history = HistoricalRecords()  # Disabled to avoid historical table requirements

    imageicon = models.ForeignKey(
        SharedFile, on_delete=models.SET_NULL, blank=True, null=True,
        related_name="supplier_imageicon"
    )
    track_selection = models.CharField(
        max_length=20,
        choices=TRACK_SELECTION_CHOICES,
        blank=True,
        null=True,
    )
    license_agreed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = "suppliers"
        indexes = [
            models.Index(fields=["-name"]),
        ]

    def __str__(self):
        return str(self.id) + " - " + self.name

    def worker_count(self):
        fields = self.__dict__
        total = 0
        for k, v in fields.items():
            if k not in [
                "total_num_workers",
                "total_num_men_workers",
                "total_num_women_workers",
            ] and k.startswith("total_num_"):
                total += v if v else 0
        return total

    @property
    def worker_counts_updated_at(self):
        """Get the updated_at timestamp from TotalNumberOfWorkers table"""
        try:
            return self.worker_counts.updated_at
        except:
            return self.updated_at  # Fallback to supplier's updated_at

    @property
    def worker_counts_created_at(self):
        """Get the created_at timestamp from TotalNumberOfWorkers table"""
        try:
            return self.worker_counts.created_at
        except:
            return self.updated_at  # Fallback to supplier's updated_at

    def __repr__(self):
        repr = (
            f"ID: {self.id} \n"
            f"NAME: {self.name} \n"
            f'recruiter: [{", ".join([recruiter.name for recruiter in self.recruiter.all()])}] \n'
        )
        return repr


class SupplierLicenseAgreement(models.Model):
    EMAIL_STATUS_PENDING = "PENDING"
    EMAIL_STATUS_SENT = "SENT"
    EMAIL_STATUS_FAILED = "FAILED"
    EMAIL_STATUS_NOT_SENT = "NOT_SENT"
    EMAIL_STATUS_CHOICES = (
        (EMAIL_STATUS_PENDING, "Pending"),
        (EMAIL_STATUS_SENT, "Sent"),
        (EMAIL_STATUS_FAILED, "Failed"),
        (EMAIL_STATUS_NOT_SENT, "Not sent"),
    )

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="license_agreements",
    )
    signer_name = models.CharField(max_length=255)
    signer_title = models.CharField(max_length=255, blank=True, null=True)
    signer_affiliation = models.CharField(max_length=255, blank=True, null=True)
    signer_email = models.EmailField(max_length=254)
    signer_workos_user_id = models.CharField(max_length=255, db_index=True)
    agreement_version = models.CharField(max_length=64)
    agreement_text = models.TextField()
    agreement_text_hash = models.CharField(max_length=64)
    signed_at = models.DateTimeField()
    confirmation_email_to = models.EmailField(max_length=254, blank=True, null=True)
    confirmation_email_status = models.CharField(
        max_length=20,
        choices=EMAIL_STATUS_CHOICES,
        default=EMAIL_STATUS_PENDING,
    )
    confirmation_email_sent_at = models.DateTimeField(blank=True, null=True)
    confirmation_email_error = models.TextField(blank=True, null=True)
    revoked_at = models.DateTimeField(blank=True, null=True)
    revoked_by_email = models.EmailField(max_length=254, blank=True, null=True)
    revoked_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "supplier_license_agreements"
        ordering = ["-signed_at"]
        indexes = [
            models.Index(fields=["supplier", "-signed_at"]),
            models.Index(
                fields=[
                    "supplier",
                    "signer_workos_user_id",
                    "agreement_version",
                    "revoked_at",
                ],
                name="supplier_li_user_active_idx",
            ),
            models.Index(
                fields=["supplier", "signer_email", "agreement_version", "revoked_at"],
                name="supplier_li_email_active_idx",
            ),
        ]

    @property
    def agreement_active(self):
        return (
            self.revoked_at is None
            and self.agreement_version == settings.SUPPLIER_AGREEMENT_VERSION
        )

    def __str__(self):
        return f"{self.supplier_id} - {self.agreement_version} - {self.signer_name}"


class SupplierUserTrackSelection(models.Model):
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name="user_track_selections",
    )
    workos_user_id = models.CharField(max_length=255)
    user_email = models.EmailField(max_length=254)
    track_selection = models.CharField(
        max_length=20,
        choices=Supplier.TRACK_SELECTION_CHOICES,
    )
    selected_at = models.DateTimeField()
    revoked_at = models.DateTimeField(blank=True, null=True)
    revoked_by_email = models.EmailField(max_length=254, blank=True, null=True)
    revoked_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "supplier_user_track_selections"
        ordering = ["-selected_at"]
        verbose_name = "Supplier user access"
        verbose_name_plural = "Supplier user access management"
        constraints = [
            models.UniqueConstraint(
                fields=["supplier", "workos_user_id"],
                name="uniq_supplier_user_track_selection",
            ),
        ]
        indexes = [
            models.Index(
                fields=["supplier", "user_email"],
                name="supplier_user_track_email_idx",
            ),
        ]

    def __str__(self):
        return f"{self.supplier_id} - {self.user_email} - {self.track_selection}"

    @property
    def access_active(self):
        return self.revoked_at is None


class MapLocationSetting(models.Model):
    MAP_KEY_INTERACTIVE_SUPPLIER_MAP = "interactive_supplier_map"
    MAP_KEY_CHOICES = ((MAP_KEY_INTERACTIVE_SUPPLIER_MAP, "Interactive Supplier Map"),)
    RADIUS_1_KM = 1
    RADIUS_3_KM = 3
    RADIUS_4_KM = 4
    RADIUS_5_KM = 5
    RADIUS_10_KM = 10
    BLUR_RADIUS_CHOICES = (
        (RADIUS_1_KM, "1 km"),
        (RADIUS_3_KM, "3 km"),
        (RADIUS_4_KM, "4 km"),
        (RADIUS_5_KM, "5 km"),
        (RADIUS_10_KM, "10 km"),
    )

    map_key = models.CharField(
        max_length=100,
        choices=MAP_KEY_CHOICES,
        unique=True,
        default=MAP_KEY_INTERACTIVE_SUPPLIER_MAP,
    )
    show_exact_coordinates = models.BooleanField(default=False)
    blur_radius_km = models.PositiveSmallIntegerField(
        choices=BLUR_RADIUS_CHOICES,
        default=RADIUS_5_KM,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="map_location_settings_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "map_location_settings"
        verbose_name = "Map Location Setting"
        verbose_name_plural = "Map Location Settings"

    def __str__(self):
        return self.map_key


class SupplierIndustry(models.Model):
    supplier = models.ForeignKey("Supplier", on_delete=models.CASCADE)
    industry = models.ForeignKey(Industry, on_delete=models.CASCADE)


class SupplierSubIndustry(models.Model):
    supplier = models.ForeignKey("Supplier", on_delete=models.CASCADE)
    subindustry = models.ForeignKey(SubIndustry, on_delete=models.CASCADE)


class SupplierRecruiters(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
    )
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    recruiter = models.ForeignKey("ilm_server_2.Recruiter", on_delete=models.CASCADE)
    status = models.CharField(
        max_length=50, choices=STATUS_CHOICES, default=STATUS_ACTIVE
    )


class SupplierUser(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="supplier_user",
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE, related_name="supplier_for_user"
    )
    email_receiving_preference = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        default="direct",
        choices=EMAIL_RECEIVING_PREFERENCE,
    )

    def __repr__(self):
        repr = f"supplier: {self.supplier.name} \n"

        return repr

    def __str__(self):
        return self.user.username + " : " + self.supplier.name

    def validate_save(self):
        if hasattr(self.user, "strategic_partner_user"):
            raise ValidationError("User is already Strategic Partner")

    def clean(self) -> None:
        self.validate_save()
        return super().clean()

    def save(self, *args, **kwargs):
        self.validate_save()
        return super().save(*args, **kwargs)


class SupplierActivitySummary(models.Model):
    supplier = models.OneToOneField(
        Supplier, on_delete=models.CASCADE, related_name="activity_summary"
    )
    ethical_grievance_worker_voice_policy = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    worker_voice_grievance_systems_procedures = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    worker_voice_grievance_communication = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    grievance_mechanisms_capacity_building = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    grievance_mechanisms_capacity_building_date = models.DateField(
        blank=True, null=True
    )
    education_empowerment = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    ethical_recruitment_policy = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    ethical_recruitment_system_procedures = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    recruitment_agency_policy_disclosure = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    recruitment_policy_communication = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    candidate_worker_recruitment_communication = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    recruitment_survey = models.DateField(blank=True, null=True)
    reimbursement = models.IntegerField(default=0)
    reimbursement_agreed_in_process = models.IntegerField(default=0)
    reimbursement_not_agreed = models.IntegerField(default=0)
    eligible_workers_not_reimbursed_count = models.IntegerField(default=0)
    eligible_workers_reimbursed_count = models.IntegerField(default=0)
    ethical_recruitment_training_capacity_building = models.DateField(
        blank=True, null=True
    )
    ern_collaboration = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    golden_dreams = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    ethical_sourcing_policy_roadmap = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    worker_satisfaction_survey = models.DateField(blank=True, null=True)
    strengthening_worker_voice_communications = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    ongoing_worker_voice_remediation = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )
    capacity_building_business_human_rights = models.DateField(blank=True, null=True)
    capacity_building_interpreters_line_supervisors = models.DateField(
        blank=True, null=True
    )
    capacity_building_management_leadership = models.DateField(blank=True, null=True)
    targeted_responsive_systems_strengthening = models.CharField(
        choices=SUPPLIER_ACTIVITY_CHOICES, max_length=100, default="not yet"
    )

    class Meta:
        verbose_name_plural = "Supplier Activity Summaries"
        managed = True
        db_table = "supplier_activity_summaries"

    def __str__(self):
        return str(self.supplier)


class Recruiter(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    created = models.DateField(blank=True, null=True, auto_now_add=True)
    tier_id = models.IntegerField(blank=True, null=True)
    address = models.CharField(max_length=500, blank=True, null=True)
    zipcode = models.CharField(max_length=20, blank=True, null=True)
    gps = models.CharField(max_length=1024, blank=True, null=True)
    facebook_website = models.CharField(max_length=1024, blank=True, null=True)
    contact_name = models.CharField(max_length=100, blank=True, null=True)
    contact_phone = models.CharField(max_length=100, blank=True, null=True)
    contact_email = models.CharField(max_length=100, blank=True, null=True)
    num_of_staff = models.IntegerField(blank=True, null=True)
    num_lisc_agents = models.IntegerField(blank=True, null=True)
    worker_placement_industries = models.TextField(blank=True, null=True)
    other = models.TextField(blank=True, null=True)

    industry = models.ForeignKey(
        Industry, on_delete=models.CASCADE, blank=True, null=True
    )
    country = models.ForeignKey(
        Country, on_delete=models.CASCADE, blank=True, null=True
    )
    province = models.ForeignKey(
        Province, on_delete=models.CASCADE, blank=True, null=True
    )
    district = models.ForeignKey(
        District, on_delete=models.CASCADE, blank=True, null=True
    )

    golden_dreams_recruiter_id = models.IntegerField(blank=True, null=True)

    description = models.TextField(blank=True, null=True)
    website = models.TextField(blank=True, null=True)

    lng = models.TextField(blank=True, null=True)
    lat = models.TextField(blank=True, null=True)
    image = models.ImageField(
        upload_to="recruiters/",
        storage=PublicStorage(),
        blank=True,
        null=True,
    )

    class Meta:
        managed = True
        db_table = "recruiters"

    def __str__(self):
        return str(self.id) + " - " + self.name


class RecruiterIssue(models.Model):
    id = models.AutoField(primary_key=True)
    issue_category = models.ForeignKey(
        IssueCategory, on_delete=models.CASCADE, null=True
    )

    kpis = models.ManyToManyField("kpis.Kpi", blank=True)

    case_status = models.ForeignKey(CaseStatus, on_delete=models.CASCADE, null=True)

    recruiter = models.ForeignKey(Recruiter, on_delete=models.CASCADE, null=True)

    class Meta:
        verbose_name_plural = "Recruiter Issues"
        managed = True
        db_table = "recruiter_issues"

    def __str__(self):
        return str(self.recruiter) + " - " + str(self.issue_category)


class UserTask(models.Model):
    id = models.AutoField(primary_key=True)
    source_id = models.PositiveIntegerField()
    source_type = models.CharField(
        max_length=20,
        choices=TASK_SOURCE_TYPE,
        default="Call",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="tasks_assigned_by_user",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="tasks_assigned_to_user",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    assigned_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        related_name="task_assigned_users",
    )
    deadline = models.DateField(blank=True, null=True)
    done = models.BooleanField(default=False)

    created_at = models.DateField(blank=True, null=True, auto_now_add=True)
    modified_at = models.DateField(blank=True, null=True, auto_now=True)

    class Meta:
        verbose_name_plural = "Users Tasks"
        managed = True
        db_table = "user_tasks"
        ordering = [
            "id",
            "source_id",
            "source_type",
            "assigned_by",
            "assigned_to",
            "deadline",
        ]

    def __str__(self):
        return "{}:{} - {} to {}".format(
            self.source_type, self.source_id, self.assigned_by, self.assigned_to
        )


class ResponseInteractionType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    class Meta:
        managed = True
        db_table = "response_interaction_types"

    def __str__(self):
        return self.name


class StrategicPartnerFile(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    url = models.CharField(max_length=1024)
    description = models.TextField(blank=True, null=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)

    class Meta:
        managed = True
        db_table = "strategic_partner_files"

    def __str__(self):
        return self.name


class StrategicPartnerResponseFile(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    url = models.CharField(max_length=1024)
    description = models.TextField(blank=True, null=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)

    class Meta:
        managed = True
        db_table = "strategic_partner_response_files"

    def __str__(self):
        return self.name


class StrategicPartner(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    GROUPING_CURRENT = "Current CASCADE Partners"
    GROUPING_PROSPECTIVE = "Prospective CASCADE Partners"
    GROUPING_CHOICES = [
        (GROUPING_CURRENT, "Current CASCADE Partners"),
        (GROUPING_PROSPECTIVE, "Prospective CASCADE Partners"),
    ]

    strategic_partner_grouping = models.CharField(
        max_length=100, choices=GROUPING_CHOICES, blank=True, null=True
    )

    created = models.DateField(blank=True, null=True, auto_now_add=True)
    country = models.ForeignKey(
        Country, on_delete=models.CASCADE, blank=True, null=True
    )
    address = models.CharField(max_length=1024, blank=True, null=True)
    zipcode = models.CharField(max_length=1024, blank=True, null=True)
    contract_start_date = models.DateField(blank=True, null=True)
    contract_end_date = models.DateField(blank=True, null=True)
    payment_amount = models.IntegerField(blank=True, null=True)
    payment_receipt_date = models.DateField(blank=True, null=True)
    date_last_annual_risk_report = models.DateField(blank=True, null=True)
    date_last_call_meeting_visit = models.DateField(blank=True, null=True)
    focal_point_name = models.CharField(max_length=1024, blank=True, null=True)
    focal_point_title = models.CharField(max_length=1024, blank=True, null=True)
    focal_point_email = models.CharField(max_length=1024, blank=True, null=True)
    focal_point_phone_number = models.CharField(max_length=56, blank=True, null=True)
    products_sourced = models.TextField(blank=True, null=True)

    lng = models.CharField(max_length=1024, blank=True, null=True)
    lat = models.CharField(max_length=1024, blank=True, null=True)

    background = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    agreement = models.TextField(blank=True, null=True)
    image = models.CharField(max_length=1024, blank=True, null=True)

    imageicon = models.ForeignKey(
        SharedFile, on_delete=models.SET_NULL, blank=True, null=True
    )

    website = models.CharField(max_length=1024, blank=True, null=True)

    LKSG_VOLUNTARY = "Voluntary for direct and indirect suppliers"
    LKSG_MANDATORY = "Mandatory for direct and indirect suppliers"
    LKSG_RISK_CHOICES = [
        (LKSG_VOLUNTARY, "Voluntary for direct and indirect suppliers"),
        (LKSG_MANDATORY, "Mandatory for direct and indirect suppliers"),
    ]

    worker_voice_mechanism = models.CharField(
        max_length=255,
        choices=LKSG_RISK_CHOICES,
        blank=True,
        null=True,
    )
    remediation_support = models.CharField(
        max_length=255,
        choices=LKSG_RISK_CHOICES,
        blank=True,
        null=True,
    )

    human_rights_officer_confirmed = models.BooleanField(default=False)
    human_rights_officer_name = models.CharField(
        max_length=255, blank=True, null=True
    )
    senior_management_reporting_confirmed = models.BooleanField(default=False)
    senior_management_reporting_date = models.DateField(blank=True, null=True)

    created = models.DateTimeField(auto_now_add=True, null=True)
    last_modified = models.DateTimeField(auto_now=True, null=True)

    strategic_partner_files = models.ManyToManyField(StrategicPartnerFile, blank=True)

    email_notify = models.BooleanField(default=False)
    total_num_workers = models.IntegerField(blank=True, null=True)
    total_num_men_workers = models.IntegerField(blank=True, null=True)
    total_num_women_workers = models.IntegerField(blank=True, null=True)
    total_num_thai_workers = models.IntegerField(blank=True, null=True)
    total_num_cambodian_workers = models.IntegerField(blank=True, null=True)
    total_num_myanmar_workers = models.IntegerField(blank=True, null=True)
    total_num_lao_workers = models.IntegerField(blank=True, null=True)
    total_num_vietnamese_workers = models.IntegerField(blank=True, null=True)
    total_num_nepalese_workers = models.IntegerField(blank=True, null=True)
    total_num_bangladeshi_workers = models.IntegerField(blank=True, null=True)
    total_num_indonesian_workers = models.IntegerField(blank=True, null=True)
    total_num_malaysian_workers = models.IntegerField(blank=True, null=True)
    total_num_indian_workers = models.IntegerField(blank=True, null=True)
    total_num_pakistani_workers = models.IntegerField(blank=True, null=True)
    total_num_sri_lankan_workers = models.IntegerField(blank=True, null=True)
    total_num_thai_men_workers = models.IntegerField(blank=True, null=True)
    total_num_thai_women_workers = models.IntegerField(blank=True, null=True)
    total_num_cambodian_men_workers = models.IntegerField(blank=True, null=True)
    total_num_cambodian_women_workers = models.IntegerField(blank=True, null=True)
    total_num_myanmar_men_workers = models.IntegerField(blank=True, null=True)
    total_num_myanmar_women_workers = models.IntegerField(blank=True, null=True)
    total_num_lao_men_workers = models.IntegerField(blank=True, null=True)
    total_num_lao_women_workers = models.IntegerField(blank=True, null=True)
    total_num_vietnamese_men_workers = models.IntegerField(blank=True, null=True)
    total_num_vietnamese_women_workers = models.IntegerField(blank=True, null=True)
    total_num_nepalese_men_workers = models.IntegerField(blank=True, null=True)
    total_num_nepalese_women_workers = models.IntegerField(blank=True, null=True)
    total_num_bangladeshi_men_workers = models.IntegerField(blank=True, null=True)
    total_num_bangladeshi_women_workers = models.IntegerField(blank=True, null=True)
    total_num_indonesian_men_workers = models.IntegerField(blank=True, null=True)
    total_num_indonesian_women_workers = models.IntegerField(blank=True, null=True)
    total_num_malaysian_men_workers = models.IntegerField(blank=True, null=True)
    total_num_malaysian_women_workers = models.IntegerField(blank=True, null=True)
    total_num_indian_men_workers = models.IntegerField(blank=True, null=True)
    total_num_indian_women_workers = models.IntegerField(blank=True, null=True)
    total_num_pakistani_men_workers = models.IntegerField(blank=True, null=True)
    total_num_pakistani_women_workers = models.IntegerField(blank=True, null=True)
    total_num_sri_lankan_men_workers = models.IntegerField(blank=True, null=True)
    total_num_sri_lankan_women_workers = models.IntegerField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Strategic partners"
        managed = True
        db_table = "strategic_partners"

    def __str__(self):
        return str(self.id) + " - " + self.name


class ProductCategory(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)

    class Meta:
        managed = True
        db_table = "product_categories"

    def __str__(self):
        return self.name


class StrategicPartnerSourcingCountry(models.Model):
    id = models.AutoField(primary_key=True)
    strategic_partner = models.ForeignKey(
        StrategicPartner,
        on_delete=models.CASCADE,
        related_name="sourcing_countries",
    )
    country = models.ForeignKey(Country, on_delete=models.CASCADE)

    class Meta:
        managed = True
        db_table = "strategic_partner_sourcing_countries"
        unique_together = ("strategic_partner", "country")


class StrategicPartnerIndustry(models.Model):
    id = models.AutoField(primary_key=True)
    strategic_partner = models.ForeignKey(
        StrategicPartner,
        on_delete=models.CASCADE,
        related_name="industries",
    )
    industry = models.ForeignKey(Industry, on_delete=models.CASCADE)

    class Meta:
        managed = True
        db_table = "strategic_partner_industries"
        unique_together = ("strategic_partner", "industry")


class StrategicPartnerProductCategory(models.Model):
    id = models.AutoField(primary_key=True)
    strategic_partner = models.ForeignKey(
        StrategicPartner,
        on_delete=models.CASCADE,
        related_name="product_categories",
    )
    product_category = models.ForeignKey(
        ProductCategory,
        on_delete=models.CASCADE,
    )

    class Meta:
        managed = True
        db_table = "strategic_partner_product_categories"
        unique_together = ("strategic_partner", "product_category")


class PolicyCompliance(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)

    class Meta:
        managed = True
        db_table = "policy_compliances"

    def __str__(self):
        return self.name


class StrategicPartnerPolicyCompliance(models.Model):
    id = models.AutoField(primary_key=True)
    strategic_partner = models.ForeignKey(
        StrategicPartner,
        db_column="sp_id",
        on_delete=models.CASCADE,
        related_name="policy_compliance_items",
    )
    policy_compliance = models.ForeignKey(
        PolicyCompliance,
        on_delete=models.CASCADE,
        related_name="strategic_partner_items",
    )
    text_value = models.TextField(blank=True, null=True)
    link_url = models.URLField(max_length=2048, blank=True, null=True)
    file = models.ForeignKey(
        SharedFile,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="strategic_partner_policy_files",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "strategic_partner_policy_compliances"
        unique_together = ("strategic_partner", "policy_compliance")


# Shared by every document that can be exposed on a company profile: Policy rows
# and Work Plan documents both use this audience vocabulary.
DOCUMENT_AUDIENCE_CUSTOMERS = "customers"
DOCUMENT_AUDIENCE_MEMBERS = "members"
DOCUMENT_AUDIENCE_PRIVATE = "private"
DOCUMENT_AUDIENCES = [
    (DOCUMENT_AUDIENCE_CUSTOMERS, "CASCADE Members - Current Customers"),
    (DOCUMENT_AUDIENCE_MEMBERS, "CASCADE Members"),
    (DOCUMENT_AUDIENCE_PRIVATE, "Private"),
]


class Policy(models.Model):
    POLICY_TYPE_TEXT = "text"
    POLICY_TYPE_LINK = "link"
    POLICY_TYPE_FILE = "file"
    POLICY_TYPES = [
        (POLICY_TYPE_TEXT, "Text"),
        (POLICY_TYPE_LINK, "Link"),
        (POLICY_TYPE_FILE, "File"),
    ]

    AUDIENCE_CUSTOMERS = DOCUMENT_AUDIENCE_CUSTOMERS
    AUDIENCE_MEMBERS = DOCUMENT_AUDIENCE_MEMBERS
    AUDIENCE_PRIVATE = DOCUMENT_AUDIENCE_PRIVATE
    AUDIENCES = DOCUMENT_AUDIENCES

    strategic_partner = models.ForeignKey(
        StrategicPartner,
        db_column="sp_id",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="policies",
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="policies",
    )
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=10, choices=POLICY_TYPES)
    text_value = models.TextField(blank=True, null=True)
    link_url = models.URLField(max_length=2048, blank=True, null=True)
    file = models.ForeignKey(
        SharedFile,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="policy_files",
    )
    source_shared_file = models.ForeignKey(
        SharedFile,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="source_policies",
        help_text="Original Work Plan SharedFile when this policy was synced from a Work Plan file.",
    )
    is_source_hidden = models.BooleanField(default=False)
    audience = models.CharField(
        max_length=10, choices=AUDIENCES, default=AUDIENCE_MEMBERS
    )
    categories = models.ManyToManyField(
        PolicyCompliance, related_name="policies", blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "policies"
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(
                        strategic_partner__isnull=False, supplier__isnull=True
                    )
                    | models.Q(
                        strategic_partner__isnull=True, supplier__isnull=False
                    )
                ),
                name="policy_owner_xor",
            ),
        ]

    def __str__(self):
        return self.title


class StrategicPartnerResponse(models.Model):
    id = models.AutoField(primary_key=True)
    interaction_date = models.DateField(blank=True, null=True)
    interaction_event_location = models.TextField(blank=True, null=True)
    response_focal_point = models.CharField(max_length=1024, blank=True, null=True)
    general_notes = models.TextField(blank=True, null=True)
    next_steps = models.TextField(blank=True, null=True)

    response_interaction_type = models.ForeignKey(
        ResponseInteractionType, on_delete=models.CASCADE, blank=True, null=True
    )

    issara_user_focal_point = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True
    )

    strategic_partner_response_files = models.ManyToManyField(
        StrategicPartnerResponseFile, blank=True
    )

    strategic_partner = models.ForeignKey(
        StrategicPartner, on_delete=models.CASCADE, blank=True, null=True
    )

    created = models.DateField(blank=True, null=True, auto_now_add=True)
    last_modified = models.DateField(blank=True, null=True, auto_now=True)

    class Meta:
        managed = True
        db_table = "strategic_partner_responses"


class PartnerReferenceDoc(models.Model):
    def get_upload_path(instance, filename):
        path = os.path.join("SP", "sp_files", filename)
        return path

    name = models.CharField(max_length=256, null=True, blank=True)
    strategic_partner = models.ForeignKey(
        StrategicPartner,
        on_delete=models.CASCADE,
    )
    file_path = models.FileField(
        blank=True,
        null=True,
        upload_to=get_upload_path,
    )
    description = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return str(self.pk)


class PartnerMessageBoard(models.Model):
    POST_TYPE_ANNOUNCEMENT = "announcement"
    POST_TYPE_REPORT = "report"
    POST_TYPE_EVENT = "event"
    POST_TYPES = (
        (POST_TYPE_ANNOUNCEMENT, "Announcement"),
        (POST_TYPE_REPORT, "Report"),
        (POST_TYPE_EVENT, "Event"),
    )

    STATUS_DRAFT = "draft"
    STATUS_PUBLISHED = "published"
    STATUSES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
    )

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    title = models.CharField(max_length=1024, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)
    sort_number = models.IntegerField(null=True, blank=True)

    strategic_partner = models.ForeignKey(
        StrategicPartner, on_delete=models.CASCADE, blank=True, null=True
    )

    post_type = models.CharField(
        max_length=16, choices=POST_TYPES, default=POST_TYPE_ANNOUNCEMENT
    )
    pinned = models.BooleanField(default=False)
    ack_required = models.BooleanField(default=False)
    ack_by = models.DateField(blank=True, null=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="authored_partner_messages",
    )
    image = models.ImageField(
        upload_to="partner_message_board/images/", blank=True, null=True
    )
    event_starts_at = models.DateTimeField(blank=True, null=True)
    event_ends_at = models.DateTimeField(blank=True, null=True)
    event_location = models.CharField(max_length=512, blank=True, null=True)
    attachments = models.ManyToManyField(
        SharedFile,
        blank=True,
        related_name="partner_message_board_posts",
    )
    # When true, the post is visible to every strategic partner regardless of
    # the `strategic_partner` FK. Used for cross-cohort announcements.
    audience_all = models.BooleanField(default=False)
    # Grouping-based audience: "Current CASCADE Partners" or
    # "Prospective CASCADE Partners". When set, overrides strategic_partner FK.
    audience_grouping = models.CharField(max_length=100, blank=True, null=True)
    # Explicit partner IDs when narrowing within a group. Null = whole group.
    audience_partner_ids = models.JSONField(blank=True, null=True)
    # Draft posts are authored by Issara staff but withheld from partners until
    # published. Only staff (the Team Console) ever see drafts.
    status = models.CharField(
        max_length=12, choices=STATUSES, default=STATUS_PUBLISHED
    )

    class Meta:
        verbose_name_plural = "PartnerMessageBoards"
        managed = True
        db_table = "partner_news_updates"

    def __str__(self):
        return self.name

    def audience_partner_queryset(self):
        """The StrategicPartner queryset this post is addressed to.

        Single source of truth for the post's audience so the post card
        (`ack_total`), the acknowledgement roster and the RSVP roster always
        agree. Priority order:
          1. audience_all → every partner.
          2. audience_partner_ids snapshot → exactly those partners (covers both
             grouping-with-snapshot and custom multi-select; authoritative).
          3. audience_grouping with no snapshot → the whole grouping (legacy).
          4. strategic_partner FK → that single partner.
          5. otherwise → every partner (legacy null-target broadcast).
        """
        if self.audience_all:
            return StrategicPartner.objects.all()
        if self.audience_partner_ids:
            return StrategicPartner.objects.filter(pk__in=self.audience_partner_ids)
        if self.audience_grouping:
            return StrategicPartner.objects.filter(
                strategic_partner_grouping=self.audience_grouping
            )
        if self.strategic_partner_id is not None:
            return StrategicPartner.objects.filter(pk=self.strategic_partner_id)
        return StrategicPartner.objects.all()


class PartnerMessageBoardComment(models.Model):
    post = models.ForeignKey(
        PartnerMessageBoard, on_delete=models.CASCADE, related_name="comments"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True
    )
    # Denormalised partner the commenting user belongs to, captured at write time
    # so the Team Console can scope comments per partner without relying on the
    # (fragile) user→strategic_partner_user join.
    strategic_partner = models.ForeignKey(
        StrategicPartner,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="message_board_comments",
    )
    body = models.TextField()
    parent_comment = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="replies",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "partner_message_board_comments"
        ordering = ("created_at",)

    def __str__(self):
        return f"Comment {self.id} on post {self.post_id}"


class PartnerMessageBoardAcknowledgement(models.Model):
    post = models.ForeignKey(
        PartnerMessageBoard,
        on_delete=models.CASCADE,
        related_name="acknowledgements",
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    # Denormalised partner the acknowledging user belongs to, captured at write
    # time so per-org acknowledgement counts/rosters don't depend on the
    # user→strategic_partner_user join (which drops unlinked users).
    strategic_partner = models.ForeignKey(
        StrategicPartner,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="message_board_acknowledgements",
    )
    acknowledged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "partner_message_board_acknowledgements"
        unique_together = (("post", "user"),)

    def __str__(self):
        return f"Ack {self.user_id}@post {self.post_id}"


class PartnerMessageBoardRSVP(models.Model):
    RSVP_GOING = "going"
    RSVP_NOT_GOING = "not_going"
    RSVP_STATUSES = (
        (RSVP_GOING, "Going"),
        (RSVP_NOT_GOING, "Not going"),
    )

    post = models.ForeignKey(
        PartnerMessageBoard, on_delete=models.CASCADE, related_name="rsvps"
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    # Denormalised partner the RSVPing user belongs to (see acknowledgement).
    strategic_partner = models.ForeignKey(
        StrategicPartner,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="message_board_rsvps",
    )
    status = models.CharField(
        max_length=16, choices=RSVP_STATUSES, default=RSVP_GOING
    )
    responded_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "partner_message_board_rsvps"
        unique_together = (("post", "user"),)

    def __str__(self):
        return f"RSVP {self.user_id}@post {self.post_id} ({self.status})"


class PartnerMessageBoardSeen(models.Model):
    post = models.ForeignKey(
        PartnerMessageBoard, on_delete=models.CASCADE, related_name="seen_by"
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    # Denormalised partner the viewing user belongs to (see acknowledgement /
    # RSVP). The unread dot stays per-user; this is for per-org "viewed by"
    # parity and future analytics.
    strategic_partner = models.ForeignKey(
        StrategicPartner,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="message_board_seen",
    )
    seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "partner_message_board_seen"
        unique_together = (("post", "user"),)

    def __str__(self):
        return f"Seen {self.user_id}@post {self.post_id}"


class PartnerMessageBoardReminder(models.Model):
    """A reminder Issara staff sent to a strategic partner to acknowledge / RSVP
    to a post. One row per (post, partner); re-reminding refreshes the time."""

    post = models.ForeignKey(
        PartnerMessageBoard, on_delete=models.CASCADE, related_name="reminders"
    )
    strategic_partner = models.ForeignKey(
        StrategicPartner,
        on_delete=models.CASCADE,
        related_name="message_board_reminders",
    )
    reminded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    reminded_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "partner_message_board_reminders"
        unique_together = (("post", "strategic_partner"),)

    def __str__(self):
        return f"Reminder partner {self.strategic_partner_id}@post {self.post_id}"


class PartnerMessageBoardReaction(models.Model):
    """A single emoji reaction a user left on a post. Facebook-style: one row
    per (post, user); choosing a different emoji replaces the previous one."""

    REACTION_THUMBS_UP = "thumbs_up"
    REACTION_HEART = "heart"
    REACTION_PARTY = "party"
    REACTION_CLAP = "clap"
    REACTION_EMOJIS = (
        (REACTION_THUMBS_UP, "Thumbs up"),
        (REACTION_HEART, "Heart"),
        (REACTION_PARTY, "Party popper"),
        (REACTION_CLAP, "Clapping hands"),
    )

    post = models.ForeignKey(
        PartnerMessageBoard, on_delete=models.CASCADE, related_name="reactions"
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    # Denormalised partner the reacting user belongs to (see acknowledgement /
    # RSVP / seen). Kept for per-org engagement analytics.
    strategic_partner = models.ForeignKey(
        StrategicPartner,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="message_board_reactions",
    )
    emoji = models.CharField(max_length=16, choices=REACTION_EMOJIS)
    reacted_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "partner_message_board_reactions"
        unique_together = (("post", "user"),)

    def __str__(self):
        return f"Reaction {self.user_id}@post {self.post_id} ({self.emoji})"


class SupplierMessageBoard(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    title = models.CharField(max_length=1024)
    description = models.TextField()
    created_at = models.DateField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sort_number = models.IntegerField(null=True, blank=True)

    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)

    class Meta:
        verbose_name_plural = "SupplierMessageBoards"

    def __str__(self):
        return self.name


# NACE Rev. 2.1 notation: section letter (A-V), division (02), group (02.2) or
# class (02.20). The classification itself is owned by cascade-api, so codes are
# stored as plain strings here and only their shape is validated.
NACE_CODE_VALIDATOR = RegexValidator(
    regex=r"^([A-V]|\d{2}(\.\d{1,2})?)$",
    message="Enter a NACE Rev. 2.1 code such as 'A', '02', '02.2' or '02.20'.",
)


def organization_logo_upload_path(instance, filename):
    """Store each CSO logo under its organization with a unique name."""
    extension = os.path.splitext(filename)[1].lower()
    return os.path.join(
        "organizations",
        str(instance.pk),
        "logo",
        f"{uuid.uuid4().hex}{extension}",
    )


class Organization(models.Model):
    """A CSO partner. Beyond the referral dropdown it backs, the organization
    now carries the profile its own users maintain in the CSO UI."""

    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(blank=True, null=True, auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    description = models.TextField(blank=True, null=True)
    website = models.URLField(max_length=255, blank=True, null=True)
    organization_type = models.CharField(
        max_length=64,
        choices=ORGANIZATION_TYPE_CHOICES,
        blank=True,
        null=True,
    )

    countries_of_registration = models.ManyToManyField(
        Country,
        blank=True,
        related_name="organizations_registered_in",
        db_table="organization_countries_of_registration",
    )
    countries_of_operation = models.ManyToManyField(
        Country,
        blank=True,
        related_name="organizations_operating_in",
        db_table="organization_countries_of_operation",
    )
    languages_supported = models.ManyToManyField(
        Language,
        blank=True,
        related_name="organizations",
        db_table="organization_languages_supported",
    )
    logo = models.ImageField(
        upload_to=organization_logo_upload_path,
        storage=PublicStorage(),
        blank=True,
        null=True,
    )

    def __str__(self):
        return self.name


def organization_image_upload_path(instance, filename):
    """Store CSO gallery images under their organization with unique names."""
    extension = os.path.splitext(filename)[1].lower()
    return os.path.join(
        "organizations",
        str(instance.organization_id),
        "images",
        f"{uuid.uuid4().hex}{extension}",
    )


class OrganizationImage(models.Model):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="profile_images"
    )
    image = models.ImageField(
        upload_to=organization_image_upload_path,
        storage=PublicStorage(),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "organization_images"
        ordering = ("created_at", "id")

    def __str__(self):
        return f"{self.organization.name}: image {self.pk}"


class OrganizationCoreFocusArea(models.Model):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="core_focus_areas"
    )
    focus_area = models.CharField(
        max_length=64, choices=ORGANIZATION_CORE_FOCUS_AREA_CHOICES
    )

    class Meta:
        db_table = "organization_core_focus_areas"
        unique_together = ("organization", "focus_area")

    def __str__(self):
        return f"{self.organization.name}: {self.focus_area}"


class OrganizationStakeholderGroup(models.Model):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="stakeholder_groups"
    )
    stakeholder_group = models.CharField(
        max_length=64, choices=ORGANIZATION_STAKEHOLDER_GROUP_CHOICES
    )

    class Meta:
        db_table = "organization_stakeholder_groups"
        unique_together = ("organization", "stakeholder_group")

    def __str__(self):
        return f"{self.organization.name}: {self.stakeholder_group}"


class OrganizationNaceCode(models.Model):
    """One target sector/industry an organization works on.

    No foreign key is possible: `nace_codes` lives in the cascade-api database,
    not this one. Only the canonical code is stored -- never the label -- so the
    display notation the UI settles on has no bearing on what is persisted.
    """

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="nace_codes"
    )
    code = models.CharField(max_length=8, validators=[NACE_CODE_VALIDATOR])

    class Meta:
        db_table = "organization_nace_codes"
        unique_together = ("organization", "code")

    def __str__(self):
        return f"{self.organization.name}: {self.code}"


class UserOrganization(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        models.CASCADE,
        primary_key=True,
        related_name="organization_user",
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="org"
    )

    def __str__(self):
        try:
            user_str = self.user.username
        except UserOrganization.user.RelatedObjectDoesNotExist:
            user_str = "User not found"

        try:
            organization_str = self.organization.name
        except Organization.DoesNotExist:
            organization_str = "Partner not found"

        return f"{user_str}:{organization_str}"


class CaseIssue(models.Model):
    id = models.AutoField(primary_key=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)
    last_modified = models.DateField(blank=True, null=True, auto_now=True)
    description = models.TextField(blank=True, null=True)
    affected_workers = models.IntegerField(blank=True, null=True)

    level = models.IntegerField(blank=True, null=True)

    issue_category = models.ForeignKey(
        IssueCategory, on_delete=models.CASCADE, null=True, blank=True
    )

    kpis = models.ManyToManyField("kpis.Kpi", blank=True)

    case_status = models.ForeignKey(
        CaseStatus, on_delete=models.CASCADE, null=True, blank=True
    )

    class Meta:
        verbose_name_plural = "Case Issues"
        managed = True
        db_table = "case_issues"

    def __str__(self):
        return self.description


class CaseInteraction(models.Model):
    id = models.AutoField(primary_key=True)
    type = models.CharField(
        max_length=20,
        default="Incoming",
        null=True,
        blank=True,
        choices=(
            ("Incoming", "Incoming"),
            ("Outgoing", "Outgoing"),
        ),
    )
    summary = models.TextField(blank=True, null=True)
    interacted = models.DateField(blank=True, null=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)
    last_modified = models.DateField(blank=True, null=True, auto_now=True)

    issara_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    interaction_reason = models.ForeignKey(
        InteractionReason, on_delete=models.CASCADE, null=True, blank=True
    )
    interaction_channel = models.ForeignKey(
        InteractionChannel, on_delete=models.CASCADE, null=True, blank=True
    )

    class Meta:
        verbose_name_plural = "Case Interactions"
        managed = True
        db_table = "case_interactions"


class Case(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=512, null=True, blank=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)
    last_modified = models.DateField(blank=True, null=True, auto_now=True)
    client_nickname = models.CharField(blank=True, null=True, max_length=45)
    client_phonenumber = models.CharField(blank=True, null=True, max_length=45)
    client_line_account = models.CharField(blank=True, null=True, max_length=1024)
    client_facebook_account = models.CharField(blank=True, null=True, max_length=1024)
    client_whatsapp_account = models.CharField(blank=True, null=True, max_length=1024)
    client_viber_account = models.CharField(blank=True, null=True, max_length=1024)
    client_share_info_consent = models.CharField(blank=True, null=True, max_length=112)
    consent_to_discuss_with_employer_anonymously = models.BooleanField(
        null=True,
        blank=True,
        default=None,
    )
    # 20 rather than 10: "EARLY_WARNING" does not fit the width the
    # Low/Medium/High scale was sized for.
    worker_identification_risk_level = models.CharField(
        max_length=20,
        choices=CaseRiskLevel.RISK_LEVEL_CHOICES,
        null=True,
        blank=True,
    )
    client_time_at_job = models.IntegerField(blank=True, null=True)
    issara_supply_chain = models.CharField(blank=True, null=True, max_length=512)
    non_supply_chain = models.CharField(blank=True, null=True, max_length=512)
    description = models.TextField(blank=True, null=True)
    debt_bondage = models.CharField(blank=True, null=True, max_length=45)
    debt_bondage_detail = models.TextField(blank=True, null=True)
    debt_bondage_broker = models.CharField(blank=True, null=True, max_length=45)
    debt_bondage_detail_broker = models.TextField(blank=True, null=True)
    vot_needs = models.TextField(blank=True, null=True)
    referral_notes = models.TextField(blank=True, null=True)
    next_steps = models.TextField(blank=True, null=True)
    work_place_details = models.TextField(blank=True, null=True)

    dead_line_date = models.DateField(blank=True, null=True)
    final_remarks = models.TextField(blank=True, null=True)
    risk_assessment = models.TextField(blank=True, null=True)
    safeguards_remarks = models.TextField(blank=True, null=True)

    source_upstream_broker = models.CharField(blank=True, null=True, max_length=112)

    rating_source_broker = models.PositiveIntegerField(
        blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    rating_source_recruiter = models.PositiveIntegerField(
        blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    rating_dest_recruiter = models.PositiveIntegerField(
        blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    rating_dest_employer = models.PositiveIntegerField(
        blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )

    case_status = models.ForeignKey(
        CaseStatus, on_delete=models.CASCADE, null=True, blank=True
    )

    supplier = models.ForeignKey(
        Supplier, related_name="cases", on_delete=models.CASCADE, null=True, blank=True
    )

    work_place = models.ForeignKey(
        WorkPlace, on_delete=models.CASCADE, null=True, blank=True
    )

    issara_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="cases",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    next_steps_issara_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="cases_next_step",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    source_recruiter = models.ForeignKey(
        Recruiter,
        related_name="source_recruiter",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    destination_recruiter = models.ForeignKey(
        Recruiter,
        related_name="destination_recruiter",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )

    client_contract_type = models.ForeignKey(
        ContractType, on_delete=models.CASCADE, null=True, blank=True
    )
    client_document_type = models.ForeignKey(
        DocumentType, on_delete=models.CASCADE, null=True, blank=True
    )
    client_gender = models.ForeignKey(
        Gender, on_delete=models.CASCADE, null=True, blank=True
    )
    client_ethnicity = models.ForeignKey(
        Ethnicity, on_delete=models.CASCADE, null=True, blank=True
    )
    client_nationality = models.ForeignKey(
        Nationality, on_delete=models.CASCADE, blank=True, null=True
    )
    case_category = models.ForeignKey(
        CaseCategory, on_delete=models.CASCADE, null=True, blank=True
    )
    client_type = models.ForeignKey(
        ClientType, on_delete=models.CASCADE, null=True, blank=True
    )
    client_status = models.ForeignKey(
        ClientStatus, on_delete=models.CASCADE, null=True, blank=True
    )
    referral_action = models.ForeignKey(
        ReferralAction, on_delete=models.CASCADE, null=True, blank=True
    )

    country = models.ForeignKey(
        Country, on_delete=models.CASCADE, null=True, blank=True
    )

    province = models.ForeignKey(
        Province, on_delete=models.CASCADE, null=True, blank=True
    )

    district = models.ForeignKey(
        District, on_delete=models.CASCADE, null=True, blank=True
    )

    client_origin_country = models.ForeignKey(
        Country,
        related_name="client_origin_country",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    client_origin_province = models.ForeignKey(
        Province,
        related_name="client_origin_province",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    client_origin_district = models.ForeignKey(
        District,
        related_name="client_origin_district",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )

    client_crossing_country = models.ForeignKey(
        Country,
        related_name="client_crossing_country",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    client_crossing_province = models.ForeignKey(
        Province,
        related_name="client_crossing_province",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    client_crossing_district = models.ForeignKey(
        District,
        related_name="client_crossing_district",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )

    first_time_contacting_issara = models.CharField(
        max_length=32,
        blank=True,
        null=True,
        choices=(
            ("Yes", "Yes"),
            ("No", "No"),
            ("Cannot remember", "Cannot remember"),
        ),
    )

    case_how_hear_issara = models.ManyToManyField(HowHearIssara, blank=True)

    case_interactions = models.ManyToManyField(CaseInteraction, blank=True)

    issue_description = models.TextField(blank=True, null=True)

    issue_offender_description = models.TextField(blank=True, null=True)

    issue_legacy_level = models.IntegerField(blank=True, null=True)

    issue_category = models.ForeignKey(
        IssueCategory, on_delete=models.CASCADE, null=True, blank=True
    )

    issue_workers_affected = models.PositiveIntegerField(blank=True, null=True)

    issue_workers_affected_description = models.TextField(blank=True, null=True)

    issue_getting_better = models.CharField(blank=True, null=True, max_length=45)

    issue_getting_better_description = models.TextField(blank=True, null=True)

    links = models.TextField(blank=True, null=True)

    kpis = models.ManyToManyField("kpis.Kpi", blank=True)
    case_created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="cases_created_by",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    original_ilm_one_id = models.IntegerField(blank=True, null=True)
    industry = models.ForeignKey(
        Industry, on_delete=models.SET_NULL, null=True, blank=True
    )
    subindustry = models.ForeignKey(
        SubIndustry, on_delete=models.SET_NULL, null=True, blank=True
    )

    interactiontype = models.CharField(
        max_length=20,
        default="Incoming",
        null=True,
        blank=True,
        choices=(
            ("Incoming", "Incoming"),
            ("Outgoing", "Outgoing"),
        ),
    )

    interaction_summary = models.TextField(blank=True, null=True)
    interacted = models.DateTimeField(blank=True, null=True)
    interaction_reason = models.ForeignKey(
        InteractionReason, on_delete=models.CASCADE, null=True, blank=True
    )
    interaction_channel = models.ForeignKey(
        InteractionChannel, on_delete=models.CASCADE, null=True, blank=True
    )

    interaction_issara_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="cases_interactions_user",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    client_telegram_account = models.CharField(blank=True, null=True, max_length=1024)
    client_zalo_account = models.CharField(blank=True, null=True, max_length=1024)
    # Free text: whichever platform the worker actually used, written as
    # "platform - handle" by the officer. The named columns above cover the
    # platforms common enough to be worth their own field; this is the rest.
    client_other_account = models.CharField(blank=True, null=True, max_length=1024)
    attachments = models.ManyToManyField(
        SharedFile,
        blank=True,
        related_name="cases",
    )
    supplier_kpis = models.ManyToManyField("kpis.SupplierKpi", blank=True)
    refer_to_org = models.ForeignKey(
        Organization,
        related_name="refer_org",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    history = HistoricalRecords()

    class Meta:
        managed = True
        db_table = "cases"

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)

        instance._loaded_values = dict(zip(field_names, values))

        return instance


class NonSupplyChainCaseIndustry(models.Model):
    supplier = models.ForeignKey("NonSupplyChainCase", on_delete=models.CASCADE)
    industry = models.ForeignKey(Industry, on_delete=models.CASCADE)


class NonSupplyChainCaseSubIndustry(models.Model):
    supplier = models.ForeignKey("NonSupplyChainCase", on_delete=models.CASCADE)
    subindustry = models.ForeignKey(SubIndustry, on_delete=models.CASCADE)


class NonSupplyChainCase(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    created = models.DateField(blank=True, null=True, auto_now_add=True)
    address = models.CharField(max_length=500, blank=True, null=True)
    zipcode = models.CharField(max_length=20, blank=True, null=True)
    offender_name = models.CharField(max_length=1024, blank=True, null=True)
    contact_phone = models.CharField(max_length=100, blank=True, null=True)
    contact_email = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    country = models.ForeignKey(
        Country, on_delete=models.CASCADE, null=True, blank=True
    )
    province = models.ForeignKey(
        Province, on_delete=models.CASCADE, null=True, blank=True
    )
    district = models.ForeignKey(
        District, on_delete=models.CASCADE, null=True, blank=True
    )

    industries = models.ManyToManyField(
        Industry,
        through="NonSupplyChainCaseIndustry",
        related_name="non_supply_chain_cases_industries",
    )

    subindustries = models.ManyToManyField(
        SubIndustry,
        through="NonSupplyChainCaseSubIndustry",
        related_name="non_supply_chain_cases_subindustries",
    )

    class Meta:
        managed = True
        db_table = "non_supply_chain_cases"
        indexes = [
            models.Index(fields=["-name"]),
        ]

    def __str__(self):
        return str(self.id) + " - " + self.name + " - " + self.offender_name

    def __repr__(self):
        repr = (
            f"ID: {self.id} \n"
            f"NAME: {self.name} \n"
            f"OFFENDER_NAME: {self.offender_name} \n"
        )
        return repr


class SupplierCRCResponse(models.Model):
    id = models.AutoField(primary_key=True)

    supplier = models.ForeignKey(
        Supplier, related_name="crc_scores", on_delete=models.CASCADE, null=True
    )

    created_at = models.DateField(blank=True, null=True, auto_now_add=True)

    avg_worker_response_feedback = models.IntegerField(blank=True, null=True)
    avg_worker_recruitment_mngmt_feedback = models.IntegerField(blank=True, null=True)
    issara_tech_assessment_response_quality_hr = models.IntegerField(
        blank=True, null=True
    )
    issara_tech_assessment_response_quality_production = models.IntegerField(
        blank=True, null=True
    )
    issara_tech_assessment_response_quality_sr_mngmt = models.IntegerField(
        blank=True, null=True
    )

    duration_of_time_taken_to_respond = models.IntegerField(blank=True, null=True)
    duration_of_time_taken_to_revert_on_action_plan = models.IntegerField(
        blank=True, null=True
    )
    duration_of_time_taken_to_resolve_issues = models.IntegerField(
        blank=True, null=True
    )

    site_cooperation_with_ethicall_distribution = models.IntegerField(
        blank=True, null=True
    )
    business_attitude_toward_suggested_remedies = models.IntegerField(
        blank=True, null=True
    )
    business_attitude_toward_capacity_and_risks = models.IntegerField(
        blank=True, null=True
    )
    business_attitude_toward_promoting_worker_voice = models.IntegerField(
        blank=True, null=True
    )
    business_attitude_toward_worker_treatment = models.IntegerField(
        blank=True, null=True
    )
    business_attitude_toward_issara = models.IntegerField(blank=True, null=True)

    response_quality_comments = models.TextField(blank=True, null=True)
    response_timeliness_comments = models.TextField(blank=True, null=True)
    response_openness_comments = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Supplier CRC *Ratings/Responses"
        managed = True
        db_table = "supplier_crc_responses"

    def __str__(self):
        return "{} - {}".format(self.supplier, self.created_at)


class SupplierResponseFile(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    url = models.CharField(max_length=1024)
    description = models.TextField(blank=True, null=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)

    class Meta:
        verbose_name_plural = "Supplier Response Files"
        managed = True
        db_table = "supplier_response_files"

    def __str__(self):
        return self.name


class BusinessResponse(models.Model):
    id = models.AutoField(primary_key=True)

    suppliers = models.ManyToManyField(Supplier, blank=True)
    suppliers_notes = models.TextField(blank=True, null=True)

    recruiters = models.ManyToManyField(Recruiter, blank=True)
    recruiters_notes = models.TextField(blank=True, null=True)

    global_buyers = models.ManyToManyField(StrategicPartner, blank=True)
    global_buyers_notes = models.TextField(blank=True, null=True)

    other_parties_notes = models.TextField(blank=True, null=True)

    event_details = models.TextField(blank=True, null=True)
    event_location = models.CharField(max_length=256, blank=True, null=True)
    event_date = models.DateField(blank=True, null=True)
    event_interaction_type = models.ForeignKey(
        ResponseInteractionType, on_delete=models.SET_NULL, blank=True, null=True
    )

    suppliers_next_steps = models.TextField(blank=True, null=True)
    suppliers_next_steps_deadline = models.DateField(blank=True, null=True)
    suppliers_focal_points = models.CharField(max_length=512, null=True, blank=True)

    recruiters_next_steps = models.TextField(blank=True, null=True)
    recruiters_next_steps_deadline = models.DateField(blank=True, null=True)
    recruiters_focal_points = models.CharField(max_length=512, null=True, blank=True)

    global_buyers_next_steps = models.TextField(blank=True, null=True)
    global_buyers_next_steps_deadline = models.DateField(blank=True, null=True)
    global_buyers_focal_points = models.CharField(max_length=512, null=True, blank=True)

    issara_next_steps = models.TextField(blank=True, null=True)
    issara_next_steps_deadline = models.DateField(blank=True, null=True)
    issara_focal_points = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True)

    created_at = models.DateField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_business_responses",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    modified_at = models.DateField(blank=True, null=True, auto_now=True)

    class Meta:
        verbose_name_plural = "Business Responses"
        managed = True
        db_table = "business_responses"

    def __str__(self):
        return self.event_details


class RecruiterResponseFile(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024)
    url = models.CharField(max_length=1024)
    description = models.TextField(blank=True, null=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)

    class Meta:
        verbose_name_plural = "Recruiter Response Files"
        managed = True
        db_table = "recruiter_response_files"

    def __str__(self):
        return self.name


class RecruiterResponse(models.Model):
    id = models.AutoField(primary_key=True)

    name = models.CharField(max_length=512)
    description = models.TextField(blank=True, null=True)
    response_proposed = models.TextField(blank=True, null=True)
    intro_meeting = models.TextField(blank=True, null=True)
    ethical_requirement_related_meeting = models.TextField(blank=True, null=True)
    strategy_meeting = models.TextField(blank=True, null=True)
    business_specific_training = models.TextField(blank=True, null=True)
    stakeholer_multi_training = models.TextField(blank=True, null=True)
    business_called_issara = models.TextField(blank=True, null=True)
    issara_called_business = models.TextField(blank=True, null=True)
    general_notes = models.TextField(blank=True, null=True)
    next_steps = models.TextField(blank=True, null=True)

    proposed_response_impacted_qty = models.IntegerField(blank=True, null=True)
    response_focal_point = models.CharField(max_length=512)

    created = models.DateField(blank=True, null=True, auto_now_add=True)
    last_modified = models.DateField(blank=True, null=True, auto_now=True)

    recruiter = models.ForeignKey(Recruiter, on_delete=models.CASCADE, null=True)

    interaction_reason = models.ForeignKey(
        InteractionReason, on_delete=models.CASCADE, null=True
    )

    interaction_channel = models.ForeignKey(
        InteractionChannel, on_delete=models.CASCADE, null=True
    )

    issue_category = models.ForeignKey(
        IssueCategory, on_delete=models.CASCADE, null=True
    )

    kpis = models.ManyToManyField("kpis.Kpi", blank=True)

    recruiter_issue = models.ForeignKey(
        RecruiterIssue, on_delete=models.CASCADE, null=True
    )

    issara_staff_involved = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True)
    recruiter_response_files = models.ManyToManyField(RecruiterResponseFile, blank=True)

    class Meta:
        verbose_name_plural = "Recruiter Responses"
        managed = True
        db_table = "recruiter_responses"

    def __str__(self):
        return self.recruiter.name


class MmThaiDemandData(models.Model):
    id = models.AutoField(primary_key=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)
    record_date = models.DateField(blank=True, null=True, auto_now_add=True)

    week = models.CharField(max_length=512)
    year = models.CharField(max_length=512)
    month = models.CharField(max_length=512)
    year_month = models.CharField(max_length=512)
    recruiter_name = models.CharField(max_length=512)
    supplier_name = models.CharField(max_length=512)
    province = models.CharField(max_length=512)
    type_of_factory = models.CharField(max_length=512)
    industry = models.CharField(max_length=512)
    subindustry = models.CharField(max_length=512)
    num_males = models.IntegerField(blank=True, null=True)
    num_females = models.IntegerField(blank=True, null=True)
    num_total = models.IntegerField(blank=True, null=True)

    recruiter = models.ForeignKey(Recruiter, on_delete=models.CASCADE, null=True)

    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, null=True)

    factorytype = models.ForeignKey(FactoryType, on_delete=models.CASCADE, null=True)

    ilm_industry = models.ForeignKey(Industry, on_delete=models.CASCADE, null=True)

    ilm_subindustry = models.ForeignKey(
        SubIndustry, on_delete=models.CASCADE, null=True
    )

    class Meta:
        verbose_name_plural = "MM Thai Demand Data"
        managed = True
        db_table = "mm_thai_demand_data"

    def __str__(self):
        return (
            self.supplier_name
            + ":"
            + self.recruiter_name
            + ":"
            + self.industry
            + ":"
            + self.subindustry
            + ":"
            + self.type_of_factory
        )


class MmThaiSendingData(models.Model):
    id = models.AutoField(primary_key=True)
    created = models.DateField(blank=True, null=True, auto_now_add=True)
    record_date = models.DateField(blank=True, null=True, auto_now_add=True)

    demand_approved_male = models.IntegerField(blank=True, null=True)
    demand_approved_female = models.IntegerField(blank=True, null=True)
    demand_approved_total = models.IntegerField(blank=True, null=True)

    visa_issued_male = models.IntegerField(blank=True, null=True)
    visa_issued_female = models.IntegerField(blank=True, null=True)
    visa_issued_total = models.IntegerField(blank=True, null=True)

    sending_male = models.IntegerField(blank=True, null=True)
    sending_female = models.IntegerField(blank=True, null=True)
    sending_total = models.IntegerField(blank=True, null=True)

    smart_card_issued_male = models.IntegerField(blank=True, null=True)
    smart_card_issued_female = models.IntegerField(blank=True, null=True)
    smart_card_issued_total = models.IntegerField(blank=True, null=True)

    recruiter = models.ForeignKey(Recruiter, on_delete=models.CASCADE, null=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, null=True)

    industry = models.ForeignKey(Industry, on_delete=models.CASCADE, null=True)
    subindustry = models.ForeignKey(SubIndustry, on_delete=models.CASCADE, null=True)

    factory_type = models.ForeignKey(FactoryType, on_delete=models.SET_NULL, null=True)
    province = models.ForeignKey(Province, on_delete=models.SET_NULL, null=True)

    class Meta:
        verbose_name_plural = "MM Thai Sending Data"
        managed = True
        db_table = "mm_thai_sending_data"
        indexes = [
            models.Index(fields=["-record_date"]),
        ]

    def __str__(self):
        return self.supplier.name


class RecruiterCRCResponse(models.Model):
    id = models.AutoField(primary_key=True)

    recruiter = models.ForeignKey(
        Recruiter,
        related_name="crc_recruiter_scores",
        on_delete=models.CASCADE,
        null=True,
    )

    created_at = models.DateField(blank=True, null=True, auto_now_add=True)

    avg_worker_response_feedback = models.IntegerField(blank=True, null=True)
    avg_worker_recruitment_mngmt_feedback = models.IntegerField(blank=True, null=True)
    issara_tech_assessment_response_quality_hr = models.IntegerField(
        blank=True, null=True
    )
    issara_tech_assessment_response_quality_production = models.IntegerField(
        blank=True, null=True
    )
    issara_tech_assessment_response_quality_sr_mngmt = models.IntegerField(
        blank=True, null=True
    )

    duration_of_time_taken_to_respond = models.IntegerField(blank=True, null=True)
    duration_of_time_taken_to_revert_on_action_plan = models.IntegerField(
        blank=True, null=True
    )
    duration_of_time_taken_to_resolve_issues = models.IntegerField(
        blank=True, null=True
    )

    site_cooperation_with_ethicall_distribution = models.IntegerField(
        blank=True, null=True
    )
    business_attitude_toward_suggested_remedies = models.IntegerField(
        blank=True, null=True
    )
    business_attitude_toward_capacity_and_risks = models.IntegerField(
        blank=True, null=True
    )
    business_attitude_toward_promoting_worker_voice = models.IntegerField(
        blank=True, null=True
    )
    business_attitude_toward_worker_treatment = models.IntegerField(
        blank=True, null=True
    )
    business_attitude_toward_issara = models.IntegerField(blank=True, null=True)

    response_quality_comments = models.TextField(blank=True, null=True)
    response_timeliness_comments = models.TextField(blank=True, null=True)
    response_openness_comments = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Recruiter CRC *Ratings/Responses"
        managed = True
        db_table = "recruiter_crc_responses"

    def __str__(self):
        return "{} - {}".format(self.recruiter, self.created_at)


class FieldworkActivityTypeCategory(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=256, null=True, blank=True)

    class Meta:
        verbose_name_plural = "Fieldwork Activity Type Categories"
        managed = True
        db_table = "fieldwork_type_categories"

    def __str__(self):
        return self.name


class FieldworkActivityType(OrganizationOnly):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=256, null=True, blank=True)
    category = models.ForeignKey(
        FieldworkActivityTypeCategory,
        related_name="types",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name_plural = "Fieldwork Activity Types"
        managed = True
        db_table = "fieldwork_types"

    def __str__(self):
        return self.name


class FieldworkActivityTypeTranslation(models.Model):
    fieldwork_activity_type = models.ForeignKey(
        FieldworkActivityType, null=False, blank=False, on_delete=models.CASCADE
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=256, null=False, blank=False)

    class Meta:
        db_table = "fieldwork_activity_type_translations"
        unique_together = (
            "fieldwork_activity_type",
            "language",
        )

    def __str__(self):
        return self.name


class FieldworkActivityPrimaryFocus(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=256, null=True, blank=True)

    class Meta:
        verbose_name_plural = "Fieldwork Activity Primary Focuses"
        managed = True
        db_table = "fieldwork_primary_focuses"

    def __str__(self):
        return self.name


class FieldworkActivity(models.Model):
    id = models.AutoField(primary_key=True)

    fieldwork_date = models.DateField(blank=True, null=True)
    fieldwork_type = models.ForeignKey(
        FieldworkActivityType, on_delete=models.SET_NULL, null=True, blank=True
    )
    training_name = models.CharField(max_length=256, null=True, blank=True)
    nationality = models.ForeignKey(
        Nationality, on_delete=models.SET_NULL, null=True, blank=True
    )
    country = models.ForeignKey(
        Country, on_delete=models.SET_NULL, null=True, blank=True
    )
    province = models.ForeignKey(
        Province, on_delete=models.SET_NULL, null=True, blank=True
    )
    district = models.ForeignKey(
        District, on_delete=models.SET_NULL, null=True, blank=True
    )

    outreach_target = models.IntegerField(blank=True, null=True)
    suppliers = models.ManyToManyField(Supplier, blank=True)
    recruiters = models.ManyToManyField(Recruiter, blank=True)
    notes = models.TextField(blank=True, null=True)
    links = models.TextField(blank=True, null=True)

    total_workers_reached = models.IntegerField(blank=True, null=True)
    female_workers_reached = models.IntegerField(blank=True, null=True)
    male_workers_reached = models.IntegerField(blank=True, null=True)
    myanmar_workers_reached = models.IntegerField(blank=True, null=True)
    cambodian_workers_reached = models.IntegerField(blank=True, null=True)
    thai_workers_reached = models.IntegerField(blank=True, null=True)
    lao_workers_reached = models.IntegerField(blank=True, null=True)
    nepalese_workers_reached = models.IntegerField(blank=True, null=True)
    bangladeshi_workers_reached = models.IntegerField(blank=True, null=True)
    indonesian_workers_reached = models.IntegerField(blank=True, null=True)
    malaysian_workers_reached = models.IntegerField(blank=True, null=True)
    indian_workers_reached = models.IntegerField(blank=True, null=True)
    sri_lankan_workers_reached = models.IntegerField(blank=True, null=True)
    pakistani_workers_reached = models.IntegerField(blank=True, null=True)
    vietnamese_workers_reached = models.IntegerField(blank=True, null=True)
    filipino_workers_reached = models.IntegerField(blank=True, null=True)
    taiwanese_workers_reached = models.IntegerField(blank=True, null=True)
    other_workers_reached = models.IntegerField(blank=True, null=True)

    strategic_partners = models.ManyToManyField(StrategicPartner, blank=True)
    total_people_reached = models.IntegerField(blank=True, null=True)
    male_reached = models.IntegerField(blank=True, null=True)
    female_reached = models.IntegerField(blank=True, null=True)
    primary_focus = models.ForeignKey(
        FieldworkActivityPrimaryFocus, on_delete=models.SET_NULL, blank=True, null=True
    )
    primary_focus_other_description = models.TextField(blank=True, null=True)

    created_at = models.DateField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        verbose_name_plural = "Fieldwork Activity"
        managed = True
        db_table = "fieldwork_activities"

    def __str__(self):
        return "{} - {}".format(self.notes, self.fieldwork_date)


class MonthlyWorkerVoice(models.Model):
    id = models.AutoField(primary_key=True)

    month_year = models.DateField(blank=True, null=True)
    khmer_tiktok = models.IntegerField(
        blank=True, null=True, verbose_name="Khmer TikTok"
    )
    hotline_in_taiwan = models.IntegerField(
        blank=True, null=True, verbose_name="Hotline in Taiwan"
    )
    mm_hotline_total = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese hotline in Thailand"
    )
    mm_whatsapp_total = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese WhatsApp in Thailand"
    )
    yangon_hotline_total = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese hotline in Myanmar"
    )
    yangon_whatsapp_total = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese WhatsApp in Yangon"
    )
    yangon_viber_total = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese Viber in Yangon"
    )
    yangon_instagram = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese Instagram in Myanmar"
    )
    yangon_golden_dreams = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese Golden Dreams in Myanmar"
    )
    mm_fb_total = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese Facebook messenger"
    )
    mm_line_total = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese LINE messages"
    )
    mm_viber_total = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese Viber"
    )
    mm_instagram = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese Instagram in Thailand"
    )
    mm_golden_dreams = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese Golden Dreams in Thailand"
    )
    cb_hotline_total = models.IntegerField(
        blank=True, null=True, verbose_name="Khmer Hotline"
    )
    cb_whatsapp_total = models.IntegerField(
        blank=True, null=True, verbose_name="Khmer WhatsApp"
    )
    cb_fb_total = models.IntegerField(
        blank=True, null=True, verbose_name="Khmer Facebook messenger"
    )
    cb_line_total = models.IntegerField(
        blank=True, null=True, verbose_name="Khmer Facebook messenger"
    )
    cb_viber_total = models.IntegerField(
        blank=True, null=True, verbose_name="Khmer Telegram"
    )
    cb_instagram = models.IntegerField(
        blank=True, null=True, verbose_name="Khmer Instagram"
    )
    cb_golden_dreams = models.IntegerField(
        blank=True, null=True, verbose_name="Khmer Golden Dreams"
    )
    thai_hotline_total = models.IntegerField(
        blank=True, null=True, verbose_name="Thai Hotline"
    )
    thai_whatsapp_total = models.IntegerField(
        blank=True, null=True, verbose_name="Thai WhatsApp"
    )
    thai_fb_total = models.IntegerField(
        blank=True, null=True, verbose_name="Thai Facebook"
    )
    thai_line_total = models.IntegerField(
        blank=True, null=True, verbose_name="Thai LINE"
    )
    thai_viber_total = models.IntegerField(
        blank=True, null=True, verbose_name="Thai Viber"
    )
    thai_instagram = models.IntegerField(
        blank=True, null=True, verbose_name="Thai Instagram"
    )
    thai_golden_dreams = models.IntegerField(
        blank=True, null=True, verbose_name="Thai Golden Dreams"
    )
    my_indonesian_whatsapp_total = models.IntegerField(
        blank=True, null=True, verbose_name="Indonesian WhatsApp"
    )
    my_indonesia_hotline_total = models.IntegerField(
        blank=True, null=True, verbose_name="Indonesian hotline"
    )
    my_nepal_whatsapp_total = models.IntegerField(
        blank=True, null=True, verbose_name="Nepali WhatsApp"
    )
    nepal_hotline_total = models.IntegerField(
        blank=True, null=True, verbose_name="Nepali Hotline"
    )
    nepal_facebook_total = models.IntegerField(
        blank=True, null=True, verbose_name="Nepali Facebook messenger"
    )
    my_burmese_whatsapp_total = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese WhatsApp in Malaysia"
    )
    my_burmese_hotline_total = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese hotline in Malaysia"
    )
    my_burmese_viber_total = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese Viber in Thailand"
    )
    my_burmese_instagram = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese Instagram in Malaysia"
    )
    my_burmese_golden_dreams = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese Golden Dreams in Malaysia"
    )
    burmese_titok_messages = models.IntegerField(
        blank=True, null=True, verbose_name="Burmese Tiktok in Malaysia"
    )
    nepalese_tiktok_messages = models.IntegerField(
        blank=True, null=True, verbose_name="Nepali Tiktok"
    )
    nepal_instagram = models.IntegerField(
        blank=True, null=True, verbose_name="Nepali Instagram"
    )
    nepal_golden_dreams = models.IntegerField(
        blank=True, null=True, verbose_name="Nepali Golden Dreams"
    )
    bangladeshi_facebook_messenger = models.IntegerField(
        blank=True, null=True, verbose_name="Bangladeshi Facebook messenger"
    )
    bangladeshi_hotline = models.IntegerField(
        blank=True, null=True, verbose_name="Bangladeshi Hotline"
    )
    bangladeshi_whatsapp = models.IntegerField(
        blank=True, null=True, verbose_name="Bangladeshi WhatsApp"
    )
    bangladeshi_tiktok_messages = models.IntegerField(
        blank=True, null=True, verbose_name="Bangladeshi Tiktok"
    )
    bangladeshi_telegram_messages = models.IntegerField(
        blank=True, null=True, verbose_name="Bangladeshi Telegram"
    )
    bangladeshi_instagram = models.IntegerField(
        blank=True, null=True, verbose_name="Bangladeshi Instagram"
    )
    bangladeshi_golden_dreams = models.IntegerField(
        blank=True, null=True, verbose_name="Bangladeshi Golden Dreams"
    )
    vietnamese_hotline_total = models.IntegerField(
        blank=True, null=True, verbose_name="Vietnamese Hotline"
    )
    vietnamese_whatsapp_total = models.IntegerField(
        blank=True, null=True, verbose_name="Vietnamese WhatsApp"
    )
    vietnamese_facebook_messenger = models.IntegerField(
        blank=True, null=True, verbose_name="Vietnamese Facebook Messenger"
    )
    vietnamese_tiktok_messages = models.IntegerField(
        blank=True, null=True, verbose_name="Vietnamese TikTok"
    )
    vietnamese_zalo_messages = models.IntegerField(
        blank=True, null=True, verbose_name="Vietnamese Zalo"
    )
    vietnamese_instagram = models.IntegerField(
        blank=True, null=True, verbose_name="Vietnamese Instagram"
    )
    vietnamese_golden_dreams = models.IntegerField(
        blank=True, null=True, verbose_name="Vietnamese Golden Dreams"
    )

    created_at = models.DateField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        verbose_name_plural = "Monthly Worker Voice"
        managed = True
        db_table = "monthly_worker_voice"

    def __str__(self):
        return "{}".format(self.month_year)


class EthicalRecruitmentMeeting(models.Model):
    id = models.AutoField(primary_key=True)

    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, null=True)
    recruiter = models.ForeignKey(Recruiter, on_delete=models.CASCADE, null=True)
    issara_staff = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True)
    location = models.CharField(max_length=512, blank=True, null=True)
    assesment = models.CharField(max_length=512, blank=True, null=True)
    supplier_contacts = models.CharField(max_length=512, blank=True, null=True)
    recruiter_contacts = models.CharField(max_length=512, blank=True, null=True)

    legal_complience_labour_laws = models.IntegerField(blank=True, null=True)
    legal_complience_criminal_laws = models.IntegerField(blank=True, null=True)
    legal_complience_recruitment_policies = models.IntegerField(blank=True, null=True)
    legal_complience_notes = models.TextField(blank=True, null=True)
    legal_complience_priority_notes = models.TextField(blank=True, null=True)

    professional_conduct_agency = models.IntegerField(blank=True, null=True)
    professional_conduct_employer = models.IntegerField(blank=True, null=True)
    professional_conduct_agency_capacity = models.IntegerField(blank=True, null=True)
    professional_conduct_employer_capacity = models.IntegerField(blank=True, null=True)
    professional_conduct_cooperation_efficiency = models.IntegerField(
        blank=True, null=True
    )
    professional_conduct_notes = models.TextField(blank=True, null=True)
    professional_conduct_priority_notes = models.TextField(blank=True, null=True)

    free_of_charge_recruitment_fees = models.IntegerField(blank=True, null=True)
    free_of_charge_transparency = models.IntegerField(blank=True, null=True)
    free_of_charge_other_fees = models.IntegerField(blank=True, null=True)
    free_of_charge_passport_fees = models.IntegerField(blank=True, null=True)
    free_of_charge_destination_fees = models.IntegerField(blank=True, null=True)
    free_of_charge_notes = models.TextField(blank=True, null=True)
    free_of_charge_priority_notes = models.TextField(blank=True, null=True)

    terms_of_engagement_business_information = models.IntegerField(
        blank=True, null=True
    )
    terms_of_engagement_job_description = models.IntegerField(blank=True, null=True)
    terms_of_engagement_recruitment_process = models.IntegerField(blank=True, null=True)
    terms_of_engagement_overall_management = models.IntegerField(blank=True, null=True)
    terms_of_engagement_complete_job_information = models.IntegerField(
        blank=True, null=True
    )
    terms_of_engagement_interview_process = models.IntegerField(blank=True, null=True)
    terms_of_engagement_medical_checks = models.IntegerField(blank=True, null=True)
    terms_of_engagement_contract_terms = models.IntegerField(blank=True, null=True)
    terms_of_engagement_original_contract_provision = models.IntegerField(
        blank=True, null=True
    )
    terms_of_engagement_predeparture_training = models.IntegerField(
        blank=True, null=True
    )
    terms_of_engagement_predeparture_training_worker_rights = models.IntegerField(
        blank=True, null=True
    )
    terms_of_engagement_travel_to_workplace = models.IntegerField(blank=True, null=True)
    terms_of_engagement_notes = models.TextField(blank=True, null=True)
    terms_of_engagement_priority_notes = models.TextField(blank=True, null=True)

    wages_deductions_benefits_information = models.IntegerField(blank=True, null=True)
    wages_deductions_benefits_predeparture_training = models.IntegerField(
        blank=True, null=True
    )
    wages_deductions_benefits_multilingualism = models.IntegerField(
        blank=True, null=True
    )
    wages_deductions_benefits_digitalization = models.IntegerField(
        blank=True, null=True
    )
    wages_deductions_benefits_notes = models.TextField(blank=True, null=True)
    wages_deductions_benefits_priority_notes = models.TextField(blank=True, null=True)

    conditions_health_and_safety = models.IntegerField(blank=True, null=True)
    conditions_document_control = models.IntegerField(blank=True, null=True)
    conditions_workers_housing = models.IntegerField(blank=True, null=True)
    conditions_freedom_of_movement = models.IntegerField(blank=True, null=True)
    conditions_notes = models.TextField(blank=True, null=True)
    conditions_priority_notes = models.TextField(blank=True, null=True)

    grievance_mechanism_encouragement = models.IntegerField(blank=True, null=True)
    grievance_mechanism_punitive_action = models.IntegerField(blank=True, null=True)
    grievance_mechanism_credibility = models.IntegerField(blank=True, null=True)
    grievance_mechanism_hr_staff = models.IntegerField(blank=True, null=True)
    grievance_mechanism_notes = models.TextField(blank=True, null=True)
    grievance_mechanism_priority_notes = models.TextField(blank=True, null=True)

    created_at = models.DateField(auto_now_add=True)
    modified_at = models.DateField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_ethical_recruitment_meetings",
    )

    class Meta:
        verbose_name_plural = "Ethical Recruitment Meetings"
        managed = True
        db_table = "ethical_recruitment_meetings"


class Config(models.Model):
    client_version = models.CharField(max_length=4)

    class Meta:
        managed = True
        db_table = "config"

    def save(self, *args, **kwargs):
        if not self.pk and Config.objects.exists():
            raise ValidationError("There is can be only one Config instance")
        return super(Config, self).save(*args, **kwargs)

    def __str__(self):
        return "Client version {}".format(self.client_version)


class StrategicPartnerUser(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        models.CASCADE,
        primary_key=True,
        related_name="strategic_partner_user",
    )
    strategic_partner = models.ForeignKey(
        StrategicPartner, on_delete=models.CASCADE, related_name="users"
    )
    email_receiving_preference = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        default="direct",
        choices=EMAIL_RECEIVING_PREFERENCE,
    )

    class Meta:
        verbose_name_plural = "Strategic partner users"
        managed = True
        db_table = "strategic_partner_users"

    def __str__(self):
        try:
            user_str = self.user.username
        except StrategicPartnerUser.user.RelatedObjectDoesNotExist:
            user_str = "User not found"

        try:
            partner_str = self.strategic_partner.name
        except StrategicPartner.DoesNotExist:
            partner_str = "Partner not found"

        return f"{user_str}:{partner_str}"

    def validate_save(self):
        if self.pk and hasattr(self.user, "supplier_user"):
            raise ValidationError("User is already Supplier")

    def clean(self) -> None:
        self.validate_save()
        return super().clean()

    def save(self, *args, **kwargs):
        self.validate_save()
        return super().save(*args, **kwargs)


class UserLogin(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        StrategicPartnerUser,
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(blank=True, null=True, auto_now_add=True)
    loggedout_at = models.DateTimeField(blank=True, null=True, auto_now_add=False)


class SupplierLogin(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(blank=True, null=True, auto_now_add=True)
    loggedout_at = models.DateTimeField(blank=True, null=True, auto_now_add=False)


class GrievanceMechanismReview(models.Model):
    id = models.AutoField(primary_key=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    date_of_review = models.DateField()
    assessment = models.TextField()
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


"""
Models for strategic partner workplan
Related Models:
- SPWorkplan
- WorkplanDocs
- WorkplanMainGoal
- WorkplanProgressIndicator
- WorkplanActivity
"""


class SPWorkplan(SPWorkplanAuditTrailMixin, models.Model):
    strategic_partner = models.OneToOneField(StrategicPartner, on_delete=models.CASCADE)
    fp_name = models.CharField(max_length=150, null=True, blank=True)
    fp_title = models.CharField(choices=SPWORKPLAN_FP_TITLES, max_length=10)
    pdf_file = models.ForeignKey(
        SharedFile, on_delete=models.SET_NULL, blank=True, null=True
    )
    current_step = models.CharField(
        max_length=50, choices=SPWORKPLAN_STEPS, default="introduction"
    )
    status = models.CharField(
        max_length=10, choices=SPWORKPLAN_STATUSES, default="saved"
    )
    suggested_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Strategic partner workplans"
        verbose_name = "Strategic partner workplan"
        db_table = "sp_workplans"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["suggested_date"]),
            models.Index(fields=["-created_at"]),
            models.Index(fields=["current_step"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.strategic_partner}"


class WorkPlanAuditTrail(models.Model):
    user = models.CharField(max_length=255)
    workplan = models.ForeignKey(
        SPWorkplan, on_delete=models.SET_NULL, null=True, blank=True
    )
    reason = models.CharField(max_length=150, choices=REASON_CHOICE)
    model = models.CharField(
        max_length=150,
    )
    data = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["workplan"]

    def __str__(self):
        return f"{self.workplan} - {self.reason} at {self.created_at.date()}"

    @property
    def changed(self, *args, **kwargs):

        if self.reason == "delete":
            return self.data
        try:
            return json.loads(self.data)
        except Exception:
            return self.data


class WorkplanDocs(SPWorkplanAuditTrailMixin, models.Model):
    workplan = models.ForeignKey(SPWorkplan, on_delete=models.CASCADE)
    document_type = models.CharField(max_length=50, choices=SPWORKPLAN_DOCUMENT_TYPES)
    document = models.ForeignKey(SharedFile, on_delete=models.CASCADE)
    document_name = models.CharField(
        max_length=255, null=True, blank=True, help_text="Custom name for the document"
    )
    categories = models.ManyToManyField(
        PolicyCompliance, related_name="workplan_documents", blank=True
    )
    audience = models.CharField(
        max_length=10,
        choices=DOCUMENT_AUDIENCES,
        default=DOCUMENT_AUDIENCE_MEMBERS,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Workplan documents"
        verbose_name = "Workplan document"
        db_table = "workplan_documents"
        indexes = [
            models.Index(fields=["document_type"]),
            models.Index(fields=["document_name"]),
            models.Index(fields=["-created_at"]),
        ]
        ordering = ["-created_at"]


class WorkplanMainGoal(SPWorkplanAuditTrailMixin, models.Model):
    workplan = models.ForeignKey(SPWorkplan, on_delete=models.CASCADE)
    ethical_recruitment = models.TextField(null=True, blank=True)
    partnership_areas = models.TextField(null=True, blank=True)
    worker_voice_escalation = models.TextField(null=True, blank=True)
    priority_suppliers_countries_regions = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Main Goals and Priority Partnership Areas"
        verbose_name = "Main Goal and Priority Partnership Area"
        db_table = "workplan_main_goals"
        indexes = [
            models.Index(fields=["-created_at"]),
        ]
        ordering = ["-created_at"]


class WorkplanProgressIndicator(SPWorkplanAuditTrailMixin, models.Model):
    workplan = models.ForeignKey(SPWorkplan, on_delete=models.CASCADE)
    area = models.CharField(max_length=50, choices=SPWORKPLAN_PROGRESS_ACTIVITY_AREAS)
    sub_area = models.CharField(max_length=100, null=True)
    numeric_value = models.PositiveIntegerField(null=True)
    str_value = models.CharField(max_length=100, null=True)
    txt_value = models.TextField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    progress_status = models.CharField(
        max_length=50, choices=PROGRESS_ACTIVITY_STATUS, default="not yet"
    )
    notes = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "Annual progress indicators"
        verbose_name = "Annual progress indicator"
        db_table = "workplan_progress_indicators"
        indexes = [
            models.Index(fields=["area"]),
            models.Index(fields=["sub_area"]),
            models.Index(fields=["-created_at"]),
        ]
        ordering = ["-created_at"]


class WorkplanActivity(SPWorkplanAuditTrailMixin, models.Model):
    workplan = models.ForeignKey(SPWorkplan, on_delete=models.CASCADE)
    area = models.CharField(max_length=50, choices=SPWORKPLAN_PROGRESS_ACTIVITY_AREAS)
    value = models.BooleanField(default=False)
    str_value = models.CharField(max_length=100, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Priority Workplan Activities"
        verbose_name = "Priority Workplan Activity"
        db_table = "workplan_activities"
        indexes = [
            models.Index(fields=["area"]),
            models.Index(fields=["-created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.workplan} - {self.str_value}"


class WorkplanNotesRemark(SPWorkplanAuditTrailMixin, models.Model):

    workplan = models.ForeignKey(SPWorkplan, on_delete=models.CASCADE)
    txt_value = models.TextField(null=True, blank=True)
    area = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.area

    class Meta:
        db_table = "workplan_notes_remark"


class SupplierProgressCategory(models.Model):
    progress_category = models.CharField(max_length=50)
    subcategory = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return self.progress_category


class SupplierProgressItem(models.Model):
    supplier_progress_category = models.ForeignKey(
        SupplierProgressCategory, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.supplier_progress_category}-{self.name}"


class SupplierProgressItemTranslation(models.Model):
    supplier_progress_item = models.ForeignKey(
        SupplierProgressItem,
        null=False,
        blank=False,
        on_delete=models.CASCADE,
        related_name="translations",
    )
    language = models.ForeignKey(
        Language, null=False, blank=False, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=200, null=False, blank=False)

    class Meta:
        db_table = "supplier_progress_item_translations"
        unique_together = (
            "supplier_progress_item",
            "language",
        )

    def __str__(self):
        return self.name


class SupplierProgress(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    supplier_progress_item = models.ForeignKey(
        SupplierProgressItem, on_delete=models.CASCADE
    )
    progress = models.CharField(
        max_length=50, choices=SUPPLIER_PROGRESSS_CHOICES, default="Gray"
    )

    def __str__(self):
        return f"{self.supplier}-{self.supplier_progress_item} -{self.progress}"


class PriorityActivityGroup(models.Model):
    name = models.CharField(max_length=50, verbose_name="Group Name")
    description = models.TextField(max_length=500, null=True, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "priority_activity_groups"
        indexes = [
            models.Index(fields=["name"]),
        ]


class PriorityActivityBase(models.Model):
    category = models.CharField(max_length=50, choices=SPWORKPLAN_ACTIVITY_AREAS)
    group = models.ForeignKey(
        PriorityActivityGroup, on_delete=models.PROTECT, null=True
    )
    description = models.CharField(max_length=500)

    def __str__(self):
        return self.description


class PriorityActivity(SPWorkplanAuditTrailMixin, models.Model):
    workplan = models.ForeignKey(SPWorkplan, on_delete=models.CASCADE)
    priority_activity = models.ForeignKey(
        PriorityActivityBase, on_delete=models.CASCADE
    )
    txt_value = models.CharField(default="", max_length=255, blank=True, null=True)
    value = models.BooleanField(default=False)
    priority = models.BooleanField(default=False, blank=True, null=True)
    progress = models.CharField(
        max_length=50,
        choices=SPWORKPLAN_ACTIVITY_PRIORITY_STATUS,
        default="not_started",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    priority_status = models.CharField(
        max_length=50, choices=PROGRESS_ACTIVITY_STATUS, default="not yet"
    )
    notes = models.TextField(null=True, blank=True)


class ERMetrics(models.Model):
    created_at = models.DateField(blank=True, null=True, auto_now_add=True)
    workers_voice_channels = models.IntegerField(null=True, blank=True)
    workers_receiving_remedition = models.IntegerField(null=True, blank=True)
    workers_pre_departure_mm = models.IntegerField(null=True, blank=True)
    workers_pre_departure_ne = models.IntegerField(null=True, blank=True)
    workers_pre_departure_kh = models.IntegerField(null=True, blank=True)
    workers_pre_departure_vn = models.IntegerField(null=True, blank=True)
    workers_pre_departure_th = models.IntegerField(null=True, blank=True)
    workers_trained = models.IntegerField(null=True, blank=True)
    recruitment_agencies_trained = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="Number of recruitment agencies representatives trained",
    )
    suppliers_trained = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="Number of suppliers representatives trained",
    )
    remediation_for_recruitment_fees_and_cases = models.IntegerField(
        null=True, blank=True, default=0
    )
    recruitment_related_fees_detected_and_intercepted = models.IntegerField(
        null=True, blank=True, default=0
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="er_metrics_created_by",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    month = models.DateField(null=True, blank=True)
    remediation_for_recruitment_fees_and_cases = models.IntegerField(
        null=True, blank=True, default=0
    )
    recruitment_related_fees_detected_and_intercepted = models.IntegerField(
        null=True, blank=True, default=0
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="er_metrics_created_by",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )

    def __str__(self):
        return f"{'ER Metrics - '} {self.month}"


class CsoLogin(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(blank=True, null=True, auto_now_add=True)
    loggedout_at = models.DateTimeField(blank=True, null=True, auto_now_add=False)


class Goal(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()

    class Meta:
        verbose_name = "Goal"
        verbose_name_plural = "Goals"
        db_table = "goals"

    def __str__(self):
        return self.name
