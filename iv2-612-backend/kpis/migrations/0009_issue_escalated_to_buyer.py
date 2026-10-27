# Generated manually to add Issue Escalated to Buyer to current KPI state and update snapshots.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("kpis", "0008_add_fieldwork_activity_type_translations"),
    ]

    operations = [
        migrations.AddField(
            model_name="historicalsupplierkpi",
            name="issue_escalated_to_buyer",
            # Default false per requirement so existing history is treated as not escalated.
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="supplierkpi",
            name="issue_escalated_to_buyer",
            # Default false per requirement so existing KPI rows are treated as not escalated.
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="supplierkpiupdate",
            name="issue_escalated_to_buyer",
            # Default false per requirement so existing update history is treated as not escalated.
            field=models.BooleanField(default=False),
        ),
    ]
