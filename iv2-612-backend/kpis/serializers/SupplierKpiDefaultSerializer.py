from datetime import datetime

from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import F, Max
from kpis.models import SupplierKpi
from rest_framework import serializers


class SupplierKpiDefaultSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierKpi
        fields = "__all__"
