from django.db import migrations, models


def _table_names(schema_editor):
    return set(schema_editor.connection.introspection.table_names())


def _column_names(schema_editor, table_name):
    with schema_editor.connection.cursor() as cursor:
        return {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor, table_name
            )
        }


def repair_worker_feedback_contact_reason_schema(apps, schema_editor):
    """
    Temporary compatibility shim for environments that missed the earlier
    worker contact reason migration branch.

    Repair drifted databases where the worker contact reason branch was skipped
    but the current application state already expects the column and tables.
    """
    table_names = _table_names(schema_editor)
    WorkerContactReason = apps.get_model("supplier", "WorkerContactReason")
    WorkerContactReasonTranslation = apps.get_model(
        "supplier", "WorkerContactReasonTranslation"
    )
    WorkerFeedback = apps.get_model("supplier", "WorkerFeedback")

    if WorkerContactReason._meta.db_table not in table_names:
        schema_editor.create_model(WorkerContactReason)
        WorkerContactReason.objects.bulk_create(
            [
                WorkerContactReason(
                    name="New Issue: Sharing feedback on a new issue or insight",
                    sort_order=10,
                    is_active=True,
                ),
                WorkerContactReason(
                    name="Open Issue: Providing more information on an open issue",
                    sort_order=20,
                    is_active=True,
                ),
            ]
        )
        table_names = _table_names(schema_editor)

    if WorkerContactReasonTranslation._meta.db_table not in table_names:
        schema_editor.create_model(WorkerContactReasonTranslation)

    worker_feedback_columns = _column_names(schema_editor, WorkerFeedback._meta.db_table)
    if "contact_reason_id" not in worker_feedback_columns:
        schema_editor.add_field(
            WorkerFeedback,
            WorkerFeedback._meta.get_field("contact_reason"),
        )


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("ilm_server_2", "0153_strategic_partner_detail_and_policy_compliance"),
        ("supplier", "0005_merge_20251216_1439"),
    ]

    operations = [
        migrations.RunPython(
            repair_worker_feedback_contact_reason_schema,
            migrations.RunPython.noop,
        ),
        migrations.AddField(
            model_name="workerfeedback",
            name="additional_attachments",
            field=models.ManyToManyField(
                blank=True,
                related_name="worker_feedback_additional_attachments",
                to="ilm_server_2.SharedFile",
            ),
        ),
    ]
