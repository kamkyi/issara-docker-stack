"""CSO Worker Voice call logging (IV2-582).

A CSO officer logs each signal a worker sends them as a row in the shared
`cases` table, so worker voice from partner organizations lands in the same
place as Issara's own casework and feeds the existing KPI reporting.

Scoping follows the convention already used by `CaseLeanViewSet`: a case
belongs to the organization of the user who created it, reached through
`case_created_by -> UserOrganization -> Organization`. `case_created_by` is
always stamped from the request, never accepted from the client, so a CSO
cannot write a case into another organization.

An organization also sees the calls *referred to it*: picking "Referral
information provided to the partner organization" on step 5 names the receiving
organization in `cases.refer_to_org`, and that is the referral actually being
made -- the receiving organization has to be able to read the call to act on
it, and is emailed when it lands. A referral hands over the reading of a case,
not ownership of it, so a shared call is strictly read-only: only the
organization that logged it can edit or delete it. That read-side widening
matches what the legacy CSO screens have always done (`kpis/functions.py`
`get_cases_by_organization`, `CaseLeanViewSet.get_cso_visibility_filter`),
which this endpoint had not yet caught up with.
"""

import django_filters
from authkit import WorkOSAuthKitAuthentication
from django.db import transaction
from django.db.models import Exists, OuterRef, Prefetch, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import SearchFilter
from rest_framework.generics import (
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.settings import api_settings

from issara.cascade.worker_voice_referral import notify_referral_organization
from issara.ilm_server_2.models import Case, SharedFile, UserOrganization
from issara.cascade.case_supplier_kpis import sync_case_supplier_kpis
from kpis.models import KpiTranslation

AUTHENTICATION_CLASSES = (WorkOSAuthKitAuthentication,) + tuple(
    api_settings.DEFAULT_AUTHENTICATION_CLASSES
)

# How the KPIs picked on step 4 classify the call, as agreed with the product
# owner: any Level 3 or Level 4 is a forced-labor risk; failing that, any
# Level 2 is an early warning; anything else -- no KPI at all, or only a level
# the rule does not name -- is unclassified.
#
# The same rule the facelift's badge applies (`kpiRiskLevel` in
# `src/components/routes/WorkerVoiceCalls/callFormatting.ts`), kept here only
# so the column can be filtered server-side. The two must agree row for row: a
# call carrying a Level 2 and a Level 3 belongs under forced labor on both
# sides, never under early warning.
#
# Levels 3 and 4 are the split the supplier tables already draw
# (`isForcedLaborRisk`), listed rather than tested as `level >= 3` so the two
# stay identical. `KPI_LEVEL_CHOICES` also allows Levels 1 and 5 and the
# catalogue holds neither; the rule does not say what they would mean, so this
# does not invent an answer.
FORCED_LABOR_KPI_LEVELS = (3, 4)
EARLY_WARNING_KPI_LEVELS = (2,)

# The facelift's locale codes are not the codes the ILM `languages` table uses:
# it says `my`/`km`/`vi` where ILM says `mm`/`kh`/`vn`. cascade-api already
# carries this map (`ILM_LANGUAGE_CODE_MAP` in `src/utils/language.ts`) because
# the KPI catalogue the step-4 form reads goes through it; the table's KPI
# descriptions come from Django instead, so it needs the same one. Sending an
# unmapped `my` would find no `KpiTranslation` row and silently read English.
#
# Anything not named here is passed through untouched, so a caller that
# already speaks ILM's codes -- the legacy client does -- still works.
ILM_LANGUAGE_CODES = {
    "my": "mm",
    "km": "kh",
    "vi": "vn",
}
DEFAULT_LANGUAGE_CODE = "en"


def ilm_language_code(lang):
    """The `languages.code` to look a translation up by."""
    code = (lang or "").strip().lower() or DEFAULT_LANGUAGE_CODE
    return ILM_LANGUAGE_CODES.get(code, code)


# Uploads accepted by the "Additional attachments" field on step 5.
ALLOWED_ATTACHMENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}
ALLOWED_ATTACHMENT_EXTENSIONS = (".pdf", ".png", ".jpg", ".jpeg")
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

# `referral_actions` row 13, "Referral information provided to the partner
# organization" -- the one action that names another organization, so step 5
# reveals the organization picker for it and requires an answer. The row is
# shared with Issara staff and predates the CSO form, so the id is stable
# across local, staging and production.
REFERRAL_TO_PARTNER_ORG_ACTION_ID = 13


