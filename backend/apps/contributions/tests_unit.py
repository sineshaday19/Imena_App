from unittest.mock import Mock
from django.test import SimpleTestCase
from rest_framework import status
from apps.contributions.models import Contribution
from apps.contributions.views import ContributionViewSet

class ContributionVerifyUnitTests(SimpleTestCase):

    def test_verify_already_verified_rejected(self):
        view = ContributionViewSet()
        request = Mock()
        contribution = Mock()
        contribution.status = Contribution.Status.VERIFIED
        view.get_object = Mock(return_value=contribution)
        resp = view.verify(request, pk='1')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
