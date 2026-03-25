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
        self.coop = Cooperative.objects.create(name='Test Coop')
        self.rider = User.objects.create_user(username='0788111111', phone_number='0788111111', password='rider123', role=User.Role.RIDER)
        CooperativeMembership.objects.create(user=self.rider, cooperative=self.coop, is_verified=True)
        self.admin_user = User.objects.create_user(username='admin@test.com', email='admin@test.com', phone_number='0788222222', password='admin123', role=User.Role.COOPERATIVE_ADMIN, is_staff=True)
        self.coop.admins.add(self.admin_user)

    def _auth_rider(self):
        r = RefreshToken.for_user(self.rider)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(r.access_token))

    def _auth_admin(self):
        r = RefreshToken.for_user(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(r.access_token))

    def test_create_contribution_as_rider(self):
        self._auth_rider()
        payload = {'cooperative': self.coop.id, 'date': '2026-02-26', 'amount': '5000'}
        resp = self.client.post('/api/contributions/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Contribution.objects.filter(rider=self.rider, amount=5000).exists())

    def test_second_contribution_same_day_rejected(self):
        self._auth_rider()
        day = '2026-03-25'
        self.client.post(
            '/api/contributions/',
            {'cooperative': self.coop.id, 'date': day, 'amount': '2000'},
            format='json',
        )
        resp = self.client.post(
            '/api/contributions/',
            {'cooperative': self.coop.id, 'date': day, 'amount': '3000'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Contribution.objects.filter(rider=self.rider, cooperative=self.coop, date=day).count(), 1)

    def test_create_contribution_requires_auth(self):
        payload = {'cooperative': self.coop.id, 'date': '2026-02-26', 'amount': '5000'}
        resp = self.client.post('/api/contributions/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_verify_contribution(self):
        c = Contribution.objects.create(rider=self.rider, cooperative=self.coop, date=date.today(), amount=5000)
        self._auth_admin()
        resp = self.client.post('/api/contributions/{}/verify/'.format(c.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        c.refresh_from_db()
        self.assertEqual(c.status, Contribution.Status.VERIFIED)

    def test_rider_cannot_verify(self):
        c = Contribution.objects.create(rider=self.rider, cooperative=self.coop, date=date.today(), amount=5000)
        self._auth_rider()
        resp = self.client.post('/api/contributions/{}/verify/'.format(c.id))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_unverify_contribution(self):
        c = Contribution.objects.create(rider=self.rider, cooperative=self.coop, date=date.today(), amount=5000, status=Contribution.Status.VERIFIED)
        self._auth_admin()
        resp = self.client.post('/api/contributions/{}/unverify/'.format(c.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        c.refresh_from_db()
        self.assertEqual(c.status, Contribution.Status.PENDING)

    def test_verify_already_verified_fails(self):
        c = Contribution.objects.create(rider=self.rider, cooperative=self.coop, date=date.today(), amount=5000, status=Contribution.Status.VERIFIED)
        self._auth_admin()
        resp = self.client.post('/api/contributions/{}/verify/'.format(c.id))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recent_returns_list(self):
        Contribution.objects.create(rider=self.rider, cooperative=self.coop, date=date.today(), amount=5000)
        self._auth_admin()
        resp = self.client.get('/api/contributions/recent/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)
        self.assertGreaterEqual(len(resp.data), 1)

    def test_rider_sees_only_own_contributions(self):
        phone = '0788333333'
        other_rider = User.objects.create_user(username=phone, email=f"{phone}@t", phone_number=phone, password='x', role=User.Role.RIDER)
        other_coop = Cooperative.objects.create(name='Other Coop')
        CooperativeMembership.objects.create(user=other_rider, cooperative=other_coop, is_verified=True)
        Contribution.objects.create(rider=other_rider, cooperative=other_coop, date=date.today(), amount=9999)
        Contribution.objects.create(rider=self.rider, cooperative=self.coop, date=date.today(), amount=5000)
        self._auth_rider()
        resp = self.client.get('/api/contributions/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get('results', resp.data) if isinstance(resp.data, dict) else resp.data
        ids = [c['id'] for c in results]
        my_contrib = Contribution.objects.get(rider=self.rider, amount=5000)
        other_contrib = Contribution.objects.get(rider=other_rider, amount=9999)
        self.assertIn(my_contrib.id, ids)
        self.assertNotIn(other_contrib.id, ids)

    def test_rider_lists_own_contributions_even_if_membership_unverified(self):
        """Unverifying a contribution must not hide rows via membership join; list is per rider."""
        c = Contribution.objects.create(
            rider=self.rider,
            cooperative=self.coop,
            date=date.today(),
            amount=3000,
            status=Contribution.Status.PENDING,
        )
        CooperativeMembership.objects.filter(user=self.rider).update(is_verified=False)
        self._auth_rider()
        resp = self.client.get('/api/contributions/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get('results', resp.data) if isinstance(resp.data, dict) else resp.data
        ids = [row['id'] for row in results]
        self.assertIn(c.id, ids)

    def test_unverify_contribution_does_not_change_membership(self):
        c = Contribution.objects.create(
            rider=self.rider,
            cooperative=self.coop,
            date=date.today(),
            amount=4000,
            status=Contribution.Status.VERIFIED,
        )
        m = CooperativeMembership.objects.get(user=self.rider)
        self.assertTrue(m.is_verified)
        self._auth_admin()
        resp = self.client.post('/api/contributions/{}/unverify/'.format(c.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        m.refresh_from_db()
        self.assertTrue(m.is_verified)
