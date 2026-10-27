from typing import Union

from django.conf import settings
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group, User
from django import forms
from django.forms import ValidationError
from django.utils.html import format_html

# only the import of admin module is necessary, not implementation
from issara.ilm_server_2.eti_base_codes.admin import ETIBaseCodeAdmin
from kpis.models import Kpi
from nested_admin.nested import NestedModelAdmin, NestedStackedInline
from nonrelated_inlines.admin import NonrelatedStackedInline
from simple_history.admin import SimpleHistoryAdmin

from .models import (
    Broker,
    BusinessResponse,
    Case,
    CaseCategory,
    CaseCategoryTranslation,
    CaseInteraction,
    CaseStatus,
    ClientStatus,
    ClientStatusTranslation,
    ClientType,
    ClientTypeTranslation,
    Config,
    ContractType,
    Country,
    CsoLogin,
    District,
    DocumentType,
    ERMetrics,
    EthicalRecruitmentMeeting,
    Ethnicity,
    FactoryType,
    FieldworkActivity,
    FieldworkActivityPrimaryFocus,
    FieldworkActivityType,
    FieldworkActivityTypeCategory,
    FieldworkActivityTypeTranslation,
    Gender,
    Goal,
    GrievanceMechanismReview,
    HowHearIssara,
    HowHearIssaraTranslation,
    Industry,
    InteractionChannel,
    InteractionChannelTranslation,
    InteractionReason,
    InteractionReasonTranslation,
    IssueCategory,
    IssueCategoryTranslation,
    Language,
    MmThaiDemandData,
    MmThaiSendingData,
    MonthlyWorkerVoice,
    Nationality,
    NewsUpdate,
    NonSupplyChainCase,
    Organization,
    OrganizationCoreFocusArea,
    OrganizationImage,
    OrganizationNaceCode,
    OrganizationStakeholderGroup,
    PartnerMessageBoard,
    PartnerMessageBoardAcknowledgement,
    PartnerMessageBoardComment,
    PartnerMessageBoardReaction,
    PartnerMessageBoardRSVP,
    PartnerMessageBoardSeen,
    PartnerReferenceDoc,
    PersonContact,
    Policy,
    PriorityActivity,
    PriorityActivityBase,
    PriorityActivityGroup,
    Province,
    Recruiter,
    RecruiterCRCResponse,
    RecruiterIssue,
    RecruiterResponse,
    RecruiterResponseFile,
    Referral,
    ReferralAction,
    ReferralActionTranslation,
    ResponseInteractionType,
    SharedFile,
    SPWorkplan,
    StrategicPartner,
    StrategicPartnerFile,
    StrategicPartnerResponse,
    StrategicPartnerResponseFile,
    StrategicPartnerUser,
    SubIndustry,
    SupplierCRCResponse,
    SupplierIndustry,
    SupplierTier,
    SupplierMessageBoard,
    SupplierProgress,
    SupplierProgressCategory,
    SupplierProgressItem,
    SupplierProgressItemTranslation,
    SupplierResponseFile,
    SupplierSubIndustry,
    SupplierSupplyChain,
    SupplierUser,
    SupplyChain,
    UserLogin,
    UserOrganization,
    UserTask,
    VesselType,
    WorkPlace,
    WorkplanActivity,
    WorkPlanAuditTrail,
    WorkplanDocs,
    WorkplanMainGoal,
    WorkplanNotesRemark,
    WorkplanProgressIndicator,
)

"""
InteractionReason translations
"""


class InteractionReasonTranslationInline(NestedStackedInline):
    model = InteractionReasonTranslation
    verbose_name = "Interaction Reason Translation"
    extra = 0


@admin.register(InteractionReason)
class InteractionReasonAdmin(NestedModelAdmin):
    inlines = [InteractionReasonTranslationInline]
    verbose_name = "Interaction Reason"


class ClientTypeTranslationInline(NestedStackedInline):
    model = ClientTypeTranslation
    verbose_name = "Client Type Translation"
    extra = 0


@admin.register(ClientType)
class ClientTypeAdmin(NestedModelAdmin):
    inlines = [ClientTypeTranslationInline]
    verbose_name = "Client Type"


class CaseCategoryTranslationInline(NestedStackedInline):
    model = CaseCategoryTranslation
    verbose_name = "Case Category Translation"
    extra = 0


@admin.register(CaseCategory)
class CaseCategoryAdmin(NestedModelAdmin):
    inlines = [CaseCategoryTranslationInline]
    verbose_name = "Case Category"

    # Add the new fields to list display
    list_display = ["id", "name", "supplier_only", "hide_for_supplier"]

    # Add filters for the new fields
    list_filter = ["supplier_only", "hide_for_supplier"]

    # Make the new fields editable in list view
    list_editable = ["supplier_only", "hide_for_supplier"]

    # Add search functionality
    search_fields = ["name"]

    # Organize fields in the form
    fieldsets = (
        (None, {"fields": ("name",)}),
        (
            "User Type Filtering",
            {
                "fields": ("supplier_only", "hide_for_supplier"),
                "description": "Control which user types can see this category. "
                "supplier_only: Only suppliers can see this category. "
                "hide_for_supplier: Hide this category from suppliers.",
            },
        ),
    )


