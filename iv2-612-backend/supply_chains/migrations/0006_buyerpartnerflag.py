from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0001_combined"),
        ("supply_chains", "0005_suppliersupplychain_pending_status"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BuyerPartnerFlag",
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
                (
                    "reason",
                    models.CharField(
                        choices=[
                            ("no_longer_sources", "This buyer no longer sources from us"),
                            ("update_status", "Update our relationship status"),
                            ("correct_info", "Correct this buyer's information"),
                            ("general", "General question or note"),
                        ],
                        max_length=64,
                    ),
                ),
                ("note", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("resolved", "Resolved"),
                            ("dismissed", "Dismissed"),
                        ],
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("resolution_note", models.TextField(blank=True)),
                (
                    "supplier",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="buyer_partner_flags",
                        to="ilm_server_2.supplier",
                    ),
                ),
                (
                    "strategic_partner",
                    models.ForeignKey(
                        blank=True,
                        help_text="Buyer this flag is about (if it's a listed CASCADE buyer).",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="supplier_flags",
                        to="ilm_server_2.strategicpartner",
                    ),
                ),
                (
                    "submitted_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="buyer_partner_flags_submitted",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "resolved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="buyer_partner_flags_resolved",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "buyer_partner_flags",
                "ordering": ("-created_at",),
                "indexes": [
                    models.Index(fields=["status"], name="bpf_status_idx"),
                    models.Index(fields=["supplier"], name="bpf_supplier_idx"),
                ],
            },
        ),
    ]
