from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ContributionViewSet

router = DefaultRouter()
router.register(r"contributions", ContributionViewSet, basename="contribution")

urlpatterns = [
    path("api/", include(router.urls)),
]