class ClientStatusTranslationInline(NestedStackedInline):
    model = ClientStatusTranslation
    verbose_name = "Client Status Translation"
    extra = 0


@admin.register(ClientStatus)
class ClientStatusAdmin(NestedModelAdmin):
    inlines = [ClientStatusTranslationInline]
    verbose_name = "Client Status"


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description")
    search_fields = ("name", "description")


class InteractionChannelTranslationInline(NestedStackedInline):
    model = InteractionChannelTranslation
    verbose_name = "Interaction Channel Translation"
    extra = 0


@admin.register(InteractionChannel)
class InteractionChannelAdmin(NestedModelAdmin):
    inlines = [InteractionChannelTranslationInline]
    verbose_name = "Interaction Channel"

    # Add the new fields to list display
    list_display = ["id", "name", "supplier_only", "hide_for_supplier"]

    # Add filters for the new fields
    list_filter = ["supplier_only", "hide_for_supplier"]

    # Make the new fields editable in list view
    list_editable = ["supplier_only", "hide_for_supplier"]

    # Add search functionality
    search_fields = ["name"]

    # Organize fields in the form
    fieldsets = (
        (None, {"fields": ("name",)}),
        (
            "User Type Filtering",
            {
                "fields": ("supplier_only", "hide_for_supplier"),
                "description": "Control which user types can see this interaction channel. "
                "supplier_only: Only suppliers can see this channel. "
                "hide_for_supplier: Hide this channel from suppliers.",
            },
        ),
    )


class IssueCategoryTranslationInline(NestedStackedInline):
    model = IssueCategoryTranslation
    verbose_name = "Issue Category Translation"
    extra = 0


@admin.register(IssueCategory)
class IssueCategoryAdmin(NestedModelAdmin):
    model = IssueCategory
    inlines = [IssueCategoryTranslationInline]
    verbose_name = "Issue Category"


class HowHearIssaraTranslationInline(NestedStackedInline):
    model = HowHearIssaraTranslation
    verbose_name = "How Hear Issara Translation"
    extra = 0


@admin.register(HowHearIssara)
class HowHearIssaraAdmin(NestedModelAdmin):
    inlines = [HowHearIssaraTranslationInline]
    verbose_name = "How Hear Issara"
    list_display = ["name", "cso_only", "hide_for_cso"]


@admin.register(UserLogin)
class UserLoginAdmin(admin.ModelAdmin):

    list_display = ("user", "partner", "created_at", "loggedout_at")
    ordering = ("id",)

    def partner(self, obj):
        if obj.user:
            return obj.user.strategic_partner.name
        return "-"

    def get_queryset(self, request):
        return (
            super(UserLoginAdmin, self)
            .get_queryset(request)
            .select_related("user__strategic_partner")  # , user_org'
        )


@admin.register(SubIndustry)
class SubIndustryAdmin(admin.ModelAdmin):

    list_display = ("name", "industry")
    list_filter = ("industry",)
    search_fields = ("name", "industry__name")
    ordering = ("id",)

    def get_queryset(self, request):
        return (
            super(SubIndustryAdmin, self)
            .get_queryset(request)
            .prefetch_related(
                "industry",
            )
        )


class ProvinceByCountryFilter(admin.SimpleListFilter):
    title = "province"
    parameter_name = "province"

    def lookups(self, request, model_admin):
        if "province__country__id__exact" in request.GET:
            country_id = request.GET["province__country__id__exact"]
            provinces = Province.objects.all().filter(country=country_id)
        else:
            provinces = Province.objects.all()

        return [(province.id, province.name) for province in provinces]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(province=self.value())


class KpiCategoryByKpi(admin.SimpleListFilter):
    title = "kpi"
    parameter_name = "kpi"

    def lookups(self, request, model_admin):
        if "kpis__kpi_category__id__exact" in request.GET:
            kpi_category_id = request.GET["kpis__kpi_category__id__exact"]
            kpis = Kpi.objects.all().filter(kpi_category=kpi_category_id)
        else:
            kpis = Province.objects.all()

        return [(kpi.id, kpi.name) for kpi in kpis]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(kpi=self.value())


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    def country(self, obj):
        return obj.province.country

    list_display = ("name", "gis_code", "crossing", "province", "country")
    list_filter = ("level", "country", "province")
    search_fields = (
        "name",
        "gis_code",
        "crossing",
        "province__name",
        "province__country__name",
    )
    list_filter = ("province__country", ProvinceByCountryFilter)

    ordering = ("id",)

    def get_queryset(self, request):
        return (
            super(DistrictAdmin, self)
            .get_queryset(request)
            .prefetch_related(
                "province__country",
            )
        )


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):

    list_display = ("name", "gis_code", "crossing", "country")
    list_filter = ("country",)
    search_fields = ("name", "gis_code", "crossing", "country__name")
    ordering = ("id",)

    def get_queryset(self, request):
        return (
            super(ProvinceAdmin, self)
            .get_queryset(request)
            .prefetch_related(
                "country",
            )
        )


