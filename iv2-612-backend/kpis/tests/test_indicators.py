from django.db import IntegrityError, transaction
from django.test import TestCase

from kpis.admin.IndicatorAdmin import (
    ILOIndicatorAdminForm,
    LKSGIndicatorAdminForm,
)
from kpis.admin.KpiAdmin import KpiAdminForm
from kpis.models import (
    ILOIndicator,
    Kpi,
    KpiIloMapping,
    KpiLksgMapping,
    LKSGIndicator,
)
from kpis.serializers import KpiSerializer


class KpiIndicatorRelationshipTests(TestCase):
    def setUp(self):
        self.ilo_one = ILOIndicator.objects.create(name="Deception")
        self.ilo_two = ILOIndicator.objects.create(name="Debt bondage")
        self.lksg_one = LKSGIndicator.objects.create(name="Forced labor")
        self.lksg_two = LKSGIndicator.objects.create(
            name="Slavery and workplace oppression"
        )
        self.kpi = Kpi.objects.create(description="Recruitment fees", level=3)

    def test_kpi_can_have_multiple_indicators(self):
        self.kpi.ilo_indicators.set([self.ilo_one, self.ilo_two])
        self.kpi.lksg_indicators.set([self.lksg_one, self.lksg_two])

        self.assertSetEqual(
            set(self.kpi.ilo_indicators.all()), {self.ilo_one, self.ilo_two}
        )
        self.assertSetEqual(
            set(self.kpi.lksg_indicators.all()), {self.lksg_one, self.lksg_two}
        )

    def test_indicator_can_be_linked_to_multiple_kpis(self):
        another_kpi = Kpi.objects.create(description="Document retention", level=3)

        self.kpi.ilo_indicators.add(self.ilo_one)
        another_kpi.ilo_indicators.add(self.ilo_one)
        self.kpi.lksg_indicators.add(self.lksg_one)
        another_kpi.lksg_indicators.add(self.lksg_one)

        self.assertSetEqual(set(self.ilo_one.kpis.all()), {self.kpi, another_kpi})
        self.assertSetEqual(set(self.lksg_one.kpis.all()), {self.kpi, another_kpi})

    def test_duplicate_mapping_is_rejected(self):
        KpiIloMapping.objects.create(kpi=self.kpi, ilo=self.ilo_one)
        KpiLksgMapping.objects.create(kpi=self.kpi, lksg=self.lksg_one)

        with self.assertRaises(IntegrityError), transaction.atomic():
            KpiIloMapping.objects.create(kpi=self.kpi, ilo=self.ilo_one)
        with self.assertRaises(IntegrityError), transaction.atomic():
            KpiLksgMapping.objects.create(kpi=self.kpi, lksg=self.lksg_one)


class KpiIndicatorAdminFormTests(TestCase):
    def setUp(self):
        self.ilo_one = ILOIndicator.objects.create(name="Deception")
        self.ilo_two = ILOIndicator.objects.create(name="Debt bondage")
        self.lksg_one = LKSGIndicator.objects.create(name="Forced labor")
        self.lksg_two = LKSGIndicator.objects.create(name="Omission of care")

    def test_create_form_saves_multiple_indicator_mappings(self):
        form = KpiAdminForm(
            data={
                "description": "Recruitment fees",
                "level": 3,
                "ilo_indicators": [self.ilo_one.pk, self.ilo_two.pk],
                "lksg_indicators": [self.lksg_one.pk, self.lksg_two.pk],
            }
        )

        self.assertTrue(form.is_valid(), form.errors)
        kpi = form.save()
        self.assertSetEqual(
            set(kpi.ilo_indicators.all()), {self.ilo_one, self.ilo_two}
        )
        self.assertSetEqual(
            set(kpi.lksg_indicators.all()), {self.lksg_one, self.lksg_two}
        )

    def test_update_form_displays_and_synchronizes_existing_mappings(self):
        kpi = Kpi.objects.create(description="Recruitment fees", level=3)
        kpi.ilo_indicators.add(self.ilo_one)
        kpi.lksg_indicators.add(self.lksg_one)

        initial_form = KpiAdminForm(instance=kpi)
        self.assertEqual(
            set(map(int, initial_form["ilo_indicators"].value())), {self.ilo_one.pk}
        )
        self.assertEqual(
            set(map(int, initial_form["lksg_indicators"].value())),
            {self.lksg_one.pk},
        )

        update_form = KpiAdminForm(
            instance=kpi,
            data={
                "description": kpi.description,
                "level": kpi.level,
                "ilo_indicators": [self.ilo_two.pk],
                "lksg_indicators": [self.lksg_one.pk, self.lksg_two.pk],
            },
        )
        self.assertTrue(update_form.is_valid(), update_form.errors)
        update_form.save()

        self.assertSetEqual(set(kpi.ilo_indicators.all()), {self.ilo_two})
        self.assertSetEqual(
            set(kpi.lksg_indicators.all()), {self.lksg_one, self.lksg_two}
        )


