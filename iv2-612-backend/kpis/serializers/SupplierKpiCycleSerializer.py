from rest_framework import serializers

from .SupplierKpiUpdateReadOnlySerializer import SupplierKpiUpdateReadOnlySerializer


class SupplierKpiCycleSerializer(SupplierKpiUpdateReadOnlySerializer):
    cycle_opened_at = serializers.DateField(source="opened_at", read_only=True)
    cycle_latest_update_id = serializers.IntegerField(read_only=True)
    cycle_update_count = serializers.IntegerField(read_only=True)

    class Meta(SupplierKpiUpdateReadOnlySerializer.Meta):
        fields = "__all__"
