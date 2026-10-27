from kpis.models import LKSGIndicator
from rest_framework import serializers


class LKSGIndicatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = LKSGIndicator
        fields = ["id", "name", "description"]
