from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.cooperatives.models import Cooperative, CooperativeMembership

from .models import User


class UserAddForm(forms.ModelForm):
    """Add user form: cooperative for riders (membership), cooperatives for admins (admin of)."""
    cooperative = forms.ModelChoiceField(
        queryset=Cooperative.objects.all(),
        required=False,
        empty_label="(For riders – pick one)",
        label="Cooperative (rider membership)",
    )
    cooperatives = forms.ModelMultipleChoiceField(
        queryset=Cooperative.objects.all(),
        required=False,
        label="Cooperatives to administer (for cooperative admins)",
        widget=forms.SelectMultiple(attrs={"size": 6}),
    )

    class Meta:
        model = User
        fields = ("username", "email", "phone_number", "role")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["password1"] = forms.CharField(
            widget=forms.PasswordInput,
            label="Password",
            min_length=8,
        )
        self.fields["password2"] = forms.CharField(
            widget=forms.PasswordInput,
            label="Password confirmation",
        )

    def clean(self):
        data = super().clean()
        if data.get("password1") != data.get("password2"):
            raise forms.ValidationError({"password2": "Passwords do not match."})
        return data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_form = UserAddForm
    list_display = (*BaseUserAdmin.list_display, "phone_number", "role")
    list_filter = (*BaseUserAdmin.list_filter, "role")
    search_fields = (*BaseUserAdmin.search_fields, "phone_number")
    fieldsets = BaseUserAdmin.fieldsets + (
        (None, {"fields": ("phone_number", "role")}),
    )
    add_fieldsets = (
        (None, {"fields": ("username", "password1", "password2")}),
        ("Profile", {"fields": ("email", "phone_number", "role", "cooperative", "cooperatives")}),
    )

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change:
            return
        # Rider: create cooperative membership (unverified) so they show in Cooperative memberships
        if obj.role == User.Role.RIDER and form.cleaned_data.get("cooperative"):
            coop = form.cleaned_data["cooperative"]
            CooperativeMembership.objects.get_or_create(
                user=obj,
                defaults={"cooperative": coop, "is_verified": False},
            )
        # Cooperative admin: add to selected cooperatives' admins (same as frontend signup)
        if obj.role == User.Role.COOPERATIVE_ADMIN and form.cleaned_data.get("cooperatives"):
            for coop in form.cleaned_data["cooperatives"]:
                coop.admins.add(obj)
