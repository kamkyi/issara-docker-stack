from django.db import migrations, models

import issara.ilm_server_2.enums


class Migration(migrations.Migration):
    """The two Worker Voice risk levels (IV2-582).

    `EARLY_WARNING` and `FORCED_LABOR` join the Low/Medium/High scale rather
    than replacing it: ILM-fronted's risk bar still writes the old three, and
    the rows already holding them are left exactly as they are. Widening to 20
    is what makes room for the longer value.
    """

    dependencies = [
        ("ilm_server_2", "0193_worker_voice_feedback_round_two"),
    ]

    operations = [
        migrations.AlterField(
            model_name="case",
            name="worker_identification_risk_level",
            field=models.CharField(
                blank=True,
                choices=issara.ilm_server_2.enums.CaseRiskLevel.RISK_LEVEL_CHOICES,
                max_length=20,
                null=True,
            ),
        ),
        # `Case` is tracked by simple_history, so the shadow table matches.
        migrations.AlterField(
            model_name="historicalcase",
            name="worker_identification_risk_level",
            field=models.CharField(
                blank=True,
                choices=issara.ilm_server_2.enums.CaseRiskLevel.RISK_LEVEL_CHOICES,
                max_length=20,
                null=True,
            ),
        ),
    ]
