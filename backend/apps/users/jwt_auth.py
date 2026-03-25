"""
Custom JWT token obtain view that accepts email or phone number as the identifier.
Django's default auth uses username; we resolve email/phone to the stored username.
"""

from django.contrib.auth import authenticate

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .phone_utils import PHONE_DIGIT_COUNT, digits_only


def _resolve_user_for_login(raw: str):
    """Match email, or phone as stored (10 digits) or legacy formatted strings."""
    user = User.objects.filter(email__iexact=raw).first()
    if user:
        return user
    digits = digits_only(raw)
    if len(digits) == PHONE_DIGIT_COUNT:
        user = User.objects.filter(phone_number=digits).first()
        if user:
            return user
    user = User.objects.filter(phone_number=raw).first()
    if user:
        return user
    user = User.objects.filter(username__iexact=raw).first()
    if user:
        return user
    if len(digits) == PHONE_DIGIT_COUNT:
        return User.objects.filter(username__iexact=digits).first()
    return None


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Accepts 'username' which can be either email or phone_number."""

    def validate(self, attrs):
        raw = (attrs.get("username") or "").strip()
        password = attrs.get("password", "")
        if not raw:
            from rest_framework import serializers
            raise serializers.ValidationError({"username": "Email or phone number is required."})

        user = _resolve_user_for_login(raw)

        if user is None:
            from rest_framework_simplejwt.exceptions import AuthenticationFailed
            raise AuthenticationFailed(
                "No active account found with the given credentials",
                "no_active_account",
            )

        authenticated = authenticate(
            request=self.context.get("request"),
            username=user.username,
            password=password,
        )
        if authenticated is None:
            from rest_framework_simplejwt.exceptions import AuthenticationFailed
            raise AuthenticationFailed(
                "No active account found with the given credentials",
                "no_active_account",
            )

        attrs["username"] = user.username
        return super().validate(attrs)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
