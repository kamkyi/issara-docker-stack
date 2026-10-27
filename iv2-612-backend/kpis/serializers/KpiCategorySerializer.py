from kpis.models import KpiCategory
from rest_framework import serializers


class KpiCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiCategory
        fields = ["id", "name", "issue_category"]