class IndicatorAdminFormTests(TestCase):
    def setUp(self):
        self.kpi_one = Kpi.objects.create(description="Recruitment fees", level=3)
        self.kpi_two = Kpi.objects.create(description="Document retention", level=3)

    def test_ilo_indicator_form_creates_and_updates_multiple_kpi_mappings(self):
        create_form = ILOIndicatorAdminForm(
            data={
                "name": "Deception",
                "description": "Misleading recruitment information",
                "kpis": [self.kpi_one.pk, self.kpi_two.pk],
            }
        )

        self.assertTrue(create_form.is_valid(), create_form.errors)
        indicator = create_form.save()
        self.assertSetEqual(set(indicator.kpis.all()), {self.kpi_one, self.kpi_two})

        initial_form = ILOIndicatorAdminForm(instance=indicator)
        self.assertEqual(
            set(map(int, initial_form["kpis"].value())),
            {self.kpi_one.pk, self.kpi_two.pk},
        )

        update_form = ILOIndicatorAdminForm(
            instance=indicator,
            data={
                "name": indicator.name,
                "description": indicator.description,
                "kpis": [self.kpi_two.pk],
            },
        )
        self.assertTrue(update_form.is_valid(), update_form.errors)
        update_form.save()
        self.assertSetEqual(set(indicator.kpis.all()), {self.kpi_two})

    def test_lksg_indicator_form_creates_and_updates_multiple_kpi_mappings(self):
        create_form = LKSGIndicatorAdminForm(
            data={
                "name": "Forced labor",
                "description": "Forced-labor risk",
                "kpis": [self.kpi_one.pk, self.kpi_two.pk],
            }
        )

        self.assertTrue(create_form.is_valid(), create_form.errors)
        indicator = create_form.save()
        self.assertSetEqual(set(indicator.kpis.all()), {self.kpi_one, self.kpi_two})

        initial_form = LKSGIndicatorAdminForm(instance=indicator)
        self.assertEqual(
            set(map(int, initial_form["kpis"].value())),
            {self.kpi_one.pk, self.kpi_two.pk},
        )

        update_form = LKSGIndicatorAdminForm(
            instance=indicator,
            data={
                "name": indicator.name,
                "description": indicator.description,
                "kpis": [],
            },
        )
        self.assertTrue(update_form.is_valid(), update_form.errors)
        update_form.save()
        self.assertFalse(indicator.kpis.exists())


class KpiIndicatorSerializerTests(TestCase):
    def setUp(self):
        self.kpi = Kpi.objects.create(description="Recruitment fees", level=3)
        self.ilo_one = ILOIndicator.objects.create(name="Deception")
        self.ilo_two = ILOIndicator.objects.create(name="Debt bondage")
        self.lksg_one = LKSGIndicator.objects.create(name="Forced labor")

    def test_serializer_returns_indicator_lists(self):
        self.kpi.ilo_indicators.set([self.ilo_one, self.ilo_two])
        self.kpi.lksg_indicators.add(self.lksg_one)

        data = KpiSerializer(self.kpi).data

        self.assertEqual(
            {indicator["id"] for indicator in data["ilo_indicators"]},
            {self.ilo_one.pk, self.ilo_two.pk},
        )
        self.assertEqual(
            [indicator["id"] for indicator in data["lksg_indicators"]],
            [self.lksg_one.pk],
        )
        self.assertNotIn("ilo_indicator_ids", data)
        self.assertNotIn("lksg_indicator_ids", data)

    def test_serializer_update_synchronizes_mappings(self):
        serializer = KpiSerializer(
            self.kpi,
            data={
                "ilo_indicator_ids": [self.ilo_one.pk, self.ilo_two.pk],
                "lksg_indicator_ids": [self.lksg_one.pk],
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        self.assertSetEqual(
            set(self.kpi.ilo_indicators.all()), {self.ilo_one, self.ilo_two}
        )
        self.assertSetEqual(set(self.kpi.lksg_indicators.all()), {self.lksg_one})
