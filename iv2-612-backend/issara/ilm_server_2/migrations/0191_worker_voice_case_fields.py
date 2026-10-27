from django.db import migrations, models


class Migration(migrations.Migration):
    """Schema for the CSO Worker Voice call entry form (IV2-582).

    Adds the three `cases` columns the finalized WV form needs and no existing
    column covers, plus the CSO visibility flags on interaction channels. The
    channel flags matter because every hotline/messaging channel carries
    `supplier_only=True` from the ILM 1 import, so the non-supplier branch of
    `InteractionChannel.get_for_user` hid all of them from CSO users.
    """

    dependencies = [
        ("ilm_server_2", "0190_profile_language_catalog_and_general_workers"),
    ]

    operations = [
        migrations.AddField(
            model_name="case",
            name="client_zalo_account",
            field=models.CharField(blank=True, max_length=1024, null=True),
        ),
        migrations.AddField(
            model_name="case",
            name="safeguards_remarks",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="case",
            name="attachments",
            field=models.ManyToManyField(
                blank=True, related_name="cases", to="ilm_server_2.sharedfile"
            ),
        ),
        # `Case` is tracked by simple_history, so the shadow table needs the
        # scalar columns too. M2M fields are not mirrored into history.
        migrations.AddField(
            model_name="historicalcase",
            name="client_zalo_account",
            field=models.CharField(blank=True, max_length=1024, null=True),
        ),
        migrations.AddField(
            model_name="historicalcase",
            name="safeguards_remarks",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="interactionchannel",
            name="cso_only",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="interactionchannel",
            name="hide_for_cso",
            field=models.BooleanField(default=False),
        ),
    ]
