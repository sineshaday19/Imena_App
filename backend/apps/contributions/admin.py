from django.contrib import admin
from .models import Contribution


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = ("rider", "cooperative", "date", "amount", "status")
    list_filter = ("cooperative", "status", "date")
    search_fields = ("rider__email", "rider__phone_number", "cooperative__name")
    date_hierarchy = "date"
    ordering = ("-date", "-created_at")
