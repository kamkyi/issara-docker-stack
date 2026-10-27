from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import simple_history.models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("grievance", "0004_grievance_information_collection_attachments"),
    ]

    operations = [
        migrations.CreateModel(
            name="HistoricalGrievance",
            fields=[
                (
                    "id",
                    models.IntegerField(
                        auto_created=True,
                        blank=True,
                        db_index=True,
                        verbose_name="ID",
                    ),
                ),
                ("issara_context", models.CharField(blank=True, max_length=255, null=True)),
                ("checked_with_hr", models.BooleanField(blank=True, null=True)),
                ("repeat_issue", models.BooleanField(blank=True, null=True)),
                ("zero_tolerance", models.BooleanField(blank=True, null=True)),
                ("reviewed_individual", models.BooleanField(blank=True, null=True)),
                ("involved_in_grievance", models.BooleanField(blank=True, null=True)),
                ("received_the_training", models.BooleanField(blank=True, null=True)),
                ("has_trained_impartial", models.JSONField(blank=True, null=True)),
                ("ethical_reviewed", models.JSONField(blank=True, null=True)),
                ("professional_ensured", models.JSONField(blank=True, null=True)),
                ("impartial_ensured", models.JSONField(blank=True, null=True)),
                ("inclusive_and_accessible", models.JSONField(blank=True, null=True)),
                ("timely_and_effective", models.JSONField(blank=True, null=True)),
                (
                    "investigation_their_wellbeing",
                    models.JSONField(blank=True, null=True),
                ),
                ("need_help_with_complex_consequences", models.BooleanField(blank=True, null=True)),
                ("send_email", models.BooleanField(default=False)),
                ("is_draft", models.BooleanField(default=True)),
                ("history_id", models.AutoField(primary_key=True, serialize=False)),
                ("history_date", models.DateTimeField(db_index=True)),
                ("history_change_reason", models.CharField(max_length=100, null=True)),
                (
                    "history_type",
                    models.CharField(
                        choices=[("+", "Created"), ("~", "Changed"), ("-", "Deleted")],
                        max_length=1,
                    ),
                ),
                (
                    "history_user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "supplier_kpi",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to="kpis.supplierkpi",
                    ),
                ),
            ],
            options={
                "verbose_name": "historical grievance",
                "verbose_name_plural": "historical grievances",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": ("history_date", "history_id"),
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
        migrations.CreateModel(
            name="GrievanceAttachmentEvent",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("attachment_name", models.CharField(max_length=256)),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("attachment_added", "Attachment added"),
                            ("attachment_visibility_changed", "Attachment visibility changed"),
                            ("attachment_removed", "Attachment removed"),
                        ],
                        max_length=40,
                    ),
                ),
                ("previous_permission", models.CharField(blank=True, default="", max_length=20)),
                ("permission", models.CharField(blank=True, default="", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "attachment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="grievance_attachment_events",
                        to="ilm_server_2.sharedfile",
                    ),
                ),
                (
                    "grievance",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="attachment_events",
                        to="grievance.grievance",
                    ),
                ),
            ],
            options={"ordering": ("-created_at", "-id")},
        ),
    ]
