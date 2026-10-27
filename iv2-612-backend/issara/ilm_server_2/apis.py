from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import SupplierProgress, Supplier
from .utils import progress_fields


class SupplierProgressAPI(APIView):

    def get(self, request, pk):
        supplier = get_object_or_404(Supplier, pk=pk)
        lang = request.query_params.get("lang")
        return Response(progress_fields(pk, lang))

    def post(self, request, pk):
        supplier = get_object_or_404(Supplier, pk=pk)

        try:
            progress_ids = [int(x) for x in request.data.keys()]
        except ValueError:
            return Response(
                {"detail": "Invalid progress item IDs"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        progress_qs = SupplierProgress.objects.filter(
            pk__in=progress_ids,
            supplier_id=pk,
        )

        if progress_qs.count() != len(progress_ids):
            return Response(
                {"detail": "Invalid data"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        progress_map = {str(p.pk): p for p in progress_qs}

        for progress_id, value in request.data.items():
            obj = progress_map.get(progress_id)
            obj.progress = value

        SupplierProgress.objects.bulk_update(progress_qs, ["progress"])

        lang = request.query_params.get("lang")
        return Response(progress_fields(pk, lang))
