from django.contrib import admin
from django.contrib.auth.models import Group
from django import forms
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models import Prefetch, Q
from django.utils import timezone
from nonrelated_inlines.admin import NonrelatedStackedInline
from issara.ilm_server_2.models import (
    StrategicPartner,
    Supplier,
    SupplierLicenseAgreement,
    SupplierRecruiters,
    SupplierUser,
    SupplierUserTrackSelection,
)
from .models import WorkerFeedback, Grievance, WorkerContactReason, TotalNumberOfWorkers


class StrategicPartnerFilter(admin.SimpleListFilter):
    title = "strategic partner"
    parameter_name = "strategic_partner"

    def lookups(self, request, model_admin):
        strategic_partners = StrategicPartner.objects.all().order_by('name')
        return [(sp.id, sp.name) for sp in strategic_partners]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(
                suppliersupplychain__supply_chain__strategic_partner_id=self.value()
            )
        return queryset


class SupplierAgreementStatusFilter(admin.SimpleListFilter):
    title = "Full Access user agreement"
    parameter_name = "agreement_status"

    def lookups(self, request, model_admin):
        return (
            ("agreed", "At least one active user agreement"),
            ("not_agreed", "No active user agreement"),
        )

    def queryset(self, request, queryset):
        active_supplier_ids = queryset.filter(
            license_agreements__id__isnull=False,
            license_agreements__agreement_version=settings.SUPPLIER_AGREEMENT_VERSION,
            license_agreements__revoked_at__isnull=True,
        ).values("pk")
        if self.value() == "agreed":
            return queryset.filter(pk__in=active_supplier_ids).distinct()
        if self.value() == "not_agreed":
            return queryset.exclude(pk__in=active_supplier_ids).distinct()
        return queryset


class UserAgreementActiveFilter(admin.SimpleListFilter):
    title = "agreement active"
    parameter_name = "agreement_active"

    def lookups(self, request, model_admin):
        return (
            ("active", "Active"),
            ("revoked", "Revoked / needs re-signing"),
        )

    def queryset(self, request, queryset):
        if self.value() == "active":
            return queryset.filter(
                agreement_version=settings.SUPPLIER_AGREEMENT_VERSION,
                revoked_at__isnull=True,
            )
        if self.value() == "revoked":
            return queryset.filter(
                Q(revoked_at__isnull=False)
                | ~Q(agreement_version=settings.SUPPLIER_AGREEMENT_VERSION)
            )
        return queryset


class UserAgreementTypeFilter(admin.SimpleListFilter):
    title = "agreement type"
    parameter_name = "agreement_type"

    def lookups(self, request, model_admin):
        return (("full_access", "Full CASCADE Access"),)

    def queryset(self, request, queryset):
        if self.value() == "full_access":
            return queryset
        return queryset


class UserAccessActiveFilter(admin.SimpleListFilter):
    title = "access status"
    parameter_name = "access_active"

    def lookups(self, request, model_admin):
        return (
            ("active", "Active"),
            ("reset", "Reset / revoked"),
        )

    def queryset(self, request, queryset):
        if self.value() == "active":
            return queryset.filter(revoked_at__isnull=True)
        if self.value() == "reset":
            return queryset.filter(revoked_at__isnull=False)
        return queryset


def apply_user_agreement_active_override(agreement, agreement_active, admin_email):
    """Revoke current-user access without changing immutable signature data."""
    if agreement_active:
        return False

    changed = agreement.revoked_at is None
    if changed:
        agreement.revoked_at = timezone.now()
        agreement.revoked_by_email = admin_email or None
    return changed


def reset_user_full_track_selection(
    agreement,
    admin_email,
    reason="Full Access agreement reset by administrator",
):
    """Return only this supplier user to track selection, retaining CMS history."""
    return SupplierUserTrackSelection.objects.filter(
        supplier_id=agreement.supplier_id,
        workos_user_id=agreement.signer_workos_user_id,
        track_selection=Supplier.TRACK_FULL,
        revoked_at__isnull=True,
    ).update(
        revoked_at=timezone.now(),
        revoked_by_email=admin_email or None,
        revoked_reason=reason,
    )


