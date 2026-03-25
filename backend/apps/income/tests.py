from datetime import date
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.cooperatives.models import Cooperative, CooperativeMembership
from apps.income.models import IncomeRecord
from apps.users.models import User

class IncomeTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.coop = Cooperative.objects.create(name='Test Coop')
        self.rider = User.objects.create_user(username='0788111111', phone_number='0788111111', password='rider123', role=User.Role.RIDER)
        CooperativeMembership.objects.create(user=self.rider, cooperative=self.coop, is_verified=True)

    def _auth_rider(self):
        refresh = RefreshToken.for_user(self.rider)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))

    def test_create_income_as_rider(self):
        self._auth_rider()
        payload = {'cooperative': self.coop.id, 'date': '2026-02-26', 'amount': '10000', 'notes': 'Morning rides'}
        resp = self.client.post('/api/income/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['amount'], '10000.00')
        self.assertTrue(IncomeRecord.objects.filter(rider=self.rider, amount=10000).exists())

    def test_summary_returns_total(self):
        IncomeRecord.objects.create(rider=self.rider, cooperative=self.coop, date=date(2026, 2, 26), amount=8000)
        self._auth_rider()
        resp = self.client.get('/api/income/summary/?date=2026-02-26')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        total = resp.data['total_income']
        self.assertTrue(total in ('8000', '8000.00'), f'Expected 8000, got {total}')

    def test_admin_cannot_create_income(self):
        admin_user = User.objects.create_user(username='admin@test.com', email='admin@test.com', phone_number='0788222222', password='admin123', role=User.Role.COOPERATIVE_ADMIN)
        self.coop.admins.add(admin_user)
        refresh = RefreshToken.for_user(admin_user)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
        payload = {'cooperative': self.coop.id, 'date': '2026-02-26', 'amount': '5000', 'notes': ''}
        resp = self.client.post('/api/income/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_requires_auth(self):
        resp = self.client.get('/api/income/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_recent_returns_list(self):
        IncomeRecord.objects.create(rider=self.rider, cooperative=self.coop, date=date(2026, 2, 26), amount=5000)
        self._auth_rider()
        resp = self.client.get('/api/income/recent/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)
        self.assertGreaterEqual(len(resp.data), 1)

    def test_stats_returns_data(self):
        IncomeRecord.objects.create(rider=self.rider, cooperative=self.coop, date=date(2026, 2, 26), amount=5000)
        self._auth_rider()
        resp = self.client.get('/api/income/stats/?group_by=month&year=2026')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('data', resp.data)
        self.assertIn('group_by', resp.data)

    def test_duplicate_income_same_date_rejected(self):
        IncomeRecord.objects.create(rider=self.rider, cooperative=self.coop, date=date(2026, 2, 26), amount=1000)
        self._auth_rider()
        payload = {'cooperative': self.coop.id, 'date': '2026-02-26', 'amount': '2000', 'notes': ''}
        resp = self.client.post('/api/income/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('date', resp.data)

    def test_coop_admin_without_staff_sees_no_income_list(self):
        IncomeRecord.objects.create(rider=self.rider, cooperative=self.coop, date=date(2026, 2, 27), amount=3000)
        admin_user = User.objects.create_user(username='pending@admin.com', email='pending@admin.com', phone_number='0788333333', password='admin123', role=User.Role.COOPERATIVE_ADMIN, is_staff=False)
        self.coop.admins.add(admin_user)
        refresh = RefreshToken.for_user(admin_user)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
        resp = self.client.get('/api/income/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_coop_admin_with_staff_sees_coop_income(self):
        IncomeRecord.objects.create(rider=self.rider, cooperative=self.coop, date=date(2026, 2, 28), amount=4000)
        admin_user = User.objects.create_user(username='staff@admin.com', email='staff@admin.com', phone_number='0788444444', password='admin123', role=User.Role.COOPERATIVE_ADMIN, is_staff=True)
        self.coop.admins.add(admin_user)
        refresh = RefreshToken.for_user(admin_user)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
        resp = self.client.get('/api/income/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(str(resp.data[0]['amount']), '4000.00')
