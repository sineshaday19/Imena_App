from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model (project-level identity + role)."""

    class Role(models.TextChoices):
        RIDER = "RIDER", "Rider"
        COOPERATIVE_ADMIN = "COOPERATIVE_ADMIN", "Cooperative admin"

    email = models.EmailField("email address", unique=True, null=True, blank=True)
    phone_number = models.CharField("phone number", max_length=15, unique=True)

    role = models.CharField(
        max_length=32,
        choices=Role.choices,
        default=Role.RIDER,
    )

    class Meta:
        db_table = "users_user"

    @property
    def is_rider(self) -> bool:
        return self.role == self.Role.RIDER

    @property
    def is_cooperative_admin(self) -> bool:
        return self.role == self.Role.COOPERATIVE_ADMIN
