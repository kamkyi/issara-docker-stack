from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("supply_chains", "0004_ensure_utf8mb4_charset"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterField(
                    model_name="suppliersupplychain",
                    name="status",
                    field=models.CharField(
                        choices=[
                            ("pre_production", "Pre Production"),
                            ("active", "Active"),
                            ("inactive", "Inactive"),
                            ("former_supplier", "Former Supplier"),
                            ("pending", "Pending Verification"),
                        ],
                        default="active",
                        max_length=50,
                    ),
                ),
            ],
        ),
    ]
