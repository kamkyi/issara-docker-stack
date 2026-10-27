from django.db.models import OuterRef, Subquery, Prefetch
from django.db.models.functions import Coalesce
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.views.decorators.vary import vary_on_headers
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.settings import api_settings

from authkit import WorkOSAuthKitAuthentication

from kpis.models import (
    Kpi,
    KpiGroupings,
    KpiGroupingTranslation,
    KpiTranslation,
)
from kpis.serializers import KpiSerializer


class KpiLegacyViewSet(viewsets.ModelViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (permissions.IsAuthenticated,)
    """
    API endpoint that allows KPIs to be viewed or edited.
    """
    queryset = Kpi.objects.all()
    default_serializer_class = KpiSerializer

    def get_serializer_class(self):
        return self.default_serializer_class

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["lang"] = self.request.query_params.get("lang", "en")
        return context

    def get_queryset(self):
        kpi_grouping_prefetch = Prefetch(
            "kpi_groupings",
            queryset=KpiGroupings.objects.prefetch_related(
                Prefetch(
                    "kpigroupingtranslation_set",
                    queryset=KpiGroupingTranslation.objects.select_related("language"),
                )
            ),
        )
        qs = self.queryset.prefetch_related(
            "kpitranslation_set",
            "kpi_category__kpicategorytranslation_set",
            "kpi_category",
            "eti_base_code",
            "kpi_legal_violation",
            "kpi_recommended_remediation",
            "kpi_systems_change",
            "ilo_indicators",
            "lksg_indicators",
            kpi_grouping_prefetch,
        )
        return qs

    # KPIs do not change often, 24 hrs is acceptable
    @method_decorator(cache_control(max_age=60 * 60 * 24, private=True))
    @method_decorator(vary_on_headers("Authorization"))
    def list(self, request, *args, **kwargs):
        lang = (request.query_params.get("lang") or "en").lower()
        kpi_grouping_prefetch = Prefetch(
            "kpi_groupings",
            queryset=KpiGroupings.objects.prefetch_related(
                Prefetch(
                    "kpigroupingtranslation_set",
                    queryset=KpiGroupingTranslation.objects.select_related("language"),
                )
            ),
        )
        if lang and lang != "en":
            translation_subquery = KpiTranslation.objects.filter(
                kpi__id=OuterRef("pk"), language__code=lang
            )

            translation_description = translation_subquery.values("description")[:1]
            translation_goal = translation_subquery.values("goal")[:1]

            queryset = Kpi.objects.annotate(
                translated_description=Coalesce(
                    Subquery(translation_description), "description"
                ),
                translated_goal=Coalesce(Subquery(translation_goal), "goal"),
            ).prefetch_related(
                "kpi_category",
                "kpi_category__kpicategorytranslation_set",
                "kpitranslation_set",
                "eti_base_code",
                "kpi_legal_violation",
                "kpi_recommended_remediation",
                "kpi_systems_change",
                "ilo_indicators",
                "lksg_indicators",
                kpi_grouping_prefetch,
            )
        else:
            queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        # Build grouping names per KPI with language-aware fallback (current lang -> en -> base name)
        grouping_map = {}
        for kpi in queryset:
            names = []
            kpi_groupings = getattr(kpi, "kpi_groupings", None)
            for grouping in (kpi_groupings.all() if kpi_groupings is not None else []):
                translations = grouping.kpigroupingtranslation_set.all()
                translated_names = {
                    t.language.code: t.name for t in translations if t.language
                }
                chosen = translated_names.get(lang) or translated_names.get("en")
                names.append(chosen or grouping.name)
            grouping_map[kpi.id] = names

        for item in data:
            item["kpi_groupings"] = grouping_map.get(item["id"], [])

        return Response(data)
