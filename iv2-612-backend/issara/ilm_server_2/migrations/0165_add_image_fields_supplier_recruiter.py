# Add image upload field to Recruiter model

from django.db import migrations, models
import issara.ilm_server_2.storages


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0164_policy_audience_customers"),
    ]

    operations = [
        migrations.AddField(
            model_name="recruiter",
            name="image",
            field=models.ImageField(
                blank=True,
                null=True,
                storage=issara.ilm_server_2.storages.PublicStorage(),
                upload_to="recruiters/",
            ),
        ),
    ]
