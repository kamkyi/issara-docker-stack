"""
Data migration: normalise SupplierActivitySummary CharField values that were
stored with trailing whitespace (e.g. "not " instead of "not yet").
"""

from django.db import migrations

ACTIVITY_CHAR_FIELDS = [
    "ethical_grievance_worker_voice_policy",
    "worker_voice_grievance_systems_procedures",
    "worker_voice_grievance_communication",
    "grievance_mechanisms_capacity_building",
    "education_empowerment",
    "ethical_recruitment_policy",
    "ethical_recruitment_system_procedures",
    "recruitment_agency_policy_disclosure",
    "recruitment_policy_communication",
    "candidate_worker_recruitment_communication",
    "ern_collaboration",
    "golden_dreams",
    "ethical_sourcing_policy_roadmap",
    "strengthening_worker_voice_communications",
    "ongoing_worker_voice_remediation",
    "targeted_responsive_systems_strengthening",
]

VALID_CHOICES = {"not yet", "partial progress", "completed"}


def fix_trailing_spaces(apps, schema_editor):
    SupplierActivitySummary = apps.get_model("ilm_server_2", "SupplierActivitySummary")
    rows = SupplierActivitySummary.objects.all()
    to_update = []
    for row in rows:
        changed = False
        for field in ACTIVITY_CHAR_FIELDS:
            raw = getattr(row, field)
            if isinstance(raw, str):
                cleaned = raw.strip()
                normalised = cleaned if cleaned in VALID_CHOICES else "not yet"
                if normalised != raw:
                    setattr(row, field, normalised)
                    changed = True
        if changed:
            to_update.append(row)

    if to_update:
        SupplierActivitySummary.objects.bulk_update(to_update, ACTIVITY_CHAR_FIELDS)


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0155_supplieractivitysummary_egm_date"),
    ]

    operations = [
        migrations.RunPython(fix_trailing_spaces, migrations.RunPython.noop),
    ]
