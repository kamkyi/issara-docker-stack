"""
Regression tests for supply chain data integrity.

Verifies that supply chain names and supplier statuses are stored in the
DB exactly as sent — not truncated or corrupted.

Known bugs reproduced:
  - "inactive" stored as "inactiv"  (7 chars instead of 8)
  - supply chain names losing their first character on insert
  - Root cause: supply_chains table charset is utf8mb3 while DB/connection
    is utf8mb4, causing silent data corruption on MySQL 8.0
"""

from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from issara.ilm_server_2.models import (
    StrategicPartner,
    Supplier,
    SupplyChain,
    SupplierSupplyChain,
)


def _make_supplier(name="Test Supplier"):
    """Create a minimal Supplier row for tests."""
    return Supplier.objects.create(name=name)


def _make_strategic_partner(name="Test SP"):
    """Create a minimal StrategicPartner row for tests."""
    return StrategicPartner.objects.create(name=name)


class SupplyChainDataIntegrityTest(APITestCase):
    """
    Regression tests verifying supply chain names and supplier statuses
    are stored in the DB exactly as sent — not truncated or corrupted.
    """

    def setUp(self):
        self.supplier_1 = _make_supplier("Supplier Alpha")
        self.supplier_2 = _make_supplier("Supplier Beta")
        self.supplier_3 = _make_supplier("Supplier Gamma")
        self.strategic_partner = _make_strategic_partner("SP Test")

        self.user = User.objects.create_user(
            username="testuser_integrity",
            password="pass",
            is_staff=True,
            is_superuser=True,
        )

        self.login_url = reverse("token_obtain_pair")

    def _get_token(self):
        res = self.client.post(
            self.login_url,
            data={"username": self.user.username, "password": "pass"},
            format="json",
        )
        return res.data["token"]

    # ------------------------------------------------------------------
    # Status round-trip tests
    # ------------------------------------------------------------------

    def test_inactive_status_not_truncated(self):
        """
        POST /supplychains/ with status='inactive' must persist
        exactly 'inactive' (8 chars) — not 'inactiv' (7 chars).
        """
        token = self._get_token()
        url = reverse("supplychain-list")

        payload = {
            "name": "Integrity Test Chain",
            "strategic_partner": self.strategic_partner.id,
            "suppliers": [
                {
                    "supplier": self.supplier_1.id,
                    "status": SupplierSupplyChain.STATUS_INACTIVE,  # "inactive"
                },
            ],
        }

        response = self.client.post(
            url,
            data=payload,
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        created_id = response.data["id"]

        # --- Assert API response ---
        api_status = response.data["suppliers"][0]["status"]
        self.assertEqual(
            api_status,
            "inactive",
            msg=f"API response returned '{api_status}' — expected 'inactive'",
        )
        self.assertEqual(
            len(api_status),
            8,
            msg=f"API response status has {len(api_status)} chars — expected 8 (no truncation)",
        )

        # --- Assert DB value ---
        db_record = SupplierSupplyChain.objects.get(
            supply_chain_id=created_id,
            supplier=self.supplier_1,
        )
        self.assertEqual(
            db_record.status,
            "inactive",
            msg=f"DB stored '{db_record.status}' — expected 'inactive' (data was truncated at DB level)",
        )
        self.assertEqual(
            len(db_record.status),
            8,
            msg=(
                f"DB status has {len(db_record.status)} chars — expected 8. "
                "Likely cause: charset mismatch between connection and table."
            ),
        )

    def test_all_statuses_round_trip(self):
        """
        Every valid status value must survive the POST → DB → GET round-trip
        without any character loss.
        """
        token = self._get_token()
        url = reverse("supplychain-list")

        cases = [
            (self.supplier_1.id, SupplierSupplyChain.STATUS_ACTIVE, "active"),
            (self.supplier_2.id, SupplierSupplyChain.STATUS_INACTIVE, "inactive"),
            (
                self.supplier_3.id,
                SupplierSupplyChain.STATUS_PRE_PROUDCTION,
                "pre_production",
            ),
        ]

        payload = {
            "name": "Status Round-trip Test",
            "strategic_partner": self.strategic_partner.id,
            "suppliers": [{"supplier": sid, "status": sv} for sid, sv, _ in cases],
        }

        response = self.client.post(
            url,
            data=payload,
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
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
                msg=(
                    f"Supplier {supplier_id}: DB stored '{db_record.status}', "
                    f"expected '{expected}' ({len(expected)} chars)"
                ),
            )

    # ------------------------------------------------------------------
    # Name round-trip tests
    # ------------------------------------------------------------------

    def test_supply_chain_name_not_truncated(self):
        """
        Supply chain name must be stored exactly as sent.
        'Final Test' was observed to become 'inal Tes' — first and last
        characters dropped.
        """
        token = self._get_token()
        url = reverse("supplychain-list")

        original_name = "Final Test"  # 10 chars — exact value that reproduced the bug

        payload = {
            "name": original_name,
            "strategic_partner": self.strategic_partner.id,
            "suppliers": [
                {
                    "supplier": self.supplier_1.id,
                    "status": SupplierSupplyChain.STATUS_ACTIVE,
                },
            ],
        }

        response = self.client.post(
            url,
            data=payload,
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        created_id = response.data["id"]

        # --- Assert API response name ---
        self.assertEqual(
            response.data["name"],
            original_name,
            msg=f"API response name is '{response.data['name']}' — expected '{original_name}'",
        )

        # --- Assert DB name ---
        db_chain = SupplyChain.objects.get(id=created_id)
        self.assertEqual(
            db_chain.name,
            original_name,
            msg=(
                f"DB stored name '{db_chain.name}' (len={len(db_chain.name)}) — "
                f"expected '{original_name}' (len={len(original_name)}). "
                "First/last characters were dropped — likely charset mismatch."
            ),
        )

    def test_name_first_character_preserved(self):
        """
        Specifically checks that the first character of the name is preserved.
        Bug: names starting with capital letters lost their first byte.
        """
        token = self._get_token()
        url = reverse("supplychain-list")

        for name in ["SupplierHR Test", "Final Test", "Wai Hyn Htun Chain"]:
            with self.subTest(name=name):
                payload = {
                    "name": name,
                    "strategic_partner": self.strategic_partner.id,
                    "suppliers": [
                        {
                            "supplier": self.supplier_1.id,
                            "status": SupplierSupplyChain.STATUS_ACTIVE,
                        },
                    ],
                }
                response = self.client.post(
                    url,
                    data=payload,
                    format="json",
                    HTTP_AUTHORIZATION=f"Bearer {token}",
                )
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)

                db_chain = SupplyChain.objects.get(id=response.data["id"])
                self.assertEqual(
                    db_chain.name[0],
                    name[0],
                    msg=(
                        f"First char of stored name is '{db_chain.name[0]}' — "
                        f"expected '{name[0]}' (full stored: '{db_chain.name}')"
                    ),
                )
                self.assertEqual(db_chain.name, name)

    # ------------------------------------------------------------------
    # Charset diagnostic tests
    # ------------------------------------------------------------------

    def test_mysql_connection_charset_is_utf8mb4(self):
        """
        MySQL connection charset must be utf8mb4.
        If it is utf8/utf8mb3, Django settings.py needs:

            DATABASES = {
                "default": {
                    ...
                    "OPTIONS": {"charset": "utf8mb4"},
                }
            }
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
                f"MySQL connection charset is '{charset}' — expected 'utf8mb4'.\n"
                'Fix: add OPTIONS: {{"charset": "utf8mb4"}} to DATABASES in settings.py'
            ),
        )

    def test_supply_chains_table_charset_is_utf8mb4(self):
        """
        The supply_chains table must use utf8mb4.
        It was created from backup.sql with CHARSET=utf8mb3, which can
        silently corrupt string data when the connection uses utf8mb4.

        Fix:
            ALTER TABLE supply_chains
            CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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

        charset = row[0] if row else "unknown"
        self.assertEqual(
            charset,
            "utf8mb4",
            msg=(
                f"supply_chains table charset is '{charset}' — expected 'utf8mb4'.\n"
                "Fix: ALTER TABLE supply_chains CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            ),
        )

    def test_suppliersupplychain_table_charset_is_utf8mb4(self):
        """ilm_server_2_suppliersupplychain must also use utf8mb4."""
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

        charset = row[0] if row else "unknown"
        self.assertEqual(
            charset,
            "utf8mb4",
            msg=f"ilm_server_2_suppliersupplychain charset is '{charset}' — expected 'utf8mb4'.",
        )
