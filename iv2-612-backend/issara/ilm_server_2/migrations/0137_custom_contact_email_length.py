from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('ilm_server_2', '0136_supplier_updated_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='supplier',
            name='contact_email',
            field=models.CharField(max_length=250, blank=True, null=True),
        ),
    ]