def apply_user_access_active_override(
    selection,
    access_active,
    admin_email,
    reason="Supplier access reset by administrator",
):
    """Reset one user's access selection without disabling their account."""
    if access_active:
        return False

    changed = selection.revoked_at is None
    if changed:
        selection.revoked_at = timezone.now()
        selection.revoked_by_email = admin_email or None
        selection.revoked_reason = reason

    if selection.track_selection == Supplier.TRACK_FULL:
        SupplierLicenseAgreement.objects.filter(
            supplier_id=selection.supplier_id,
            signer_workos_user_id=selection.workos_user_id,
            agreement_version=settings.SUPPLIER_AGREEMENT_VERSION,
            revoked_at__isnull=True,
        ).update(
            revoked_at=timezone.now(),
            revoked_by_email=admin_email or None,
            revoked_reason=reason,
        )
    return changed


def revoke_user_agreement_if_requested(agreement, agreement_active, admin_email):
    changed = apply_user_agreement_active_override(
        agreement,
        agreement_active,
        admin_email,
    )
    if changed:
        reset_user_full_track_selection(
            agreement,
            admin_email,
            reason="Full Access agreement revoked by administrator",
        )
    return changed


def delete_user_agreement(agreement, admin_email):
    """Delete one audit row and invalidate any duplicate active signatures."""
    reset_user_full_track_selection(
        agreement,
        admin_email,
        reason="Full Access agreement deleted by administrator",
    )
    SupplierLicenseAgreement.objects.filter(
        supplier_id=agreement.supplier_id,
        signer_workos_user_id=agreement.signer_workos_user_id,
        agreement_version=agreement.agreement_version,
        revoked_at__isnull=True,
    ).exclude(pk=agreement.pk).update(
        revoked_at=timezone.now(),
        revoked_by_email=admin_email or None,
    )
    agreement.delete()


class SupplierLicenseAgreementStatusForm(forms.ModelForm):
    agreement_active = forms.BooleanField(
        required=False,
        label="Agreement active for this supplier user",
        help_text=(
            "Uncheck to return only this supplier user to track selection. They "
            "may choose Marketplace or sign a new Full Access agreement. The "
            "original signature record remains."
        ),
    )

    class Meta:
        model = SupplierLicenseAgreement
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["agreement_active"].initial = bool(
            self.instance and self.instance.agreement_active
        )

    def clean_agreement_active(self):
        agreement_active = self.cleaned_data["agreement_active"]
        if (
            agreement_active
            and self.instance
            and self.instance.pk
            and (
                self.instance.revoked_at is not None
                or self.instance.agreement_version
                != settings.SUPPLIER_AGREEMENT_VERSION
            )
        ):
            raise ValidationError(
                "A revoked agreement cannot be reactivated. The supplier user must "
                "review and sign the agreement again."
            )
        return agreement_active


class SupplierUserAccessStatusForm(forms.ModelForm):
    access_active = forms.BooleanField(
        required=False,
        label="Access selection active for this supplier user",
        help_text=(
            "Uncheck to return only this supplier user to the Track Selection "
            "page. Their user account remains active."
        ),
    )

    class Meta:
        model = SupplierUserTrackSelection
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["access_active"].initial = bool(
            self.instance and self.instance.access_active
        )

    def clean_access_active(self):
        access_active = self.cleaned_data["access_active"]
        if (
            access_active
            and self.instance
            and self.instance.pk
            and self.instance.revoked_at is not None
        ):
            raise ValidationError(
                "Reset or revoked access cannot be reactivated in the CMS. The "
                "supplier user must select a track again."
            )
        return access_active


class SupplierLicenseAgreementInline(admin.TabularInline):
    form = SupplierLicenseAgreementStatusForm
    model = SupplierLicenseAgreement
    fields = (
        "agreement_active",
        "signer_name",
        "signer_title",
        "signer_affiliation",
        "signer_email",
        "agreement_version",
        "signed_at",
        "confirmation_email_to",
        "confirmation_email_status",
        "confirmation_email_sent_at",
        "revoked_at",
        "revoked_by_email",
        "revoked_reason",
    )
    readonly_fields = (
        "signer_name",
        "signer_title",
        "signer_affiliation",
        "signer_email",
        "agreement_version",
        "signed_at",
        "confirmation_email_to",
        "confirmation_email_status",
        "confirmation_email_sent_at",
        "revoked_at",
        "revoked_by_email",
    )
    extra = 0
    can_delete = True
    ordering = ("-signed_at",)
    verbose_name = "Supplier user agreement and email audit record"
    verbose_name_plural = "Supplier user agreements and email audit records"

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True


