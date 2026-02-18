"""Root URL configuration."""
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("", include("apps.users.urls")),
    path("", include("apps.cooperatives.urls")),
    path("", include("apps.income.urls")),
    path("", include("apps.contributions.urls")),
    path("", include("apps.core.urls")),
]
