from rest_framework import serializers
from issara.ilm_server_2.models import (
    Supplier,
    SupplierActivitySummary,
    FieldworkActivity,
)
from issara.ilm_server_2.choices import SUPPLIER_ACTIVITY_CHOICES


class SupplierListDropDownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
        ]


_VALID_ACTIVITY_CHOICES = {choice[0] for choice in SUPPLIER_ACTIVITY_CHOICES}
_ACTIVITY_CHAR_FIELDS = [
    "ethical_grievance_worker_voice_policy",
    "worker_voice_grievance_systems_procedures",
    "worker_voice_grievance_communication",
    "grievance_mechanisms_capacity_building",
    "education_empowerment",
    "ethical_recruitment_policy",
    "ethical_recruitment_system_procedures",
    "recruitment_agency_policy_disclosure",
    "recruitment_policy_communication",
    "candidate_worker_recruitment_communication",
    "ern_collaboration",
    "golden_dreams",
    "ethical_sourcing_policy_roadmap",
    "strengthening_worker_voice_communications",
    "ongoing_worker_voice_remediation",
    "targeted_responsive_systems_strengthening",
]
_ACTIVITY_NON_NEGATIVE_INT_FIELDS = [
    "reimbursement",
    "reimbursement_agreed_in_process",
    "reimbursement_not_agreed",
    "eligible_workers_not_reimbursed_count",
    "eligible_workers_reimbursed_count",
]


class SupplierActivitySummarySerializer(serializers.ModelSerializer):
    supplier = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = SupplierActivitySummary
        fields = "__all__"

    def validate(self, attrs):
        """Strip whitespace from activity CharField values and normalise to 'not yet' if invalid."""
        for field in _ACTIVITY_CHAR_FIELDS:
            if field in attrs and isinstance(attrs[field], str):
                cleaned = attrs[field].strip()
                attrs[field] = (
                    cleaned if cleaned in _VALID_ACTIVITY_CHOICES else "not yet"
                )
        for field in _ACTIVITY_NON_NEGATIVE_INT_FIELDS:
            if field in attrs and attrs[field] is not None:
                try:
                    attrs[field] = max(int(attrs[field]), 0)
                except (TypeError, ValueError):
                    raise serializers.ValidationError(
                        {field: "A non-negative integer is required."}
                    )
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for field in _ACTIVITY_NON_NEGATIVE_INT_FIELDS:
            value = data.get(field)
            try:
                data[field] = max(int(value), 0)
            except (TypeError, ValueError):
                data[field] = 0
        return data


class SupplierFieldWorkTrainingSerializer(serializers.ModelSerializer):
    name = serializers.CharField()

    class Meta:
        model = FieldworkActivity
        fields = ["id", "fieldwork_date", "name", "training_name"]
