from django.db import migrations


def ensure_utf8mb4_charset(apps, schema_editor):
    """
    Ensure supply chain tables use utf8mb4 to prevent silent truncation/corruption
    seen with utf8mb3 tables under utf8mb4 connections.
    """
    if schema_editor.connection.vendor != "mysql":
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            ALTER TABLE supply_chains
            CONVERT TO CHARACTER SET utf8mb4
            COLLATE utf8mb4_unicode_ci
            """
        )
        cursor.execute(
            """
            ALTER TABLE ilm_server_2_suppliersupplychain
            CONVERT TO CHARACTER SET utf8mb4
            COLLATE utf8mb4_unicode_ci
            """
        )


class Migration(migrations.Migration):

    dependencies = [
        ("supply_chains", "0003_add_fieldwork_activity_type_translations"),
    ]

    operations = [
        migrations.RunPython(
            ensure_utf8mb4_charset,
            migrations.RunPython.noop,
        ),
    ]