def organization_for(user):
    """The organization the requesting user belongs to, or None.

    WorkOS users without a matching ILM account resolve to an object with no
    primary key, which has no organization link to follow.
    """
    user_id = getattr(user, "pk", None)
    if not user_id:
        return None

    link = (
        UserOrganization.objects.filter(user_id=user_id)
        .select_related("organization")
        .first()
    )
    return link.organization if link else None


def owning_organization_id(case):
    """The id of the organization whose user logged this call, or None.

    `case_created_by` is nullable on the shared `cases` table, and a user can
    exist without a `UserOrganization` row. Django's reverse one-to-one
    descriptor raises a subclass of `AttributeError` in that case, which is
    what makes the `getattr` default reachable rather than an exception.
    """
    creator = case.case_created_by
    if creator is None:
        return None
    link = getattr(creator, "organization_user", None)
    return link.organization_id if link else None


def logged_by(organization):
    """Calls this organization logged itself -- the ones it owns."""
    return Q(
        case_created_by__organization_user__organization_id=organization.id
    )


def referred_to(organization):
    """Calls another organization referred to this one on step 5."""
    return Q(refer_to_org_id=organization.id)


def is_owned_by(case, organization):
    return (
        organization is not None
        and owning_organization_id(case) == organization.id
    )


def is_shared_with(case, organization):
    """True when this organization holds the call as a referral only.

    An organization that refers a call to itself still owns it, so ownership
    is checked first -- otherwise its own call would render as read-only.
    """
    if organization is None:
        return False
    return case.refer_to_org_id == organization.id and not is_owned_by(
        case, organization
    )


def lookup_name(field):
    """Read-only display label for a lookup foreign key.

    Every table the form selects from names its label column `name`, and an
    unset foreign key reads as null rather than raising.
    """
    return serializers.CharField(
        source=f"{field}.name", read_only=True, default=None
    )


class WorkerVoiceAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedFile
        fields = ["id", "name", "type", "size", "file_path", "created_at"]
        read_only_fields = fields


