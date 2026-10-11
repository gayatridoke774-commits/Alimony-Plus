import unittest
from semantic_search import select_best_chunk


class TestSemanticSearch(unittest.TestCase):

    def test_prefers_statutory_text_when_scores_are_close(self):
        chunks = [
            {"text": "Plain Summary Section 18 explains protection orders."},
            {"text": "Statutory Text > Intro The Magistrate may pass a protection order."},
        ]
        scores = [0.8845, 0.8454]

        selected = select_best_chunk(chunks, scores)

        self.assertIn("Statutory Text >", selected["text"])

    def test_keeps_best_match_when_statutory_score_is_too_low(self):
        chunks = [
            {"text": "Plain Summary about protection orders."},
            {"text": "Statutory Text > Intro unrelated statutory content."},
        ]
        scores = [0.90, 0.80]

        selected = select_best_chunk(chunks, scores)

        self.assertIn("Plain Summary", selected["text"])


if __name__ == "__main__":
    unittest.main()