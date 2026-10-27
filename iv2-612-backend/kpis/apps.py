from django.apps import AppConfig


class KpisConfig(AppConfig):
    name = "kpis"

    def ready(self):
        import kpis.signals