class WorkerVoiceCaseSerializer(serializers.ModelSerializer):
    """The finalized five-step Worker Voice form, mapped onto `cases`.

    Only the fields the form collects are writable. Everything else on `Case`
    -- ratings, recruiters, supply chain, the Issara-staff assignments -- stays
    out so a CSO submission can never touch Issara-managed columns.
    """

    # `cases.interacted` is a DateTimeField, but the form asks for a date and
    # the rest of the codebase reads the column back as `interacted.date()`.
    # Accept the plain `YYYY-MM-DD` the form sends (stored at midnight UTC),
    # still accept a full ISO timestamp from other callers, and render it as a
    # date so re-opening a saved call repopulates the date picker.
    interacted = serializers.DateTimeField(
        input_formats=["%Y-%m-%d", "iso-8601"],
        format="%Y-%m-%d",
    )

    attachments = WorkerVoiceAttachmentSerializer(many=True, read_only=True)
    uploaded_attachments = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False,
    )
    # Files the officer took off the call while editing. Sent as ids because
    # the edit form was handed the saved attachments, not the files themselves.
    removed_attachment_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )
    organization_name = serializers.CharField(
        source="case_created_by.organization_user.organization.name",
        read_only=True,
        default=None,
    )
    # True when the reader is the *receiving* organization of a referral rather
    # than the one that logged the call. The detail panel reads it to say who
    # shared the call and to drop the edit and delete controls, which the API
    # refuses for a shared call anyway.
    shared_with_my_organization = serializers.SerializerMethodField()

    # Labels for the read-only "view call" panel. Resolving these client-side
    # would mean a request per lookup table, and the geography ones are
    # parameterized by their parent, so they are answered here instead.
    client_nationality_name = lookup_name("client_nationality")
    interaction_reason_name = lookup_name("interaction_reason")
    interaction_channel_name = lookup_name("interaction_channel")
    client_type_name = lookup_name("client_type")
    client_gender_name = lookup_name("client_gender")
    supplier_name = lookup_name("supplier")
    country_name = lookup_name("country")
    province_name = lookup_name("province")
    district_name = lookup_name("district")
    client_origin_country_name = lookup_name("client_origin_country")
    client_origin_province_name = lookup_name("client_origin_province")
    client_origin_district_name = lookup_name("client_origin_district")
    client_crossing_country_name = lookup_name("client_crossing_country")
    client_crossing_province_name = lookup_name("client_crossing_province")
    client_crossing_district_name = lookup_name("client_crossing_district")
    client_contract_type_name = lookup_name("client_contract_type")
    client_document_type_name = lookup_name("client_document_type")
    case_status_name = lookup_name("case_status")
    referral_action_name = lookup_name("referral_action")
    refer_to_org_name = lookup_name("refer_to_org")
    interaction_issara_staff_name = serializers.SerializerMethodField()
    next_steps_issara_staff_name = serializers.SerializerMethodField()
    kpi_details = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            "id",
            "created",
            "last_modified",
            # Step 1 -- Key data
            "client_nationality",
            "interaction_reason",
            "interaction_issara_staff",
            "interaction_channel",
            "first_time_contacting_issara",
            "client_type",
            "interacted",
            "interaction_summary",
            # The workplace the call is about, and where that workplace is.
            # Picking a supplier auto-fills the three location columns from the
            # supplier record, exactly as the legacy call wizard does, but they
            # stay editable and are stored per case -- a supplier whose own
            # country/province/district is blank or stale must not silently
            # blank out the case. They are nullable throughout: a CSO may not
            # know the workplace, which is the second product flow.
            "supplier",
            "country",
            "province",
            "district",
            # Step 2 -- Worker info
            "description",
            "client_nickname",
            "client_gender",
            "client_phonenumber",
            "client_whatsapp_account",
            "client_viber_account",
            "client_telegram_account",
            "client_facebook_account",
            "client_line_account",
            "client_zalo_account",
            "client_other_account",
            "client_origin_country",
            "client_origin_province",
            "client_origin_district",
            "client_crossing_country",
            "client_crossing_province",
            "client_crossing_district",
            # Step 3 -- Recruitment info
            "client_time_at_job",
            "debt_bondage",
            "debt_bondage_detail",
            "debt_bondage_broker",
            "debt_bondage_detail_broker",
            "client_contract_type",
            "client_document_type",
            # Step 4 -- Issue details
            "issue_description",
            "issue_workers_affected",
            "issue_getting_better",
            "issue_getting_better_description",
            "kpis",
            # Step 5 -- Support and actions
            "vot_needs",
            "client_share_info_consent",
            "consent_to_discuss_with_employer_anonymously",
            "worker_identification_risk_level",
            "case_status",
            "referral_action",
            "refer_to_org",
            "next_steps",
            "next_steps_issara_staff",
            "dead_line_date",
            "final_remarks",
            "safeguards_remarks",
            "attachments",
            "uploaded_attachments",
            "removed_attachment_ids",
            # Read-only provenance
            "case_created_by",
            "organization_name",
            "shared_with_my_organization",
            # Read-only labels for the "view call" panel
            "client_nationality_name",
            "interaction_reason_name",
            "interaction_channel_name",
            "client_type_name",
            "client_gender_name",
            "supplier_name",
            "country_name",
            "province_name",
            "district_name",
            "client_origin_country_name",
            "client_origin_province_name",
            "client_origin_district_name",
            "client_crossing_country_name",
            "client_crossing_province_name",
            "client_crossing_district_name",
            "client_contract_type_name",
            "client_document_type_name",
            "case_status_name",
            "referral_action_name",
            "refer_to_org_name",
            "interaction_issara_staff_name",
            "next_steps_issara_staff_name",
            "kpi_details",
        ]
        read_only_fields = ["id", "created", "last_modified", "case_created_by"]
        extra_kwargs = {
            # Required on the form; the model leaves them nullable because ~47k
            # legacy rows predate the finalized form.
            "client_nationality": {"required": True, "allow_null": False},
            "interaction_reason": {"required": True, "allow_null": False},
            "interaction_issara_staff": {"required": True, "allow_null": False},
            "interaction_channel": {"required": True, "allow_null": False},
            "first_time_contacting_issara": {"required": True, "allow_null": False},
            "client_type": {"required": True, "allow_null": False},
            "interaction_summary": {
                "required": True,
                "allow_null": False,
                "allow_blank": False,
            },
            "client_origin_country": {"required": True, "allow_null": False},
            "client_time_at_job": {"required": True, "allow_null": False},
            "client_contract_type": {"required": True, "allow_null": False},
            "issue_workers_affected": {"required": True, "allow_null": False},
        }

    def get_shared_with_my_organization(self, case):
        return is_shared_with(case, self.context.get("viewer_organization"))

    @staticmethod
    def _display_name(user):
        if user is None:
            return None
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name or user.username or user.email or None

    def get_interaction_issara_staff_name(self, case):
        return self._display_name(case.interaction_issara_staff)

    def get_next_steps_issara_staff_name(self, case):
        return self._display_name(case.next_steps_issara_staff)

    def get_kpi_details(self, case):
        """The selected KPIs, grouped the way step 4 presents them."""
        return [
            {
                "id": kpi.id,
                "description": kpi.description,
                "category": kpi.kpi_category.name if kpi.kpi_category else None,
            }
            for kpi in case.kpis.all()
        ]

    def validate(self, attrs):
        """The partner-referral action is meaningless without its target.

        `refer_to_org` is what actually routes the case: it is the receiving
        organization's only route to seeing it, and the follow-up task is
        raised against that organization's users. So the action that says a
        referral was provided cannot be saved without naming who to.
        """
        referral_action = attrs.get(
            "referral_action", getattr(self.instance, "referral_action", None)
        )
        refer_to_org = attrs.get(
            "refer_to_org", getattr(self.instance, "refer_to_org", None)
        )
        if (
            referral_action is not None
            and referral_action.id == REFERRAL_TO_PARTNER_ORG_ACTION_ID
            and refer_to_org is None
        ):
            raise serializers.ValidationError(
                {
                    "refer_to_org": (
                        "Select the organization the referral was provided to."
                    )
                }
            )
        return attrs

    def validate_uploaded_attachments(self, files):
        for uploaded in files:
            name = (uploaded.name or "").lower()
            if not name.endswith(ALLOWED_ATTACHMENT_EXTENSIONS):
                raise serializers.ValidationError(
                    f"{uploaded.name}: only .pdf, .png and .jpg files are supported."
                )
            content_type = getattr(uploaded, "content_type", None)
            if content_type and content_type not in ALLOWED_ATTACHMENT_TYPES:
                raise serializers.ValidationError(
                    f"{uploaded.name}: unsupported file type {content_type}."
                )
            if (getattr(uploaded, "size", 0) or 0) > MAX_ATTACHMENT_BYTES:
                raise serializers.ValidationError(
                    f"{uploaded.name}: files must be 10MB or smaller."
                )
        return files

    def _remove_attachments(self, case, attachment_ids):
        """Take the files the officer removed off the call.

        Only the case's own attachments are looked at, so an id belonging to
        another organization's case cannot reach a file this case never held.
        A file no other case still points at is deleted rather than left
        orphaned -- the same policy the delete endpoint follows, and these can
        carry worker PII.
        """
        if not attachment_ids:
            return
        removed = list(case.attachments.filter(pk__in=attachment_ids))
        case.attachments.remove(*removed)
        for attachment in removed:
            if not attachment.cases.exists():
                attachment.delete()

    def _save_attachments(self, case, files):
        for uploaded in files:
            case.attachments.add(
                SharedFile.create_from_upload(
                    uploaded,
                    description=f"Worker Voice case {case.pk} attachment",
                )
            )

    @transaction.atomic
    def create(self, validated_data):
        files = validated_data.pop("uploaded_attachments", [])
        # A new call has nothing to remove; the field is dropped rather than
        # rejected so the form can send one payload shape for both.
        validated_data.pop("removed_attachment_ids", None)
        kpis = validated_data.pop("kpis", [])
        # Ownership is derived from the request, never from the payload -- it
        # is what scopes the case to the caller's organization.
        validated_data["case_created_by"] = self.context["request"].user
        case = Case.objects.create(**validated_data)
        if kpis:
            case.kpis.set(kpis)
        self._save_attachments(case, files)
        return case

    @transaction.atomic
    def update(self, instance, validated_data):
        files = validated_data.pop("uploaded_attachments", [])
        removed_ids = validated_data.pop("removed_attachment_ids", [])
        # Read the stored supplier before the save, so the comparison below is
        # against what was actually persisted rather than in-memory state.
        previous_supplier_id = instance.supplier_id
        next_supplier = validated_data.get("supplier", instance.supplier)
        next_supplier_id = next_supplier.pk if next_supplier else None
        supplier_changing = next_supplier_id != previous_supplier_id

        # During a supplier transition this serializer applies the KPI set
        # itself, so legacy `create_us` never runs against the new supplier.
        # Its post_add branch reopens and resets a closed `SupplierKpi` that the
        # destination supplier already has -- clearing status, dates and
        # assignments on a row other cases share -- and its post_remove branch
        # deletes rows. Neither belongs in an edit whose rule is preservation.
        # Every link is then rebuilt additively by `sync_case_supplier_kpis`.
        #
        # Outside a supplier change nothing is intercepted: adding or removing a
        # KPI behaves exactly as it does on master, legacy reopen and cleanup
        # included.
        deferred_kpis = (
            validated_data.pop("kpis") if supplier_changing and "kpis" in validated_data
            else None
        )

        if supplier_changing and previous_supplier_id:
            # Unlink the old supplier's rows *before* DRF applies the new KPI
            # set. DRF saves the instance first and sets m2m fields after, so a
            # request that changes the supplier AND drops a KPI would otherwise
            # reach legacy `create_us`'s post_remove branch with the new
            # supplier already in place; its `_cleanup_kpi_and_history` then
            # finds no case matching the *old* supplier and deletes that
            # SupplierKpi together with its history. Clearing the links here
            # leaves that branch nothing to collect, so the row survives.
            for supplier_kpi in list(
                instance.supplier_kpis.filter(supplier_id=previous_supplier_id)
            ):
                instance.supplier_kpis.remove(supplier_kpi)

        case = super().update(instance, validated_data)

        if deferred_kpis is not None:
            # Written through the join model directly, which does not fire
            # `m2m_changed`, so the KPI set lands without legacy's side effects.
            through = Case.kpis.through
            wanted = {kpi.pk for kpi in deferred_kpis}
            current = set(case.kpis.values_list("id", flat=True))
            through.objects.filter(
                case_id=case.pk, kpi_id__in=current - wanted
            ).delete()
            through.objects.bulk_create(
                [
                    through(case_id=case.pk, kpi_id=kpi_id)
                    for kpi_id in sorted(wanted - current)
                ]
            )

        if case.supplier_id != previous_supplier_id:
            # The KPI set has landed, and the old supplier's links are gone.
            # Link each remaining KPI to the new supplier without reopening or
            # changing any existing SupplierKpi record.
            sync_case_supplier_kpis(case)
        self._remove_attachments(case, removed_ids)
        self._save_attachments(case, files)
        return case


