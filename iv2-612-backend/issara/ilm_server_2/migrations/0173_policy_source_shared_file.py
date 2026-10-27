import django.db.models.deletion
from django.db import migrations, models


def backfill_policy_source_shared_file(apps, schema_editor):
    Policy = apps.get_model("ilm_server_2", "Policy")
    WorkplanDocs = apps.get_model("ilm_server_2", "WorkplanDocs")

    workplan_docs = (
        WorkplanDocs.objects.select_related("workplan")
        .filter(document_id__isnull=False, workplan__strategic_partner_id__isnull=False)
        .only("document_id", "workplan__strategic_partner_id")
    )

    for workplan_doc in workplan_docs.iterator():
        Policy.objects.filter(
            strategic_partner_id=workplan_doc.workplan.strategic_partner_id,
            file_id=workplan_doc.document_id,
            source_shared_file_id__isnull=True,
        ).update(source_shared_file_id=workplan_doc.document_id)


def clear_policy_source_shared_file(apps, schema_editor):
    Policy = apps.get_model("ilm_server_2", "Policy")
    Policy.objects.update(source_shared_file_id=None)


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0172_partnerMessageBoard_audience_grouping_partner_ids"),
    ]

    operations = [
        migrations.AddField(
            model_name="policy",
            name="source_shared_file",
            field=models.ForeignKey(
                blank=True,
                help_text=(
                    "Original Work Plan SharedFile when this policy was synced from "
                    "a Work Plan file."
                ),
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="source_policies",
                to="ilm_server_2.sharedfile",
            ),
        ),
        migrations.AddField(
            model_name="policy",
            name="is_source_hidden",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(
            backfill_policy_source_shared_file,
            clear_policy_source_shared_file,
        ),
    ]
