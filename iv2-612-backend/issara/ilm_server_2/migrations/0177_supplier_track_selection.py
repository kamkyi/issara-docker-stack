import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ilm_server_2", "0176_strategic_partner_workforce_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="track_selection",
            field=models.CharField(
                blank=True,
                choices=[
                    ("MARKETPLACE", "CASCADE Marketplace"),
                    ("FULL", "Full CASCADE Access"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="supplier",
            name="license_agreed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="SupplierLicenseAgreement",
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
                ("signer_name", models.CharField(max_length=255)),
                ("signer_email", models.EmailField(max_length=254)),
                (
                    "signer_workos_user_id",
                    models.CharField(db_index=True, max_length=255),
                ),
                ("agreement_version", models.CharField(max_length=64)),
                ("agreement_text", models.TextField()),
                ("agreement_text_hash", models.CharField(max_length=64)),
                ("signed_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "supplier",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="license_agreements",
                        to="ilm_server_2.supplier",
                    ),
                ),
            ],
            options={
                "db_table": "supplier_license_agreements",
                "ordering": ["-signed_at"],
                "managed": True,
            },
        ),
        migrations.AddIndex(
            model_name="supplierlicenseagreement",
            index=models.Index(
                fields=["supplier", "-signed_at"],
                name="supplier_li_supplie_09987f_idx",
            ),
        ),
    ]
