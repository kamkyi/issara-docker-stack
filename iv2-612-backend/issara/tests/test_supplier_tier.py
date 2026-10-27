from django.test import TestCase

from issara.ilm_server_2.models import Supplier, SupplierTier
from issara.ilm_server_2.serializers import SupplierSerializer


class SupplierTierSerializerTests(TestCase):
    def setUp(self):
        self.export_factory = SupplierTier.objects.create(
            name="Export-level factory"
        )
        self.upstream = SupplierTier.objects.create(
            name="Upstream farms, mills, plants, processors"
        )

    def test_create_supplier_with_tier_id(self):
        serializer = SupplierSerializer(
            data={"name": "New supplier", "tier_id": self.export_factory.id}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        supplier = serializer.save()

        self.assertEqual(supplier.tier, self.export_factory)
        self.assertEqual(serializer.data["tier_id"], self.export_factory.id)

    def test_update_supplier_tier_id(self):
        supplier = Supplier.objects.create(
            name="Existing supplier", tier=self.export_factory
        )
        serializer = SupplierSerializer(
            supplier,
            data={"tier_id": self.upstream.id},
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_supplier = serializer.save()

        self.assertEqual(updated_supplier.tier, self.upstream)
        self.assertEqual(serializer.data["tier_id"], self.upstream.id)

    def test_clear_supplier_tier_id(self):
        supplier = Supplier.objects.create(
            name="Existing supplier", tier=self.export_factory
        )
        serializer = SupplierSerializer(
            supplier,
            data={"tier_id": None},
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_supplier = serializer.save()

        self.assertIsNone(updated_supplier.tier)
        self.assertIsNone(serializer.data["tier_id"])

    def test_reject_unknown_tier_id(self):
        serializer = SupplierSerializer(
            data={"name": "New supplier", "tier_id": 999999}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("tier_id", serializer.errors)
