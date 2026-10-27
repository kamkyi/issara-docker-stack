from kpis.models import SupplierKpiUpdate
from rest_framework import serializers


class SupplierKpiUpdateDefaultSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierKpiUpdate
        fields = "__all__"
