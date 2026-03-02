from django.contrib import admin
from .models import Cooperative, CooperativeMembership


@admin.register(Cooperative)
class CooperativeAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")
    search_fields = ("name",)
    filter_horizontal = ("admins",)


@admin.register(CooperativeMembership)
class CooperativeMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "cooperative", "is_verified")
    list_filter = ("is_verified", "cooperative")
    search_fields = ("user__email", "user__phone_number", "cooperative__name")
    list_editable = ("is_verified",)  # Tick/untick directly in the list
    actions = ["mark_verified", "mark_unverified"]

    @admin.action(description="Verify selected members")
    def mark_verified(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f"{updated} membership(s) marked as verified.")

    @admin.action(description="Unverify selected members")
    def mark_unverified(self, request, queryset):
        updated = queryset.update(is_verified=False)
        self.message_user(request, f"{updated} membership(s) marked as unverified.")
