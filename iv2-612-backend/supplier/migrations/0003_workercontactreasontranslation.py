from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0136_auto_20250703_1004"),
        ("supplier", "0002_workercontactreason_contact_reason_field"),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkerContactReasonTranslation",
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
                (
                    "language",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="worker_contact_reason_translations",
                        to="ilm_server_2.language",
                    ),
                ),
                (
                    "worker_contact_reason",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="translations",
                        to="supplier.workercontactreason",
                    ),
                ),
            ],
            options={
                "db_table": "worker_contact_reason_translations",
                "unique_together": {("worker_contact_reason", "language")},
            },
        ),
    ]
