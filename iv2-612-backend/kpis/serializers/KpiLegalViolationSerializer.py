from kpis.models import KpiLegalViolation
from rest_framework import serializers


class KpiLegalViolationSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiLegalViolation
        fields = ["id", "name", "description", "law", "article", "country"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get("country_name"):
            data["country"] = instance.country.name if instance.country else None
        return data
