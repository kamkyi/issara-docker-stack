from django.db import migrations, models


# Two risk-flavoured outcomes the CSO Worker Voice form needs. They are added
# rather than replacing anything: `case_statuses` holds three ILM 1 rows that
# ~43k live cases point at, and the Issara-facing screens still show them.
#
# Both are `cso_only`, and `CaseStatusViewSet` only serves the CSO set to a
# client that asks for it by name, so ILM-fronted -- which serves CSO users as
# well as Issara staff -- keeps the legacy three either way.
CSO_CASE_STATUSES = [
    "Early warning risk",
    "Forced labor risk",
]


def seed_cso_case_statuses(apps, schema_editor):
    CaseStatus = apps.get_model("ilm_server_2", "CaseStatus")
    existing = set(CaseStatus.objects.values_list("name", flat=True))
    CaseStatus.objects.bulk_create(
        [CaseStatus(name=name) for name in CSO_CASE_STATUSES if name not in existing]
    )
    # Applied to every name, not just the rows inserted here, so a re-run after
    # a rollback that dropped and re-added the flag columns converges on the
    # same state instead of leaving them at the column default.
    CaseStatus.objects.filter(name__in=CSO_CASE_STATUSES).update(
        cso_only=True, hide_for_cso=False
    )


class Migration(migrations.Migration):
    """Second round of Worker Voice form feedback (IV2-582).

    Adds the free-text "Other" contact column for platforms with no dedicated
    field, and the CSO-only case statuses.
    """

    dependencies = [
        ("ilm_server_2", "0192_worker_voice_lookup_options"),
    ]

    operations = [
        migrations.AddField(
            model_name="case",
            name="client_other_account",
            field=models.CharField(blank=True, max_length=1024, null=True),
        ),
        # `Case` is tracked by simple_history, so the shadow table needs it too.
        migrations.AddField(
            model_name="historicalcase",
            name="client_other_account",
            field=models.CharField(blank=True, max_length=1024, null=True),
        ),
        migrations.AddField(
            model_name="casestatus",
            name="cso_only",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="casestatus",
            name="hide_for_cso",
            field=models.BooleanField(default=False),
        ),
        # Seed data is retained on rollback so unapplying never cascades away
        # rows that live cases point at.
        migrations.RunPython(seed_cso_case_statuses, migrations.RunPython.noop),
    ]
