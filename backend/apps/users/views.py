from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.cooperatives.models import CooperativeMembership

from .models import User
from .serializers import RegisterSerializer


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register(request):
    """Create a new user account."""
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(
        {"detail": "Account created successfully. You can now log in."},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    """Return current user id, email, phone_number, role, and membership status."""
    user: User = request.user
    is_member_verified = False
    cooperative_info = None
    try:
        membership = user.cooperative_membership
    except CooperativeMembership.DoesNotExist:
        membership = None

    if membership is not None:
        is_member_verified = bool(membership.is_verified)
        cooperative_info = {
            "id": membership.cooperative_id,
            "name": membership.cooperative.name,
        }

    return Response(
        {
            "id": user.id,
            "email": user.email or "",
            "phone_number": user.phone_number,
            "role": user.role,
            "is_superuser": user.is_superuser,
            "is_member_verified": is_member_verified,
            "cooperative": cooperative_info,
        }
    )
