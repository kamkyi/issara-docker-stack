from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

from .models import Config


class ClientVersionMiddleware(MiddlewareMixin):
    def process_request(self, request):
        client_version = request.GET.get('client_version', None)
        client_version_on_server = Config.objects.all().first().client_version

        # Check if client_version was sent, otherwise admin interface won't work
        if client_version:
            if client_version != client_version_on_server:
                return JsonResponse({
                    'error': 'Client version expired',
                    'client_version_on_server': client_version_on_server
                }, status=444)
