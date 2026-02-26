from django.db.models import Prefetch
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Cooperative, CooperativeMembership
from .serializers import CooperativeCreateSerializer, CooperativeSerializer


class CooperativeViewSet(viewsets.ModelViewSet):
    """List, retrieve cooperatives by role. Create restricted to superuser/staff only."""

    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return CooperativeCreateSerializer
        return CooperativeSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAdminUser()]
        if self.action == "signup_choices":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            qs = Cooperative.objects.all()
        elif user.is_cooperative_admin:
            qs = Cooperative.objects.filter(admins=user)
        elif user.is_rider:
            qs = Cooperative.objects.filter(members__user=user).distinct()
        else:
            qs = Cooperative.objects.none()

        return qs.prefetch_related(
            Prefetch("members", queryset=CooperativeMembership.objects.select_related("user")),
            "admins",
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        coop = serializer.save()
        coop.admins.add(request.user)
        return Response(
            CooperativeSerializer(coop).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def signup_choices(self, request):
        """Public list of cooperatives for signup form (id, name only)."""
        try:
            coops = Cooperative.objects.all().values("id", "name").order_by("name")
            return Response(list(coops))
        except Exception:
            return Response([])

    @action(detail=True, methods=["post"], url_path="members/(?P<member_id>[^/.]+)/verify")
    def verify_member(self, request, pk=None, member_id=None):
        """Toggle verification status of a membership. Admin only."""
        if request.user.role != "COOPERATIVE_ADMIN":
            return Response(
                {"detail": "Only cooperative administrators can verify members."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            membership = CooperativeMembership.objects.get(
                cooperative_id=pk, user_id=member_id
            )
        except CooperativeMembership.DoesNotExist:
            return Response({"detail": "Member not found."}, status=status.HTTP_404_NOT_FOUND)
        membership.is_verified = not membership.is_verified
        membership.save(update_fields=["is_verified"])
        return Response({"id": membership.user_id, "is_verified": membership.is_verified})