class WorkerVoiceCaseListSerializer(serializers.ModelSerializer):
    """The columns the "View Worker Voice" table draws.

    The table needs readable labels rather than the raw ids the create/edit
    serializer round-trips, and it draws a page at a time -- sending the whole
    case for every row would ship some fifty fields the list never shows.
    """

    interacted = serializers.DateTimeField(format="%Y-%m-%d", read_only=True)
    client_nationality_name = lookup_name("client_nationality")
    interaction_reason_name = lookup_name("interaction_reason")
    interaction_channel_name = lookup_name("interaction_channel")
    client_type_name = lookup_name("client_type")
    case_status_name = lookup_name("case_status")
    supplier_name = lookup_name("supplier")
    attachment_count = serializers.SerializerMethodField()
    # The levels of the KPIs picked on step 4, so the table can say whether the
    # issue is an early warning or a forced-labor risk. The levels themselves
    # are sent rather than a verdict: the mapping is presentation, and the
    # facelift already owns it (`isForcedLaborRisk`, Levels 3 & 4).
    kpi_levels = serializers.SerializerMethodField()
    # What the "Issue Description" column draws since round four. Ana asked for
    # the KPI description ILM shows under "Kpi", not the interaction reason the
    # column used to carry, so this is the same thing legacy's `translated_kpis`
    # sends: the KPI's description in the reader's language, falling back to the
    # English text on the `kpis` row. The reason is still collected on step 1
    # and still shown in the detail panel; it is only off the table.
    kpi_descriptions = serializers.SerializerMethodField()
    # The table mixes the organization's own calls with the ones referred to
    # it, so each row has to say which it is: a shared row names the
    # organization that logged it and carries no edit or delete action.
    owner_organization_name = serializers.CharField(
        source="case_created_by.organization_user.organization.name",
        read_only=True,
        default=None,
    )
    shared_with_my_organization = serializers.SerializerMethodField()
    # Who entered the call, asked for by name in round four. The account that
    # saved it is the answer -- `interaction_issara_staff` is the officer who
    # *received* the feedback, which is a different question the form already
    # asks on step 1. Blank on a referred-in row: the reader's organization is
    # told which organization sent the call, not which of its officers typed
    # it, and an individual's address is not the referral's to hand over.
    staff_email = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            "id",
            "created",
            "interacted",
            "client_nickname",
            "client_nationality_name",
            "interaction_reason_name",
            "interaction_channel_name",
            "client_type_name",
            "case_status_name",
            "supplier_name",
            # Shown as a column of the table since IV2-582 round three. The
            # endpoint is already scoped to the reader's organization, and the
            # detail panel has always carried it.
            "client_phonenumber",
            "worker_identification_risk_level",
            "kpi_levels",
            "kpi_descriptions",
            "interaction_summary",
            "issue_description",
            "attachment_count",
            "owner_organization_name",
            "shared_with_my_organization",
            "staff_email",
        ]
        read_only_fields = fields

    def get_attachment_count(self, case):
        # Counted off the prefetched rows rather than with a COUNT per row.
        return len(case.attachments.all())

    def get_kpi_levels(self, case):
        # Read off the prefetched `kpis`, so no query per row.
        return [kpi.level for kpi in case.kpis.all() if kpi.level is not None]

    def get_kpi_descriptions(self, case):
        """Every KPI on the call, described in the reader's language.

        Both the KPIs and the translations for the one language asked for are
        prefetched by the view, so this costs no query per row. A KPI with no
        row in that language reads as its English description -- translation
        coverage is partial (12 to 80 of the 84 KPIs, depending on the
        language), and the legacy screens fall back the same way.
        """
        descriptions = []
        for kpi in case.kpis.all():
            # `translations_for_language` is the view's Prefetch; it holds at
            # most one row, the unique_together being (kpi, language). Absent
            # only if this serializer is ever handed rows from some other
            # queryset, in which case English is the honest answer rather than
            # a crash.
            translated = next(iter(getattr(kpi, "translations_for_language", ())), None)
            text = (translated.description if translated else None) or kpi.description
            if text:
                descriptions.append(text)
        return descriptions

    def get_shared_with_my_organization(self, case):
        return is_shared_with(case, self.context.get("viewer_organization"))

    def get_staff_email(self, case):
        # `case_created_by` is joined by the list queryset already, so this is
        # read off the row rather than fetched per case.
        if is_shared_with(case, self.context.get("viewer_organization")):
            return None
        return getattr(case.case_created_by, "email", None) or None


