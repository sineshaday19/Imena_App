"""Tests for cooperative signup_choices and list."""
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.cooperatives.models import Cooperative, CooperativeMembership
from apps.users.models import User


class CooperativeTests(TestCase):
    """Test cooperative API."""

    def setUp(self):
        self.client = APIClient()
        self.coop = Cooperative.objects.create(name="Alpha Coop")
        Cooperative.objects.create(name="Beta Coop")
        self.rider = User.objects.create_user(
            username="+250788111111",
            phone_number="+250788111111",
            password="rider123",
            role=User.Role.RIDER,
        )
        CooperativeMembership.objects.create(user=self.rider, cooperative=self.coop)
        self.admin_user = User.objects.create_user(
            username="admin@test.com",
            email="admin@test.com",
            phone_number="+250788222222",
            password="admin123",
            role=User.Role.COOPERATIVE_ADMIN,
        )
        self.coop.admins.add(self.admin_user)

    def _auth_rider(self):
        refresh = RefreshToken.for_user(self.rider)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def _auth_admin(self):
        refresh = RefreshToken.for_user(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_signup_choices_public(self):
        """Signup choices returns cooperatives without auth."""
        resp = self.client.get("/api/cooperatives/signup_choices/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(len(data), 2)
        names = [c["name"] for c in data]
        self.assertIn("Alpha Coop", names)
        self.assertIn("Beta Coop", names)

    def test_rider_sees_own_cooperative(self):
        """Rider sees only their cooperative in list."""
        self._auth_rider()
        resp = self.client.get("/api/cooperatives/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        results = data.get("results", data) if isinstance(data, dict) else data
        coop_ids = [c["id"] for c in (results if isinstance(results, list) else [])]
        self.assertIn(self.coop.id, coop_ids)

    def test_verify_member_admin_toggle(self):
        """Admin can toggle member verification."""
        self._auth_admin()
        resp = self.client.post(
            "/api/cooperatives/{}/members/{}/verify/".format(
                self.coop.id, self.rider.id
            )
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("is_verified", resp.data)
        self.assertIn("id", resp.data)

    def test_verify_member_rider_forbidden(self):
        """Rider cannot verify members; gets 403."""
        self._auth_rider()
        resp = self.client.post(
            "/api/cooperatives/{}/members/{}/verify/".format(
                self.coop.id, self.rider.id
            )
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_verify_member_not_found(self):
        """Verify non-member returns 404."""
        other = User.objects.create_user(
            username="other@test.com",
            email="other@test.com",
            phone_number="+250788999999",
            password="x",
            role=User.Role.RIDER,
        )
        self._auth_admin()
        resp = self.client.post(
            "/api/cooperatives/{}/members/{}/verify/".format(self.coop.id, other.id)
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_cooperative_requires_staff(self):
        """Only staff/superuser can create cooperative; rider gets 403."""
        self._auth_rider()
        resp = self.client.post(
            "/api/cooperatives/",
            {"name": "New Coop"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
