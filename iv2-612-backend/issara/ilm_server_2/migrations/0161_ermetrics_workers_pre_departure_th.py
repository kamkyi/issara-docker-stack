# Generated manually on 2026-05-21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0160_maplocationsetting"),
    ]

    operations = [
        migrations.AddField(
            model_name="ermetrics",
            name="workers_pre_departure_th",
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
