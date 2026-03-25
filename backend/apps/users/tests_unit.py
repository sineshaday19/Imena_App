import os
from unittest.mock import Mock, patch
from django.db import IntegrityError
from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError
from apps.users.admin import UserAddForm
from apps.users.jwt_auth import CustomTokenObtainPairSerializer
from apps.users.admin_invite_constants import ADMIN_REGISTRATION_INVITE_CODE
from apps.users.phone_utils import PHONE_DIGIT_COUNT, normalize_phone_number
from apps.users.serializers import RegisterSerializer
from apps.users.views import _registration_integrity_detail_and_code, _registration_integrity_user_message


class PhoneUtilsTests(SimpleTestCase):

    def test_normalize_accepts_separators(self):
        self.assertEqual(normalize_phone_number('(0) 78-123-45-67'), '0781234567')

    def test_normalize_requires_exact_digit_count(self):
        self.assertIsNone(normalize_phone_number('12345'))
        self.assertIsNone(normalize_phone_number('1' * (PHONE_DIGIT_COUNT + 1)))


class UserAddFormUnitTests(SimpleTestCase):

    def test_password_mismatch_sets_password2_error(self):
        form = UserAddForm(data={'username': 'u1', 'email': 'u1@test.com', 'phone_number': '0788000000', 'role': 'RIDER', 'password1': 'password123', 'password2': 'different123'})
        form.validate_unique = lambda : None
        self.assertFalse(form.is_valid())
        self.assertIn('password2', form.errors)

class RegisterSerializerUnitTests(SimpleTestCase):

    def test_register_password_mismatch_rejected(self):
        s = RegisterSerializer()
        with self.assertRaises(ValidationError):
            s.validate({'phone_number': '0788123456', 'password': 'validpass123', 'confirm_password': 'differentpass123', 'role': 'rider', 'cooperative_id': object()})

    @patch('apps.users.serializers.User.objects.filter')
    def test_validate_phone_number_duplicate_rejected(self, mock_filter):
        mock_filter.return_value.exists.return_value = True
        s = RegisterSerializer()
        with self.assertRaises(ValidationError):
            s.validate_phone_number('0788123456')

    @patch('apps.users.serializers.User.objects.filter')
    def test_validate_email_duplicate_rejected(self, mock_filter):
        mock_filter.return_value.exists.return_value = True
        s = RegisterSerializer()
        with self.assertRaises(ValidationError):
            s.validate_email('user@test.com')

    def test_admin_registration_disabled_without_invite_code_env(self):
        old = os.environ.pop('ADMIN_INVITE_CODE', None)
        try:
            s = RegisterSerializer()
            with self.assertRaises(ValidationError):
                s.validate({'email': 'admin@test.com', 'phone_number': '0788123456', 'password': 'validpass123', 'confirm_password': 'validpass123', 'role': 'administrator', 'cooperatives': [object()], 'invite_code': 'anything'})
        finally:
            if old is not None:
                os.environ['ADMIN_INVITE_CODE'] = old

    def test_admin_registration_invalid_invite_code_rejected(self):
        old = os.environ.get('ADMIN_INVITE_CODE')
        os.environ['ADMIN_INVITE_CODE'] = 'SECRET'
        try:
            s = RegisterSerializer()
            with self.assertRaises(ValidationError):
                s.validate({'email': 'admin@test.com', 'phone_number': '0788123456', 'password': 'validpass123', 'confirm_password': 'validpass123', 'role': 'administrator', 'cooperatives': [object()], 'invite_code': 'WRONG'})
        finally:
            if old is None:
                os.environ.pop('ADMIN_INVITE_CODE', None)
            else:
                os.environ['ADMIN_INVITE_CODE'] = old

    @patch('apps.users.serializers.User.objects.filter')
    def test_register_rider_missing_cooperative_rejected(self, mock_filter):
        mock_filter.return_value.exists.return_value = False
        mock_filter.return_value.first.return_value = None
        s = RegisterSerializer(data={'phone_number': '0788123456', 'password': 'validpass123', 'confirm_password': 'validpass123', 'role': 'rider'})
        self.assertFalse(s.is_valid())
        self.assertIn('cooperative_id', s.errors)

class RegistrationIntegrityMessageTests(SimpleTestCase):

    def test_phone_number_in_error_uses_phone_message(self):
        exc = IntegrityError('UNIQUE constraint failed: users_user.phone_number')
        self.assertIn('phone number', _registration_integrity_user_message(exc, 'rider').lower())

    def test_unknown_constraint_does_not_claim_email_or_phone(self):
        exc = IntegrityError('unknown constraint violation')
        detail, code = _registration_integrity_detail_and_code(exc, 'rider')
        self.assertEqual(code, 'registration_conflict')
        self.assertNotIn('email or phone', detail.lower())
        self.assertIn('administrator', detail.lower())

class JwtAuthUnitTests(SimpleTestCase):

    def test_missing_username_rejected(self):
        s = CustomTokenObtainPairSerializer(context={'request': Mock()}, data={'username': '', 'password': 'x'})
        with self.assertRaises(ValidationError):
            s.is_valid(raise_exception=True)

    @patch('apps.users.jwt_auth.User.objects.filter')
    def test_unknown_user_rejected(self, mock_filter):
        mock_filter.return_value.first.return_value = None
        s = CustomTokenObtainPairSerializer(context={'request': Mock()}, data={'username': 'unknown@test.com', 'password': 'x'})
        with self.assertRaises(Exception):
            s.is_valid(raise_exception=True)

    @patch('apps.users.jwt_auth.authenticate')
    @patch('apps.users.jwt_auth.User.objects.filter')
    @patch('rest_framework_simplejwt.serializers.TokenObtainPairSerializer.validate')
    def test_login_success_resolves_identifier_and_calls_super_validate(self, mock_super_validate, mock_filter, mock_authenticate):
        user = Mock(username='resolved-username')
        mock_filter.return_value.first.return_value = user
        mock_authenticate.return_value = user
        mock_super_validate.return_value = {'access': 'a', 'refresh': 'r'}
        s = CustomTokenObtainPairSerializer(context={'request': Mock()}, data={'username': 'user@test.com', 'password': 'secret'})
        self.assertTrue(s.is_valid(), s.errors)
        mock_super_validate.assert_called()
