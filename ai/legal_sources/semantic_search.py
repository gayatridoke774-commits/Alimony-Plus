import json
from pathlib import Path

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


BASE_DIR = Path(__file__).resolve().parent
EMBEDDED_FILE = BASE_DIR / "embedded_chunks.json"


print("Loading legal knowledge base...")

with open(EMBEDDED_FILE, "r", encoding="utf-8") as f:
    chunks = json.load(f)

print(f"Legal chunks loaded: {len(chunks)}")

print("Loading E5-small model...")
model = SentenceTransformer("intfloat/multilingual-e5-small")


def search_legal_sources(question, top_k=5):
    """
    Search the verified legal knowledge base.

    Args:
        question: User's legal question.
        top_k: Number of results to return.

    Returns:
        List of relevant legal source chunks.
    """

    query_embedding = model.encode(
        [f"query: {question}"],
        normalize_embeddings=True
    )

    document_embeddings = [
        chunk["embedding"]
        for chunk in chunks
    ]

    similarities = cosine_similarity(
        query_embedding,
        document_embeddings
    )[0]

    ranked_indexes = similarities.argsort()[::-1][:top_k]

    results = []

    for index in ranked_indexes:
        chunk = chunks[index]

        results.append({
            "score": round(float(similarities[index]), 4),
            "document_id": chunk["document_id"],
            "title": chunk["title"],
            "section": chunk["section"],
            "text": chunk["text"],
            "source_url": chunk["source_url"],
            "authority": chunk["authority"],
            "official_source": chunk["official_source"],
        })

    return results


def print_results(results):
    """Display search results in a readable format."""

    print("\n" + "=" * 70)
    print("TOP LEGAL SOURCES")
    print("=" * 70)

    for i, result in enumerate(results, start=1):

        print(f"\n[{i}] Similarity: {result['score']}")
        print(f"Title: {result['title']}")
        print(f"Section: {result['section']}")
        print(f"Authority: {result['authority']}")
        print(f"Official source: {result['official_source']}")
        print(f"Source: {result['source_url']}")
        print(f"Text:\n{result['text']}")
        print("-" * 70)


if __name__ == "__main__":

    question = input("\nAsk a legal knowledge question: ")

    results = search_legal_sources(question)

    print_results(results)