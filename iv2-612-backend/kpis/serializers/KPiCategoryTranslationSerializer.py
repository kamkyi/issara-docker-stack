from rest_framework import serializers
from kpis.models import KpiCategoryTranslation


class KPiCategoryTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="translated_name", read_only=True)
    issue_category = serializers.IntegerField(
        source="kpi_category.issue_category.id", read_only=True
    )

    class Meta:
        model = KpiCategoryTranslation
        fields = ["id", "name", "issue_category"]
