from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ilm_server_2", "0177_supplier_track_selection"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplierlicenseagreement",
            name="confirmation_email_to",
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name="supplierlicenseagreement",
            name="confirmation_email_status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("SENT", "Sent"),
                    ("FAILED", "Failed"),
                    ("NOT_SENT", "Not sent"),
                ],
                default="PENDING",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="supplierlicenseagreement",
            name="confirmation_email_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="supplierlicenseagreement",
            name="confirmation_email_error",
            field=models.TextField(blank=True, null=True),
        ),
    ]
