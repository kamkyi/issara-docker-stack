from kpis.models import SupplierKpiUpdate
from rest_framework import serializers


class SupplierKpiUpdateLegacySerializer(serializers.ModelSerializer):
    supplier = serializers.IntegerField(
        source="supplier_kpi.supplier.id", read_only=True
    )
    supplier_name = serializers.CharField(
        source="supplier_kpi.supplier.name", read_only=True
    )
    category_id = serializers.IntegerField(
        source="supplier_kpi.kpi.kpi_category.id", read_only=True
    )
    description = serializers.SerializerMethodField()
    level = serializers.IntegerField(source="supplier_kpi.kpi.level", read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)

    calls = serializers.SerializerMethodField(read_only=True)

    category = serializers.SerializerMethodField()

    def get_description(self, obj):
        lang_code = self.context.get("lang", "en")
        kpi = obj.supplier_kpi.kpi

        translation = kpi.kpitranslation_set.filter(language__code=lang_code).first()

        return translation.description if translation else kpi.description

    def get_category(self, obj):
        lang_code = self.context.get("lang", "en")
        kpi_category = obj.supplier_kpi.kpi.kpi_category

        translation = kpi_category.kpicategorytranslation_set.filter(
            language__code=lang_code
        ).first()

        return translation.name if translation else kpi_category.name

    def get_calls(self, obj):
        calls_list = []
        if hasattr(obj, "calls"):
            if obj.calls:
                calls_list = [int(call_id) for call_id in obj.calls.split(",")]
        else:
            calls = (
                obj.case_set.all()
                .filter(
                    case_created_by__organization_user__organization=self.context[
                        "request"
                    ].organization_user.organization_id
                )[0]
                .id
            )
            calls_list.append(calls)
        return calls_list

    def to_representation(self, instance):
        _data = super().to_representation(instance)
        _data["assigned_to"] = (
            instance.assigned_to if hasattr(instance, "assigned_to_id") else ""
        )
        assigned_to_id = _data.get("assigned_to", None)
        if assigned_to_id is not None:
            _data["assigned_to"] = {
                "id": assigned_to_id.id,
                "username": assigned_to_id.username,
            }

        return _data

    class Meta:
        model = SupplierKpiUpdate
        fields = "__all__"
