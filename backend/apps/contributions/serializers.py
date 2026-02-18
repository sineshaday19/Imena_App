from rest_framework import serializers

from apps.cooperatives.models import CooperativeMembership

from .models import Contribution


class ContributionCreateSerializer(serializers.ModelSerializer):
    """Create contribution. Rider and status set from request; cooperative must be rider's."""

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
        return value

    def create(self, validated_data):
        validated_data["rider"] = self.context["request"].user
        validated_data["status"] = Contribution.Status.PENDING
        return super().create(validated_data)


class ContributionSerializer(serializers.ModelSerializer):
    """Read-only contribution with rider and cooperative info."""

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
        return {"id": obj.rider_id, "email": obj.rider.email}

    def get_cooperative(self, obj):
        return {"id": obj.cooperative_id, "name": obj.cooperative.name}
