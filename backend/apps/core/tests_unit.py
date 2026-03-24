from unittest.mock import Mock
from django.test import SimpleTestCase
from apps.core.permissions import IsCooperativeAdmin, IsRider

class PermissionUnitTests(SimpleTestCase):

    def test_is_rider_allows_rider(self):
        req = Mock()
        req.user = Mock(is_authenticated=True, is_rider=True)
        self.assertTrue(IsRider().has_permission(req, None))

    def test_is_cooperative_admin_requires_staff(self):
        req = Mock()
        req.user = Mock(is_authenticated=True, is_cooperative_admin=True, is_staff=False)
        self.assertFalse(IsCooperativeAdmin().has_permission(req, None))
