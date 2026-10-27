from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ilm_server_2', '0184_workplandocs_audience'),
    ]

    operations = [
        migrations.AddField(
            model_name='strategicpartner',
            name='worker_voice_mechanism',
            field=models.CharField(
                blank=True,
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='strategicpartner',
            name='remediation_support',
            field=models.CharField(
                blank=True,
                max_length=255,
                null=True,
            ),
        ),
    ]
