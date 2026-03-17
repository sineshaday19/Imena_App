from datetime import date
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from apps.income.serializers import IncomeRecordCreateSerializer


class IncomeRecordCreateSerializerUnitTests(SimpleTestCase):
    @patch("apps.income.serializers.IncomeRecord.objects.filter")
    def test_duplicate_income_same_date_rejected(self, mock_filter):
        mock_filter.return_value.exists.return_value = True
        request = Mock()
        request.user = Mock(is_authenticated=True)
        s = IncomeRecordCreateSerializer(
            context={"request": request},
            data={
                "cooperative": 1,
                "date": date(2026, 2, 26),
                "amount": "1000",
                "notes": "",
            },
        )
        # We bypass validate_cooperative (which expects a Cooperative instance) and unit-test duplicate check.
        s.initial_data["cooperative"] = Mock(id=1)
        with self.assertRaises(ValidationError) as ctx:
            s.validate({"cooperative": Mock(id=1), "date": date(2026, 2, 26), "amount": "1000", "notes": ""})
        self.assertIn("date", ctx.exception.detail)
