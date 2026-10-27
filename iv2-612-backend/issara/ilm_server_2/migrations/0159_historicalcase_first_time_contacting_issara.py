from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0158_case_first_time_contacting_issara"),
    ]

    operations = [
        migrations.AddField(
            model_name="historicalcase",
            name="first_time_contacting_issara",
            field=models.CharField(
                blank=True,
                choices=[
                    ("Yes", "Yes"),
                    ("No", "No"),
                    ("Cannot remember", "Cannot remember"),
                ],
                max_length=32,
                null=True,
            ),
        ),
    ]
