from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ilm_server_2', '0183_merge_20260724_1024'),
    ]

    operations = [
        migrations.AddField(
            model_name='workplandocs',
            name='audience',
            field=models.CharField(
                choices=[
                    ('customers', 'CASCADE Members - Current Customers'),
                    ('members', 'CASCADE Members'),
                    ('private', 'Private'),
                ],
                default='members',
                max_length=10,
            ),
        ),
    ]
