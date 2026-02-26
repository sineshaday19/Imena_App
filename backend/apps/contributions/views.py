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
        if self.action == "verify":
            return [permissions.IsAuthenticated(), IsCooperativeAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            qs = Contribution.objects.all()
        elif user.is_cooperative_admin:
            qs = Contribution.objects.filter(cooperative__admins=user).distinct()
        elif user.is_rider:
            qs = Contribution.objects.filter(rider=user)
        else:
            qs = Contribution.objects.none()
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
