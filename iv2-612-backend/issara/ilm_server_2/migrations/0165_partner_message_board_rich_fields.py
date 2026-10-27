# Generated for PartnerMessageBoard rich-fields feature
# Adds: post_type, pinned, ack_required, ack_by, author, image,
#       event_starts_at, event_ends_at, event_location, attachments (M2M)
# Creates: PartnerMessageBoardComment, PartnerMessageBoardAcknowledgement,
#          PartnerMessageBoardRSVP, PartnerMessageBoardSeen

from django.conf import settings
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0164_policy_audience_customers"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="partnermessageboard",
            name="post_type",
            field=models.CharField(
                choices=[
                    ("announcement", "Announcement"),
                    ("report", "Report"),
                    ("event", "Event"),
                ],
                default="announcement",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="partnermessageboard",
            name="pinned",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="partnermessageboard",
            name="ack_required",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="partnermessageboard",
            name="ack_by",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="partnermessageboard",
            name="author",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="authored_partner_messages",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="partnermessageboard",
            name="image",
            field=models.ImageField(
                blank=True, null=True, upload_to="partner_message_board/images/"
            ),
        ),
        migrations.AddField(
            model_name="partnermessageboard",
            name="event_starts_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="partnermessageboard",
            name="event_ends_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="partnermessageboard",
            name="event_location",
            field=models.CharField(blank=True, max_length=512, null=True),
        ),
        migrations.AddField(
            model_name="partnermessageboard",
            name="attachments",
            field=models.ManyToManyField(
                blank=True,
                related_name="partner_message_board_posts",
                to="ilm_server_2.sharedfile",
            ),
        ),
        migrations.CreateModel(
            name="PartnerMessageBoardComment",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("body", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "author",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "parent_comment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="replies",
                        to="ilm_server_2.partnermessageboardcomment",
                    ),
                ),
                (
                    "post",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="ilm_server_2.partnermessageboard",
                    ),
                ),
            ],
            options={
                "db_table": "partner_message_board_comments",
                "managed": True,
                "ordering": ("created_at",),
            },
        ),
        migrations.CreateModel(
            name="PartnerMessageBoardAcknowledgement",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("acknowledged_at", models.DateTimeField(auto_now_add=True)),
                (
                    "post",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="acknowledgements",
                        to="ilm_server_2.partnermessageboard",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "partner_message_board_acknowledgements",
                "managed": True,
                "unique_together": {("post", "user")},
            },
        ),
        migrations.CreateModel(
            name="PartnerMessageBoardRSVP",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("going", "Going"), ("not_going", "Not going")],
                        default="going",
                        max_length=16,
                    ),
                ),
                ("responded_at", models.DateTimeField(auto_now=True)),
                (
                    "post",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="rsvps",
                        to="ilm_server_2.partnermessageboard",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "partner_message_board_rsvps",
                "managed": True,
                "unique_together": {("post", "user")},
            },
        ),
        migrations.CreateModel(
            name="PartnerMessageBoardSeen",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("seen_at", models.DateTimeField(auto_now=True)),
                (
                    "post",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="seen_by",
                        to="ilm_server_2.partnermessageboard",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "partner_message_board_seen",
                "managed": True,
                "unique_together": {("post", "user")},
            },
        ),
    ]