class SupplierUserInline(NonrelatedStackedInline):
    fields = ("user", "email_receiving_preference")
    model = SupplierUser
    extra = 1

    def get_form_queryset(self, obj):
        return self.model.objects.filter(supplier=obj)

    def save_new_instance(self, parent, instance):
        _groups = instance.user.groups.all()
        _supplier_group = Group.objects.filter(name="Supplier")

        if "Supplier" in [x.name for x in _groups if x.name == "Supplier"]:
            instance.supplier = parent
        else:
            if len(_groups) == 0:
                instance.user.groups.add(_supplier_group.first())
                instance.supplier = parent
            else:
                raise ValidationError("User is present in other groups.")


class SupplierRecruiterInline(admin.TabularInline):
    model = SupplierRecruiters
    raw_id_fields = ("recruiter",)
    extra = 0


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "track_selection",
        "agreement_active",
        "license_agreed_at",
        "latest_agreement_email_status",
        "latest_agreement_email_sent_at",
        "tier",
        "address",
        "vessel_number",
        "country",
        "province",
        "district",
    )

    list_filter = (
        SupplierAgreementStatusFilter,
        "track_selection",
        StrategicPartnerFilter,
        "tier",
        "country",
        "province",
        "district",
    )
    search_fields = (
        "=id",
        "name",
        "license_agreements__signer_name",
        "license_agreements__signer_title",
        "license_agreements__signer_affiliation",
        "license_agreements__signer_email",
        "license_agreements__confirmation_email_to",
        "country__name",
        "province__name",
        "district__name",
        "tier__name",
    )
    ordering = ("id",)
    readonly_fields = ("license_agreed_at",)
    inlines = [
        SupplierLicenseAgreementInline,
        SupplierUserInline,
        SupplierRecruiterInline,
    ]

    @admin.display(boolean=True, description="Agreement active")
    def agreement_active(self, obj):
        return any(
            agreement.agreement_active
            for agreement in getattr(obj, "agreement_audit_rows", ())
        )

    @admin.display(description="Latest email status")
    def latest_agreement_email_status(self, obj):
        agreement = self._latest_agreement(obj)
        return agreement.confirmation_email_status if agreement else "—"

    @admin.display(description="Email sent at")
    def latest_agreement_email_sent_at(self, obj):
        agreement = self._latest_agreement(obj)
        return agreement.confirmation_email_sent_at if agreement else None

    @staticmethod
    def _latest_agreement(obj):
        agreements = getattr(obj, "agreement_audit_rows", ())
        return agreements[0] if agreements else None

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        admin_email = getattr(request.user, "email", "")
        for deleted_object in formset.deleted_objects:
            if isinstance(deleted_object, SupplierLicenseAgreement):
                delete_user_agreement(deleted_object, admin_email)
            else:
                deleted_object.delete()
        for form_instance in formset.forms:
            if not hasattr(form_instance, "cleaned_data"):
                continue
            instance = form_instance.instance
            if not isinstance(instance, SupplierLicenseAgreement):
                continue
            if "agreement_active" in form_instance.cleaned_data:
                revoke_user_agreement_if_requested(
                    instance,
                    form_instance.cleaned_data.get("agreement_active", False),
                    admin_email,
                )
        for instance in instances:
            instance.save()
        formset.save_m2m()

    def get_queryset(self, request):
        return (
            super(SupplierAdmin, self)
            .get_queryset(request)
            .select_related("tier")
            .prefetch_related(
                "district",
                "province",
                "country",
                "reports",
                Prefetch(
                    "license_agreements",
                    queryset=SupplierLicenseAgreement.objects.order_by("-signed_at"),
                    to_attr="agreement_audit_rows",
                ),
            )
        )


