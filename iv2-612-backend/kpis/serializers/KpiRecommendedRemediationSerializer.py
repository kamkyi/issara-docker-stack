from kpis.models import KpiRecommendedRemediation
from rest_framework import serializers


class KpiRecommendedRemediationSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiRecommendedRemediation
        fields = ["id", "name", "description"]
