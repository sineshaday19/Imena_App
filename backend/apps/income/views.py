from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.mixins import CreateModelMixin

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
        return (
            IncomeRecord.objects.filter(
                Q(rider=user) | Q(cooperative__admins=user)
            )
            .distinct()
            .select_related("rider", "cooperative")
        )