class SupplierLicenseAgreementAdmin(admin.ModelAdmin):
    """Standalone configuration retained for tests; intentionally not registered."""

    form = SupplierLicenseAgreementStatusForm
    list_display = (
        "id",
        "supplier",
        "agreement_type",
        "agreement_active",
        "signer_name",
        "signer_title",
        "signer_affiliation",
        "signer_email",
        "agreement_version",
        "signed_at",
        "revoked_at",
        "confirmation_email_status",
        "confirmation_email_sent_at",
    )
    list_filter = (
        UserAgreementTypeFilter,
        UserAgreementActiveFilter,
        "confirmation_email_status",
        "agreement_version",
        "signed_at",
    )
    search_fields = (
        "=supplier__id",
        "supplier__name",
        "signer_name",
        "signer_title",
        "signer_affiliation",
        "signer_email",
        "confirmation_email_to",
        "signer_workos_user_id",
    )
    readonly_fields = tuple(
        field.name
        for field in SupplierLicenseAgreement._meta.concrete_fields
        if field.name not in {"revoked_reason"}
    )
    ordering = ("-signed_at",)
    date_hierarchy = "signed_at"
    actions = (
        "revoke_selected_agreements",
        "delete_selected_agreements",
    )

    @admin.display(boolean=True, description="Agreement active")
    def agreement_active(self, obj):
        return obj.agreement_active

    @admin.display(description="Agreement type")
    def agreement_type(self, obj):
        return "Full CASCADE Access"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return True

    def save_model(self, request, obj, form, change):
        revoke_user_agreement_if_requested(
            obj,
            form.cleaned_data.get("agreement_active", False),
            getattr(request.user, "email", ""),
        )
        super().save_model(request, obj, form, change)

    @admin.action(description="Revoke selected user agreements")
    def revoke_selected_agreements(self, request, queryset):
        admin_email = getattr(request.user, "email", "")
        for agreement in queryset:
            revoke_user_agreement_if_requested(agreement, False, admin_email)
            agreement.save(update_fields=["revoked_at", "revoked_by_email"])

    @admin.action(description="Delete selected user agreements")
    def delete_selected_agreements(self, request, queryset):
        self.delete_queryset(request, queryset)

    def delete_model(self, request, obj):
        delete_user_agreement(obj, getattr(request.user, "email", ""))

    def delete_queryset(self, request, queryset):
        admin_email = getattr(request.user, "email", "")
        for agreement in list(queryset):
            delete_user_agreement(agreement, admin_email)


@admin.register(SupplierUserTrackSelection)
class SupplierUserTrackSelectionAdmin(admin.ModelAdmin):
    form = SupplierUserAccessStatusForm
    list_display = (
        "supplier",
        "user_email",
        "access_type",
        "access_active",
        "selected_at",
        "revoked_at",
        "revoked_by_email",
    )
    list_filter = (
        "track_selection",
        UserAccessActiveFilter,
        "selected_at",
    )
    search_fields = (
        "=supplier__id",
        "supplier__name",
        "user_email",
        "workos_user_id",
    )
    fields = (
        "access_active",
        "supplier",
        "user_email",
        "workos_user_id",
        "track_selection",
        "selected_at",
        "revoked_at",
        "revoked_by_email",
        "revoked_reason",
    )
    readonly_fields = (
        "supplier",
        "user_email",
        "workos_user_id",
        "track_selection",
        "selected_at",
        "revoked_at",
        "revoked_by_email",
    )
    ordering = ("-selected_at",)
    actions = ("reset_selected_access", "revoke_selected_access")

    @admin.display(description="Current access type")
    def access_type(self, obj):
        return obj.get_track_selection_display()

    @admin.display(boolean=True, description="Access active")
    def access_active(self, obj):
        return obj.access_active

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        apply_user_access_active_override(
            obj,
            form.cleaned_data.get("access_active", False),
            getattr(request.user, "email", ""),
        )
        super().save_model(request, obj, form, change)

    def _reset_queryset(self, request, queryset, reason):
        admin_email = getattr(request.user, "email", "")
        for selection in queryset:
            if apply_user_access_active_override(
                selection,
                False,
                admin_email,
                reason=reason,
            ):
                selection.save(
                    update_fields=[
                        "revoked_at",
                        "revoked_by_email",
                        "revoked_reason",
                    ]
                )

    @admin.action(description="Reset selected supplier access")
    def reset_selected_access(self, request, queryset):
        self._reset_queryset(
            request,
            queryset,
            "Supplier access reset by administrator",
        )

    @admin.action(description="Revoke selected supplier access")
    def revoke_selected_access(self, request, queryset):
        self._reset_queryset(
            request,
            queryset,
            "Supplier access revoked by administrator",
        )


