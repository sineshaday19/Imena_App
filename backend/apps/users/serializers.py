import os

from django.db import transaction
from rest_framework import serializers

from apps.cooperatives.models import Cooperative, CooperativeMembership

from .admin_invite_constants import ADMIN_REGISTRATION_INVITE_CODE
from .models import User
from .phone_utils import describe_phone_rule, normalize_phone_number

_LOGIN_USERNAME_MISMATCH = (
    "This number is already used as the login (username) on another account, "
    "but that account's phone field is different—often after editing in Django admin. "
    "Ask a system administrator to open that user and align Username with Phone number."
)

# Matches frontend `signup.errors.emailOrPhoneAlreadyExists` default (English).
REGISTRATION_DUPLICATE_CONTACT = "A user with this email or phone number already exists."


class RegisterSerializer(serializers.ModelSerializer):
    """Register a new user. Riders can use email or phone; admins require email. Riders must select a cooperative."""

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
    phone_number = serializers.CharField(write_only=True, max_length=64)

    class Meta:
        model = User
        fields = [
            "email",
            "phone_number",
            "password",
            "confirm_password",
            "full_name",
            "role",
            "cooperative_id",
            "cooperatives",
            "invite_code",
        ]

    email = serializers.EmailField(
        write_only=True,
        required=False,
        allow_null=True,
        allow_blank=True,
    )

    def validate_email(self, value):
        if not value or not str(value).strip():
            return None
        normalized = str(value).strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError(REGISTRATION_DUPLICATE_CONTACT)
        return normalized

    def validate_phone_number(self, value):
        raw = (value or "").strip()
        if not raw:
            raise serializers.ValidationError("Phone number is required.")
        normalized = normalize_phone_number(raw)
        if not normalized:
            raise serializers.ValidationError(describe_phone_rule())
        if User.objects.filter(phone_number=normalized).exists():
            raise serializers.ValidationError(REGISTRATION_DUPLICATE_CONTACT)
        return normalized

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
            expected = os.environ.get("ADMIN_INVITE_CODE", "").strip() or ADMIN_REGISTRATION_INVITE_CODE
            if attrs.get("invite_code", "") != expected:
                raise serializers.ValidationError(
                    {"invite_code": "Invalid invite code."}
                )

        email_clean = (attrs.get("email") or "").strip()
        phone_clean = (attrs.get("phone_number") or "").strip()
        login_username = email_clean.lower() if email_clean else phone_clean
        if login_username:
            existing = User.objects.filter(username__iexact=login_username).first()
            if existing:
                existing_phone = (existing.phone_number or "").strip()
                if existing_phone == phone_clean:
                    raise serializers.ValidationError(
                        {"phone_number": "A user with this phone number already exists."}
                    )
                if existing_phone != phone_clean and (existing_phone or phone_clean):
                    raise serializers.ValidationError({"phone_number": _LOGIN_USERNAME_MISMATCH})

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
        raw_email = validated_data.get("email")
        if raw_email is not None and not str(raw_email).strip():
            raw_email = None
        email = str(raw_email).strip().lower() if raw_email else None
        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({"email": REGISTRATION_DUPLICATE_CONTACT})
        username = email if email else phone_number
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
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
