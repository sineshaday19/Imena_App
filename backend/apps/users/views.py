from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

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
    """Return current user id, email, and role."""
    user: User = request.user
    return Response(
        {
            "id": user.id,
            "email": user.email,
            "role": user.role,
        }
    )
