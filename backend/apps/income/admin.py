from django.contrib import admin
from .models import IncomeRecord


@admin.register(IncomeRecord)
class IncomeRecordAdmin(admin.ModelAdmin):
    list_display = ("rider", "cooperative", "date", "amount")
    list_filter = ("cooperative", "date")
    search_fields = ("rider__email", "cooperative__name")
    date_hierarchy = "date"
