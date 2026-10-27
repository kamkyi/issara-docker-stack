from issara.ilm_server_2.serializers import EtiBaseCodeSerializer
from kpis.models import ILOIndicator, Kpi, LKSGIndicator
from rest_framework import serializers

from .ILOIndicatorSerializer import ILOIndicatorSerializer
from .KpiLegalViolationSerializer import KpiLegalViolationSerializer
from .KpiRecommendedRemediationSerializer import KpiRecommendedRemediationSerializer
from .KpiSystemsChangeSerializer import KpiSystemsChangeSerializer
from .LKSGIndicatorSerializer import LKSGIndicatorSerializer


class KpiSerializer(serializers.ModelSerializer):
    eti_base_code = EtiBaseCodeSerializer(many=False, read_only=True)
    kpi_legal_violation = KpiLegalViolationSerializer(many=False, read_only=True)
    kpi_recommended_remmediation = KpiRecommendedRemediationSerializer(
        many=False, read_only=True
    )
    kpi_systems_change = KpiSystemsChangeSerializer(many=False, read_only=True)
    ilo_indicators = ILOIndicatorSerializer(many=True, read_only=True)
    lksg_indicators = LKSGIndicatorSerializer(many=True, read_only=True)
    ilo_indicator_ids = serializers.PrimaryKeyRelatedField(
        source="ilo_indicators",
        many=True,
        queryset=ILOIndicator.objects.all(),
        required=False,
        write_only=True,
    )
    lksg_indicator_ids = serializers.PrimaryKeyRelatedField(
        source="lksg_indicators",
        many=True,
        queryset=LKSGIndicator.objects.all(),
        required=False,
        write_only=True,
    )
    kpi_category = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    goal = serializers.SerializerMethodField()

    def _get_translation_by_lang(self, translations, lang_code):
        """
        Safely find a translation object matching lang_code without raising
        if the related Language row is missing.
        """
        for t in translations.all():
            try:
                if getattr(t.language, "code", None) == lang_code:
                    return t
            except Exception:
                # Skip broken FK rows
                continue
        return None

    def get_kpi_category(self, obj):
        lang_code = self.context.get("lang", "en")
        kpi_category = obj.kpi_category

        if kpi_category:
            # Use prefetched translations to avoid N+1 queries
            translations = getattr(
                kpi_category, "kpicategorytranslation_set", None
            ) or []
            translation = self._get_translation_by_lang(translations, lang_code)

            return {
                "id": kpi_category.id,
                "name": translation.name if translation else kpi_category.name,
            }
        return None

    def get_description(self, obj):
        lang_code = self.context.get("lang", "en")
        translations = getattr(obj, "kpitranslation_set", None) or []
        translation = self._get_translation_by_lang(translations, lang_code)

        return translation.description if translation else obj.description

    def get_goal(self, obj):
        lang_code = self.context.get("lang", "en")
        translations = getattr(obj, "kpitranslation_set", None) or []
        translation = self._get_translation_by_lang(translations, lang_code)

        return translation.goal if translation else obj.goal

    class Meta:
        model = Kpi
        fields = [
            "id",
            "kpi_category",
            "description",
            "level",
            "goal",
            "ilo_indicators",
            "lksg_indicators",
            "ilo_indicator_ids",
            "lksg_indicator_ids",
            "eti_base_code",
            "kpi_legal_violation",
            "kpi_recommended_remmediation",
            "kpi_systems_change",
        ]
