from django.db.models import Sum
from django.db.models.functions import TruncMonth, TruncYear
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.mixins import CreateModelMixin
from rest_framework.response import Response

from apps.core.permissions import IsRider, cooperative_admin_has_operational_data

from .models import IncomeRecord
from .serializers import IncomeRecordCreateSerializer, IncomeRecordSerializer


class IncomeRecordViewSet(CreateModelMixin, viewsets.ReadOnlyModelViewSet):
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
        qs = IncomeRecord.objects.all()
        if user.is_superuser:
            pass
        elif user.is_cooperative_admin:
            if cooperative_admin_has_operational_data(user):
                qs = qs.filter(cooperative__admins=user).distinct()
            else:
                qs = IncomeRecord.objects.none()
        elif user.is_rider:
            qs = qs.filter(rider=user)
        else:
            qs = IncomeRecord.objects.none()

        if not user.is_superuser and not user.is_rider:
            qs = qs.filter(rider__cooperative_membership__is_verified=True)

        return qs.select_related("rider", "cooperative")

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        qs = self.get_queryset()
        date_str = request.query_params.get("date")
        if date_str:
            try:
                from datetime import datetime
                dt = datetime.strptime(date_str, "%Y-%m-%d").date()
                qs = qs.filter(date=dt)
            except ValueError:
                pass
        total = qs.aggregate(total=Sum("amount"))["total"] or 0
        return Response({"total_income": str(total)})

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
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

    @action(detail=False, methods=["get"], url_path="recent")
    def recent(self, request):
        from .serializers import IncomeRecordSerializer
        qs = self.get_queryset().order_by("-date", "-id")[:10]
        return Response(IncomeRecordSerializer(qs, many=True).data)
