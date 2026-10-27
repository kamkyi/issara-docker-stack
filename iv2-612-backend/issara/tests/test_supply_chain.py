import random

from datetime import datetime, timedelta

from django.conf import settings
from django.core import mail
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from issara.ilm_server_2.models import (
    SupplyChain,
    SupplierSupplyChain,
)
import issara.ilm_server_2.factories as factories
import issara.ilm_server_2.fixtures as fixtures
from django.contrib.auth.models import User


client = APIClient()


class SupplyChainTest(APITestCase):
    """Test module for supply chain API"""

    def setUp(self):
        # create fat suppliers
        self.suppliers = factories.FatSupplierFactory.create_batch(5)

        self.strategicPartner = factories.StrategicPartnerFactory.create(
            email_notify=True
        )

        self.supply_chain = factories.FatSupplyChainFactory(
            strategic_partner=self.strategicPartner, suppliers=self.suppliers
        )

        self.login_url = reverse("token_obtain_pair")

        self.password = "pass"

        self.user = factories.UserWithPasswordFactory.create()

    def create_user_token(self):
        res = self.client.post(
            self.login_url,
            data={"username": self.user.username, "password": self.password},
            format="json",
        )
        token = res.data["token"]
        return token

    def test_create_supply_chain(self):
        """Tests for creating new object of supply chain"""

        supply_chain_name = "test_supply_chain"
        access_token = self.create_user_token()

        headers = {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}

        url = reverse("supplychain-list")
        data = {
            "name": supply_chain_name,
            "strategic_partner": self.strategicPartner.id,
            "suppliers": [
                {
                    "supplier": self.suppliers[0].id,
                    "status": SupplierSupplyChain.STATUS_PRE_PROUDCTION,
                },
                {
                    "supplier": self.suppliers[1].id,
                    "status": SupplierSupplyChain.STATUS_INACTIVE,
                },
            ],
        }
        response = self.client.post(url, data=data, format="json", **headers)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_update_supply_chain(self):
        """Tests for updating existing object of supply chain"""

        supply_chain_name = "updated_supply_chain"
        access_token = self.create_user_token()

        headers = {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}

        url = reverse(
            "supplychain-detail",
            kwargs={
                "pk": self.supply_chain.pk,
            },
        )

        data = {
            "name": supply_chain_name,
            "strategic_partner": self.strategicPartner.id,
            "suppliers": [
                {
                    "supplier": self.suppliers[0].id,
                    "status": SupplierSupplyChain.STATUS_PRE_PROUDCTION,
                },
                {
                    "supplier": self.suppliers[1].id,
                    "status": SupplierSupplyChain.STATUS_INACTIVE,
                },
            ],
        }
        response = self.client.put(url, data=data, format="json", **headers)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_supply_chain(self):
        """Tests for deleting existing object of supply chain"""

        access_token = self.create_user_token()

        headers = {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}

        url = reverse(
            "supplychain-detail",
            kwargs={
                "pk": self.supply_chain.pk,
            },
        )

        response = self.client.delete(url, format="json", **headers)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_list_supply_chain_by_id_query_param(self):
        """Tests GET /supplychains/?id=<id> returns only the requested supply chain."""

        access_token = self.create_user_token()
        headers = {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}

        url = reverse("supplychain-list")
        response = self.client.get(
            f"{url}?id={self.supply_chain.id}",
            format="json",
            **headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], self.supply_chain.id)


