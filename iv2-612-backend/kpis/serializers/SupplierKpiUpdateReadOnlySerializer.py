from issara.ilm_server_2.serializers import UserBasicSerializer
from kpis.models import SupplierKpiUpdate
from rest_framework import serializers


class SupplierKpiUpdateReadOnlySerializer(serializers.ModelSerializer):
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
    category = serializers.SerializerMethodField()
    level = serializers.IntegerField(source="supplier_kpi.kpi.level", read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)
    assigned_to = UserBasicSerializer()
    bhr_focal = serializers.SerializerMethodField()

    class Meta:
        model = SupplierKpiUpdate
        fields = "__all__"

    def get_category(self, obj):
        filtered_translations = getattr(
            obj.supplier_kpi.kpi.kpi_category, "filtered_category_translations", []
        )

        if filtered_translations:
            return filtered_translations[
                0
            ].name  # Assume only one translation per language
        return obj.supplier_kpi.kpi.kpi_category.name

    def get_description(self, obj):
        filtered_translations = getattr(
            obj.supplier_kpi.kpi, "filtered_kpi_translations", []
        )

        if filtered_translations:
            return filtered_translations[
                0
            ].description  # Assume only one translation per language
        return obj.supplier_kpi.kpi.description

    def get_bhr_focal(self, obj):
        """Get BHR focal persons for this KPI update"""
        try:
            # Check if the field exists and is accessible
            if hasattr(obj, 'bhr_focal'):
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
