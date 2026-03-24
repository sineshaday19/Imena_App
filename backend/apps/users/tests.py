from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.cooperatives.models import Cooperative
from apps.users.models import User

class JWTLoginTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.coop = Cooperative.objects.create(name='Test Coop')
        self.user = User.objects.create_user(username='+250788123450', email='user@test.com', phone_number='+250788123450', password='secret123', role=User.Role.RIDER)

    def test_login_with_phone(self):
        resp = self.client.post('/api/token/', {'username': '+250788123450', 'password': 'secret123'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_login_with_email(self):
        resp = self.client.post('/api/token/', {'username': 'user@test.com', 'password': 'secret123'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)

    def test_login_wrong_password(self):
        resp = self.client.post('/api/token/', {'username': '+250788123450', 'password': 'wrong'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_unknown_user(self):
        resp = self.client.post('/api/token/', {'username': 'unknown@test.com', 'password': 'secret123'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_username(self):
        resp = self.client.post('/api/token/', {'password': 'secret123'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

class RegisterTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.coop = Cooperative.objects.create(name='Test Cooperative')

    def test_register_rider_success(self):
        payload = {'phone_number': '+250788123456', 'password': 'validpass123', 'confirm_password': 'validpass123', 'full_name': 'Test Rider', 'role': 'rider', 'cooperative_id': self.coop.id}
        resp = self.client.post('/api/users/register/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('detail', resp.data)
        self.assertTrue(User.objects.filter(phone_number='+250788123456').exists())

    def test_register_rider_missing_cooperative(self):
        payload = {'phone_number': '+250788123457', 'password': 'validpass123', 'confirm_password': 'validpass123', 'role': 'rider'}
        resp = self.client.post('/api/users/register/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cooperative_id', resp.data)

    def test_register_passwords_mismatch(self):
        payload = {'phone_number': '+250788123458', 'password': 'validpass123', 'confirm_password': 'different', 'role': 'rider', 'cooperative_id': self.coop.id}
        resp = self.client.post('/api/users/register/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_phone(self):
        User.objects.create_user(username='+250788123459', phone_number='+250788123459', password='oldpass', role=User.Role.RIDER)
        payload = {'phone_number': '+250788123459', 'password': 'validpass123', 'confirm_password': 'validpass123', 'role': 'rider', 'cooperative_id': self.coop.id}
        resp = self.client.post('/api/users/register/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone_number', resp.data)

    def test_register_username_phone_mismatch_returns_clear_field_error(self):
        User.objects.create_user(username='+250788199990', phone_number='+250788199991', password='oldpass', role=User.Role.RIDER)
        payload = {'phone_number': '+250788199990', 'password': 'validpass123', 'confirm_password': 'validpass123', 'role': 'rider', 'cooperative_id': self.coop.id}
        resp = self.client.post('/api/users/register/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone_number', resp.data)
        self.assertIn('login', str(resp.data['phone_number'][0]).lower())

    def test_register_two_riders_same_full_name_different_phones(self):
        shared_name = 'Marie Uwase'
        users = (('600001', 'marie.one@example.com'), ('600002', 'marie.two@example.com'))
        for (phone_suffix, rider_email) in users:
            payload = {'phone_number': f'+250788{phone_suffix}', 'email': rider_email, 'password': 'validpass123', 'confirm_password': 'validpass123', 'full_name': shared_name, 'role': 'rider', 'cooperative_id': self.coop.id}
            resp = self.client.post('/api/users/register/', payload, format='json')
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(User.objects.filter(first_name='Marie', last_name='Uwase').count(), 2)

class MeTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='+250788999999', phone_number='+250788999999', password='testpass123', role=User.Role.RIDER)

    def test_me_requires_auth(self):
        resp = self.client.get('/api/users/me/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_user_info(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        resp = self.client.get('/api/users/me/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['phone_number'], '+250788999999')
        self.assertEqual(resp.data['role'], 'RIDER')
        self.assertIn('is_staff', resp.data)
        self.assertFalse(resp.data['is_staff'])
