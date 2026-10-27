from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class WorkOSUser(models.Model):
    """
    Separate table for WorkOS authenticated users.
    This serves as the central source of truth for WorkOS users.
    """

    workos_user_id = models.CharField(max_length=255, unique=True, db_index=True)
    workos_organization_id = models.CharField(max_length=255, null=True, blank=True)

    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150, null=True, blank=True)
    last_name = models.CharField(max_length=150, null=True, blank=True)
    email_verified = models.BooleanField(default=False)
    profile_picture_url = models.URLField(blank=True, null=True)
    locale = models.CharField(max_length=50, blank=True)
    external_id = models.CharField(max_length=255, null=True, blank=True)

    authentication_method = models.CharField(max_length=100, blank=True)
    access_token = models.TextField(blank=True)
    refresh_token = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)
    last_login_workos = models.DateTimeField(null=True, blank=True)
    workos_last_sign_in_at = models.DateTimeField(null=True, blank=True)

    linked_django_user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workos_profile",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "workos_users"
        verbose_name = "WorkOS User"
        verbose_name_plural = "WorkOS Users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["workos_user_id"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.email} (WorkOS: {self.workos_user_id})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def update_last_login(self):
        """Update the last login timestamp"""
        self.last_login_workos = timezone.now()
        self.save(update_fields=["last_login_workos"])
