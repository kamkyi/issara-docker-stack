from rest_framework import serializers
from kpis.models import SupplierKpiUpdate


# Optimized serializer for SupplierKpiUpdate for the optimized endpoint
class SupplierKpiUpdateSerializer(serializers.ModelSerializer):
    supplier = serializers.SerializerMethodField()
    supplier_name = serializers.SerializerMethodField()
    category_id = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    status_name = serializers.SerializerMethodField()
    calls = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()

    def get_supplier(self, obj):
        if obj.supplier_kpi and obj.supplier_kpi.supplier:
            return obj.supplier_kpi.supplier.id
        return None

    def get_supplier_name(self, obj):
        if obj.supplier_kpi and obj.supplier_kpi.supplier:
            return obj.supplier_kpi.supplier.name
        return None

    def get_category_id(self, obj):
        try:
            return obj.supplier_kpi.kpi.kpi_category.id
        except AttributeError:
            return None

    def get_description(self, obj):
        try:
            return obj.supplier_kpi.kpi.description
        except AttributeError:
            return None

    def get_level(self, obj):
        try:
            return obj.supplier_kpi.kpi.level
        except AttributeError:
            return None

    def get_status_name(self, obj):
        try:
            return obj.status.name if obj.status else None
        except AttributeError:
            return None

    def get_calls(self, obj):
        # Use the exact v2 SQL annotation logic (cases_kpis join)
        try:
            from django.db import connection

            supplier_kpi = obj.supplier_kpi
            if supplier_kpi is not None:
                supplier_id = supplier_kpi.supplier_id
                supplier_kpi_id = supplier_kpi.id
                kpi_id = supplier_kpi.kpi_id
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT GROUP_CONCAT(ck.case_id)
                        FROM supplier_kpis sk
                        LEFT OUTER JOIN cases_kpis ck ON ck.kpi_id = sk.kpi_id
                        LEFT OUTER JOIN cases c ON c.id = ck.case_id
                        WHERE c.supplier_id = %s
                        AND sk.id = %s
                        AND sk.kpi_id = %s
                        GROUP BY sk.id
                        """,
                        [supplier_id, supplier_kpi_id, kpi_id],
                    )
                    row = cursor.fetchone()
                    if row and row[0]:
                        return [int(cid) for cid in row[0].split(",") if cid]
        except Exception:
            pass
        return []

    def get_category(self, obj):
        try:
            return obj.supplier_kpi.kpi.kpi_category.name
        except AttributeError:
            return None

    class Meta:
        model = SupplierKpiUpdate
        fields = [
            "id",
            "supplier",
            "supplier_name",
            "category_id",
            "description",
            "level",
            "status_name",
            "calls",
            "category",
            "supplier_kpi",
            "overview_date",
            "status",
            "kpi_update_source",
            "closed_quality",
            "closed_notes",
            "affected_workers",
            "retaliation",
            "retaliation_cso",
            "remediation_issara_recommendation",
            "remediation_progress",
            "remediation_aligned",
            "remediation_business_steps_taken",
            "remediation_business_steps_remaining",
            "remediation_payment_deadline",
            "remediation_owed_baht",
            "remediation_owed_kyat",
            "remediation_owed_ringitt",
            "remediation_owed_usd",
            "remediation_paid_baht",
            "remediation_paid_kyat",
            "remediation_paid_ringitt",
            "remediation_paid_usd",
            "remediation_workers_paid",
            "remediation_documents_owed",
            "remediation_documents_provided",
            "remediation_documents_deadline",
            "remediation_notes",
            "remediation_action",
            "remediation_validation",
            "remediation_results",
            "remediation_sp_recommendation",
            "systems_change_issara_recommendation",
            "systems_change_progress",
            "systems_change_aligned",
            "systems_change_business_steps_taken",
            "systems_change_business_steps_remaining",
            "systems_change_deadline",
            "opened_at",
            "closed_at",
            "closure_date",
            "next_description",
            "deadline",
            "issue_escalated_to_buyer",
            "assigned_to",
            "assigned_users",
            "bhr_focal",
        ]