class WorkerVoiceCaseSearchFilter(SearchFilter):
    """Free-text search across the table's columns, plus the case id.

    `SearchFilter` only builds `icontains` lookups, which the integer primary
    key rejects, so an all-digit term is matched against the id as well -- that
    is how an officer refers to a call the organization has already logged.

    KPI descriptions are deliberately not searched, here or in `search_fields`.
    The column shows them translated, but only the English `kpis.description`
    is complete (translation coverage runs from 12 to 80 of the 84 KPIs), so a
    search over them would answer for some rows and some languages and not
    others. Legacy ILM draws the same line: its KPI column is `filterable:
    false` and nothing searches the text.
    """

    def filter_queryset(self, request, queryset, view):
        matched = super().filter_queryset(request, queryset, view)
        term = request.query_params.get(self.search_param, "").strip()
        if term.isdigit():
            matched = (matched | queryset.filter(pk=int(term))).distinct()
        return matched


class WorkerVoiceCaseFilterSet(django_filters.FilterSet):
    """The search boxes in the calls table's header row, one per column.

    Each filter is named after the column it sits under rather than after the
    `cases` column it reads, so what the table sends and what the officer sees
    line up. They narrow rather than replace the free-text `search` box, which
    still runs across every column at once.
    """

    # A number box: the officer already knows the call they are looking for.
    id = django_filters.NumberFilter(field_name="pk")
    # `interacted` is a datetime stored at midnight UTC and rendered as a bare
    # date; TIME_ZONE is UTC, so the `date` lookup matches what is on screen.
    date = django_filters.DateFilter(field_name="interacted", lookup_expr="date")
    worker = django_filters.CharFilter(
        field_name="client_nickname", lookup_expr="icontains"
    )
    nationality = django_filters.CharFilter(
        field_name="client_nationality__name", lookup_expr="icontains"
    )
    reason = django_filters.CharFilter(
        field_name="interaction_reason__name", lookup_expr="icontains"
    )
    # The "Issue Description" column's box, matched against the English
    # `kpis.description`. The column can render a translation, but the CSO and
    # Management dashboards are English-only for now, so what is typed and what
    # is shown are the same text in practice. If another language is ever
    # turned on, the two part company and this needs revisiting -- which is why
    # the free-text `search` box still leaves KPIs alone: one column's box is a
    # narrower promise than "search everything".
    #
    # `Exists` rather than a join on the many-to-many: a call whose two KPIs
    # both match would otherwise come back as two rows.
    kpi = django_filters.CharFilter(method="filter_kpi")
    channel = django_filters.CharFilter(
        field_name="interaction_channel__name", lookup_expr="icontains"
    )
    status = django_filters.CharFilter(
        field_name="case_status__name", lookup_expr="icontains"
    )
    supplier = django_filters.CharFilter(
        field_name="supplier__name", lookup_expr="icontains"
    )
    phone = django_filters.CharFilter(
        field_name="client_phonenumber", lookup_expr="icontains"
    )
    # The email of the account that entered the call. Narrowed to the calls
    # this organization logged, because that is the half the column is drawn
    # on: a referred-in row shows no email, and a box that could pull one up
    # by an address the officer cannot see would hand back what the column
    # deliberately withholds.
    staff = django_filters.CharFilter(method="filter_staff")
    # Picked from a dropdown of the stored levels, so an exact match.
    risk = django_filters.CharFilter(
        field_name="worker_identification_risk_level", lookup_expr="iexact"
    )
    # The table's "Forced labor risk level" column, which reads the levels of
    # the KPIs picked on step 4 rather than the worker's personal risk. Levels
    # 3 and 4 are the forced-labor risk, 2 the early warning, and a call
    # tagged with neither is in no band at all.
    kpi_risk = django_filters.ChoiceFilter(
        choices=(
            ("FORCED_LABOR", "Forced labor risk"),
            ("EARLY_WARNING", "Early warning"),
        ),
        method="filter_kpi_risk",
    )
    # The table's "All / Logged by us / Referred to us" tabs. Omitted means all
    # of them, which is the default view: an officer wants their caseload, and
    # a referral someone sent them is part of it.
    scope = django_filters.ChoiceFilter(
        choices=(
            ("own", "Logged by my organization"),
            ("shared", "Referred to my organization"),
        ),
        method="filter_scope",
    )

    class Meta:
        model = Case
        fields = []

    def filter_kpi_risk(self, queryset, name, value):
        # `Exists` rather than a join on the many-to-many: a call tagged with
        # two Level 4 KPIs would otherwise come back as two rows.
        forced_labor = Exists(
            Case.kpis.through.objects.filter(
                case_id=OuterRef("pk"), kpi__level__in=FORCED_LABOR_KPI_LEVELS
            )
        )
        early_warning = Exists(
            Case.kpis.through.objects.filter(
                case_id=OuterRef("pk"), kpi__level__in=EARLY_WARNING_KPI_LEVELS
            )
        )
        if value == "FORCED_LABOR":
            return queryset.filter(forced_labor)
        if value == "EARLY_WARNING":
            # `exclude` as well as `filter`, so a call carrying both a Level 2
            # and a Level 3 is listed under forced labor only -- the same row
            # the badge shows, rather than a row in each band.
            return queryset.filter(early_warning).exclude(forced_labor)
        return queryset

    def filter_kpi(self, queryset, name, value):
        return queryset.filter(
            Exists(
                Case.kpis.through.objects.filter(
                    case_id=OuterRef("pk"), kpi__description__icontains=value
                )
            )
        )

    def filter_staff(self, queryset, name, value):
        organization = organization_for(self.request.user) if self.request else None
        if organization is None:
            return queryset
        return queryset.filter(
            logged_by(organization), case_created_by__email__icontains=value
        )

    def filter_scope(self, queryset, name, value):
        # The queryset is already narrowed to the two halves; this picks one of
        # them. Without a resolvable organization there is nothing to pick, and
        # the view has already refused the request in that case.
        organization = organization_for(self.request.user) if self.request else None
        if organization is None:
            return queryset
        if value == "own":
            return queryset.filter(logged_by(organization))
        if value == "shared":
            return queryset.filter(referred_to(organization))
        return queryset


