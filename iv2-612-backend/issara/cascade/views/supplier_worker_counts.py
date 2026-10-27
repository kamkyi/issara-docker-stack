from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny


class SupplierWorkerCountsAPIView(APIView):
    """Returns worker count fields for a supplier or all suppliers.

    Query params:
      - supplier_id (optional): if provided, return single supplier object
    Response: if supplier_id provided -> {supplier_id, ...fields}
              else -> {"results": [{supplier_id, ...}, ...]}
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from issara.ilm_server_2.models import Supplier
        from supplier.models import TotalNumberOfWorkers

        supplier_id = request.query_params.get("supplier_id")

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

        def serialize(supplier, worker_counts):
            out = {
                "supplier_id": supplier.pk,
                "id": supplier.pk,
            }
            
            if worker_counts:
                for fname in worker_count_fields:
                    out[fname] = getattr(worker_counts, fname, 0)
                out["worker_counts_created_at"] = worker_counts.created_at.isoformat() if worker_counts.created_at else None
                out["worker_counts_updated_at"] = worker_counts.updated_at.isoformat() if worker_counts.updated_at else None
            else:
                # No worker counts yet - return zeros
                for fname in worker_count_fields:
                    out[fname] = 0
                out["worker_counts_created_at"] = None
                out["worker_counts_updated_at"] = None
            
            # Add num_of_workers_access_to_issara_wv_channels from Supplier if existing
            if hasattr(supplier, "num_of_workers_access_to_issara_wv_channels"):
                out["num_of_workers_access_to_issara_wv_channels"] = supplier.num_of_workers_access_to_issara_wv_channels
            
            return out

        if supplier_id:
            try:
                supplier = Supplier.objects.get(pk=supplier_id)
                worker_counts = TotalNumberOfWorkers.objects.filter(supplier=supplier).first()
            except Supplier.DoesNotExist:
                return Response(
                    {"detail": "Supplier not found."}, status=status.HTTP_404_NOT_FOUND
                )
            return Response(serialize(supplier, worker_counts), status=status.HTTP_200_OK)

        suppliers = Supplier.objects.all()
        results = []
        for supplier in suppliers:
            worker_counts = TotalNumberOfWorkers.objects.filter(supplier=supplier).first()
            results.append(serialize(supplier, worker_counts))
        
        return Response(
            {"results": results, "count": len(results), "next": None, "previous": None},
            status=status.HTTP_200_OK,
        )
