# Generated for PartnerMessageBoard.audience_all feature.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0165_partner_message_board_rich_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="partnermessageboard",
            name="audience_all",
            field=models.BooleanField(default=False),
        ),
    ]
