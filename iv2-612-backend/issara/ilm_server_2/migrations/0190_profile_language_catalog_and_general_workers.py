import pycountry
from django.db import migrations, models


LEGACY_PROFILE_CODE_ALIASES = {
    "mm": "my",
    "kh": "km",
    "vn": "vi",
}


def seed_profile_languages(apps, schema_editor):
    Language = apps.get_model("ilm_server_2", "Language")
    Organization = apps.get_model("ilm_server_2", "Organization")
    through = Organization.languages_supported.through

    iso_languages = sorted(
        (language.alpha_2.lower(), language.name)
        for language in pycountry.languages
        if hasattr(language, "alpha_2")
    )

    existing_by_code = {
        language.code: language
        for language in Language.objects.filter(
            code__in=[code for code, _name in iso_languages]
        )
    }
    new_languages = []
    existing_profile_ids = []
    for code, name in iso_languages:
        existing = existing_by_code.get(code)
        if existing:
            existing_profile_ids.append(existing.id)
        else:
            new_languages.append(
                Language(
                    code=code,
                    name=name,
                    name_en=name,
                    is_operational=False,
                    is_profile_selectable=True,
                )
            )

    Language.objects.bulk_create(new_languages)
    Language.objects.filter(id__in=existing_profile_ids).update(
        is_profile_selectable=True
    )

    languages_by_code = {
        language.code: language
        for language in Language.objects.filter(
            code__in={
                *LEGACY_PROFILE_CODE_ALIASES,
                *LEGACY_PROFILE_CODE_ALIASES.values(),
            }
        )
    }
    for legacy_code, canonical_code in LEGACY_PROFILE_CODE_ALIASES.items():
        legacy = languages_by_code.get(legacy_code)
        canonical = languages_by_code.get(canonical_code)
        if not legacy or not canonical:
            continue

        legacy_organization_ids = list(
            through.objects.filter(language_id=legacy.id).values_list(
                "organization_id", flat=True
            )
        )
        if not legacy_organization_ids:
            continue

        duplicate_organization_ids = list(
            through.objects.filter(
                language_id=canonical.id,
                organization_id__in=legacy_organization_ids,
            ).values_list("organization_id", flat=True)
        )
        if duplicate_organization_ids:
            through.objects.filter(
                language_id=legacy.id,
                organization_id__in=duplicate_organization_ids,
            ).delete()
        through.objects.filter(language_id=legacy.id).update(language_id=canonical.id)


class Migration(migrations.Migration):
    dependencies = [
        ("ilm_server_2", "0189_organization_logo"),
    ]

    operations = [
        migrations.AddField(
            model_name="language",
            name="is_operational",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="language",
            name="is_profile_selectable",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="language",
            name="code",
            field=models.CharField(db_index=True, max_length=4, unique=True),
        ),
        migrations.AlterField(
            model_name="organizationstakeholdergroup",
            name="stakeholder_group",
            field=models.CharField(
                choices=[
                    ("cross_border_migrant_workers", "Cross-border migrant workers"),
                    ("internal_migrant_workers", "Internal migrant workers"),
                    ("informal_sector_workers", "Informal sector workers"),
                    ("women_workers", "Women workers"),
                    (
                        "indigenous_ethnic_minority_workers",
                        "Indigenous & ethnic minority workers",
                    ),
                    ("factory_personnel", "Factory personnel"),
                    ("worker_committees", "Worker committees"),
                    ("general_workers", "General workers"),
                ],
                max_length=64,
            ),
        ),
        # Seed data is deliberately retained on rollback so unapplying the
        # migration never cascades away organization or translation records.
        migrations.RunPython(seed_profile_languages, migrations.RunPython.noop),
    ]
