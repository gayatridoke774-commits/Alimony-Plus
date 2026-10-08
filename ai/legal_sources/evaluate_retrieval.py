from semantic_search import search_legal_sources


# ---------------------------------------------------------
# Retrieval evaluation test cases
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# Run evaluation
# ---------------------------------------------------------

def run_evaluation():
    total_tests = len(TEST_CASES)
    passed = 0

    print("\n" + "=" * 70)
    print("LEGAL RETRIEVAL EVALUATION")
    print("=" * 70)

    for number, test in enumerate(TEST_CASES, start=1):

        question = test["question"]
        expected_document_id = test["expected_document_id"]

        print(f"\nRunning Test {number}...")
        print(f"Question: {question}")

        # Search the legal knowledge base
        results = search_legal_sources(
            question,
            top_k=5
        )

        # Extract document IDs from retrieved results
        document_ids = [
            result["document_id"]
            for result in results
        ]

        # Check whether the expected source
        # appears in the top 5 results
        found = expected_document_id in document_ids

        if found:
            passed += 1
            status = "PASS"
        else:
            status = "FAIL"

        print(f"\nTest {number}: {status}")
        print(f"Expected document: {expected_document_id}")

        if results:
            print(f"Top result: {results[0]['title']}")
            print(f"Top similarity: {results[0]['score']}")
        else:
            print("Top result: No results")

        print(f"Retrieved document IDs: {document_ids}")

        print("-" * 70)

    # -----------------------------------------------------
    # Final evaluation result
    # -----------------------------------------------------

    accuracy = (passed / total_tests) * 100

    print("\n" + "=" * 70)
    print("EVALUATION SUMMARY")
    print("=" * 70)

    print(f"Total tests : {total_tests}")
    print(f"Passed      : {passed}")
    print(f"Failed      : {total_tests - passed}")
    print(f"Accuracy    : {accuracy:.2f}%")

    if passed == total_tests:
        print("\nRESULT: ALL TESTS PASSED")
    else:
        print("\nRESULT: SOME TESTS FAILED")

    print("=" * 70)


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

if __name__ == "__main__":
    run_evaluation()