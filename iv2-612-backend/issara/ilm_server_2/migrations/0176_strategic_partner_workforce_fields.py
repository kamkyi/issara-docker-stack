from django.db import migrations, models


class AddIntegerFieldIfNotExists(migrations.AddField):
    """
    AddField variant for staging databases that may already have had individual
    columns patched manually. Django migration state is still updated normally.
    """

    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        to_model = to_state.apps.get_model(app_label, self.model_name)
        table_name = to_model._meta.db_table
        column_name = self.name

        with schema_editor.connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() "
                "AND TABLE_NAME = %s "
                "AND COLUMN_NAME = %s",
                [table_name, column_name],
            )
            if cursor.fetchone():
                return

        super().database_forwards(app_label, schema_editor, from_state, to_state)


WORKFORCE_FIELDS = [
    "total_num_workers",
    "total_num_men_workers",
    "total_num_women_workers",
    "total_num_thai_workers",
    "total_num_cambodian_workers",
    "total_num_myanmar_workers",
    "total_num_lao_workers",
    "total_num_vietnamese_workers",
    "total_num_nepalese_workers",
    "total_num_bangladeshi_workers",
    "total_num_indonesian_workers",
    "total_num_malaysian_workers",
    "total_num_indian_workers",
    "total_num_pakistani_workers",
    "total_num_sri_lankan_workers",
    "total_num_thai_men_workers",
    "total_num_thai_women_workers",
    "total_num_cambodian_men_workers",
    "total_num_cambodian_women_workers",
    "total_num_myanmar_men_workers",
    "total_num_myanmar_women_workers",
    "total_num_lao_men_workers",
    "total_num_lao_women_workers",
    "total_num_vietnamese_men_workers",
    "total_num_vietnamese_women_workers",
    "total_num_nepalese_men_workers",
    "total_num_nepalese_women_workers",
    "total_num_bangladeshi_men_workers",
    "total_num_bangladeshi_women_workers",
    "total_num_indonesian_men_workers",
    "total_num_indonesian_women_workers",
    "total_num_malaysian_men_workers",
    "total_num_malaysian_women_workers",
    "total_num_indian_men_workers",
    "total_num_indian_women_workers",
    "total_num_pakistani_men_workers",
    "total_num_pakistani_women_workers",
    "total_num_sri_lankan_men_workers",
    "total_num_sri_lankan_women_workers",
]


class Migration(migrations.Migration):
    dependencies = [
        ("ilm_server_2", "0175_workplandocs_categories"),
    ]

    operations = [
        AddIntegerFieldIfNotExists(
            model_name="strategicpartner",
            name=field_name,
            field=models.IntegerField(blank=True, null=True),
        )
        for field_name in WORKFORCE_FIELDS
    ]
