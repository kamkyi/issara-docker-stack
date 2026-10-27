from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0154_restructure_sp_detail_tables"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplieractivitysummary",
            name="grievance_mechanisms_capacity_building_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
