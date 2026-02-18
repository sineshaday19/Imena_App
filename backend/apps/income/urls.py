from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import IncomeRecordViewSet

router = DefaultRouter()
router.register(r"income", IncomeRecordViewSet, basename="incomerecord")

urlpatterns = [
    path("api/", include(router.urls)),
]
