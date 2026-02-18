from django.conf import settings
from django.db import models


class Cooperative(models.Model):
    """One cooperative; has many riders (via membership) and one or more admins."""

    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    admins = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="administered_cooperatives",
        blank=True,
    )

    class Meta:
        db_table = "cooperatives_cooperative"
        ordering = ["name"]

    def __str__(self):
        return self.name


class CooperativeMembership(models.Model):
    """Links a rider to a single cooperative. One user, one cooperative."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cooperative_membership",
    )
    cooperative = models.ForeignKey(
        Cooperative,
        on_delete=models.CASCADE,
        related_name="members",
    )

    class Meta:
        db_table = "cooperatives_membership"

    def __str__(self):
        return f"{self.user} @ {self.cooperative}"
