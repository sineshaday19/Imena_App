"""Role-based permission classes. Use User role helpers only."""
from rest_framework import permissions


class IsRider(permissions.BasePermission):
    """Allow only authenticated users with role RIDER."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_rider
        )


class IsCooperativeAdmin(permissions.BasePermission):
    """Allow only authenticated users with role COOPERATIVE_ADMIN who are staff.

    In practice this means:
    - User.role == COOPERATIVE_ADMIN
    - User.is_staff is True (set by a system administrator)
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_cooperative_admin
            and user.is_staff
        )
