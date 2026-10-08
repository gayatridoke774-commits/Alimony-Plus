import json
from pathlib import Path

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


# ---------------------------------------------------------
# File paths
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
EMBEDDED_FILE = BASE_DIR / "embedded_chunks.json"


# ---------------------------------------------------------
# Load legal knowledge base
# ---------------------------------------------------------

print("Loading legal knowledge base...")

with open(EMBEDDED_FILE, "r", encoding="utf-8") as f:
    chunks = json.load(f)

print(f"Legal chunks loaded: {len(chunks)}")


# ---------------------------------------------------------
# Load embedding model
# ---------------------------------------------------------

print("Loading E5-small model...")

model = SentenceTransformer(
    "intfloat/multilingual-e5-small"
)


# ---------------------------------------------------------
# Semantic legal search
# ---------------------------------------------------------

def search_legal_sources(question, top_k=5):
    """
    Search the verified legal knowledge base using
    semantic similarity.

    Args:
        question: User's legal question.
        top_k: Number of results to return.

    Returns:
        List of relevant legal source results containing:
        - similarity score
        - document ID
        - title
        - section
        - legal text
        - authority
        - official source status
        - official source URL
        - citation information
    """

    # -----------------------------------------------------
    # Convert user question into an embedding
    # -----------------------------------------------------

    query_embedding = model.encode(
        [f"query: {question}"],
        normalize_embeddings=True
    )

    # -----------------------------------------------------
    # Get stored document embeddings
    # -----------------------------------------------------

    document_embeddings = [
        chunk["embedding"]
        for chunk in chunks
    ]

    # -----------------------------------------------------
    # Calculate cosine similarity
    # -----------------------------------------------------

    similarities = cosine_similarity(
        query_embedding,
        document_embeddings
    )[0]

    # -----------------------------------------------------
    # Rank results from highest to lowest similarity
    # -----------------------------------------------------

    ranked_indexes = similarities.argsort()[::-1][:top_k]

    results = []

    for index in ranked_indexes:

        chunk = chunks[index]

        # -------------------------------------------------
        # Build a clean citation/source card
        # -------------------------------------------------

        citation = {
            "title": chunk["title"],
            "section": chunk.get("section", ""),
            "authority": chunk.get("authority", ""),
            "source_url": chunk.get("source_url", ""),
            "official_source": chunk.get("official_source", False),
        }

        # -------------------------------------------------
        # Build final result
        # -------------------------------------------------

        result = {
            "score": round(
                float(similarities[index]),
                4
            ),

            "document_id": chunk["document_id"],

            "title": chunk["title"],

            "section": chunk.get(
                "section",
                ""
            ),

            "text": chunk["text"],

            "source_url": chunk.get(
                "source_url",
                ""
            ),

            "authority": chunk.get(
                "authority",
                ""
            ),

            "official_source": chunk.get(
                "official_source",
                False
            ),

            "citation": citation,
        }

        results.append(result)

    return results


# ---------------------------------------------------------
# Print search results
# ---------------------------------------------------------

def print_results(results):
    """
    Display retrieved legal sources in a readable format.
    """

    print("\n" + "=" * 70)
    print("TOP LEGAL SOURCES")
    print("=" * 70)

    for i, result in enumerate(results, start=1):

        print(f"\n[{i}] Similarity: {result['score']}")

        print(f"Title: {result['title']}")

        if result["section"]:
            print(f"Section: {result['section']}")

        print(f"Authority: {result['authority']}")

        print(
            f"Official source: "
            f"{result['official_source']}"
        )

        print(f"Source: {result['source_url']}")

        print("\nLegal text:")

        print(result["text"])

        print("\nCitation:")

        print(
            f"{result['citation']['title']}"
        )

        if result["citation"]["section"]:
            print(
                f"Section: "
                f"{result['citation']['section']}"
            )

        print(
            f"Authority: "
            f"{result['citation']['authority']}"
        )

        print(
            f"Official URL: "
            f"{result['citation']['source_url']}"
        )

        print("-" * 70)


# ---------------------------------------------------------
# Test the search system directly
# ---------------------------------------------------------

if __name__ == "__main__":

    question = input(
        "\nAsk a legal knowledge question: "
    )

    results = search_legal_sources(
        question,
        top_k=5
    )

    print_results(results)