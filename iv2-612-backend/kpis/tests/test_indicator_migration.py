from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class KpiIndicatorMigrationTests(TransactionTestCase):
    migrate_from = [("kpis", "0010_add_ilo_lksg_indicators")]
    migrate_to = [("kpis", "0011_auto_20260716_0444")]

    def setUp(self):
        super().setUp()
        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_from)
        old_apps = executor.loader.project_state(self.migrate_from).apps

        Kpi = old_apps.get_model("kpis", "Kpi")
        ILOIndicator = old_apps.get_model("kpis", "ILOIndicator")
        LKSGIndicator = old_apps.get_model("kpis", "LKSGIndicator")
        ilo = ILOIndicator.objects.create(name="Deception")
        lksg = LKSGIndicator.objects.create(name="Forced labor")
        self.kpi_id = Kpi.objects.create(
            description="Recruitment fees",
            level=3,
            ilo_indicator_id=ilo.pk,
            lksg_indicator_id=lksg.pk,
        ).pk
        self.ilo_id = ilo.pk
        self.lksg_id = lksg.pk

        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_to)
        self.apps = executor.loader.project_state(self.migrate_to).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_existing_single_relationships_are_copied(self):
        KpiIloMapping = self.apps.get_model("kpis", "KpiIloMapping")
        KpiLksgMapping = self.apps.get_model("kpis", "KpiLksgMapping")

        self.assertTrue(
            KpiIloMapping.objects.filter(
                kpi_id=self.kpi_id, ilo_id=self.ilo_id
            ).exists()
        )
        self.assertTrue(
            KpiLksgMapping.objects.filter(
                kpi_id=self.kpi_id, lksg_id=self.lksg_id
            ).exists()
        )