class WorkerVoiceCasePagination(LimitOffsetPagination):
    default_limit = 25
    max_limit = 100


class OwningOrganizationCanWrite(permissions.BasePermission):
    """A referral shares the reading of a call, never the keeping of it.

    The receiving organization needs the call to act on it, so it reads like
    any other. Editing and deleting stay with the organization that logged it:
    the call is that organization's record of what a worker told them, and a
    delete takes the attachments with it.

    Round four briefly opened editing to the receiving organization, on the
    grounds that legacy ILM put no ownership check on editing a case. That was
    reverted: a save of a `Case` runs legacy `post_save`/`m2m_changed` signals
    that create, reopen and delete `SupplierKpi` rows and their history when
    the supplier or the KPI set changes, and those rows belong to the supplier
    relationship the *logging* organization owns and feed other teams'
    dashboards. Read-only is the only rule under which one organization's edit
    cannot reach another's data through a side effect.
    """

    message = (
        "This call was referred to your organization by the organization that "
        "logged it. Only that organization can edit or delete it."
    )

    def has_object_permission(self, request, view, case):
        if request.method in permissions.SAFE_METHODS:
            return True
        return is_owned_by(case, organization_for(request.user))


class WorkerVoiceCaseScopedMixin:
    authentication_classes = AUTHENTICATION_CLASSES
    permission_classes = (permissions.IsAuthenticated, OwningOrganizationCanWrite)
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    serializer_class = WorkerVoiceCaseSerializer

    @property
    def viewer_organization(self):
        """The requesting user's organization, resolved once per request.

        Both the queryset and the serializers need it, and it is a query, so it
        is answered once rather than per row.
        """
        if not hasattr(self, "_viewer_organization"):
            organization = organization_for(self.request.user)
            if organization is None:
                raise PermissionDenied(
                    "Your account is not linked to a partner organization."
                )
            self._viewer_organization = organization
        return self._viewer_organization

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["viewer_organization"] = self.viewer_organization
        return context

    def get_queryset(self):
        organization = self.viewer_organization
        return (
            Case.objects.filter(
                # The calls the organization logged, plus the ones referred to
                # it. Both sides are single-row joins, so this cannot duplicate
                # a row and needs no `distinct()`.
                logged_by(organization)
                | referred_to(organization)
            )
            .select_related(
                # Reached by every row to say whether it is shared and by whom.
                "case_created_by__organization_user__organization",
                "client_nationality",
                "interaction_reason",
                "interaction_channel",
                "interaction_issara_staff",
                "client_type",
                "client_gender",
                "client_contract_type",
                "client_document_type",
                "case_status",
                "supplier",
                # The workplace location the supplier picker fills in; joined
                # here so `country_name`/`province_name`/`district_name` cost
                # nothing per row.
                "country",
                "province",
                "district",
                "referral_action",
                "refer_to_org",
                "next_steps_issara_staff",
                "client_origin_country",
                "client_origin_province",
                "client_origin_district",
                "client_crossing_country",
                "client_crossing_province",
                "client_crossing_district",
            )
            .prefetch_related(
                "kpis__kpi_category",
                # The KPI descriptions the table draws, in the caller's
                # language only: one extra query for the page, not one per row
                # and not the whole translation table.
                Prefetch(
                    "kpis__kpitranslation_set",
                    queryset=KpiTranslation.objects.filter(
                        language__code=ilm_language_code(
                            self.request.query_params.get("lang")
                        )
                    ),
                    to_attr="translations_for_language",
                ),
                "attachments",
            )
            .order_by("-id")
        )


