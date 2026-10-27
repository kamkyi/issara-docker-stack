from django.db.models import F, Subquery, Value
from issara.ilm_server_2.serializers import UserBasicSerializer
from issara.ilm_server_2.models import Case
from kpis.models import Kpi, SupplierKpi
from rest_framework import serializers


class SupplierKpiReadOnlySerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name")
    category = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    level = serializers.IntegerField(source="kpi.level")
    status_name = serializers.CharField(source="status.name", default="N/A")
    remediation = serializers.CharField(
        source="kpi.kpi_recommended_remediation.name", default=None
    )
    systems_change = serializers.CharField(
        source="kpi.kpi_systems_change.name", default=None
    )
    law = serializers.CharField(source="kpi.kpi_legal_violation.name", default=None)
    country = serializers.SerializerMethodField()
    days_open = serializers.SerializerMethodField()
    assigned_to = UserBasicSerializer()
    assigned_users = UserBasicSerializer(many=True)
    bhr_focal = serializers.SerializerMethodField()
    active_calls = serializers.SerializerMethodField()
    updates = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    supply_chains = serializers.SerializerMethodField()
    supplier_users = serializers.SerializerMethodField()

    class Meta:
        model = SupplierKpi
        fields = "__all__"

    def get_days_open(self, obj):
        return obj.days_open

    def get_country(self, obj):
        if not hasattr(obj, "supplier") or not obj.supplier:
            return []

        if not hasattr(obj.supplier, "prefetched_cases"):
            return []

        countries = [
            case.country.name for case in obj.supplier.prefetched_cases if case.country
        ]

        return ",".join(set(countries))

    def get_category(self, obj):
        filtered_translations = getattr(
            obj.kpi.kpi_category, "filtered_category_translations", []
        )

        if filtered_translations:
            return filtered_translations[
                0
            ].name  # Assume only one translation per language
        return obj.kpi.kpi_category.name

    def get_description(self, obj):
        filtered_translations = getattr(obj.kpi, "filtered_kpi_translations", [])

        if filtered_translations:
            return filtered_translations[
                0
            ].description  # Assume only one translation per language
        return obj.kpi.description

    def get_supply_chains(self, obj):
        """Get all supply chains for this supplier"""
        if not hasattr(obj, "supplier") or not obj.supplier:
            return []

        if not hasattr(obj.supplier, "prefetched_supply_chains"):
            return []

        supply_chains = []
        for supplier_supply_chain in obj.supplier.prefetched_supply_chains:
            supply_chains.append(
                {
                    "id": supplier_supply_chain.supply_chain.id,
                    "name": supplier_supply_chain.supply_chain.name,
                    "status": supplier_supply_chain.status,
                }
            )

        return supply_chains

    def get_active_calls(self, obj):
        """Return KPI-related WV calls bounded by the KPI's own `opened_at`."""
        # If the viewset has already prefetched active calls for this object,
        # use them to avoid additional DB queries.
        if hasattr(obj, "prefetched_active_calls"):
            return obj.prefetched_active_calls

        try:
            kpi_level_subquery = Kpi.objects.filter(id=obj.kpi_id).values("level")[:1]

            calls_qs = (
                Case.objects.filter(kpis__id=obj.kpi_id, supplier_id=obj.supplier_id)
                .select_related(
                    "interaction_issara_staff",
                    "next_steps_issara_staff",
                    "source_recruiter",
                    "destination_recruiter",
                )
                .annotate(
                    issara_user=F("interaction_issara_staff__email"),
                    next_steps_issara_user=F("next_steps_issara_staff__email"),
                    kpi_level=Subquery(kpi_level_subquery),
                    source_recruiter_name=F("source_recruiter__name"),
                    destination_recruiter_name=F("destination_recruiter__name"),
                    supplier_kpi_id=Value(obj.id),
                )
                .values(
                    "id",
                    "created",
                    "interacted",
                    "last_modified",
                    "client_nickname",
                    "client_phonenumber",
                    "description",
                    "interaction_summary",
                    "referral_notes",
                    "next_steps",
                    "issara_user",
                    "next_steps_issara_user",
                    "kpi_level",
                    "source_recruiter_name",
                    "destination_recruiter_name",
                    "supplier_kpi_id",
                )
                .distinct()
            )

            if obj.opened_at:
                calls_qs = calls_qs.filter(created__gte=obj.opened_at)

            return list(calls_qs)
        except Exception:
            return []

    def get_supplier_users(self, obj):
        """Get all active users for this supplier"""
        if not hasattr(obj, "supplier") or not obj.supplier:
            return []

        if not hasattr(obj.supplier, "prefetched_supplier_users"):
            return []

        supplier_users = []
        for supplier_user in obj.supplier.prefetched_supplier_users:
            group_names = [group.name for group in supplier_user.user.groups.all()]
            supplier_users.append(
                {
                    "email": supplier_user.user.email,
                    "groups": list(set(group_names)),
                    "is_active": supplier_user.user.is_active,
                }
            )

        return supplier_users

    def get_bhr_focal(self, obj):
        """Get BHR focal persons for this KPI"""
        try:
            # Check if the field exists and is accessible
            if hasattr(obj, "bhr_focal"):
                bhr_focal_users = obj.bhr_focal.all()
                return [
                    {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                    }
                    for user in bhr_focal_users
                ]
        except Exception:
            # Return empty list if tables don't exist yet
            pass
        return []
