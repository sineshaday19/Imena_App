"""Tests for report endpoints."""
from datetime import date

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.cooperatives.models import Cooperative, CooperativeMembership
from apps.contributions.models import Contribution
from apps.income.models import IncomeRecord
from apps.users.models import User


class ReportTests(TestCase):
    """Test /api/reports/ actions."""

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

    def test_reports_require_auth(self):
        """Report endpoints require authentication."""
        resp = self.client.get("/api/reports/contributions-summary/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_contributions_summary(self):
        """Contributions summary returns totals."""
        Contribution.objects.create(
            rider=self.rider,
            cooperative=self.coop,
            date=date(2026, 2, 26),
            amount=5000,
            status=Contribution.Status.VERIFIED,
        )
        self._auth_rider()
        resp = self.client.get("/api/reports/contributions-summary/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("total_amount", resp.data)
        self.assertIn("verified_amount", resp.data)
        self.assertIn("pending_amount", resp.data)

    def test_income_by_cooperative(self):
        """Income by cooperative returns results."""
        IncomeRecord.objects.create(
            rider=self.rider, cooperative=self.coop, date=date(2026, 2, 26), amount=3000
        )
        self._auth_admin()
        resp = self.client.get("/api/reports/income-by-cooperative/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("results", resp.data)
        self.assertIsInstance(resp.data["results"], list)
