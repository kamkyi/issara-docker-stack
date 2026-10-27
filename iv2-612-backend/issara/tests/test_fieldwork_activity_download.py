from datetime import date, datetime

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from issara.ilm_server_2.models import (
    Config,
    Country,
    District,
    FieldworkActivity,
    FieldworkActivityType,
    Nationality,
    Province,
    Recruiter,
    Supplier,
)


class FieldworkActivityDownloadTests(APITestCase):
    def setUp(self):
        Config.objects.create(client_version="3.0")

        self.user = User.objects.create_user(
            username="fieldwork-test-user",
            password="pass",
        )
        self.client.force_authenticate(user=self.user)
        self.url = "/api/v2/fieldwork-activities/"
        self.download_url = "/api/v2/fieldwork-activities/download-xls/"

    def test_download_xls_includes_supplier_and_recruiter_name(self):
        alpha_supplier = Supplier.objects.create(name="Alpha Supplier")
        beta_supplier = Supplier.objects.create(name="Beta Supplier")
        recruiter_a = Recruiter.objects.create(name="Recruiter A")
        recruiter_b = Recruiter.objects.create(name="Recruiter B")

        activity = FieldworkActivity.objects.create(fieldwork_date=date(2026, 2, 10))
        activity.suppliers.add(beta_supplier, alpha_supplier)
        activity.recruiters.add(recruiter_b, recruiter_a)

        response = self.client.get(
            self.url,
            data={"download_xls": "true", "client_version": "3.0"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        activity_row = next(item for item in response.data if item["id"] == activity.id)

        self.assertIn("supplier_name", activity_row)
        self.assertIn("recruiter_name", activity_row)
        self.assertEqual(activity_row["supplier_name"], "Alpha Supplier, Beta Supplier")
        self.assertEqual(activity_row["recruiter_name"], "Recruiter A, Recruiter B")

    def test_download_xls_respects_fieldwork_date_range(self):
        in_range_activity = FieldworkActivity.objects.create(
            fieldwork_date=date(2026, 2, 10)
        )
        out_of_range_activity = FieldworkActivity.objects.create(
            fieldwork_date=date(2026, 4, 5)
        )

        response = self.client.get(
            self.url,
            data={
                "download_xls": "true",
                "client_version": "3.0",
                "fieldwork_date_from": "2026-02-01",
                "fieldwork_date_to": "2026-02-28",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data]

        self.assertIn(in_range_activity.id, ids)
        self.assertNotIn(out_of_range_activity.id, ids)

    def test_download_xls_endpoint_returns_text_labels_not_ids(self):
        fieldwork_type = FieldworkActivityType.objects.create(name="Training")
        nationality = Nationality.objects.create(name="Myanmar")
        country = Country.objects.create(name="Thailand")
        province = Province.objects.create(name="Samut Sakhon", country=country)
        district = District.objects.create(name="Mueang", province=province)
        supplier = Supplier.objects.create(name="Supplier X")
        recruiter = Recruiter.objects.create(name="Recruiter Y")

        activity = FieldworkActivity.objects.create(
            fieldwork_date=date(2026, 2, 10),
            fieldwork_type=fieldwork_type,
            nationality=nationality,
            country=country,
            province=province,
            district=district,
            notes="Activity note",
            outreach_target=100,
        )
        activity.suppliers.add(supplier)
        activity.recruiters.add(recruiter)

        response = self.client.get(
            self.download_url,
            data={"client_version": "3.0"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = next(item for item in response.data if item["id"] == activity.id)

        self.assertEqual(row["fieldwork_type"], "Training")
        self.assertEqual(row["nationality"], "Myanmar")
        self.assertEqual(row["country"], "Thailand")
        self.assertEqual(row["province"], "Samut Sakhon")
        self.assertEqual(row["district"], "Mueang")
        self.assertEqual(row["fieldwork_notes"], "Activity note")
        self.assertEqual(row["supplier_name"], "Supplier X")
        self.assertEqual(row["recruiter_name"], "Recruiter Y")

    def test_download_xls_endpoint_respects_date_range(self):
        in_range_activity = FieldworkActivity.objects.create(
            fieldwork_date=date(2026, 2, 10)
        )
        out_of_range_activity = FieldworkActivity.objects.create(
            fieldwork_date=date(2026, 4, 5)
        )

        response = self.client.get(
            self.download_url,
            data={
                "client_version": "3.0",
                "fieldwork_date_from": "2026-02-01",
                "fieldwork_date_to": "2026-02-28",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data]

        self.assertIn(in_range_activity.id, ids)
        self.assertNotIn(out_of_range_activity.id, ids)

    def test_download_xls_endpoint_accepts_unix_timestamp_filters(self):
        in_range_activity = FieldworkActivity.objects.create(
            fieldwork_date=date(2026, 2, 10)
        )
        out_of_range_activity = FieldworkActivity.objects.create(
            fieldwork_date=date(2026, 4, 5)
        )

        response = self.client.get(
            self.download_url,
            data={
                "client_version": "3.0",
                "start_timestamp": int(datetime(2026, 2, 1).timestamp()),
                "end_timestamp": int(datetime(2026, 2, 28).timestamp()),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data]

        self.assertIn(in_range_activity.id, ids)
        self.assertNotIn(out_of_range_activity.id, ids)

    def test_list_endpoint_respects_supplier_filter(self):
        supplier_a = Supplier.objects.create(name="Supplier A")
        supplier_b = Supplier.objects.create(name="Supplier B")

        activity_a = FieldworkActivity.objects.create(fieldwork_date=date(2026, 2, 10))
        activity_b = FieldworkActivity.objects.create(fieldwork_date=date(2026, 2, 11))
        activity_a.suppliers.add(supplier_a)
        activity_b.suppliers.add(supplier_b)

        response = self.client.get(
            self.url,
            data={
                "client_version": "3.0",
                "supplier_ids": f"({supplier_a.id})",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data["results"]]

        self.assertIn(activity_a.id, ids)
        self.assertNotIn(activity_b.id, ids)

    def test_download_xls_endpoint_respects_supplier_filter(self):
        supplier_a = Supplier.objects.create(name="Supplier A")
        supplier_b = Supplier.objects.create(name="Supplier B")

        activity_a = FieldworkActivity.objects.create(fieldwork_date=date(2026, 2, 10))
        activity_b = FieldworkActivity.objects.create(fieldwork_date=date(2026, 2, 11))
        activity_a.suppliers.add(supplier_a)
        activity_b.suppliers.add(supplier_b)

        response = self.client.get(
            self.download_url,
            data={
                "client_version": "3.0",
                "supplier_ids": f"({supplier_a.id})",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data]

        self.assertIn(activity_a.id, ids)
        self.assertNotIn(activity_b.id, ids)

    def test_download_xls_endpoint_respects_suppliers_array_param(self):
        supplier_a = Supplier.objects.create(name="Supplier A")
        supplier_b = Supplier.objects.create(name="Supplier B")

        activity_a = FieldworkActivity.objects.create(fieldwork_date=date(2026, 2, 10))
        activity_b = FieldworkActivity.objects.create(fieldwork_date=date(2026, 2, 11))
        activity_a.suppliers.add(supplier_a)
        activity_b.suppliers.add(supplier_b)

        response = self.client.get(
            self.download_url,
            data={
                "client_version": "3.0",
                "suppliers[]": [supplier_a.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data]

        self.assertIn(activity_a.id, ids)
        self.assertNotIn(activity_b.id, ids)
