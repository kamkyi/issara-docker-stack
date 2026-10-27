from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ilm_server_2", "0178_supplier_license_email_audit"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplierlicenseagreement",
            name="revoked_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="supplierlicenseagreement",
            name="revoked_by_email",
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name="supplierlicenseagreement",
            name="revoked_reason",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="supplierlicenseagreement",
            index=models.Index(
                fields=[
                    "supplier",
                    "signer_workos_user_id",
                    "agreement_version",
                    "revoked_at",
                ],
                name="supplier_li_user_active_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="supplierlicenseagreement",
            index=models.Index(
                fields=["supplier", "signer_email", "agreement_version", "revoked_at"],
                name="supplier_li_email_active_idx",
            ),
        ),
        migrations.CreateModel(
            name="SupplierUserTrackSelection",
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
                ("workos_user_id", models.CharField(max_length=255)),
                ("user_email", models.EmailField(max_length=254)),
                (
                    "track_selection",
                    models.CharField(
                        choices=[
                            ("MARKETPLACE", "CASCADE Marketplace"),
                            ("FULL", "Full CASCADE Access"),
                        ],
                        max_length=20,
                    ),
                ),
                ("selected_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "supplier",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="user_track_selections",
                        to="ilm_server_2.supplier",
                    ),
                ),
            ],
            options={
                "db_table": "supplier_user_track_selections",
                "ordering": ["-selected_at"],
                "managed": True,
            },
        ),
        migrations.AddConstraint(
            model_name="supplierusertrackselection",
            constraint=models.UniqueConstraint(
                fields=("supplier", "workos_user_id"),
                name="uniq_supplier_user_track_selection",
            ),
        ),
        migrations.AddIndex(
            model_name="supplierusertrackselection",
            index=models.Index(
                fields=["supplier", "user_email"],
                name="supplier_user_track_email_idx",
            ),
        ),
    ]