class WorkerVoiceCaseListCreateAPIView(WorkerVoiceCaseScopedMixin, ListCreateAPIView):
    """GET the organization's caseload -- what it logged, plus what was
    referred to it; POST a new call.

    The `scope` filter splits the two halves for the table's tabs.
    """

    pagination_class = WorkerVoiceCasePagination
    filter_backends = (WorkerVoiceCaseSearchFilter, DjangoFilterBackend)
    filterset_class = WorkerVoiceCaseFilterSet
    search_fields = (
        "client_nickname",
        "interaction_summary",
        "issue_description",
        "description",
        "client_phonenumber",
        "client_nationality__name",
        "interaction_reason__name",
        "interaction_channel__name",
        "client_type__name",
        "case_status__name",
        "supplier__name",
    )

    def get_serializer_class(self):
        # The list is a table of labels; a POST is the five-step form.
        if self.request.method == "GET":
            return WorkerVoiceCaseListSerializer
        return WorkerVoiceCaseSerializer

    def perform_create(self, serializer):
        # Reached only after get_queryset has confirmed the organization link.
        self.get_queryset()
        case = serializer.save()
        # Told after the transaction the serializer opened has committed, so an
        # organization is never emailed about a call that failed to save.
        if case.refer_to_org_id is not None:
            transaction.on_commit(
                lambda: notify_referral_organization(case, self.request.user)
            )


