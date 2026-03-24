from django.contrib.auth import authenticate

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        raw = (attrs.get("username") or "").strip()
        password = attrs.get("password", "")
        if not raw:
            from rest_framework import serializers
            raise serializers.ValidationError({"username": "Email or phone number is required."})

        user = User.objects.filter(email__iexact=raw).first()
        if user is None:
            user = User.objects.filter(phone_number=raw).first()

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
