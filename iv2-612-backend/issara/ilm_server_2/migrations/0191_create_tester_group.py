from django.db import migrations


def create_tester_group(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.get_or_create(name="Tester")


def remove_tester_group(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name="Tester").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("ilm_server_2", "0190_profile_language_catalog_and_general_workers"),
    ]

    operations = [
        migrations.RunPython(create_tester_group, remove_tester_group),
    ]
