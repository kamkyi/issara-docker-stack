from django.db import migrations, models
import django.db.models.deletion


def seed_contact_reasons(apps, schema_editor):
    Reason = apps.get_model("supplier", "WorkerContactReason")
    seed_data = [
        ("New Issue: Sharing feedback on a new issue or insight", 10),
        ("Open Issue: Providing more information on an open issue", 20),
    ]
    for name, sort_order in seed_data:
        Reason.objects.update_or_create(
            name=name, defaults={"sort_order": sort_order, "is_active": True}
        )


class Migration(migrations.Migration):

    dependencies = [
        ("supplier", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkerContactReason",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, null=True)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Worker Contact Reason",
                "verbose_name_plural": "Worker Contact Reasons",
                "db_table": "worker_contact_reasons",
                "ordering": ["sort_order", "name"],
            },
        ),
        migrations.AddField(
            model_name="workerfeedback",
            name="contact_reason",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="worker_feedbacks",
                to="supplier.workercontactreason",
            ),
        ),
        migrations.RunPython(seed_contact_reasons, migrations.RunPython.noop),
    ]
