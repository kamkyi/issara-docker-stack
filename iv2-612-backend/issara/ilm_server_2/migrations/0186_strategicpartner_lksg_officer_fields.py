from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ilm_server_2', '0185_strategicpartner_lksg_risk_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='strategicpartner',
            name='human_rights_officer_confirmed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='strategicpartner',
            name='human_rights_officer_name',
            field=models.CharField(
                blank=True,
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='strategicpartner',
            name='senior_management_reporting_confirmed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='strategicpartner',
            name='senior_management_reporting_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='strategicpartner',
            name='worker_voice_mechanism',
            field=models.CharField(
                blank=True,
                choices=[
                    ('Voluntary for direct and indirect suppliers',
                     'Voluntary for direct and indirect suppliers'),
                    ('Mandatory for direct and indirect suppliers',
                     'Mandatory for direct and indirect suppliers'),
                ],
                max_length=255,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='strategicpartner',
            name='remediation_support',
            field=models.CharField(
                blank=True,
                choices=[
                    ('Voluntary for direct and indirect suppliers',
                     'Voluntary for direct and indirect suppliers'),
                    ('Mandatory for direct and indirect suppliers',
                     'Mandatory for direct and indirect suppliers'),
                ],
                max_length=255,
                null=True,
            ),
        ),
    ]
