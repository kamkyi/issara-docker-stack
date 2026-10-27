from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ilm_server_2", "0179_supplier_license_agreement_revocation"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="supplierusertrackselection",
            options={
                "managed": True,
                "ordering": ["-selected_at"],
                "verbose_name": "Supplier user access",
                "verbose_name_plural": "Supplier user access management",
            },
        ),
        migrations.AddField(
            model_name="supplierusertrackselection",
            name="revoked_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="supplierusertrackselection",
            name="revoked_by_email",
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name="supplierusertrackselection",
            name="revoked_reason",
            field=models.TextField(blank=True, null=True),
        ),
    ]
