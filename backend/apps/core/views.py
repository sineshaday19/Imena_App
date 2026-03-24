from django.db.models import Case, Count, DecimalField, Sum, Value, When
from django.db.models.functions import TruncMonth, TruncYear

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.contributions.models import Contribution
from apps.income.models import IncomeRecord


def _income_queryset(user):
    qs = IncomeRecord.objects.all()
    if user.is_superuser:
        pass
    elif user.is_cooperative_admin:
        qs = qs.filter(cooperative__admins=user).distinct()
    elif user.is_rider:
        qs = qs.filter(rider=user)
    else:
        qs = IncomeRecord.objects.none()

    if not user.is_superuser:
        qs = qs.filter(rider__cooperative_membership__is_verified=True)

    return qs


def _contribution_queryset(user):
    qs = Contribution.objects.all()
    if user.is_superuser:
        pass
    elif user.is_cooperative_admin:
        qs = qs.filter(cooperative__admins=user).distinct()
    elif user.is_rider:
        qs = qs.filter(rider=user)
    else:
        qs = Contribution.objects.none()

    if not user.is_superuser:
        qs = qs.filter(rider__cooperative_membership__is_verified=True)

    return qs


class ReportViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="income-by-rider")
    def income_by_rider(self, request):
        user = request.user
        if not (user.is_authenticated and (user.is_superuser or (user.is_cooperative_admin and user.is_staff))):
            return Response(
                {"detail": "Only verified cooperative administrators can view this report."},
                status=status.HTTP_403_FORBIDDEN,
            )
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
        user = request.user
        if not (user.is_authenticated and (user.is_superuser or (user.is_cooperative_admin and user.is_staff))):
            return Response(
                {"detail": "Only verified cooperative administrators can view this report."},
                status=status.HTTP_403_FORBIDDEN,
            )
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
        user = request.user
        if not (user.is_authenticated and (user.is_superuser or (user.is_cooperative_admin and user.is_staff))):
            return Response(
                {"detail": "Only verified cooperative administrators can view this report."},
                status=status.HTTP_403_FORBIDDEN,
            )
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
        for key in agg:
            if agg[key] is None:
                agg[key] = 0
        return Response(agg)

    @action(detail=False, methods=["get"], url_path="contributions-stats")
    def contributions_stats(self, request):
        user = request.user
        if not (user.is_authenticated and (user.is_superuser or (user.is_cooperative_admin and user.is_staff))):
            return Response(
                {"detail": "Only verified cooperative administrators can view this report."},
                status=status.HTTP_403_FORBIDDEN,
            )
        group_by = request.query_params.get("group_by", "month")
        year = request.query_params.get("year")
        verified_only = request.query_params.get("verified", "1") == "1"
        qs = _contribution_queryset(user)
        if verified_only:
            qs = qs.filter(status=Contribution.Status.VERIFIED)
        if group_by == "year":
            rows = (
                qs.annotate(period=TruncYear("date"))
                .values("period")
                .annotate(total=Sum("amount"))
                .order_by("period")
            )
            data = [
                {"period": row["period"].strftime("%Y"), "total": str(row["total"] or 0)}
                for row in rows
            ]
        else:
            if year:
                qs = qs.filter(date__year=year)
            rows = (
                qs.annotate(period=TruncMonth("date"))
                .values("period")
                .annotate(total=Sum("amount"))
                .order_by("period")
            )
            data = [
                {"period": row["period"].strftime("%Y-%m"), "total": str(row["total"] or 0)}
                for row in rows
            ]
        return Response({"group_by": group_by, "data": data})
