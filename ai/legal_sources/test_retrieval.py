from semantic_search import search_legal_sources

questions = [
    "Where can a woman get free legal aid in India?",
    "What protection is available to women facing domestic violence?",
    "My husband is not supporting me financially. What legal options may I have?",
    "Can a wife ask for financial support while a divorce case is pending?",
]

for question in questions:
    print("\nQUESTION:", question)

    results = search_legal_sources(question, top_k=3)

    for result in results:
        print(
            result["score"],
            "|",
            result["document_id"],
            "|",
            result["title"],
            "|",
            result["section"],
        )

    if not results:
        print("No sufficiently relevant source found.")
