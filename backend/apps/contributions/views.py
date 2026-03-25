from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.mixins import CreateModelMixin
from rest_framework.response import Response

from apps.core.permissions import IsCooperativeAdmin, IsRider, cooperative_admin_has_operational_data

from .models import Contribution
from .serializers import ContributionCreateSerializer, ContributionSerializer


class ContributionViewSet(CreateModelMixin, viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return ContributionCreateSerializer
        return ContributionSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsRider()]
        if self.action in ("verify", "unverify"):
            return [permissions.IsAuthenticated(), IsCooperativeAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Contribution.objects.all()
        if user.is_superuser:
            pass
        elif user.is_cooperative_admin:
            if cooperative_admin_has_operational_data(user):
                qs = qs.filter(cooperative__admins=user).distinct()
            else:
                qs = Contribution.objects.none()
        elif user.is_rider:
            qs = qs.filter(rider=user)
        else:
            qs = Contribution.objects.none()

        if not user.is_superuser and not user.is_rider:
            qs = qs.filter(rider__cooperative_membership__is_verified=True)

        return qs.select_related("rider", "cooperative")

    @action(detail=True, methods=["post"], url_path="verify")
    def verify(self, request, pk=None):
        contribution = self.get_object()
        if contribution.status != Contribution.Status.PENDING:
            return Response(
                {"detail": "Only PENDING contributions can be verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        contribution.status = Contribution.Status.VERIFIED
        contribution.save()
        serializer = self.get_serializer(contribution)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="unverify")
    def unverify(self, request, pk=None):
        contribution = self.get_object()
        if contribution.status != Contribution.Status.VERIFIED:
            return Response(
                {"detail": "Only VERIFIED contributions can be unverified."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        contribution.status = Contribution.Status.PENDING
        contribution.save()
        serializer = self.get_serializer(contribution)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="recent")
    def recent(self, request):
        qs = self.get_queryset().order_by("-date", "-created_at")[:10]
        return Response(self.get_serializer(qs, many=True).data)
