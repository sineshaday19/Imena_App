from django.db import IntegrityError
import logging

from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.cooperatives.models import CooperativeMembership

from .models import User
from .serializers import REGISTRATION_DUPLICATE_CONTACT, RegisterSerializer


logger = logging.getLogger(__name__)


def _registration_integrity_detail_and_code(exc: IntegrityError, role: str) -> tuple[str, str]:
    """Map DB integrity errors to an honest user message and a stable machine code."""
    text = str(exc).lower()
    role_l = (role or "rider").lower()

    if "cooperatives_membership" in text or "cooperatives_membership_" in text:
        return (
            "Registration could not finish linking your account to a cooperative. "
            "You may already be linked, or a partial signup exists—contact a system administrator.",
            "membership_conflict",
        )

    if "phone_number" in text or "users_user.phone_number" in text:
        return (REGISTRATION_DUPLICATE_CONTACT, "duplicate_phone")

    if (
        "users_user.email" in text
        or "users_user_email" in text
        or "email_key" in text
        or ('"email"' in text and "users_user" in text)
        or ("unique" in text and " email" in text and "users_user" in text)
    ):
        return (REGISTRATION_DUPLICATE_CONTACT, "duplicate_email")

    if "username" in text or "users_user.username" in text:
        if role_l == "administrator":
            return (REGISTRATION_DUPLICATE_CONTACT, "duplicate_email")
        return (
            "This login username is already taken. With phone-only signup, that is usually your phone number—"
            "try signing in, or ask an admin to check for a mismatched username vs phone in Django admin.",
            "duplicate_username",
        )

    if "unique constraint" in text or "duplicate key" in text or "duplicate entry" in text:
        if "email" in text and "phone" not in text:
            return (REGISTRATION_DUPLICATE_CONTACT, "duplicate_email")
        if "phone" in text or "phone_number" in text:
            return (REGISTRATION_DUPLICATE_CONTACT, "duplicate_phone")
        if "username" in text:
            if role_l == "administrator":
                return (REGISTRATION_DUPLICATE_CONTACT, "duplicate_email")
            return (
                "This login username is already taken. If you use your phone to log in, that number may already be registered.",
                "duplicate_username",
            )

    return (
        "Registration could not be completed because of a database conflict. "
        "If you are sure your details are new, contact a system administrator; they can match this to the exact error in server logs.",
        "registration_conflict",
    )


def _registration_integrity_user_message(exc: IntegrityError, role: str) -> str:
    """Backward-compatible wrapper for tests and callers that only need the message."""
    return _registration_integrity_detail_and_code(exc, role)[0]


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register(request):
    """Create a new user account (JSON body). Browser GET is not supported — use the app signup page or POST here."""
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        serializer.save()
    except IntegrityError as exc:
        logger.error("Registration IntegrityError: %s", exc, exc_info=True)
        role_str = request.data.get("role") or "rider"
        detail, error_code = _registration_integrity_detail_and_code(exc, str(role_str))
        return Response(
            {
                "detail": detail,
                "error_code": error_code,
                "integrity_error": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception:
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
    # Always read from DB (avoids stale reverse OneToOne descriptor on reused instances).
    membership = (
        CooperativeMembership.objects.filter(user_id=user.pk)
        .select_related("cooperative")
        .first()
    )
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
            "is_staff": user.is_staff,
            "is_member_verified": is_member_verified,
            "cooperative": cooperative_info,
        }
    )