class ReferralActionTranslationInline(NestedStackedInline):
    model = ReferralActionTranslation
    verbose_name = "Referral Action Translation"
    extra = 0


@admin.register(ReferralAction)
class ReferralActionAdmin(NestedModelAdmin):
    inlines = [ReferralActionTranslationInline]
    verbose_name = "Referral Action"


class StrategicPartnerUserModelAdmin(admin.TabularInline):
    model = StrategicPartnerUser
    fields = ["user", "email_receiving_preference"]
    can_delete = False
    extra = 0

    def has_add_permission(self, request, obj=None):
        """Prevent adding new records"""
        return False


@admin.register(StrategicPartner)
class StrategicPartnerAdmin(admin.ModelAdmin):
    list_display = ("name", "strategic_partner_grouping", "imageicon", "email_notify")
    list_filter = ("strategic_partner_grouping",)
    filter_horizontal = ("strategic_partner_files",)
    search_fields = ("id", "name")
    inlines = [StrategicPartnerUserModelAdmin]

    def enable_live_notification(self, request, queryset):
        queryset.update(email_notify=True)

    def disable_live_notification(self, request, queryset):
        queryset.update(email_notify=False)

    actions = [enable_live_notification, disable_live_notification]


# Supplier admin moved to supplier/admin.py


admin.site.register(SupplierIndustry)
admin.site.register(SupplierSubIndustry)


@admin.register(SupplierTier)
class SupplierTierAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    ordering = ("id",)

# @admin.register(SupplierKpi)
# class SupplierKpiAdmin(admin.ModelAdmin):
#
#     list_display = ('supplier',  'kpi_category', 'kpi__description', 'opened_at', 'closed_at', 'open')
#
#     list_filter = ('open', 'kpi__kpi_category', 'supplier__name')
#     search_fields = ('supplier__name', 'kpi__kpi_category__name', 'kpi__description',)
#     ordering = ('id',)
#
#     def kpi_category(self, obj):
#         return obj.kpi.kpi_category
#
#     def kpi__description(self, obj):
#         return obj.kpi.description
#
#     def get_queryset(self, request):
#         return super(SupplierKpiAdmin, self).get_queryset(request).prefetch_related(
#             'kpi__kpi_category', 'supplier'
#         )
#
#     def formfield_for_foreignkey(self, db_field, request, **kwargs):
#         if db_field.name == 'kpi':
#             kwargs["queryset"] = Kpi.objects.prefetch_related('kpi_category').all()
#         return super(SupplierKpiAdmin, self).formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(PriorityActivityBase)
class PriorityActivityBaseAdmin(admin.ModelAdmin):
    list_display = ("category", "description", "group__name")
    list_filter = ("category", "group__name")
    search_fields = ("description", "group")

    def group__name(self, obj: PriorityActivityBase) -> Union[str, None]:
        return obj.group.name if obj.group is not None else None


@admin.register(PriorityActivity)
class PriorityActivityAdmin(admin.ModelAdmin):
    list_display = (
        "workplan",
        "priority_activity",
        "value",
        "priority",
        "progress",
        "created_at",
        "updated_at",
    )
    list_filter = ("progress", "priority_activity")
    search_fields = ("workplan__strategic_partner",)
    autocomplete_fields = (
        "workplan",
        "priority_activity",
    )


@admin.register(Recruiter)
class RecruiterAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "tier_id",
        "address",
        "industry",
        "country",
        "province",
        "district",
    )

    list_filter = (
        "industry",
        "country",
        "province",
        "district",
    )
    search_fields = (
        "name",
        "industry__name",
        "country__name",
        "province__name",
        "district__name",
        "tier_id",
    )
    ordering = ("id",)

    def get_queryset(self, request):
        return (
            super(RecruiterAdmin, self)
            .get_queryset(request)
            .prefetch_related(
                "district",
                "province",
                "country",
                "industry",
            )
        )


@admin.register(RecruiterIssue)
class RecruiterIssueAdmin(admin.ModelAdmin):

    list_display = ("recruiter", "case_status")

    list_filter = (
        "case_status",
        "kpis__kpi_category",
        "recruiter",
    )
    search_fields = (
        "kpis__kpi_category__name",
        "kpis__description",
        "case_status__name",
        "recruiter__name",
    )
    ordering = ("id",)

    def kpi_category(self, obj):
        return obj.kpi.kpi_category


