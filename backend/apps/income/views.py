from django.db.models import Sum
from django.db.models.functions import TruncMonth, TruncYear
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.mixins import CreateModelMixin
from rest_framework.response import Response

from apps.core.permissions import IsRider

from .models import IncomeRecord
from .serializers import IncomeRecordCreateSerializer, IncomeRecordSerializer


class IncomeRecordViewSet(CreateModelMixin, viewsets.ReadOnlyModelViewSet):
    """List, retrieve, and create income records. Create restricted to riders (self only)."""

    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return IncomeRecordCreateSerializer
        return IncomeRecordSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsRider()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            qs = IncomeRecord.objects.all()
        elif user.is_cooperative_admin:
            qs = IncomeRecord.objects.filter(cooperative__admins=user).distinct()
        elif user.is_rider:
            qs = IncomeRecord.objects.filter(rider=user)
        else:
            qs = IncomeRecord.objects.none()
        return qs.select_related("rider", "cooperative")

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """Return total income visible to the current user."""
        qs = self.get_queryset()
        total = qs.aggregate(total=Sum("amount"))["total"] or 0
        return Response({"total_income": str(total)})

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """
        Return income grouped by month or year.
        Query params:
          - group_by: 'month' (default) | 'year'
          - year: filter to a specific year (optional, only for group_by=month)
        """
        qs = self.get_queryset()
        group_by = request.query_params.get("group_by", "month")
        year = request.query_params.get("year")

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
