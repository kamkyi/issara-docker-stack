from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0173_merge_20260701_0001"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="imageicon",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="supplier_imageicon",
                to="ilm_server_2.sharedfile",
            ),
        ),
    ]