@admin.register(StrategicPartnerResponse)
class StrategicPartnerResponseAdmin(admin.ModelAdmin):
    list_display = ("strategic_partner",)
    search_fields = ("strategic_partner__name",)
    list_filter = ("strategic_partner",)
    filter_horizontal = ("strategic_partner_response_files",)


# @admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "description",
        "issara_staff",
        "client_contract_type",
        "created",
    )
    search_fields = ("description",)
    list_filter = ("client_contract_type", "issara_staff", "supplier")
    raw_id_fields = (
        "supplier_kpis",
        "supplier",
        "kpis",
        "interaction_issara_staff",
    )


class CaseHistoryAdmin(CaseAdmin, SimpleHistoryAdmin):
    history_list_display = ["changed_fields", "list_changes"]

    def changed_fields(self, obj):
        if obj.prev_record:
            delta = obj.diff_against(obj.prev_record)
            return delta.changed_fields
        return None

    def list_changes(self, obj):
        fields = ""
        if obj.prev_record:
            delta = obj.diff_against(obj.prev_record)

            for change in delta.changes:
                fields += str(
                    "<strong>{}</strong> changed from <span style='background-color:#ffb5ad'>{}</span> to <span style='background-color:#b3f7ab'>{}</span> . <br/>".format(
                        change.field, change.old, change.new
                    )
                )
            return format_html(fields)
        return None


admin.site.register(Case, CaseHistoryAdmin)


class CaseHistoryAdmin(CaseAdmin, SimpleHistoryAdmin):
    history_list_display = ["changed_fields", "list_changes"]

    def changed_fields(self, obj):
        if obj.prev_record:
            delta = obj.diff_against(obj.prev_record)
            return delta.changed_fields
        return None

    def list_changes(self, obj):
        fields = ""
        if obj.prev_record:
            delta = obj.diff_against(obj.prev_record)

            for change in delta.changes:
                fields += str(
                    "<strong>{}</strong> changed from <span style='background-color:#ffb5ad'>{}</span> to <span style='background-color:#b3f7ab'>{}</span> . <br/>".format(
                        change.field, change.old, change.new
                    )
                )
            return format_html(fields)
        return None


class CaseHistoryAdmin(CaseAdmin, SimpleHistoryAdmin):
    history_list_display = ["changed_fields", "list_changes"]

    def changed_fields(self, obj):
        if obj.prev_record:
            delta = obj.diff_against(obj.prev_record)
            return delta.changed_fields
        return None

    def list_changes(self, obj):
        fields = ""
        if obj.prev_record:
            delta = obj.diff_against(obj.prev_record)

            for change in delta.changes:
                fields += str(
                    "<strong>{}</strong> changed from <span style='background-color:#ffb5ad'>{}</span> to <span style='background-color:#b3f7ab'>{}</span> . <br/>".format(
                        change.field, change.old, change.new
                    )
                )
            return format_html(fields)
        return None


class SupplierSupplyInline(admin.TabularInline):
    model = SupplierSupplyChain
    raw_id_fields = ("supplier",)
    extra = 0


@admin.register(SupplyChain)
class SupplyChainAdmin(admin.ModelAdmin):
    list_display = ("name", "strategic_partner")
    search_fields = ("name", "strategic_partner__name")
    list_filter = ("strategic_partner",)
    raw_id_fields = ("strategic_partner",)
    # filter_horizontal = ('suppliers',)
    inlines = (SupplierSupplyInline,)


# @admin.register(CaseIssue)
# class CaseIssueAdmin(admin.ModelAdmin):
#     list_display = ('issue_category', 'kpi_category', 'case_status')
#     list_filter = ('issue_category', 'case__supplier',
#                    'kpis__kpi_category', 'kpis', 'case_status')
#
#     def kpi_category(self, obj):
#             array = obj.kpis.all()
#             return array[0].kpi_category if len(array) else ""
#
#     def supplier(self, obj):
#             return obj.case.supplier


@admin.register(CaseInteraction)
class CaseInteractionAdmin(admin.ModelAdmin):
    list_display = ("id", "summary", "interacted", "issara_staff")
    search_fields = ("issara_staff__email", "summary")

    def case(self, obj):
        return obj.case

    def supplier(self, obj):
        return obj.case.supplier


@admin.register(BusinessResponse)
class SupplierResponseAdmin(admin.ModelAdmin):
    list_display = ("event_details",)
    filter_horizontal = (
        "suppliers",
        "recruiters",
        "global_buyers",
        "issara_focal_points",
    )
    readonly_fields = (
        "created_at",
        "modified_at",
    )
    fieldsets = (
        (
            "Participants",
            {
                "fields": (
                    "suppliers",
                    "suppliers_notes",
                    "recruiters",
                    "recruiters_notes",
                    "global_buyers",
                    "global_buyers_notes",
                    "other_parties_notes",
                )
            },
        ),
        ("Event Details", {"fields": ("event_details",)}),
        (
            "Actions",
            {
                "fields": (
                    "suppliers_next_steps",
                    "suppliers_next_steps_deadline",
                    "suppliers_focal_points",
                    "recruiters_next_steps",
                    "recruiters_next_steps_deadline",
                    "recruiters_focal_points",
                    "global_buyers_next_steps",
                    "global_buyers_next_steps_deadline",
                    "global_buyers_focal_points",
                    "issara_next_steps",
                    "issara_next_steps_deadline",
                    "issara_focal_points",
                )
            },
        ),
        ("Extra", {"fields": ("created_at", "created_by", "modified_at")}),
    )


