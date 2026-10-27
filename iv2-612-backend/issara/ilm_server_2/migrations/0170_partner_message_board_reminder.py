# Reminders staff send to a strategic partner to acknowledge / RSVP to a post,
# persisted so the roster's "Reminded" state survives across sessions.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ilm_server_2', '0169_partner_message_board_seen_strategic_partner'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PartnerMessageBoardReminder',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('reminded_at', models.DateTimeField(auto_now=True)),
                (
                    'post',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='reminders',
                        to='ilm_server_2.PartnerMessageBoard',
                    ),
                ),
                (
                    'strategic_partner',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='message_board_reminders',
                        to='ilm_server_2.StrategicPartner',
                    ),
                ),
                (
                    'reminded_by',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'db_table': 'partner_message_board_reminders',
                'managed': True,
                'unique_together': {('post', 'strategic_partner')},
            },
        ),
    ]
