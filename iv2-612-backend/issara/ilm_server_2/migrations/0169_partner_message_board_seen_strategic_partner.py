# Denormalised strategic_partner on message-board seen rows (parity with the
# acknowledgement / RSVP / comment rows from 0168), since one partner org has
# many users.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ilm_server_2', '0168_partner_message_board_record_strategic_partner'),
    ]

    operations = [
        migrations.AddField(
            model_name='partnermessageboardseen',
            name='strategic_partner',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='message_board_seen',
                to='ilm_server_2.StrategicPartner',
            ),
        ),
    ]