@admin.register(RecruiterResponse)
class RecruiterResponseAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "description",
        "recruiter",
        "issue_category",
        "issue_status",
    )
    list_filter = (
        "issue_category",
        "kpis__kpi_category",
        "kpis",
        "recruiter",
        "recruiter_issue__case_status__name",
    )
    search_fields = (
        "name",
        "description",
        "created",
        "recruiter__name",
        "issue_category__name",
        "kpis__kpi_category__name",
        "kpis__description",
        "recruiter_issue__case_status__name",
    )
    filter_horizontal = ("recruiter_response_files", "issara_staff_involved")

    def kpi_category(self, obj):
        return obj.kpi.kpi_category

    def issue_status(self, obj):
        return obj.recruiter_issue.case_status


@admin.register(SupplierCRCResponse)
class SupplierCRCResponseAdmin(admin.ModelAdmin):

    list_display = ("supplier", "created_at")
    list_filter = ("supplier",)
    search_fields = ("supplier__name", "created_at")
    ordering = ("id",)


@admin.register(RecruiterCRCResponse)
class RecruiterCRCResponseAdmin(admin.ModelAdmin):

    list_display = ("recruiter", "created_at")
    list_filter = ("recruiter",)
    search_fields = ("recruiter__name", "created_at")
    ordering = ("id",)


@admin.register(MmThaiDemandData)
class MmThaiDemandDataAdmin(admin.ModelAdmin):

    list_display = (
        "supplier_name",
        "recruiter_name",
        "industry",
        "subindustry",
        "created",
        "record_date",
    )
    list_filter = ("supplier_name", "recruiter_name", "industry", "subindustry")
    search_fields = (
        "supplier_name",
        "recruiter_name",
        "industry",
        "subindustry",
        "created",
        "record_date",
    )
    ordering = ("id", "record_date")


@admin.register(MmThaiSendingData)
class MmThaiSendingDataAdmin(admin.ModelAdmin):
    list_display = (
        "supplier",
        "recruiter",
        "industry",
        "subindustry",
        "created",
        "record_date",
    )
    list_filter = ("supplier", "recruiter", "industry", "subindustry")
    search_fields = (
        "supplier",
        "recruiter",
        "industry",
        "subindustry",
        "created",
        "record_date",
    )
    ordering = (
        "id",
        "record_date",
    )

    def get_queryset(self, request):
        return (
            super(MmThaiSendingDataAdmin, self)
            .get_queryset(request)
            .select_related(
                "supplier",
                "recruiter",
                "industry",
                "subindustry",
                "factory_type",
                "province",
            )
        )


class FieldworkActivityTypeTranslationInline(NestedStackedInline):
    model = FieldworkActivityTypeTranslation
    verbose_name = "Fieldwork Activity Type Translation"
    extra = 0


@admin.register(FieldworkActivityType)
class FieldworkActivityTypeAdmin(NestedModelAdmin):
    list_display = ("id", "name", "category")
    list_filter = ("category",)
    inlines = [FieldworkActivityTypeTranslationInline]

    def get_queryset(self, request):
        return (
            super(FieldworkActivityTypeAdmin, self)
            .get_queryset(request)
            .select_related("category")
        )


class FieldworkActivityTypeByCategoryFilter(admin.SimpleListFilter):
    title = "fieldwork_type"
    parameter_name = "fieldwork_type"

    def lookups(self, request, model_admin):
        if "fieldwork_type__category__id__exact" in request.GET:
            category_id = request.GET["fieldwork_type__category__id__exact"]
            fieldwork_types = FieldworkActivityType.objects.filter(
                category_id=category_id
            )
        else:
            fieldwork_types = FieldworkActivityType.objects.all()

        return [
            (fieldwork_type.id, fieldwork_type.name)
            for fieldwork_type in fieldwork_types
        ]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(fieldwork_type=self.value())


