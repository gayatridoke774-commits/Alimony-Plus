import unittest
import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from validate_sources import (
    get_source_url,
    has_meaningful_content,
    validate_document,
    validate_registry,
    validate_url,
)


class TestValidatorHelpers(unittest.TestCase):

    def test_accepts_official_https_url(self):
        errors = validate_url(
            "https://www.indiacode.nic.in/example.pdf"
        )
        self.assertEqual(errors, [])

    def test_rejects_http_url(self):
        errors = validate_url(
            "http://www.indiacode.nic.in/example.pdf"
        )
        self.assertIn("Source URL must use HTTPS", errors)

    def test_rejects_unofficial_domain(self):
        errors = validate_url(
            "https://example.com/legal.pdf"
        )
        self.assertTrue(
            any("not allowlisted" in error for error in errors)
        )

    def test_rejects_missing_url(self):
        errors = validate_url("")
        self.assertIn("Missing source URL", errors)

    def test_supports_source_url_field(self):
        source = {
            "source_url": "https://www.indiacode.nic.in/example.pdf"
        }
        self.assertEqual(
            get_source_url(source),
            "https://www.indiacode.nic.in/example.pdf",
        )

    def test_supports_legacy_url_field(self):
        source = {
            "url": "https://www.indiacode.nic.in/example.pdf"
        }
        self.assertEqual(
            get_source_url(source),
            "https://www.indiacode.nic.in/example.pdf",
        )

    def test_prefers_source_url_when_both_fields_exist(self):
        source = {
            "source_url": "https://www.indiacode.nic.in/current.pdf",
            "url": "https://www.indiacode.nic.in/legacy.pdf",
        }
        self.assertEqual(
            get_source_url(source),
            "https://www.indiacode.nic.in/current.pdf",
        )

    def test_detects_meaningful_text(self):
        self.assertTrue(
            has_meaningful_content(
                {"content": "This is meaningful legal content."}
            )
        )

    def test_detects_short_legal_clause_when_minimum_is_lowered(self):
        self.assertTrue(
            has_meaningful_content(
                {"content": "Pay rent."},
                minimum_length=5,
            )
        )

    def test_rejects_empty_content(self):
        self.assertFalse(
            has_meaningful_content({"content": ""})
        )

    def test_rejects_malformed_json(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "broken.json"
            file_path.write_text(
                '{"document_id": "broken",',
                encoding="utf-8",
            )

            data, errors = validate_document(file_path, {})

            self.assertIsNone(data)
            self.assertTrue(
                any("Cannot load JSON" in error for error in errors)
            )

    def test_rejects_json_root_that_is_not_an_object(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "array.json"
            file_path.write_text(
                json.dumps(["not", "an", "object"]),
                encoding="utf-8",
            )

            data, errors = validate_document(file_path, {})

            self.assertIsNone(data)
            self.assertIn("JSON root must be an object", errors)

    def test_registry_rejects_missing_sources_list(self):
        errors, registry_by_id = validate_registry({})

        self.assertIn("Registry must contain a sources list", errors)
        self.assertEqual(registry_by_id, {})

    def test_registry_rejects_duplicate_source_ids(self):
        registry = {
            "sources": [
                {
                    "source_id": "TEST_SOURCE",
                    "title": "Test source",
                    "source_url": "https://www.indiacode.nic.in/test.pdf",
                },
                {
                    "source_id": "TEST_SOURCE",
                    "title": "Duplicate source",
                    "source_url": "https://www.indiacode.nic.in/other.pdf",
                },
            ]
        }

        errors, registry_by_id = validate_registry(registry)

        self.assertTrue(
            any("Duplicate registry source_id" in error for error in errors)
        )
        self.assertEqual(len(registry_by_id), 1)

    def test_registry_rejects_missing_source_id(self):
        registry = {
            "sources": [
                {
                    "title": "Test source",
                    "source_url": "https://www.indiacode.nic.in/test.pdf",
                }
            ]
        }

        errors, registry_by_id = validate_registry(registry)

        self.assertTrue(
            any("has no source_id" in error for error in errors)
        )
        self.assertEqual(registry_by_id, {})

    def test_document_rejects_unknown_source_id(self):
        document = {
            "document_id": "UNKNOWN_SOURCE",
            "title": "Test legal document",
            "document_type": "legislation",
            "source": {
                "source_id": "UNKNOWN_SOURCE",
                "source_url": "https://www.indiacode.nic.in/test.pdf",
                "official_source": True,
                "authority": "Test authority",
            },
            "rag_metadata": {
                "section": "Section 1",
            },
            "section": "Test section",
            "content": (
                "This is sample legal content used to test source mapping."
            ),
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "unknown_source.json"
            file_path.write_text(
                json.dumps(document),
                encoding="utf-8",
            )

            with patch(
                "validate_sources.check_url_reachability",
                return_value=("REACHABLE", "Mocked for unit test"),
            ):
                data, errors = validate_document(file_path, {})

        self.assertIsNotNone(data)
        self.assertTrue(
            any(
                "is not present in registry.json" in error
                for error in errors
            )
        )

    def test_document_rejects_missing_source_url(self):
        document = {
            "document_id": "TEST_SOURCE",
            "title": "Test legal document",
            "document_type": "legislation",
            "source": {
                "source_id": "TEST_SOURCE",
                "official_source": True,
                "authority": "Test authority",
            },
            "rag_metadata": {
                "section": "Section 1",
            },
            "section": "Test section",
            "content": (
                "This is sample legal content used to test missing URLs."
            ),
        }

        registry = {
            "TEST_SOURCE": {
                "source_id": "TEST_SOURCE",
                "title": "Test legal document",
                "source_url": "https://www.indiacode.nic.in/test.pdf",
            }
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "missing_url.json"
            file_path.write_text(
                json.dumps(document),
                encoding="utf-8",
            )

            with patch(
                "validate_sources.check_url_reachability",
                return_value=("REACHABLE", "Mocked for unit test"),
            ):
                data, errors = validate_document(file_path, registry)

        self.assertIsNotNone(data)
        self.assertTrue(
            any("Missing source URL" in error for error in errors)
        )


if __name__ == "__main__":
    unittest.main()