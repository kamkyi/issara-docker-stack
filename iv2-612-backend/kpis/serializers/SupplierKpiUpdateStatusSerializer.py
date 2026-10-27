from rest_framework import serializers
from kpis.models import SupplierKpiUpdateStatus


class SupplierKpiUpdateStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierKpiUpdateStatus
        fields = ["id", "name"]
