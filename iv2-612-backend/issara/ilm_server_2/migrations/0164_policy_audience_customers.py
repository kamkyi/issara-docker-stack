# Add "customers" audience option for policies.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0163_policy"),
    ]

    operations = [
        migrations.AlterField(
            model_name="policy",
            name="audience",
            field=models.CharField(
                choices=[
                    ("customers", "CASCADE Members - Current Customers"),
                    ("members", "CASCADE Members"),
                    ("private", "Private"),
                ],
                default="members",
                max_length=10,
            ),
        ),
    ]
