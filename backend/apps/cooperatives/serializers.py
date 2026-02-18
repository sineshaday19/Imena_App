from rest_framework import serializers

from .models import Cooperative


class CooperativeCreateSerializer(serializers.ModelSerializer):
    """Create a new cooperative. Caller is added as admin."""

    class Meta:
        model = Cooperative
        fields = ["name"]


class CooperativeSerializer(serializers.ModelSerializer):
    """Read-only cooperative with members and admins (minimal user info)."""

    members = serializers.SerializerMethodField()
    admins = serializers.SerializerMethodField()

    class Meta:
        model = Cooperative
        fields = ["id", "name", "created_at", "updated_at", "members", "admins"]
        read_only_fields = fields

    def get_members(self, obj):
        return [
            {"id": m.user_id, "email": m.user.email}
            for m in obj.members.select_related("user").all()
        ]

    def get_admins(self, obj):
        return [{"id": u.id, "email": u.email} for u in obj.admins.all()]
