
from semantic_search import (
    MIN_SIMILARITY_THRESHOLD,
    search_legal_sources,
)


# Each question has one expected relevant document.
TEST_CASES = [
    {
        "question": "What does Section 24 of the Hindu Marriage Act provide?",
        "expected_document_id": "INDIA_CODE_HMA_1955_SECTIONS_24_25",
    },
    {
        "question": "Can a divorced Muslim woman claim maintenance under Section 125?",
        "expected_document_id": "SC_MOHD_ABDUL_SAMAD_2024",
    },
    {
        "question": (
            "What monetary relief can a woman receive under "
            "Section 20 of the Domestic Violence Act?"
        ),
        "expected_document_id": "INDIA_CODE_PWDVA_2005_SECTION_20",
    },
    {
        "question": "What maintenance rights does a Hindu wife have under Section 18?",
        "expected_document_id": "INDIA_CODE_HAMA_1956_SECTION_18",
    },
    {
        "question": (
            "What does Section 144 of the Bharatiya Nagarik "
            "Suraksha Sanhita provide?"
        ),
        "expected_document_id": "BNSS_2023_S144",
    },
]

# Questions that should not retrieve legal sources from this corpus.
IRRELEVANT_QUERIES = [
    "What is the weather forecast for Mumbai tomorrow?",
    "How do I bake a chocolate cake?",
    "Explain photosynthesis in plants.",
    "Who won the latest cricket match?",
    "What is the capital of Japan?",
]

TOP_K = 5

REQUIRED_FIELDS = (
    "document_id",
    "title",
    "section",
    "text",
    "source_url",
    "authority",
    "official_source",
    "citation",
)

REQUIRED_CITATION_FIELDS = (
    "title",
    "section",
    "authority",
    "source_url",
    "official_source",
)


def check_citation_integrity(result):
    """Check required source metadata and citation consistency."""
    errors = []

    for field in REQUIRED_FIELDS:
        if field not in result or result[field] is None:
            errors.append(f"Missing field: {field}")
        elif field != "official_source" and not result[field]:
            errors.append(f"Empty field: {field}")

    citation = result.get("citation")

    if not isinstance(citation, dict):
        return errors + ["Citation is missing or not an object"]

    for field in REQUIRED_CITATION_FIELDS:
        if field not in citation or citation[field] is None:
            errors.append(f"Missing citation field: {field}")
        elif field != "official_source" and not citation[field]:
            errors.append(f"Empty citation field: {field}")

    source_url = result.get("source_url", "")
    if source_url and not source_url.startswith("https://"):
        errors.append("Source URL is not HTTPS")

    if not isinstance(result.get("official_source"), bool):
        errors.append("official_source must be a boolean")

    # Ensure the displayed citation matches the retrieved result.
    for field in REQUIRED_CITATION_FIELDS:
        if field in result and field in citation:
            if result[field] != citation[field]:
                errors.append(f"Citation mismatch: {field}")

    score = result.get("score")
    if not isinstance(score, (int, float)) or not -1 <= score <= 1:
        errors.append("Invalid cosine similarity score")

    return errors


