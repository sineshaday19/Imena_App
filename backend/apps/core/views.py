"""Read-only report endpoints. Aggregations at DB level; visibility by rider/admin."""
from django.db.models import Case, Count, DecimalField, Q, Sum, Value, When

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.contributions.models import Contribution
from apps.income.models import IncomeRecord


def _income_queryset(user):
    return IncomeRecord.objects.filter(
        Q(rider=user) | Q(cooperative__admins=user)
    ).distinct()


def _contribution_queryset(user):
    return Contribution.objects.filter(
        Q(rider=user) | Q(cooperative__admins=user)
    ).distinct()


class ReportViewSet(viewsets.ViewSet):
    """Read-only reports: income and contribution summaries."""

    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="income-by-rider")
    def income_by_rider(self, request):
        """Income totals per rider (and cooperative) in date range. Visibility: rider=self, admin=cooperatives they admin."""
        user = request.user
        date_from = request.query_params.get("from")
        date_to = request.query_params.get("to")
        qs = _income_queryset(user).values(
            "rider_id", "rider__email", "cooperative_id", "cooperative__name"
        ).annotate(total=Sum("amount"))
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        rows = [
            {
                "rider_id": r["rider_id"],
                "rider_email": r["rider__email"],
                "cooperative_id": r["cooperative_id"],
                "cooperative_name": r["cooperative__name"],
                "total": r["total"],
            }
            for r in qs.order_by("rider_id", "cooperative_id")
        ]
        return Response({"results": rows})

    @action(detail=False, methods=["get"], url_path="income-by-cooperative")
    def income_by_cooperative(self, request):
        """Income totals per cooperative in date range. Visibility: rider=self coop, admin=cooperatives they admin."""
        user = request.user
        date_from = request.query_params.get("from")
        date_to = request.query_params.get("to")
        qs = _income_queryset(user).values(
            "cooperative_id", "cooperative__name"
        ).annotate(total=Sum("amount"))
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        rows = [
            {
                "cooperative_id": r["cooperative_id"],
                "cooperative_name": r["cooperative__name"],
                "total": r["total"],
            }
            for r in qs.order_by("cooperative_id")
        ]
        return Response({"results": rows})

    @action(detail=False, methods=["get"], url_path="contributions-summary")
    def contributions_summary(self, request):
        """Total contributions and pending vs verified totals. Optional date range. Visibility: rider=self, admin=cooperatives they admin."""
        user = request.user
        date_from = request.query_params.get("from")
        date_to = request.query_params.get("to")
        qs = _contribution_queryset(user)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        agg = qs.aggregate(
            total_amount=Sum("amount"),
            total_count=Count("id"),
            pending_amount=Sum(
                Case(
                    When(status=Contribution.Status.PENDING, then="amount"),
                    default=Value(0),
                    output_field=DecimalField(),
                )
            ),
            pending_count=Count(
                Case(When(status=Contribution.Status.PENDING, then=1))
            ),
            verified_amount=Sum(
                Case(
                    When(status=Contribution.Status.VERIFIED, then="amount"),
                    default=Value(0),
                    output_field=DecimalField(),
                )
            ),
            verified_count=Count(
                Case(When(status=Contribution.Status.VERIFIED, then=1))
            ),
        )
        # Sum/Count return None when no rows
        for key in agg:
            if agg[key] is None:
                agg[key] = 0
        return Response(agg)
