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
    """Allow only authenticated users with role COOPERATIVE_ADMIN."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_cooperative_admin
        )
