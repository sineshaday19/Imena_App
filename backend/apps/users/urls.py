from django.urls import path

from .views import me, register

urlpatterns = [
    path("api/users/register/", register, name="user_register"),
    path("api/users/me/", me, name="user_me"),
]