@admin.register(FieldworkActivity)
class FieldworkActivityAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "fieldwork_date",
        "fieldwork_type",
        "primary_focus",
        "country",
        "province",
    )
    list_filter = (
        "fieldwork_type__category",
        FieldworkActivityTypeByCategoryFilter,
    )
    filter_horizontal = ("suppliers", "recruiters", "strategic_partners")
    readonly_fields = ("created_at",)
    fieldsets = (
        (
            "General",
            {
                "fields": (
                    "fieldwork_date",
                    "fieldwork_type",
                    "country",
                    "province",
                    "suppliers",
                    "recruiters",
                    "notes",
                )
            },
        ),
        (
            "Outreach related",
            {
                "fields": (
                    "total_workers_reached",
                    "female_workers_reached",
                    "male_workers_reached",
                    "myanmar_workers_reached",
                    "cambodian_workers_reached",
                    "thai_workers_reached",
                    "lao_workers_reached",
                    "nepalese_workers_reached",
                    "bangladeshi_workers_reached",
                    "indonesian_workers_reached",
                    "malaysian_workers_reached",
                    "indian_workers_reached",
                    "other_workers_reached",
                )
            },
        ),
        (
            "Training/Multi-stakeholder/other related",
            {
                "fields": (
                    "strategic_partners",
                    "total_people_reached",
                    "male_reached",
                    "female_reached",
                    "primary_focus",
                    "primary_focus_other_description",
                )
            },
        ),
        (
            "Extra",
            {
                "fields": (
                    "created_at",
                    "created_by",
                    "links",
                )
            },
        ),
    )

    def get_queryset(self, request):
        return (
            super(FieldworkActivityAdmin, self)
            .get_queryset(request)
            .select_related("fieldwork_type", "country", "province", "primary_focus")
        )


@admin.register(NewsUpdate)
class NewsUpdateAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "title", "description", "sort_number", "created")


@admin.register(PartnerMessageBoard)
class PartnerMessageBoardAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "title",
        "post_type",
        "pinned",
        "audience_all",
        "ack_required",
        "ack_by",
        "sort_number",
        "created",
        "strategic_partner",
        "author",
    )
    list_filter = (
        "post_type",
        "pinned",
        "audience_all",
        "ack_required",
        "strategic_partner",
    )
    raw_id_fields = ("author", "strategic_partner", "attachments")


@admin.register(PartnerMessageBoardComment)
class PartnerMessageBoardCommentAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "author", "parent_comment", "created_at")
    list_filter = ("created_at",)
    raw_id_fields = ("post", "author", "parent_comment")


@admin.register(PartnerMessageBoardAcknowledgement)
class PartnerMessageBoardAcknowledgementAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "user", "acknowledged_at")
    raw_id_fields = ("post", "user")


@admin.register(PartnerMessageBoardRSVP)
class PartnerMessageBoardRSVPAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "user", "status", "responded_at")
    list_filter = ("status",)
    raw_id_fields = ("post", "user")


@admin.register(PartnerMessageBoardSeen)
class PartnerMessageBoardSeenAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "user", "seen_at")
    raw_id_fields = ("post", "user")


@admin.register(PartnerMessageBoardReaction)
class PartnerMessageBoardReactionAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "user", "emoji", "reacted_at")
    list_filter = ("emoji",)
    raw_id_fields = ("post", "user")


@admin.register(SupplierMessageBoard)
class SupplierMessageBoardAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "title",
        "description",
        "sort_number",
        "supplier",
        "created_at",
        "updated_at",
    )
    list_filter = ("supplier",)


@admin.register(SharedFile)
class SharedFileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "description",
        "type",
        "file_path",
        "sort_number",
        "created_at",
    )
    list_filter = ("type",)
    readonly_fields = ["preview"]

    def preview(self, obj):
        return format_html(
            '<img src="{}" width="800" height="auto" />'.format(obj.file_path.url)
        )


@admin.register(CsoLogin)
class CsoLoginAdmin(admin.ModelAdmin):
    list_display = ["user", "created_at", "loggedout_at"]


class StrategicPartnerUserInline(admin.StackedInline):
    model = StrategicPartnerUser
    autocomplete_fields = ("strategic_partner",)
    max_num = 1


class UserOrganizationInline(admin.StackedInline):
    model = UserOrganization
    raw_id_fields = ("organization",)
    max_num = 1


class CustomUserAdmin(UserAdmin):
    list_display = (
        "username",
        "email",
        "partner",
        "first_name",
        "last_name",
        "is_staff",
    )
    inlines = [StrategicPartnerUserInline, UserOrganizationInline]

    def partner(self, obj):
        if obj.strategic_partner_user:
            return obj.strategic_partner_user.strategic_partner.name
        return "-"

    def organization(self, obj):
        if obj.organization_user:
            return obj.organization_user
        return "-"

    def get_queryset(self, request):
        return (
            super(CustomUserAdmin, self)
            .get_queryset(request)
            .select_related("strategic_partner_user__strategic_partner")
        )


class SupplierSupplyChainAdmin(admin.ModelAdmin):
    model = SupplierSupplyChain
    list_filter = ("supply_chain__strategic_partner",)
    list_display = (
        "supply_chain",
        "supplier",
        "status",
    )
    raw_id_fields = (
        "supply_chain",
        "supplier",
    )
    search_fields = (
        "supplier__name",
        "supply_chain__name",
        "status",
    )
    list_filter = (
        "supply_chain__name",
        "status",
    )

    def get_queryset(self, request):
        return (
            super(SupplierSupplyChainAdmin, self)
            .get_queryset(request)
            .select_related("supplier", "supply_chain")
        )


