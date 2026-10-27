from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0181_supplier_license_agreement_signer_details"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sharedfile",
            name="permission",
            field=models.CharField(
                choices=[
                    ("Both", "Both"),
                    ("Supplier Only", "Supplier Only"),
                    ("Supplier + Issara", "Supplier + Issara"),
                    ("SP Only", "SP Only"),
                ],
                default="Both",
                max_length=20,
            ),
        ),
    ]
