from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0157_suppliertier_and_update_supplier_tiers"),
    ]

    operations = [
        migrations.AddField(
            model_name="case",
            name="first_time_contacting_issara",
            field=models.CharField(
                blank=True,
                choices=[
                    ("Yes", "Yes"),
                    ("No", "No"),
                    ("Cannot remember", "Cannot remember"),
                ],
                max_length=32,
                null=True,
            ),
        ),
    ]
