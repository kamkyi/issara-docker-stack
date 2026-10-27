from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0153_strategic_partner_detail_and_policy_compliance"),
        ("grievance", "0003_merge_0002_auto_20250129_0815_0002_auto_20250303_0716"),
    ]

    operations = [
        migrations.AddField(
            model_name="grievance",
            name="information_collection_attachments",
            field=models.ManyToManyField(
                blank=True,
                help_text=(
                    "Supplier-uploaded attachments supporting internal grievance "
                    "information collection"
                ),
                related_name="kpi_grievance_information_collection_attachments",
                to="ilm_server_2.SharedFile",
            ),
        ),
    ]
