from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CooperativeViewSet

router = DefaultRouter()
router.register(r"cooperatives", CooperativeViewSet, basename="cooperative")

urlpatterns = [
    path("api/", include(router.urls)),
]