class WorkPlanHisotryAdmin(admin.ModelAdmin):
    fields = ("workplan",)
    change_form_template = "workplan-hisotry.html"
    readonly_fields = ("workplan",)
    search_fields = ("workplan__strategic_partner__name", "reason")
    list_filter = ("workplan",)
    list_per_page = 30

    list_display = ["workplan", "model", "reason", "user", "created_at"]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.order_by("workplan").distinct()

    def changeform_view(self, request, object_id, form_url, extra_context):
        obj = self.get_object(request, object_id)
        extra_context = extra_context or {}
        extra_context.update(
            {"deep": WorkPlanAuditTrail.objects.filter(workplan=obj.workplan)}
        )
        extra_context["show_save_and_continue"] = False
        extra_context["show_save"] = False
        _data = super().changeform_view(request, object_id, form_url, extra_context)
        return _data


class WorkplanDocsInlineForm(forms.ModelForm):
    upload_file = forms.FileField(
        required=False,
        help_text="Upload or replace the document linked to this workplan row.",
    )

    class Meta:
        model = WorkplanDocs
        fields = ("document_type", "document_name")

    def clean(self):
        cleaned_data = super().clean()
        if cleaned_data.get("DELETE", False):
            return cleaned_data

        uploaded_file = cleaned_data.get("upload_file")
        has_existing_document = bool(getattr(self.instance, "document_id", None))
        if not uploaded_file and not has_existing_document:
            raise forms.ValidationError(
                "Upload a file when creating a workplan document."
            )
        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        uploaded_file = self.cleaned_data.get("upload_file")
        if uploaded_file:
            instance.document = SharedFile.create_from_upload(uploaded_file)
        if commit:
            instance.save()
            self.save_m2m()
        return instance


class WorkplanDocsInline(admin.TabularInline):
    model = WorkplanDocs
    form = WorkplanDocsInlineForm
    extra = 0
    fields = (
        "document_type",
        "document_name",
        "upload_file",
        "current_document_link",
    )
    readonly_fields = ("current_document_link",)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("document")

    def current_document_link(self, obj):
        if not getattr(obj, "document_id", None) or not getattr(obj, "document", None):
            return "-"

        shared_file = obj.document
        file_path = getattr(shared_file, "file_path", None)
        url = ""
        try:
            url = file_path.url if file_path else ""
        except Exception:
            url = str(file_path or "")

        label = getattr(shared_file, "name", None) or str(shared_file)
        if url:
            return format_html('<a href="{}" target="_blank">{}</a>', url, label)
        return label

    current_document_link.short_description = "Current document"


class SPWorkplanAdmin(admin.ModelAdmin):
    change_form_template = "workplan-hisotry.html"
    search_fields = ("strategic_partner",)
    list_select_related = ("strategic_partner",)
    raw_id_fields = ("strategic_partner",)
    inlines = [WorkplanDocsInline]

    def changeform_view(self, request, object_id, form_url, extra_context):
        obj = self.get_object(request, object_id)
        extra_context = extra_context or {}
        # extra_context.update({"deep":  obj.workplanaudittrail_set.all()})
        xl = super().changeform_view(request, object_id, form_url, extra_context)
        return xl

    def save_model(self, request, obj, form, change):
        """
        pass request.user with save() for workplan history
        """
        obj.user = request.user
        xl = super().save_model(request, obj, form, change)
        return xl

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)

        for deleted_obj in formset.deleted_objects:
            deleted_obj.delete()

        for instance in instances:
            is_new = instance.pk is None
            instance.save()
            if hasattr(instance, "save_history"):
                instance.save_history(request.user, is_new=is_new)

        formset.save_m2m()

    # class Media:


class WorkplanMainGoalAdmin(admin.ModelAdmin):
    def save_model(self, request, obj, form, change):
        """
        pass request.user with save() for workplan history
        """
        obj.user = request.user
        _data = super().save_model(request, obj, form, change)
        return _data


class WorkPlanNotesRemarkAdmin(admin.ModelAdmin):
    def save_model(self, request, obj, form, change):
        """
        pass request.user with save() for workplan history
        """
        obj.user = request.user
        _data = super().save_model(request, obj, form, change)
        return _data


class WorkplanProgressIndicatorAdmin(admin.ModelAdmin):
    def save_model(self, request, obj, form, change):
        """
        pass request.user with save() for workplan history
        """
        obj.user = request.user
        _data = super().save_model(request, obj, form, change)
        return _data


class WorkplanActivityAdmin(admin.ModelAdmin):
    def save_model(self, request, obj, form, change):
        """
        pass request.user with save() for workplan history
        """
        obj.user = request.user
        _data = super().save_model(request, obj, form, change)
        return _data


