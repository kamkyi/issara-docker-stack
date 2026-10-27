from django.db import migrations, models


TABLE_NAME = "supplier_license_agreements"
FIELD_DEFINITIONS = (
    ("signer_title", "varchar(255) NULL"),
    ("signer_affiliation", "varchar(255) NULL"),
)


def get_column_names(schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        return {
            column.name
            for column in connection.introspection.get_table_description(
                cursor,
                TABLE_NAME,
            )
        }


def add_signer_detail_columns(apps, schema_editor):
    del apps
    columns = get_column_names(schema_editor)
    quote = schema_editor.quote_name
    for field_name, field_definition in FIELD_DEFINITIONS:
        if field_name not in columns:
            schema_editor.execute(
                f"ALTER TABLE {quote(TABLE_NAME)} "
                f"ADD COLUMN {quote(field_name)} {field_definition}"
            )


def remove_signer_detail_columns(apps, schema_editor):
    del apps
    columns = get_column_names(schema_editor)
    quote = schema_editor.quote_name
    for field_name, _field_definition in reversed(FIELD_DEFINITIONS):
        if field_name in columns:
            schema_editor.execute(
                f"ALTER TABLE {quote(TABLE_NAME)} DROP COLUMN {quote(field_name)}"
            )


class Migration(migrations.Migration):
    dependencies = [
        ("ilm_server_2", "0180_supplier_user_track_selection_revocation"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    add_signer_detail_columns,
                    remove_signer_detail_columns,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="supplierlicenseagreement",
                    name="signer_title",
                    field=models.CharField(blank=True, max_length=255, null=True),
                ),
                migrations.AddField(
                    model_name="supplierlicenseagreement",
                    name="signer_affiliation",
                    field=models.CharField(blank=True, max_length=255, null=True),
                ),
            ],
        ),
    ]
