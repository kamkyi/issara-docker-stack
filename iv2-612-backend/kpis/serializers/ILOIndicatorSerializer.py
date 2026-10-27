from kpis.models import ILOIndicator
from rest_framework import serializers


class ILOIndicatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ILOIndicator
        fields = ["id", "name", "description"]
