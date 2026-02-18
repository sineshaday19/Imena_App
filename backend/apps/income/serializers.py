from rest_framework import serializers

from apps.cooperatives.models import CooperativeMembership

from .models import IncomeRecord


class IncomeRecordSerializer(serializers.ModelSerializer):
    """Read-only income record with rider and cooperative info."""

    rider = serializers.SerializerMethodField()
    cooperative = serializers.SerializerMethodField()

    class Meta:
        model = IncomeRecord
        fields = ["id", "rider", "cooperative", "date", "amount"]
        read_only_fields = fields

    def get_rider(self, obj):
        return {"id": obj.rider_id, "email": obj.rider.email}

    def get_cooperative(self, obj):
        return {"id": obj.cooperative_id, "name": obj.cooperative.name}


class IncomeRecordCreateSerializer(serializers.ModelSerializer):
    """Create income record. Rider is set from request.user; cooperative must be rider's."""

    class Meta:
        model = IncomeRecord
        fields = ["cooperative", "date", "amount"]

    def validate_cooperative(self, value):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")
        try:
            membership = request.user.cooperative_membership
        except CooperativeMembership.DoesNotExist:
            raise serializers.ValidationError(
                "You have no cooperative membership. Only riders can create income."
            )
        if membership.cooperative_id != value.id:
            raise serializers.ValidationError(
                "You can only create income for your own cooperative."
            )
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        cooperative = attrs["cooperative"]
        date = attrs["date"]
        if IncomeRecord.objects.filter(
            rider=request.user,
            cooperative=cooperative,
            date=date,
        ).exists():
            raise serializers.ValidationError(
                {"date": "You already have an income record for this cooperative and date."}
            )
        return attrs

    def create(self, validated_data):
        validated_data["rider"] = self.context["request"].user
        return super().create(validated_data)
