from semantic_search import search_legal_sources

questions = [
    ("RELEVANT", "What does Section 24 of the Hindu Marriage Act provide?"),
    ("RELEVANT", "Can a divorced Muslim woman claim maintenance under Section 125?"),
    ("RELEVANT", "What monetary relief can a woman receive under Section 20 of the Domestic Violence Act?"),
    ("RELEVANT", "What maintenance rights does a Hindu wife have under Section 18?"),
    ("RELEVANT", "What does Section 144 of the Bharatiya Nagarik Suraksha Sanhita provide?"),
    ("IRRELEVANT", "What is the weather forecast for Mumbai tomorrow?"),
    ("IRRELEVANT", "How do I bake a chocolate cake?"),
    ("IRRELEVANT", "Explain photosynthesis in plants."),
    ("IRRELEVANT", "Who won the latest cricket match?"),
    ("IRRELEVANT", "What is the capital of Japan?"),
        ("RELEVANT", "My husband is not supporting me financially. What legal options may I have?"),
    ("RELEVANT", "Can a wife ask for financial support while a divorce case is pending?"),
    ("RELEVANT", "Where can a woman get free legal aid in India?"),
    ("RELEVANT", "What protection is available to women facing domestic violence?"),
    ("RELEVANT", "What is maintenance under Indian family law?"),
    ("IRRELEVANT", "How can I fix a Python syntax error?"),
    ("IRRELEVANT", "Suggest a good laptop for computer engineering students."),
    ("IRRELEVANT", "How do I prepare for a cricket tournament?"),
    ("IRRELEVANT", "Explain how photosynthesis works in simple words."),
    ("IRRELEVANT", "Give me a recipe for vegetable pulao."),
]

thresholds = [0.80, 0.82, 0.83, 0.85]

for category, question in questions:
    # Disable filtering temporarily to inspect the raw top score.
    results = search_legal_sources(
        question, top_k=1, min_similarity=-1.0
    )

    print(f"\n{category}: {question}")

    if not results:
        print("No matching result.")
        continue

    score = results[0]["score"]
    print(f"Top similarity score: {score:.4f}")

    for threshold in thresholds:
        decision = "ACCEPT" if score >= threshold else "REJECT"
        print(f"  Threshold {threshold:.2f}: {decision}")