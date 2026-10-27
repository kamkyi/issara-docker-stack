"""Rejoin the migration graph after IV2-608 merged into IV2-582.

Both branches numbered their migration 0191 off 0190 -- `0191_create_tester_group`
from the Tester role work, `0191_worker_voice_case_fields` from this one -- so
after the merge `ilm_server_2` had two leaf nodes and `manage.py migrate` refused
to run at all. This carries no operations; it only says the two lines are one
again.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0191_create_tester_group"),
        ("ilm_server_2", "0194_worker_voice_risk_levels"),
    ]

    operations = []
