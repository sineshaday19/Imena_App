"""Tests for contribution API."""
from datetime import date

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.cooperatives.models import Cooperative, CooperativeMembership
from apps.contributions.models import Contribution
from apps.users.models import User


class ContributionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.coop = Cooperative.objects.create(name="Test Coop")
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
        r = RefreshToken.for_user(self.rider)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + str(r.access_token))

    def _auth_admin(self):
        r = RefreshToken.for_user(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + str(r.access_token))

    def test_create_contribution_as_rider(self):
        self._auth_rider()
        payload = {"cooperative": self.coop.id, "date": "2026-02-26", "amount": "5000"}
        resp = self.client.post("/api/contributions/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Contribution.objects.filter(rider=self.rider, amount=5000).exists())

    def test_create_contribution_requires_auth(self):
        payload = {"cooperative": self.coop.id, "date": "2026-02-26", "amount": "5000"}
        resp = self.client.post("/api/contributions/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_verify_contribution(self):
        c = Contribution.objects.create(
            rider=self.rider, cooperative=self.coop, date=date.today(), amount=5000
        )
        self._auth_admin()
        resp = self.client.post("/api/contributions/{}/verify/".format(c.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        c.refresh_from_db()
        self.assertEqual(c.status, Contribution.Status.VERIFIED)

    def test_rider_cannot_verify(self):
        """Rider cannot call verify; only admin can."""
        c = Contribution.objects.create(
            rider=self.rider, cooperative=self.coop, date=date.today(), amount=5000
        )
        self._auth_rider()
        resp = self.client.post("/api/contributions/{}/verify/".format(c.id))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_unverify_contribution(self):
        """Admin can unverify a VERIFIED contribution."""
        c = Contribution.objects.create(
            rider=self.rider,
            cooperative=self.coop,
            date=date.today(),
            amount=5000,
            status=Contribution.Status.VERIFIED,
        )
        self._auth_admin()
        resp = self.client.post("/api/contributions/{}/unverify/".format(c.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        c.refresh_from_db()
        self.assertEqual(c.status, Contribution.Status.PENDING)

    def test_verify_already_verified_fails(self):
        """Verify on already VERIFIED contribution returns 400."""
        c = Contribution.objects.create(
            rider=self.rider,
            cooperative=self.coop,
            date=date.today(),
            amount=5000,
            status=Contribution.Status.VERIFIED,
        )
        self._auth_admin()
        resp = self.client.post("/api/contributions/{}/verify/".format(c.id))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recent_returns_list(self):
        """Recent contributions endpoint returns list (admin)."""
        Contribution.objects.create(
            rider=self.rider, cooperative=self.coop, date=date.today(), amount=5000
        )
        self._auth_admin()
        resp = self.client.get("/api/contributions/recent/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)
        self.assertGreaterEqual(len(resp.data), 1)

    def test_rider_sees_only_own_contributions(self):
        """List: rider sees only their contributions."""
        other_rider = User.objects.create_user(
            username="+250788333333",
            phone_number="+250788333333",
            password="x",
            role=User.Role.RIDER,
        )
        other_coop = Cooperative.objects.create(name="Other Coop")
        CooperativeMembership.objects.create(user=other_rider, cooperative=other_coop)
        Contribution.objects.create(
            rider=other_rider, cooperative=other_coop, date=date.today(), amount=9999
        )
        Contribution.objects.create(
            rider=self.rider, cooperative=self.coop, date=date.today(), amount=5000
        )
        self._auth_rider()
        resp = self.client.get("/api/contributions/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get("results", resp.data)
        ids = [c["id"] for c in results]
        my_contrib = Contribution.objects.get(rider=self.rider, amount=5000)
        other_contrib = Contribution.objects.get(rider=other_rider, amount=9999)
        self.assertIn(my_contrib.id, ids)
        self.assertNotIn(other_contrib.id, ids)