# unregister old user admin


class StrategicPartnerUserModelAdmin(admin.ModelAdmin):
    list_filter = [
        "strategic_partner",
    ]
    search_fields = ["strategic_partner__name", "user__username", "user__email"]


admin.site.register(StrategicPartnerUser, StrategicPartnerUserModelAdmin)
admin.site.unregister(User)
admin.site.register(GrievanceMechanismReview)
# register new user admin that includes a StrategicPartnerUserInline
admin.site.register(User, CustomUserAdmin)
admin.site.register(PartnerReferenceDoc)
admin.site.register(ContractType)
admin.site.register(SupplierSupplyChain, SupplierSupplyChainAdmin)
admin.site.register(Country)
admin.site.register(DocumentType)
admin.site.register(Ethnicity)
admin.site.register(Industry)
admin.site.register(Nationality)
admin.site.register(StrategicPartnerFile)
admin.site.register(StrategicPartnerResponseFile)
admin.site.register(VesselType)
admin.site.register(WorkPlace)
admin.site.register(ResponseInteractionType)
admin.site.register(CaseStatus)
admin.site.register(FactoryType)
admin.site.register(Gender)
admin.site.register(Broker)
admin.site.register(RecruiterResponseFile)
admin.site.register(SupplierResponseFile)
admin.site.register(FieldworkActivityTypeCategory)
admin.site.register(FieldworkActivityPrimaryFocus)
admin.site.register(MonthlyWorkerVoice)
admin.site.register(EthicalRecruitmentMeeting)
admin.site.register(UserTask)
admin.site.register(Config)
admin.site.register(PersonContact)
admin.site.register(NonSupplyChainCase)
admin.site.register(SPWorkplan, SPWorkplanAdmin)


class SupplierUserAdmin(admin.ModelAdmin):
    """Admin configuration for SupplierUser with search functionality"""

    list_display = ("user", "supplier", "email_receiving_preference")
    list_filter = ("email_receiving_preference", "supplier")
    search_fields = (
        "user__username",
        "user__first_name",
        "user__last_name",
        "user__email",
        "supplier__name",
    )
    # Use autocomplete fields for better search experience
    autocomplete_fields = ("user", "supplier")

    def get_queryset(self, request):
        """Optimize queryset with select_related for better performance"""
        queryset = super().get_queryset(request)
        return queryset.select_related("user", "supplier")


admin.site.register(SupplierUser, SupplierUserAdmin)
admin.site.register(SupplierProgress)
admin.site.register(WorkplanMainGoal, WorkplanMainGoalAdmin)
admin.site.register(WorkplanNotesRemark, WorkPlanNotesRemarkAdmin)
admin.site.register(WorkplanProgressIndicator, WorkplanProgressIndicatorAdmin)
admin.site.register(WorkplanActivity, WorkplanActivityAdmin)
admin.site.register(WorkPlanAuditTrail, WorkPlanHisotryAdmin)
admin.site.register(ERMetrics)


class OrganizationCoreFocusAreaInline(admin.TabularInline):
    model = OrganizationCoreFocusArea
    extra = 0


class OrganizationStakeholderGroupInline(admin.TabularInline):
    model = OrganizationStakeholderGroup
    extra = 0


class OrganizationNaceCodeInline(admin.TabularInline):
    model = OrganizationNaceCode
    extra = 0


class OrganizationImageInline(admin.TabularInline):
    model = OrganizationImage
    extra = 0


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "organization_type", "website", "created_at")
    list_filter = ("organization_type",)
    search_fields = ("name",)
    filter_horizontal = (
        "countries_of_registration",
        "countries_of_operation",
        "languages_supported",
    )
    inlines = [
        OrganizationCoreFocusAreaInline,
        OrganizationStakeholderGroupInline,
        OrganizationNaceCodeInline,
        OrganizationImageInline,
    ]


admin.site.register(UserOrganization)
admin.site.register(PriorityActivityGroup)
admin.site.register(Language)
admin.site.register(SupplierProgressCategory)


@admin.register(Policy)
class PolicyAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "type", "strategic_partner", "supplier", "audience", "created_at")
    list_filter = ("type", "audience")
    search_fields = ("title",)
    filter_horizontal = ("categories",)
    raw_id_fields = ("strategic_partner", "supplier", "file")


class SupplierProgressItemTranslationInline(NestedStackedInline):
    model = SupplierProgressItemTranslation
    verbose_name = "Supplier Progress Item Translation"
    extra = 0


@admin.register(SupplierProgressItem)
class SupplierProgressItemAdmin(NestedModelAdmin):
    inlines = [SupplierProgressItemTranslationInline]
    verbose_name = "Supplier Progress Item"
    list_display = ["id", "name", "supplier_progress_category"]
    search_fields = ["name"]
    list_filter = ["supplier_progress_category"]