class WorkerVoiceCaseDetailAPIView(
    WorkerVoiceCaseScopedMixin, RetrieveUpdateDestroyAPIView
):
    """Read, edit or delete one call.

    A call the caller's organization neither logged nor was referred is outside
    `get_queryset`, so any method on it is a 404. A call that was referred to
    the caller is readable but not writable -- `OwningOrganizationCanWrite`
    answers 403 there, which tells the officer why rather than pretending the
    call they can see does not exist.
    """

    def perform_update(self, serializer):
        # Read before the save, so a referral added or redirected on an edit is
        # noticed. Re-saving a call whose referral has not moved sends nothing:
        # the receiving organization was told when it was first referred, and
        # every later edit would otherwise mail them again.
        referred_before = serializer.instance.refer_to_org_id
        case = serializer.save()
        if (
            case.refer_to_org_id is not None
            and case.refer_to_org_id != referred_before
        ):
            transaction.on_commit(
                lambda: notify_referral_organization(case, self.request.user)
            )

    @transaction.atomic
    def perform_destroy(self, instance):
        # The uploads exist only for this call and can carry worker PII, so
        # they go with it instead of lingering as orphaned SharedFile rows.
        # Anything a second case also points at is left alone.
        attachments = list(instance.attachments.all())
        instance.delete()
        for attachment in attachments:
            if not attachment.cases.exists():
                attachment.delete()