def run_evaluation():
    hits = {1: 0, 3: 0, 5: 0}
    reciprocal_rank_total = 0.0
    citation_errors = []
    duplicate_document_results = 0
    relevant_failures = []

    print("\n" + "=" * 70)
    print("LEGAL RETRIEVAL EVALUATION")
    print("=" * 70)
    print(f"Queries: {len(TEST_CASES)}")
    print(f"Similarity threshold: {MIN_SIMILARITY_THRESHOLD}")
    print(f"Ranking cutoff: {TOP_K}")

    for number, test in enumerate(TEST_CASES, start=1):
        question = test["question"]
        expected_id = test["expected_document_id"]

        results = search_legal_sources(
            question,
            top_k=TOP_K,
            evaluation_mode=True,
        )
        document_ids = [r.get("document_id") for r in results]

        # Recall@k: one expected relevant document per question.
        for k in hits:
            if expected_id in document_ids[:k]:
                hits[k] += 1

        # Reciprocal rank: 1/rank, or zero if not retrieved.
        if expected_id in document_ids:
            rank = document_ids.index(expected_id) + 1
            reciprocal_rank_total += 1.0 / rank
        else:
            rank = None
            relevant_failures.append(question)

        if len(document_ids) != len(set(document_ids)):
            duplicate_document_results += 1

        for result in results:
            for error in check_citation_integrity(result):
                citation_errors.append(
                    f"Relevant query {number}: {error} "
                    f"(document={result.get('document_id', 'UNKNOWN')})"
                )

        print(f"\nTest {number}: {question}")
        print(f"Expected document: {expected_id}")
        print(f"Expected document rank: {rank or 'NOT RETRIEVED'}")
        print(f"Retrieved documents: {document_ids}")
        print(
            "Top similarity:",
            results[0]["score"] if results else "NO RESULTS",
        )

    total = len(TEST_CASES)

    print("\n" + "=" * 70)
    print("RANKING METRICS")
    print("=" * 70)

    for k in (1, 3, 5):
        print(f"Recall@{k}: {hits[k]}/{total} = {hits[k] / total:.2%}")

    mrr = reciprocal_rank_total / total if total else 0.0
    print(f"MRR: {mrr:.4f}")

    # Test whether unrelated queries are rejected by the threshold.
    print("\n" + "=" * 70)
    print("IRRELEVANT-QUERY REJECTION")
    print("=" * 70)

    rejected = 0

    for question in IRRELEVANT_QUERIES:
        results = search_legal_sources(
            question,
            top_k=TOP_K,
            evaluation_mode=True,
        )
        is_rejected = len(results) == 0

        if is_rejected:
            rejected += 1

        top_score = results[0]["score"] if results else "NO RESULTS"

        print(f"\nQuestion: {question}")
        print(f"Top score: {top_score}")
        print(f"Rejected: {'PASS' if is_rejected else 'FAIL'}")

        for result in results:
            for error in check_citation_integrity(result):
                citation_errors.append(
                    f"Irrelevant query: {error} "
                    f"(document={result.get('document_id', 'UNKNOWN')})"
                )

    print(f"\nRejection rate: {rejected}/{len(IRRELEVANT_QUERIES)}")

    print("\n" + "=" * 70)
    print("CITATION INTEGRITY")
    print("=" * 70)

    print(f"Citation errors: {len(citation_errors)}")
    print(f"Queries with duplicate document IDs: {duplicate_document_results}")

    for error in citation_errors:
        print(f"ERROR: {error}")

    print("\n" + "=" * 70)
    print("OVERALL SUMMARY")
    print("=" * 70)

    ranking_pass = all(hits[k] == total for k in (1, 3, 5))
    rejection_pass = rejected == len(IRRELEVANT_QUERIES)
    citations_pass = len(citation_errors) == 0
    duplicates_pass = duplicate_document_results == 0

    all_checks_pass = all(
        (ranking_pass, rejection_pass, citations_pass, duplicates_pass)
    )

    print(f"Recall@1/3/5 all 100%: {ranking_pass}")
    print(f"All irrelevant queries rejected: {rejection_pass}")
    print(f"Citation checks passed: {citations_pass}")
    print(f"No duplicate document IDs: {duplicates_pass}")

    if all_checks_pass:
        print("\nRESULT: ALL CURRENT EVALUATION CHECKS PASSED")
    else:
        print("\nRESULT: REVIEW REQUIRED")

        if relevant_failures:
            print("\nRelevant questions that failed retrieval:")
            for question in relevant_failures:
                print(f"- {question}")

    print(
        "\nNote: Results reflect this test set only. "
        "Passing these checks does not establish legal accuracy "
        "or production readiness."
    )

    return 0 if all_checks_pass else 1


if __name__ == "__main__":
    raise SystemExit(run_evaluation())