from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.settings import api_settings
from django.db.models import Prefetch
from authkit import WorkOSAuthKitAuthentication


class KPIListBySupplierCategoryAPIView(APIView):
    """
    Returns a list of KPIs for a given supplier and KPI category, with descriptions.
    Query params: supplier_id, kpi_category_id
    """

    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        from kpis.serializers.KpiSerializer import KpiSerializer
        from issara.ilm_server_2.models import Case
        from kpis.models import Kpi, KpiGroupings, KpiGroupingTranslation, SupplierKpi

        supplier_id = request.query_params.get("supplier_id")
        kpi_category_id = request.query_params.get("kpi_category_id")
        lang_code = (request.query_params.get("lang") or "en").lower()
        if not supplier_id:
            return Response(
                {"detail": "supplier_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cases = (
            Case.objects.filter(supplier_id=supplier_id)
            .select_related("case_status", "interaction_channel")
            .prefetch_related("kpis")
        )
        case_ids = cases.values_list("id", flat=True)
        kpi_filter = {"case__id__in": case_ids}
        if kpi_category_id:
            kpi_filter["kpi_category_id"] = kpi_category_id
        kpi_grouping_prefetch = Prefetch(
            "kpi_groupings",
            queryset=KpiGroupings.objects.prefetch_related(
                Prefetch(
                    "kpigroupingtranslation_set",
                    queryset=KpiGroupingTranslation.objects.select_related("language"),
                )
            ),
        )
        kpis = (
            Kpi.objects.filter(**kpi_filter)
            .distinct()
            .prefetch_related(
                "ilo_indicators", "lksg_indicators", kpi_grouping_prefetch
            )
        )

        kpi_case_map = {}
        for case in cases:
            remediation_quality = None
            if case.case_status and case.case_status.name.lower() == "closed":
                rating = getattr(case, "rating_dest_employer", None)
                if rating == 1:
                    remediation_quality = "poor"
                elif rating == 2:
                    remediation_quality = "fair"
                elif rating == 3:
                    remediation_quality = "good"
                elif rating == 4:
                    remediation_quality = "very_good"
                elif rating == 5:
                    remediation_quality = "excellent"
            received_via = (
                case.interaction_channel.name if case.interaction_channel else None
            )
            for kpi in case.kpis.all():
                if kpi.id not in kpi_case_map:
                    kpi_case_map[kpi.id] = []
                kpi_case_map[kpi.id].append(
                    {
                        "case_id": case.id,
                        "opened_at": case.created,
                        "closed_at": (
                            case.last_modified
                            if case.case_status
                            and case.case_status.name.lower() == "closed"
                            else None
                        ),
                        "status": case.case_status.id if case.case_status else None,
                        "status_name": (
                            case.case_status.name if case.case_status else None
                        ),
                        "remediation_quality": remediation_quality,
                        "received_via": received_via,
                    }
                )

        serializer = KpiSerializer(
            kpis, many=True, context={"lang": request.query_params.get("lang", "en")}
        )
        data = serializer.data

        grouping_map = {}
        for kpi in kpis:
            names = []
            groupings = getattr(kpi, "kpi_groupings", None)
            if hasattr(groupings, "all"):
                groupings = groupings.all()
            elif groupings is None:
                groupings = []
            for grouping in groupings:
                translations = getattr(grouping, "kpigroupingtranslation_set", None)
                if hasattr(translations, "all"):
                    translations = translations.all()
                elif translations is None:
                    translations = []
                trans_by_lang = {
                    t.language.code: t.name for t in translations if t.language
                }
                chosen = trans_by_lang.get(lang_code) or trans_by_lang.get("en")
                names.append(chosen or grouping.name)
            grouping_map[kpi.id] = names

        supplier_kpis = SupplierKpi.objects.filter(
            supplier_id=supplier_id, kpi_id__in=[k.id for k in kpis]
        )
        supplier_kpi_map = {sk.kpi_id: sk for sk in supplier_kpis}
        for item in data:
            item["cases"] = kpi_case_map.get(item["id"], [])
            item["kpi_groupings"] = grouping_map.get(item["id"], [])
            sk = supplier_kpi_map.get(item["id"])
            if sk:
                item["close_quality"] = sk.closed_quality
                item["close_notes"] = sk.closed_notes
                item["remediation_progress"] = sk.remediation_progress
                item["remediation_aligned"] = sk.remediation_aligned
                item["remediation_issara_recommendation"] = (
                    sk.remediation_issara_recommendation
                )
                item["remediation_business_steps_taken"] = (
                    sk.remediation_business_steps_taken
                )
                item["remediation_business_steps_remaining"] = (
                    sk.remediation_business_steps_remaining
                )
                item["remediation_payment_deadline"] = sk.remediation_payment_deadline
                item["remediation_owed_baht"] = sk.remediation_owed_baht
                item["remediation_owed_kyat"] = sk.remediation_owed_kyat
                item["remediation_owed_ringitt"] = sk.remediation_owed_ringitt
                item["remediation_owed_usd"] = sk.remediation_owed_usd
                item["remediation_paid_baht"] = sk.remediation_paid_baht
                item["remediation_paid_kyat"] = sk.remediation_paid_kyat
                item["remediation_paid_ringitt"] = sk.remediation_paid_ringitt
                item["remediation_paid_usd"] = sk.remediation_paid_usd
                item["remediation_workers_paid"] = sk.remediation_workers_paid
                item["remediation_documents_owed"] = sk.remediation_documents_owed
                item["remediation_documents_provided"] = (
                    sk.remediation_documents_provided
                )
                item["remediation_documents_deadline"] = (
                    sk.remediation_documents_deadline
                )
                item["remediation_notes"] = sk.remediation_notes
                item["remediation_action"] = sk.remediation_action
                item["remediation_validation"] = sk.remediation_validation
                item["remediation_results"] = sk.remediation_results
                item["remediation_sp_recommendation"] = sk.remediation_sp_recommendation
                item["systems_change_issara_recommendation"] = (
                    sk.systems_change_issara_recommendation
                )
                item["systems_change_progress"] = sk.systems_change_progress
                item["systems_change_aligned"] = sk.systems_change_aligned
                item["systems_change_business_steps_taken"] = (
                    sk.systems_change_business_steps_taken
                )
                item["systems_change_business_steps_remaining"] = (
                    sk.systems_change_business_steps_remaining
                )
                item["systems_change_deadline"] = sk.systems_change_deadline
                item["opened_at"] = sk.opened_at
                item["closed_at"] = sk.closed_at
        return Response(data, status=200)
