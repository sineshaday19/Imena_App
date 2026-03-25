from django.db import IntegrityError
from rest_framework import serializers

from apps.cooperatives.models import CooperativeMembership

from .models import Contribution


class ContributionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contribution
        fields = ["cooperative", "date", "amount"]

    def validate_cooperative(self, value):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")
        try:
            membership = request.user.cooperative_membership
        except CooperativeMembership.DoesNotExist:
            raise serializers.ValidationError(
                "You have no cooperative membership. Only riders can create contributions."
            )
        if membership.cooperative_id != value.id:
            raise serializers.ValidationError(
                "You can only create contributions for your own cooperative."
            )
        if not membership.is_verified:
            raise serializers.ValidationError(
                "Your cooperative membership is not verified yet. Please contact your cooperative administrator."
            )
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        cooperative = attrs["cooperative"]
        day = attrs["date"]
        if Contribution.objects.filter(
            rider=request.user,
            cooperative=cooperative,
            date=day,
        ).exists():
            raise serializers.ValidationError(
                {"date": "You already have a contribution for this cooperative and date."}
            )
        return attrs

    def create(self, validated_data):
        validated_data["rider"] = self.context["request"].user
        validated_data["status"] = Contribution.Status.PENDING
        try:
            return super().create(validated_data)
        except IntegrityError:
            raise serializers.ValidationError(
                {
                    "date": "You already have a contribution for this cooperative and date.",
                }
            ) from None


class ContributionSerializer(serializers.ModelSerializer):
    rider = serializers.SerializerMethodField()
    cooperative = serializers.SerializerMethodField()

    class Meta:
        model = Contribution
        fields = [
            "id",
            "rider",
            "cooperative",
            "date",
            "amount",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_rider(self, obj):
        email = obj.rider.email or ""
        phone = getattr(obj.rider, "phone_number", "") or ""
        return {"id": obj.rider_id, "email": email, "phone_number": phone}

    def get_cooperative(self, obj):
        return {"id": obj.cooperative_id, "name": obj.cooperative.name}
