from django.conf.urls import url

from drf_jwt_2fa import views

urlpatterns = [
    url('^auth/', views.obtain_auth_token, name='auth'),
    url('^refresh/', views.refresh_auth_token, name='refresh'),
    url('^verify/', views.verify_auth_token, name='verify'),
]
