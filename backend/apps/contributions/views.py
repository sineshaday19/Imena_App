from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.mixins import CreateModelMixin
from rest_framework.response import Response

from apps.core.permissions import IsCooperativeAdmin, IsRider

from .models import Contribution
from .serializers import ContributionCreateSerializer, ContributionSerializer


class ContributionViewSet(CreateModelMixin, viewsets.ReadOnlyModelViewSet):
    """List, retrieve, create, and verify contributions. Create=riders; verify=admins."""

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
            qs = qs.filter(cooperative__admins=user).distinct()
        elif user.is_rider:
            qs = qs.filter(rider=user)
        else:
            qs = Contribution.objects.none()

        # For non-superusers, only include contributions from verified members
        if not user.is_superuser:
            qs = qs.filter(rider__cooperative_membership__is_verified=True)

        return qs.select_related("rider", "cooperative")

    @action(detail=True, methods=["post"], url_path="verify")
    def verify(self, request, pk=None):
        """Set contribution status to VERIFIED. Only admins of the cooperative; only PENDING."""
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
        """Set contribution status back to PENDING. Only admins; only VERIFIED."""
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
        """Return last 10 contributions for admin overview (amount, date, rider)."""
        qs = self.get_queryset().order_by("-date", "-created_at")[:10]
        return Response(self.get_serializer(qs, many=True).data)
