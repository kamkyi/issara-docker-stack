from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q, Exists, OuterRef
from issara.ilm_server_2.models import Supplier


class SupplierMapAPIView(APIView):
    """
    Returns supplier location data for map display.
    Query params: supplier_id (optional)
    Response: {"suppliers": [{...}]}
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from supplier.models import TotalNumberOfWorkers
        from supply_chains.models import SupplierSupplyChain

        supplier_id = request.query_params.get("supplier_id")
        min_workers = request.query_params.get("min_workers")
        max_workers = request.query_params.get("max_workers")
        industry = request.query_params.get("industry")
        supplier_name = request.query_params.get("supplier_name")

        supply_exists = SupplierSupplyChain.objects.filter(supplier=OuterRef("pk"))
        qs = Supplier.objects.annotate(supply_chain_member=Exists(supply_exists))
        
        # Build supplier ID filter list based on worker counts
        supplier_ids_with_workers = None
        if min_workers or max_workers:
            worker_qs = TotalNumberOfWorkers.objects.all()
            if min_workers:
                try:
                    min_workers_val = int(min_workers)
                    worker_qs = worker_qs.filter(total_num_workers__gte=min_workers_val)
                except Exception:
                    return Response(
                        {"detail": "Invalid min_workers value; must be integer."},
                        status=400,
                    )
            if max_workers:
                try:
                    max_workers_val = int(max_workers)
                    worker_qs = worker_qs.filter(total_num_workers__lte=max_workers_val)
                except Exception:
                    return Response(
                        {"detail": "Invalid max_workers value; must be integer."},
                        status=400,
                    )
            supplier_ids_with_workers = list(worker_qs.values_list('supplier_id', flat=True))
            qs = qs.filter(id__in=supplier_ids_with_workers)
        
        if supplier_id:
            qs = qs.filter(id=supplier_id)
        if supplier_name:
            qs = qs.filter(name__icontains=supplier_name)
        if industry:
            try:
                ind_val = int(industry)
                qs = qs.filter(industries__id=ind_val)
            except Exception:
                qs = qs.filter(industries__name__icontains=industry)

        qs = (
            qs.exclude(
                Q(lat__isnull=True) | Q(lat="") | Q(lng__isnull=True) | Q(lng="")
            )
            .prefetch_related("industries")
            .only("id", "name", "lat", "lng")
            .distinct()
        )
        # Fetch all worker counts for these suppliers in one query
        supplier_ids = [s.id for s in qs]
        worker_counts_map = {}
        if supplier_ids:
            worker_counts = TotalNumberOfWorkers.objects.filter(
                supplier_id__in=supplier_ids
            ).values('supplier_id', 'total_num_workers')
            worker_counts_map = {wc['supplier_id']: wc['total_num_workers'] for wc in worker_counts}
        
        suppliers = []
        for s in qs:
            lat = getattr(s, "lat", None)
            lng = getattr(s, "lng", None)
            try:
                lat = float(lat) if lat not in (None, "") else None
            except Exception:
                lat = None
            try:
                lng = float(lng) if lng not in (None, "") else None
            except Exception:
                lng = None

            inds = [ind.name for ind in s.industries.all()]
            industry_name = inds[0] if inds else None

            workers = worker_counts_map.get(s.id, 0)
            supply_chain_member = bool(getattr(s, "supply_chain_member", False))
            if lat is None or lng is None:
                continue

            suppliers.append(
                {
                    "supplier_id": s.id,
                    "supplier_name": s.name,
                    "industry": industry_name,
                    "lat": lat,
                    "lng": lng,
                    "workers": workers,
                    "supply_chain_member": supply_chain_member,
                }
            )

        return Response({"suppliers": suppliers}, status=200)
