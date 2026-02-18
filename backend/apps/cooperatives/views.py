from django.db.models import Prefetch, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Cooperative, CooperativeMembership
from .serializers import CooperativeCreateSerializer, CooperativeSerializer


class CooperativeViewSet(viewsets.ModelViewSet):
    """List, retrieve, create cooperatives. Create restricted to cooperative admins."""

    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return CooperativeCreateSerializer
        return CooperativeSerializer

    def get_queryset(self):
        user = self.request.user
        return (
            Cooperative.objects.filter(
                Q(members__user=user) | Q(admins=user)
            )
            .distinct()
            .prefetch_related(
                Prefetch("members", queryset=CooperativeMembership.objects.select_related("user")),
                "admins",
            )
        )

    def create(self, request, *args, **kwargs):
        if request.user.role != "COOPERATIVE_ADMIN":
            return Response(
                {"detail": "Only cooperative administrators can create cooperatives."},
                status=status.HTTP_403_FORBIDDEN,
            )
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