class SupplyChainDataIntegrityTest(APITestCase):
    """
    Regression tests verifying that supply chain names and supplier statuses
    are stored in the DB exactly as sent — not truncated or corrupted.

    Covers the bug where:
      - "inactive" was stored as "inactiv"  (7 chars instead of 8)
      - supply chain names lost their first character on insert
    """

    def setUp(self):
        self.suppliers = factories.FatSupplierFactory.create_batch(3)
        self.strategic_partner = factories.StrategicPartnerFactory.create()
        self.user = factories.UserWithPasswordFactory.create()
        self.login_url = reverse("token_obtain_pair")

    def _get_token(self):
        res = self.client.post(
            self.login_url,
            data={"username": self.user.username, "password": "pass"},
            format="json",
        )
        return res.data["token"]

    def test_inactive_status_stored_correctly(self):
        """
        POST /supplychains/ with status='inactive' must persist
        exactly 'inactive' (8 chars) — not a truncated variant.
        """
        token = self._get_token()
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
        url = reverse("supplychain-list")

        payload = {
            "name": "Integrity Test Chain",
            "strategic_partner": self.strategic_partner.id,
            "suppliers": [
                {
                    "supplier": self.suppliers[0].id,
                    "status": SupplierSupplyChain.STATUS_INACTIVE,  # "inactive"
                },
            ],
        }

        response = self.client.post(url, data=payload, format="json", **headers)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        created_id = response.data["id"]

        # --- Check API response ---
        response_status = response.data["suppliers"][0]["status"]
        self.assertEqual(
            response_status,
            "inactive",
            msg=f"API response returned '{response_status}' instead of 'inactive'",
        )
        self.assertEqual(
            len(response_status),
            8,
            msg=f"API response status has length {len(response_status)}, expected 8",
        )

        # --- Check DB directly via ORM ---
        db_record = SupplierSupplyChain.objects.get(
            supply_chain_id=created_id,
            supplier=self.suppliers[0],
        )
        self.assertEqual(
            db_record.status,
            "inactive",
            msg=f"DB stored '{db_record.status}' instead of 'inactive'",
        )
        self.assertEqual(
            len(db_record.status),
            8,
            msg=f"DB status field has {len(db_record.status)} chars, expected 8 — data was truncated",
        )

    def test_all_statuses_stored_correctly(self):
        """
        Each of the four valid statuses must survive the full
        POST → DB round-trip without truncation.
        """
        token = self._get_token()
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
        url = reverse("supplychain-list")

        cases = [
            (self.suppliers[0].id, SupplierSupplyChain.STATUS_ACTIVE, "active"),
            (self.suppliers[1].id, SupplierSupplyChain.STATUS_INACTIVE, "inactive"),
            (
                self.suppliers[2].id,
                SupplierSupplyChain.STATUS_PRE_PROUDCTION,
                "pre_production",
            ),
        ]

        payload = {
            "name": "Status Round-trip Test",
            "strategic_partner": self.strategic_partner.id,
            "suppliers": [
                {"supplier": supplier_id, "status": status_val}
                for supplier_id, status_val, _ in cases
            ],
        }

        response = self.client.post(url, data=payload, format="json", **headers)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        created_id = response.data["id"]

        for supplier_id, _, expected in cases:
            db_record = SupplierSupplyChain.objects.get(
                supply_chain_id=created_id,
                supplier_id=supplier_id,
            )
            self.assertEqual(
                db_record.status,
                expected,
                msg=f"Supplier {supplier_id}: DB stored '{db_record.status}', expected '{expected}'",
            )

    def test_supply_chain_name_stored_correctly(self):
        """
        The supply chain name must be stored in the DB exactly as sent —
        no characters dropped from the start or end.
        """
        token = self._get_token()
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
        url = reverse("supplychain-list")

        original_name = "Final Test"  # 10 chars — known to reproduce the bug

        payload = {
            "name": original_name,
            "strategic_partner": self.strategic_partner.id,
            "suppliers": [
                {
                    "supplier": self.suppliers[0].id,
                    "status": SupplierSupplyChain.STATUS_ACTIVE,
                },
            ],
        }

        response = self.client.post(url, data=payload, format="json", **headers)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        created_id = response.data["id"]

        # --- Check API response ---
        self.assertEqual(
            response.data["name"],
            original_name,
            msg=f"API response name is '{response.data['name']}', expected '{original_name}'",
        )

        # --- Check DB directly via ORM ---
        db_chain = SupplyChain.objects.get(id=created_id)
        self.assertEqual(
            db_chain.name,
            original_name,
            msg=f"DB stored name '{db_chain.name}' (len={len(db_chain.name)}) — expected '{original_name}' (len={len(original_name)})",
        )

    def test_mysql_connection_charset(self):
        """
        Verifies MySQL connection charset is utf8mb4 (not utf8/utf8mb3).
        A utf8mb3 connection against a utf8mb4 table (or vice-versa) can
        silently corrupt multi-byte data on some MySQL 8.0 builds.
        """
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("SHOW VARIABLES LIKE 'character_set_connection';")
            row = cursor.fetchone()

        charset = row[1] if row else "unknown"
        self.assertEqual(
            charset,
            "utf8mb4",
            msg=(
                f"MySQL connection charset is '{charset}', expected 'utf8mb4'. "
                'Add OPTIONS: {{"charset": "utf8mb4"}} to DATABASES in settings.py.'
            ),
        )

    def test_supply_chains_table_charset(self):
        """
        Verifies the supply_chains table itself uses utf8mb4.
        If the table was created from backup.sql with utf8mb3 and the
        connection is utf8mb4, MySQL may silently corrupt strings.
        """
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT CCSA.character_set_name "
                "FROM information_schema.TABLES T "
                "JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY CCSA "
                "  ON CCSA.collation_name = T.TABLE_COLLATION "
                "WHERE T.TABLE_SCHEMA = DATABASE() "
                "AND T.TABLE_NAME = 'supply_chains';"
            )
            row = cursor.fetchone()

        table_charset = row[0] if row else "unknown"
        self.assertEqual(
            table_charset,
            "utf8mb4",
            msg=(
                f"supply_chains table charset is '{table_charset}', expected 'utf8mb4'. "
                "Run: ALTER TABLE supply_chains CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            ),
        )

    def test_suppliersupplychain_table_charset(self):
        """Verifies ilm_server_2_suppliersupplychain also uses utf8mb4."""
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT CCSA.character_set_name "
                "FROM information_schema.TABLES T "
                "JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY CCSA "
                "  ON CCSA.collation_name = T.TABLE_COLLATION "
                "WHERE T.TABLE_SCHEMA = DATABASE() "
                "AND T.TABLE_NAME = 'ilm_server_2_suppliersupplychain';"
            )
            row = cursor.fetchone()

        table_charset = row[0] if row else "unknown"
        self.assertEqual(
            table_charset,
            "utf8mb4",
            msg=(
                f"ilm_server_2_suppliersupplychain charset is '{table_charset}', expected 'utf8mb4'."
            ),
        )
