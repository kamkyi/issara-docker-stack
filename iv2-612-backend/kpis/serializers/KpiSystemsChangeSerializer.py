from kpis.models import KpiSystemsChange
from rest_framework import serializers


class KpiSystemsChangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiSystemsChange
        fields = ["id", "name", "description"]
