from django.apps import AppConfig


class IlmServerConfig(AppConfig):
    name = 'issara.ilm_server_2'

    def ready(self):
        import issara.ilm_server_2.signals
