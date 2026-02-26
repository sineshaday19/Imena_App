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
    search_fields = ("user__email", "cooperative__name")
