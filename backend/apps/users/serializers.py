from django.db import transaction
from rest_framework import serializers

from apps.cooperatives.models import Cooperative, CooperativeMembership

from .admin_invite_constants import ADMIN_REGISTRATION_INVITE_CODE
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True, required=False, default="")
    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})
    confirm_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    role = serializers.ChoiceField(
        choices=[("rider", "Rider"), ("administrator", "Administrator")],
        default="rider",
        required=False,
    )
    cooperative_id = serializers.PrimaryKeyRelatedField(
        queryset=Cooperative.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    cooperatives = serializers.PrimaryKeyRelatedField(
        queryset=Cooperative.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    invite_code = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        default="",
    )
    phone_number = serializers.CharField(write_only=True, max_length=15)

    class Meta:
        model = User
        fields = ["email", "phone_number", "password", "confirm_password", "full_name", "role", "cooperative_id", "cooperatives", "invite_code"]

    def validate_email(self, value):
        if not value or not value.strip():
            return None
        if User.objects.filter(email__iexact=value.strip()).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.strip().lower()

    def validate_phone_number(self, value):
        raw = (value or "").strip()
        if not raw:
            raise serializers.ValidationError("Phone number is required.")
        if User.objects.filter(phone_number=raw).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return raw

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        role_str = attrs.get("role", "rider")
        if role_str == "rider":
            if not attrs.get("cooperative_id"):
                raise serializers.ValidationError(
                    {"cooperative_id": "Riders must select a cooperative."}
                )
            if not (attrs.get("phone_number") or "").strip():
                raise serializers.ValidationError(
                    {"phone_number": "Riders must provide a phone number."}
                )
        else:
            email = (attrs.get("email") or "").strip()
            if not email:
                raise serializers.ValidationError(
                    {"email": "Administrators must provide an email."}
                )
            if not (attrs.get("phone_number") or "").strip():
                raise serializers.ValidationError(
                    {"phone_number": "Phone number is required."}
                )
            cooperatives = attrs.get("cooperatives") or []
            if not cooperatives:
                raise serializers.ValidationError(
                    {"cooperatives": "Administrators must select at least one cooperative."}
                )
        if role_str == "administrator":
            if attrs.get("invite_code", "") != ADMIN_REGISTRATION_INVITE_CODE:
                raise serializers.ValidationError(
                    {"invite_code": "Invalid invite code."}
                )

        email_clean = (attrs.get("email") or "").strip()
        phone_clean = (attrs.get("phone_number") or "").strip()
        proposed_username = email_clean.lower() if email_clean else phone_clean
        existing_login = User.objects.filter(username=proposed_username).first()
        if existing_login and existing_login.phone_number != phone_clean:
            raise serializers.ValidationError(
                {
                    "phone_number": (
                        "This number is already used as the login (username) on another account, "
                        "but that account's phone field is different—often after editing in Django admin. "
                        "Ask a system administrator to open that user and align Username with Phone number."
                    )
                }
            )

        attrs.pop("invite_code", None)
        return attrs

    def create(self, validated_data):
        full_name = validated_data.pop("full_name", "") or ""
        role_str = validated_data.pop("role", "rider")
        cooperative_id = validated_data.pop("cooperative_id", None)
        cooperatives = validated_data.pop("cooperatives", []) or []
        phone_number = (validated_data.pop("phone_number", "") or "").strip()
        role = User.Role.COOPERATIVE_ADMIN if role_str == "administrator" else User.Role.RIDER
        parts = full_name.strip().split(None, 1)
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""
        email = validated_data.get("email")
        username = email or phone_number
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email or None,
                password=validated_data["password"],
                first_name=first_name,
                last_name=last_name,
                role=role,
                phone_number=phone_number,
            )
            if role == User.Role.RIDER and cooperative_id:
                CooperativeMembership.objects.create(user=user, cooperative=cooperative_id)
            if role == User.Role.COOPERATIVE_ADMIN:
                for coop in cooperatives:
                    coop.admins.add(user)
        return user
