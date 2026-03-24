from rest_framework import permissions


class IsRider(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_rider
        )


def cooperative_admin_has_operational_data(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and user.is_cooperative_admin
        and user.is_staff
    )


class IsCooperativeAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_cooperative_admin
            and user.is_staff
        )
