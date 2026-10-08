import json
from pathlib import Path

from semantic_search import search_legal_sources


BASE_DIR = Path(__file__).resolve().parent


def build_legal_context(question, top_k=5):
    """
    Retrieve relevant verified legal sources and
    build a clean context for the AI assistant.
    """

    results = search_legal_sources(
        question,
        top_k=top_k
    )

    context_parts = []

    for i, result in enumerate(results, start=1):

        citation = result["citation"]

        context = f"""
SOURCE {i}

Title:
{citation["title"]}

Section:
{citation["section"]}

Authority:
{citation["authority"]}

Official source:
{citation["official_source"]}

Source URL:
{citation["source_url"]}

Legal text:
{result["text"]}
""".strip()

        context_parts.append(context)

    return "\n\n" + ("\n\n" + "=" * 70 + "\n\n").join(context_parts)


if __name__ == "__main__":

    question = input(
        "\nEnter a legal question: "
    )

    print("\nBuilding legal context...")

    context = build_legal_context(
        question,
        top_k=5
    )

    print("\n" + "=" * 70)
    print("RETRIEVED LEGAL CONTEXT")
    print("=" * 70)

    print(context)