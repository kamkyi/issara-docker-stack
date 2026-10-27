from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0171_auto_20260616_0416"),
    ]

    operations = [
        migrations.AddField(
            model_name="partnermessageboard",
            name="audience_grouping",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="partnermessageboard",
            name="audience_partner_ids",
            field=models.JSONField(blank=True, null=True),
        ),
    ]
