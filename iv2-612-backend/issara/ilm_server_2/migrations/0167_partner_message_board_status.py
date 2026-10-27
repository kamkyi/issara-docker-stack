# Generated for PartnerMessageBoard draft/published status.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ilm_server_2', '0166_partner_message_board_audience_all'),
    ]

    operations = [
        migrations.AddField(
            model_name='partnermessageboard',
            name='status',
            field=models.CharField(
                choices=[('draft', 'Draft'), ('published', 'Published')],
                default='published',
                max_length=12,
            ),
        ),
    ]
