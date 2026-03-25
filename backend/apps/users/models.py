from django.contrib.auth.models import AbstractUser, UserManager as DjangoUserManager
from django.db import models


class UserManager(DjangoUserManager):
    """Store NULL for missing email instead of ''.

    Django's default ``normalize_email`` maps None to '', which collides with
    ``unique=True`` on email: only one phone-only user could exist in SQLite.
    """

    def normalize_email(self, email):
        if email is None:
            return None
        stripped = str(email).strip()
        if not stripped:
            return None
        return super().normalize_email(stripped)


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

    objects = UserManager()

    class Meta:
        db_table = "users_user"

    @property
    def is_rider(self) -> bool:
        return self.role == self.Role.RIDER

    @property
    def is_cooperative_admin(self) -> bool:
        return self.role == self.Role.COOPERATIVE_ADMIN
