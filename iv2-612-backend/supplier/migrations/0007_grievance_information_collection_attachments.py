from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0153_strategic_partner_detail_and_policy_compliance"),
        ("supplier", "0006_workerfeedback_additional_attachments"),
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
                related_name="grievance_information_collection_attachments",
                to="ilm_server_2.SharedFile",
            ),
        ),
    ]
