from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('ilm_server_2', '0136_supplier_updated_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='priorityactivity',
            name='txt_value',
            field=models.CharField(default='', max_length=500, blank=True),
        ),
    ]
