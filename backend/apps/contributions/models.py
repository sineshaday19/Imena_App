from decimal import Decimal

from django.conf import settings
from django.db import models


class Contribution(models.Model):
    """Contribution by a rider to a cooperative; amount and date, with admin verification."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"

    rider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="contributions",
    )
    cooperative = models.ForeignKey(
        "cooperatives.Cooperative",
        on_delete=models.CASCADE,
        related_name="contributions",
    )
    date = models.DateField()
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "contributions_contribution"
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.rider} @ {self.cooperative} on {self.date}: {self.amount} ({self.status})"
