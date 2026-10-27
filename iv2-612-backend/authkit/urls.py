from django.urls import path
from . import views

urlpatterns = [
    path("callback/", views.authkit_callback, name="authkit-auth-callback"),
    path("logout/", views.authkit_logout, name="authkit-logout"),
    path("logout-public/", views.authkit_logout_public, name="authkit-logout-public"),
    path("user-info/", views.authkit_user_info, name="authkit-user-info"),
    path("health/", views.authkit_health, name="authkit-health"),
]
