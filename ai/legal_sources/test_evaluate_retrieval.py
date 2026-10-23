
import unittest

from evaluate_retrieval import check_citation_integrity


def make_valid_result():
    citation = {
        "title": "Test legal source",
        "section": "Section 24",
        "authority": "Example authority",
        "source_url": "https://www.indiacode.nic.in/example.pdf",
        "official_source": True,
    }

    return {
        "document_id": "TEST_DOCUMENT",
        "title": citation["title"],
        "section": citation["section"],
        "text": "Example legal text for a unit test.",
        "source_url": citation["source_url"],
        "authority": citation["authority"],
        "official_source": True,
        "citation": citation.copy(),
        "score": 0.9,
    }


class TestCitationIntegrity(unittest.TestCase):

    def test_accepts_valid_result(self):
        self.assertEqual(check_citation_integrity(make_valid_result()), [])

    def test_detects_missing_title(self):
        result = make_valid_result()
        del result["title"]

        errors = check_citation_integrity(result)

        self.assertTrue(any("Missing field: title" in e for e in errors))

    def test_detects_citation_mismatch(self):
        result = make_valid_result()
        result["citation"]["title"] = "Different title"

        errors = check_citation_integrity(result)

        self.assertIn("Citation mismatch: title", errors)

    def test_rejects_http_source_url(self):
        result = make_valid_result()
        result["source_url"] = "http://www.indiacode.nic.in/example.pdf"
        result["citation"]["source_url"] = result["source_url"]

        errors = check_citation_integrity(result)

        self.assertIn("Source URL is not HTTPS", errors)

    def test_rejects_invalid_similarity_score(self):
        result = make_valid_result()
        result["score"] = 1.5

        errors = check_citation_integrity(result)

        self.assertIn("Invalid cosine similarity score", errors)

    def test_rejects_non_boolean_official_source(self):
        result = make_valid_result()
        result["official_source"] = "yes"
        result["citation"]["official_source"] = "yes"

        errors = check_citation_integrity(result)

        self.assertIn("official_source must be a boolean", errors)


if __name__ == "__main__":
    unittest.main()
