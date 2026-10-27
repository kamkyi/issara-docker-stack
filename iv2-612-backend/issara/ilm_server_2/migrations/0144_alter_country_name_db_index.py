from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0143_move_supplychain_to_new_app"),
    ]

    operations = [
        migrations.AlterField(
            model_name="country",
            name="name",
            field=models.CharField(max_length=100, db_index=True),
        ),
    ]
