from rest_framework import serializers

from apps.cooperatives.models import Cooperative, CooperativeMembership

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    """Register a new user. Uses email as username. Riders must select a cooperative."""

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

    class Meta:
        model = User
        fields = ["email", "password", "confirm_password", "full_name", "role", "cooperative_id"]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        role_str = attrs.get("role", "rider")
        if role_str == "rider" and not attrs.get("cooperative_id"):
            raise serializers.ValidationError(
                {"cooperative_id": "Riders must select a cooperative."}
            )
        return attrs

    def create(self, validated_data):
        full_name = validated_data.pop("full_name", "") or ""
        role_str = validated_data.pop("role", "rider")
        cooperative_id = validated_data.pop("cooperative_id", None)
        role = User.Role.COOPERATIVE_ADMIN if role_str == "administrator" else User.Role.RIDER
        parts = full_name.strip().split(None, 1)
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""
        email = validated_data["email"]
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data["password"],
            first_name=first_name,
            last_name=last_name,
            role=role,
        )
        if role == User.Role.RIDER and cooperative_id:
            CooperativeMembership.objects.create(user=user, cooperative=cooperative_id)
        return user