@admin.register(WorkerFeedback)
class WorkerFeedbackAdmin(admin.ModelAdmin):
    list_display = ['id', 'supplier', 'contact_reason', 'interaction_date', 'case_status', 'workers_affected', 'created_at']
    list_filter = ['case_status', 'interaction_date', 'supplier', 'worker_voice_channel', 'contact_reason']
    search_fields = ['client_name', 'employee_id', 'phone_number', 'feedback_description']
    date_hierarchy = 'interaction_date'
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('supplier', 'hr_staff', 'contact_reason', 'interaction_date', 'case_status')
        }),
        ('Worker Details', {
            'fields': ('client_name', 'employee_id', 'phone_number', 'line_id', 'whatsapp', 'zalo', 
                      'nationality', 'gender', 'employee_department')
        }),
        ('Feedback Details', {
            'fields': ('worker_voice_channel', 'feedback_description', 'workers_affected', 
                      'workers_affected_description', 'summary')
        }),
        ('Case Management', {
            'fields': ('case_call_type', 'issue_categories', 'selected_kpis', 'kpi_categories',
                      'next_steps', 'next_steps_for_company_staff', 'additional_attachments', 'deadline')
        }),
        ('Status & Notes', {
            'fields': ('situation_improving', 'situation_improving_description', 
                      'urgent_needs_of_employee', 'final_remarks', 'safeguards_remarks')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Grievance)
class GrievanceAdmin(admin.ModelAdmin):
    list_display = ['id', 'worker_feedback', 'get_supplier', 'is_complete', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at', 'zero_tolerance', 'ethical_reviewed', 'need_help_with_complex_consequences']
    search_fields = ['worker_feedback__client_name', 'worker_feedback__employee_id', 'information_collection_notes']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']
    filter_horizontal = ('information_collection_attachments',)

    def get_supplier(self, obj):
        return obj.worker_feedback.supplier if obj.worker_feedback else None
    get_supplier.short_description = 'Supplier'
    get_supplier.admin_order_field = 'worker_feedback__supplier'
    
    fieldsets = (
        ('Worker Feedback Link', {
            'fields': ('worker_feedback',)
        }),
        ('Information Collection (Step 2)', {
            'fields': ('issara_context', 'check_with_hr', 'repeat_issue', 'information_collection_notes', 'information_collection_attachments')
        }),
        ('Safeguarding Workers (Step 3)', {
            'fields': ('zero_tolerance', 'reviewed_individual', 'involved_in_grievance', 'safeguarding_notes')
        }),
        ('Ethical Investigation (Step 4)', {
            'fields': ('ethical_reviewed', 'professional_ensured', 'impartial_ensured', 
                      'inclusive_and_accessible', 'timely_and_effective', 'ethical_investigation_notes')
        }),
        ('Worker Communication (Step 5)', {
            'fields': ('investigation_their_wellbeing', 'need_help_with_complex_consequences', 'communication_notes')
        }),
        ('Monitoring & Communication (Step 6)', {
            'fields': ('remediation', 'system_strengthening')
        }),
        ('Training Requirements (Step 7)', {
            'fields': ('trainings',)
        }),
        ('Legacy Fields', {
            'fields': ('received_the_training', 'has_trained_impartial'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


# Temporarily commented until table is created
@admin.register(TotalNumberOfWorkers)
class TotalNumberOfWorkersAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'supplier',
        'total_num_workers',
        'total_num_men_workers',
        'total_num_women_workers',
        'updated_at',
    ]
    list_filter = ['supplier', 'updated_at', 'created_at']
    search_fields = ['supplier__name']
    date_hierarchy = 'updated_at'
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Supplier Information', {
            'fields': ('supplier',)
        }),
        ('Total Counts', {
            'fields': ('total_num_workers', 'total_num_men_workers', 'total_num_women_workers')
        }),
        ('Workers by Nationality', {
            'fields': (
                'total_num_thai_workers',
                'total_num_thai_male_workers',
                'total_num_thai_female_workers',
                'total_num_cambodian_workers',
                'total_num_cambodian_male_workers',
                'total_num_cambodian_female_workers',
                'total_num_myanmar_workers',
                'total_num_myanmar_male_workers',
                'total_num_myanmar_female_workers',
                'total_num_lao_workers',
                'total_num_lao_male_workers',
                'total_num_lao_female_workers',
                'total_num_vietnamese_workers',
                'total_num_vietnamese_male_workers',
                'total_num_vietnamese_female_workers',
                'total_num_nepalese_workers',
                'total_num_nepalese_male_workers',
                'total_num_nepalese_female_workers',
                'total_num_bangladeshi_workers',
                'total_num_bangladeshi_male_workers',
                'total_num_bangladeshi_female_workers',
                'total_num_indonesian_workers',
                'total_num_indonesian_male_workers',
                'total_num_indonesian_female_workers',
                'total_num_malaysian_workers',
                'total_num_malaysian_male_workers',
                'total_num_malaysian_female_workers',
                'total_num_indian_workers',
                'total_num_indian_male_workers',
                'total_num_indian_female_workers',
                'total_num_pakistani_workers',
                'total_num_pakistani_male_workers',
                'total_num_pakistani_female_workers',
                'total_num_sri_lankan_workers',
                'total_num_sri_lankan_male_workers',
                'total_num_sri_lankan_female_workers',
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('supplier')
      
      
@admin.register(WorkerContactReason)
class WorkerContactReasonAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "sort_order", "is_active", "created_at", "updated_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "description"]
    ordering = ["sort_order", "name"]
