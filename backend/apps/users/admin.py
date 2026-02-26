from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (*BaseUserAdmin.list_display, "phone_number", "role")
    list_filter = (*BaseUserAdmin.list_filter, "role")
    search_fields = (*BaseUserAdmin.search_fields, "phone_number")
    fieldsets = BaseUserAdmin.fieldsets + (
        (None, {"fields": ("phone_number", "role")}),
    )
