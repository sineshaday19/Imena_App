from django.db import IntegrityError
import logging

from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.cooperatives.models import CooperativeMembership

from .models import User
from .serializers import RegisterSerializer


logger = logging.getLogger(__name__)


def _registration_integrity_user_message(exc: IntegrityError, role: str) -> str:
    """
    Rare race or DB-level unique violations: return the same prose as RegisterSerializer
    so clients can map duplicate phone vs email without always showing the combined line.
    """
    text = str(exc).lower()
    role_l = (role or "rider").lower()

    if "phone_number" in text:
        return "A user with this phone number already exists."

    if "email_key" in text or "users_user.email" in text or "users_user_email" in text:
        return "A user with this email already exists."

    if "username" in text:
        if role_l == "administrator":
            return "A user with this email already exists."
        return "A user with this phone number already exists."

    return "A user with this email or phone number already exists."


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register(request):
    """Create a new user account."""
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        serializer.save()
    except IntegrityError as integrity_exc:
        role_str = request.data.get("role") or "rider"
        return Response(
            {"detail": _registration_integrity_user_message(integrity_exc, str(role_str))},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception:
        # Avoid leaking a 500 HTML page to the frontend; log and send JSON
        logger.exception("Unexpected error while registering user")
        return Response(
            {"detail": "Server error while creating account. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
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
