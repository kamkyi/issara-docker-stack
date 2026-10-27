from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny


class SupplierFullDetailAPIView(APIView):
    """
    Returns a full supplier detail payload including reports, industries,
    subindustries, supply_chains, recruiters and worker count metadata.

    Query params: supplier_id (required)
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from issara.ilm_server_2.models import (
            Supplier,
            SupplierSupplyChain,
            SupplierRecruiters,
        )

        supplier_id = request.query_params.get("supplier_id")
        if not supplier_id:
            return Response(
                {"detail": "supplier_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            supplier = (
                Supplier.objects.select_related(
                    "country", "province", "district", "vessel_type"
                )
                .prefetch_related(
                    "reports",
                    "industries",
                    "subindustries",
                    "additional_contacts",
                )
                .get(pk=supplier_id)
            )
        except Supplier.DoesNotExist:
            return Response(
                {"detail": "Supplier not found."}, status=status.HTTP_404_NOT_FOUND
            )

        reports = []
        for r in supplier.reports.all():
            try:
                file_url = r.file_path.url if r.file_path else ""
            except Exception:
                file_url = str(r.file_path) if r.file_path else ""
            reports.append(
                {
                    "id": getattr(r, "id", None),
                    "name": getattr(r, "name", None),
                    "sort_number": getattr(r, "sort_number", None),
                    "description": getattr(r, "description", None) or "",
                    "type": getattr(r, "type", None),
                    "file_path": file_url,
                    "permission": getattr(r, "permission", None),
                    "size": getattr(r, "size", ""),
                    "created_at": (
                        getattr(r, "created_at", None).isoformat()
                        if getattr(r, "created_at", None)
                        else None
                    ),
                }
            )

        industries = [i.id for i in supplier.industries.all()]
        subindustries = [s.id for s in supplier.subindustries.all()]

        supply_chains = []
        sc_qs = SupplierSupplyChain.objects.filter(supplier=supplier).select_related(
            "supply_chain"
        )
        for sc in sc_qs:
            supply_chains.append(
                {
                    "id": getattr(sc, "id", None),
                    "supply_chain_name": (
                        getattr(sc.supply_chain, "name", None)
                        if getattr(sc, "supply_chain", None)
                        else None
                    ),
                    "status": getattr(sc, "status", None),
                }
            )

        recruiters = []
        for sr in SupplierRecruiters.objects.filter(supplier=supplier).select_related(
            "recruiter"
        ):
            recruiters.append(
                {
                    "recruiter": getattr(sr.recruiter, "id", None),
                    "recruiter_name": getattr(sr.recruiter, "name", None),
                    "status": getattr(sr, "status", None),
                }
            )

        additional_contacts = []
        for c in supplier.additional_contacts.all():
            additional_contacts.append(
                {
                    "id": getattr(c, "id", None),
                    "name": getattr(c, "name", None),
                    "email": getattr(c, "email", None),
                    "phone": getattr(c, "phone", None),
                }
            )

        payload = {
            "id": supplier.id,
            "reports": reports,
            "name": supplier.name,
            "created": supplier.created.isoformat() if supplier.created else None,
            "anonymous": bool(supplier.anonymous),
            "is_worker_voice_rolled_out": bool(supplier.is_worker_voice_rolled_out),
            "tier_id": supplier.tier_id,
            "address": supplier.address,
            "zipcode": supplier.zipcode,
            "gps": supplier.gps,
            "vessel_number": supplier.vessel_number,
            "fishing_gear_liscense_number": supplier.fishing_gear_liscense_number,
            "contact_name": supplier.contact_name,
            "contact_phone": supplier.contact_phone,
            "contact_email": supplier.contact_email,
            "name_harvesting_business": supplier.name_harvesting_business,
            "num_vessels_sourced_from": supplier.num_vessels_sourced_from,
        }
        
        # Fetch worker counts separately from TotalNumberOfWorkers table
        from supplier.models import TotalNumberOfWorkers
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=supplier.id).first()
        
        worker_count_fields = [
            "total_num_workers",
            "total_num_men_workers",
            "total_num_women_workers",
            "total_num_thai_workers",
            "total_num_thai_male_workers",
            "total_num_thai_female_workers",
            "total_num_cambodian_workers",
            "total_num_cambodian_male_workers",
            "total_num_cambodian_female_workers",
            "total_num_myanmar_workers",
            "total_num_myanmar_male_workers",
            "total_num_myanmar_female_workers",
            "total_num_lao_workers",
            "total_num_lao_male_workers",
            "total_num_lao_female_workers",
            "total_num_vietnamese_workers",
            "total_num_vietnamese_male_workers",
            "total_num_vietnamese_female_workers",
            "total_num_nepalese_workers",
            "total_num_nepalese_male_workers",
            "total_num_nepalese_female_workers",
            "total_num_bangladeshi_workers",
            "total_num_bangladeshi_male_workers",
            "total_num_bangladeshi_female_workers",
            "total_num_indonesian_workers",
            "total_num_indonesian_male_workers",
            "total_num_indonesian_female_workers",
            "total_num_malaysian_workers",
            "total_num_malaysian_male_workers",
            "total_num_malaysian_female_workers",
            "total_num_indian_workers",
            "total_num_indian_male_workers",
            "total_num_indian_female_workers",
            "total_num_pakistani_workers",
            "total_num_pakistani_male_workers",
            "total_num_pakistani_female_workers",
            "total_num_sri_lankan_workers",
            "total_num_sri_lankan_male_workers",
            "total_num_sri_lankan_female_workers",
        ]

        for field_name in worker_count_fields:
            payload[field_name] = (
                getattr(worker_counts, field_name, 0) if worker_counts else 0
            )
        
        payload["num_of_workers_access_to_issara_wv_channels"] = supplier.num_of_workers_access_to_issara_wv_channels
        payload["date_of_most_recent_recruitment_survey"] = (
            supplier.date_of_most_recent_recruitment_survey.isoformat()
            if supplier.date_of_most_recent_recruitment_survey
            else None
        )
        payload["date_of_most_recent_worker_satisfaction_survey"] = (
            supplier.date_of_most_recent_worker_satisfaction_survey.isoformat()
            if supplier.date_of_most_recent_worker_satisfaction_survey
            else None
        )
        payload["num_workers_reimbursed_recruitment_fees"] = supplier.num_workers_reimbursed_recruitment_fees
        payload["remain_num_workers_owed_recruitment_fee_reimbursement"] = supplier.remain_num_workers_owed_recruitment_fee_reimbursement
        payload["total_amt_recruitment_fee_reimbursed_to_workers"] = (
            str(supplier.total_amt_recruitment_fee_reimbursed_to_workers)
            if supplier.total_amt_recruitment_fee_reimbursed_to_workers is not None
            else None
        )
        payload["remain_amt_owed_recruitment_fee_reimbursement_to_workers"] = (
            str(supplier.remain_amt_owed_recruitment_fee_reimbursement_to_workers)
            if supplier.remain_amt_owed_recruitment_fee_reimbursement_to_workers is not None
            else None
        )
        payload["hiring_practice"] = supplier.hiring_practice
        payload["other"] = supplier.other
        payload["vessel_type"] = supplier.vessel_type.id if supplier.vessel_type else None
        payload["industries"] = industries
        payload["subindustries"] = subindustries
        payload["country"] = supplier.country.id if supplier.country else None
        payload["province"] = supplier.province.id if supplier.province else None
        payload["district"] = supplier.district.id if supplier.district else None
        payload["golden_dreams_employer_id"] = supplier.golden_dreams_employer_id
        payload["website"] = supplier.website
        payload["description"] = supplier.description
        payload["lng"] = supplier.lng
        payload["lat"] = supplier.lat
        payload["additional_contacts"] = additional_contacts
        payload["worker_voice"] = (
            bool(supplier.worker_voice)
            if supplier.worker_voice is not None
            else False
        )
        payload["worker_voice_status"] = supplier.worker_voice_status
        payload["recruiter"] = recruiters
        payload["supply_chains"] = supply_chains
        
        # Add worker_counts timestamps if available
        if worker_counts:
            payload["worker_counts_updated_at"] = (
                worker_counts.updated_at.isoformat()
                if worker_counts.updated_at
                else None
            )
            payload["worker_counts_created_at"] = (
                worker_counts.created_at.isoformat()
                if worker_counts.created_at
                else None
            )
        else:
            payload["worker_counts_updated_at"] = None
            payload["worker_counts_created_at"] = None

        return Response(payload, status=status.HTTP_200_OK)
