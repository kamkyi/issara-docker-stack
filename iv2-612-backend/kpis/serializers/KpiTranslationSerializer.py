from issara.ilm_server_2.serializers import EtiBaseCodeSerializer
from kpis.models import Kpi
from rest_framework import serializers

from .KpiCategorySerializer import KpiCategorySerializer
from .KpiLegalViolationSerializer import KpiLegalViolationSerializer
from .KpiRecommendedRemediationSerializer import KpiRecommendedRemediationSerializer
from .KpiSystemsChangeSerializer import KpiSystemsChangeSerializer


class KpiTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    description = serializers.CharField(source="translated_description", read_only=True)
    goal = serializers.CharField(source="translated_goal", read_only=True)
    kpi_category = KpiCategorySerializer(many=False, read_only=True)
    eti_base_code = EtiBaseCodeSerializer(read_only=True)
    kpi_legal_violation = KpiLegalViolationSerializer(read_only=True)
    kpi_recommended_remmediation = KpiRecommendedRemediationSerializer(read_only=True)
    kpi_systems_change = KpiSystemsChangeSerializer(read_only=True)

    class Meta:
        model = Kpi
        fields = [
            "id",
            "description",
            "kpi_category",
            "level",
            "goal",
            "eti_base_code",
            "kpi_legal_violation",
            "kpi_recommended_remmediation",
            "kpi_systems_change",
        ]
