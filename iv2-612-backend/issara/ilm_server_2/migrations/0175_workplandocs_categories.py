from django.db import migrations, models


class AddManyToManyIfNotExists(migrations.AddField):
    """
    Like AddField, but skips the database step if the through table already
    exists (e.g. the table was created by a previous partial migration).
    The Django migration state is always updated so subsequent migrations work.
    """

    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        to_model = to_state.apps.get_model(app_label, self.model_name)
        field = to_model._meta.get_field(self.name)
        through_table = field.remote_field.through._meta.db_table

        with schema_editor.connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.TABLES "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s",
                [through_table],
            )
            if cursor.fetchone():
                return  # table already exists – nothing to do

        super().database_forwards(app_label, schema_editor, from_state, to_state)

    def database_backwards(self, app_label, schema_editor, from_state, to_state):
        pass  # noop – don't drop a table we may not have created


class Migration(migrations.Migration):
    dependencies = [
        ("ilm_server_2", "0173_policy_source_shared_file"),
        ("ilm_server_2", "0174_supplier_imageicon"),
    ]

    operations = [
        AddManyToManyIfNotExists(
            model_name="workplandocs",
            name="categories",
            field=models.ManyToManyField(
                blank=True,
                related_name="workplan_documents",
                to="ilm_server_2.policycompliance",
            ),
        ),
    ]
