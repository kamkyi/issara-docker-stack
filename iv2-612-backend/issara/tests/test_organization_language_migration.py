import importlib

from django.apps import apps
from django.test import TestCase

from issara.ilm_server_2.models import Language, Organization


seed_profile_languages = importlib.import_module(
    "issara.ilm_server_2.migrations.0190_profile_language_catalog_and_general_workers"
).seed_profile_languages


class OrganizationLanguageMigrationTests(TestCase):
    def test_seed_preserves_operational_ids_and_normalizes_profile_links(self):
        legacy, _ = Language.objects.update_or_create(
            code="mm",
            defaults={
                "name": "Burmese",
                "name_en": "Burmese",
                "is_operational": True,
                "is_profile_selectable": False,
            },
        )
        canonical, _ = Language.objects.update_or_create(
            code="my",
            defaults={
                "name": "Burmese",
                "name_en": "Burmese",
                "is_operational": False,
                "is_profile_selectable": True,
            },
        )
        legacy_id = legacy.id
        canonical_id = canonical.id

        legacy_only = Organization.objects.create(name="Legacy selection")
        legacy_only.languages_supported.add(legacy)
        duplicate = Organization.objects.create(name="Both selections")
        duplicate.languages_supported.add(legacy, canonical)

        seed_profile_languages(apps, None)
        seed_profile_languages(apps, None)

        legacy.refresh_from_db()
        canonical.refresh_from_db()
        self.assertEqual(legacy.id, legacy_id)
        self.assertTrue(legacy.is_operational)
        self.assertFalse(legacy.is_profile_selectable)
        self.assertEqual(canonical.id, canonical_id)
        self.assertTrue(canonical.is_profile_selectable)
        self.assertEqual(
            Language.objects.filter(is_profile_selectable=True).count(), 184
        )
        self.assertEqual(
            list(legacy_only.languages_supported.values_list("code", flat=True)),
            ["my"],
        )
        self.assertEqual(
            list(duplicate.languages_supported.values_list("code", flat=True)),
            ["my"],
        )
