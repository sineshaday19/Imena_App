from decimal import Decimal

from django.conf import settings
from django.db import models


class IncomeRecord(models.Model):
    """Income for a rider in a cooperative on a specific day."""

    rider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="income_records",
    )
    cooperative = models.ForeignKey(
        "cooperatives.Cooperative",
        on_delete=models.CASCADE,
        related_name="income_records",
    )
    date = models.DateField()
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
    )

    class Meta:
        db_table = "income_incomerecord"
        ordering = ["-date", "rider"]
        constraints = [
            models.UniqueConstraint(
                fields=["rider", "cooperative", "date"],
                name="unique_income_per_rider_coop_day",
            )
        ]

    def __str__(self):
        return f"{self.rider} @ {self.cooperative} on {self.date}: {self.amount}"
