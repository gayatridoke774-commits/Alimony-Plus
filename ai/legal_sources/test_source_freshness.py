import unittest
from datetime import date, timedelta

from check_source_freshness import evaluate_date, check_source


class TestEvaluateDate(unittest.TestCase):

    def setUp(self):
        self.today = date(2026, 10, 10)

    def test_missing_date(self):
        self.assertEqual(
            evaluate_date(None, 90, self.today),
            ("MISSING", None),
        )

    def test_empty_date(self):
        self.assertEqual(
            evaluate_date("", 90, self.today),
            ("MISSING", None),
        )

    def test_invalid_date_format(self):
        self.assertEqual(
            evaluate_date("10-10-2026", 90, self.today),
            ("INVALID", None),
        )

    def test_impossible_date(self):
        self.assertEqual(
            evaluate_date("2026-02-30", 90, self.today),
            ("INVALID", None),
        )

    def test_future_date(self):
        future_date = (self.today + timedelta(days=1)).isoformat()

        self.assertEqual(
            evaluate_date(future_date, 90, self.today),
            ("FUTURE DATE", -1),
        )

    def test_current_date(self):
        self.assertEqual(
            evaluate_date(self.today.isoformat(), 90, self.today),
            ("CURRENT", 0),
        )

    def test_date_at_age_limit(self):
        boundary_date = (self.today - timedelta(days=90)).isoformat()

        self.assertEqual(
            evaluate_date(boundary_date, 90, self.today),
            ("CURRENT", 90),
        )

    def test_stale_date(self):
        stale_date = (self.today - timedelta(days=91)).isoformat()

        self.assertEqual(
            evaluate_date(stale_date, 90, self.today),
            ("STALE", 91),
        )

    def test_source_passes_when_both_dates_are_current(self):
        source = {
            "source_id": "TEST_SOURCE",
            "title": "Test source",
            "last_verified_on": "2026-10-10",
            "reviewed_on": "2026-10-10",
        }

        result = check_source(source, self.today)

        self.assertTrue(result["verification_ok"])
        self.assertTrue(result["review_ok"])
        self.assertTrue(result["overall_ok"])

    def test_source_requires_review_when_review_date_is_missing(self):
        source = {
            "source_id": "TEST_SOURCE",
            "title": "Test source",
            "last_verified_on": "2026-10-10",
            "reviewed_on": None,
        }

        result = check_source(source, self.today)

        self.assertTrue(result["verification_ok"])
        self.assertFalse(result["review_ok"])
        self.assertFalse(result["overall_ok"])
        self.assertTrue(result["review_missing"])

    def test_source_fails_when_verification_date_is_stale(self):
        source = {
            "source_id": "TEST_SOURCE",
            "title": "Test source",
            "last_verified_on": "2026-07-01",
            "reviewed_on": "2026-10-10",
        }

        result = check_source(source, self.today)

        self.assertFalse(result["verification_ok"])
        self.assertTrue(result["review_ok"])
        self.assertFalse(result["overall_ok"])

    def test_source_fails_when_review_date_is_invalid(self):
        source = {
            "source_id": "TEST_SOURCE",
            "title": "Test source",
            "last_verified_on": "2026-10-10",
            "reviewed_on": "not-a-date",
        }

        result = check_source(source, self.today)

        self.assertTrue(result["verification_ok"])
        self.assertFalse(result["review_ok"])
        self.assertFalse(result["overall_ok"])
        self.assertFalse(result["review_missing"])

if __name__ == "__main__":
    unittest.main()