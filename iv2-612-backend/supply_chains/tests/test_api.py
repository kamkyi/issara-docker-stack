from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from model_bakery import baker
from rest_framework import status
from rest_framework.test import APIClient

from supply_chains.models import SupplierSupplyChain


class SupplyChainAPIPerformanceTest(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="supply-chain-reader",
            email="supply-chain-reader@example.com",
        )
        self.strategic_partner = baker.make("ilm_server_2.StrategicPartner")
        self.supply_chain = baker.make(
            "supply_chains.SupplyChain",
            name="Query-count supply chain",
            strategic_partner=self.strategic_partner,
        )
        self.suppliers = baker.make("ilm_server_2.Supplier", _quantity=5)
        SupplierSupplyChain.objects.bulk_create(
            [
                SupplierSupplyChain(
                    supply_chain=self.supply_chain,
                    supplier=supplier,
                    status=SupplierSupplyChain.STATUS_ACTIVE,
                )
                for supplier in self.suppliers
            ]
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_retrieve_has_constant_query_count_and_unchanged_payload(self):
        url = reverse("supplychain-detail", kwargs={"pk": self.supply_chain.pk})

        # One group-membership query, one supply-chain query, and one supplier
        # through-model query, regardless of the number of suppliers.
        with self.assertNumQueries(3):
            response = self.client.get(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.json(),
            {
                "id": self.supply_chain.id,
                "name": self.supply_chain.name,
                "strategic_partner": self.strategic_partner.id,
                "strategic_partner_name": self.strategic_partner.name,
                "suppliers": [
                    {
                        "supplier": supplier.id,
                        "supplier_name": supplier.name,
                        "status": SupplierSupplyChain.STATUS_ACTIVE,
                    }
                    for supplier in self.suppliers
                ],
            },
        )
