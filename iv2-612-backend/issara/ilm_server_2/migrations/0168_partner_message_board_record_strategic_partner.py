# Denormalised strategic_partner on message-board acknowledgement / RSVP /
# comment rows, captured at write time so per-partner counts, rosters and the
# comments filter don't depend on the user->strategic_partner_user join.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ilm_server_2', '0167_partner_message_board_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='partnermessageboardacknowledgement',
            name='strategic_partner',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='message_board_acknowledgements',
                to='ilm_server_2.StrategicPartner',
            ),
        ),
        migrations.AddField(
            model_name='partnermessageboardrsvp',
            name='strategic_partner',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='message_board_rsvps',
                to='ilm_server_2.StrategicPartner',
            ),
        ),
        migrations.AddField(
            model_name='partnermessageboardcomment',
            name='strategic_partner',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='message_board_comments',
                to='ilm_server_2.StrategicPartner',
            ),
        ),
    ]
