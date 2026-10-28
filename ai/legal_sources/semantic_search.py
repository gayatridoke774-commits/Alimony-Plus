
import json
from functools import lru_cache
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from source_policy import (
    get_source_eligibility,
    get_document_source_ids,
    is_document_eligible,
)


BASE_DIR = Path(__file__).resolve().parent
EMBEDDED_FILE = BASE_DIR / "embedded_chunks.json"

MODEL_NAME = "intfloat/multilingual-e5-small"

# Provisional threshold; validate with a larger retrieval test set.
MIN_SIMILARITY_THRESHOLD = 0.82

# Prefer statutory text when its score is sufficiently close to
# the highest-scoring chunk from the same document.
MAX_STATUTORY_SCORE_GAP = 0.05


@lru_cache(maxsize=1)
def load_resources():
    """Load and cache the model, chunks, and document embeddings."""
    print("Loading legal knowledge base...")

    with open(EMBEDDED_FILE, "r", encoding="utf-8") as file:
        loaded_chunks = json.load(file)

    if not isinstance(loaded_chunks, list) or not loaded_chunks:
        raise ValueError("The embedded knowledge base is empty or invalid.")

    for index, chunk in enumerate(loaded_chunks):
        if not isinstance(chunk, dict):
            raise ValueError(f"Chunk {index} is not a JSON object.")

        required = (
            "document_id",
            "title",
            "text",
            "embedding",
            "source_url",
            "authority",
            "section",
        )
        missing = [key for key in required if not chunk.get(key)]

        if missing:
            raise ValueError(
                f"Chunk {index} is missing required fields: {missing}"
            )

        if len(chunk["embedding"]) != 384:
            raise ValueError(f"Chunk {index} has an invalid embedding size.")

    embeddings = np.asarray(
        [chunk["embedding"] for chunk in loaded_chunks],
        dtype=np.float32,
    )

    print(f"Legal chunks loaded: {len(loaded_chunks)}")
    print("Loading E5-small model...")

    embedding_model = SentenceTransformer(MODEL_NAME)

    return loaded_chunks, embeddings, embedding_model


def select_best_chunk(
    chunks,
    scores,
    max_score_gap=MAX_STATUTORY_SCORE_GAP,
):
    """
    Prefer statutory text if it scores within max_score_gap of
    the best chunk. Otherwise, return the highest-scoring chunk.
    """
    if not chunks or len(chunks) != len(scores):
        raise ValueError(
            "Chunks and scores must be non-empty and equal in length."
        )

    best_index = max(range(len(scores)), key=lambda i: scores[i])
    best_score = scores[best_index]

    statutory_candidates = [
        i
        for i, chunk in enumerate(chunks)
        if chunk.get("text", "").lstrip().startswith("Statutory Text >")
        and best_score - scores[i] <= max_score_gap
    ]

    if statutory_candidates:
        selected_index = max(
            statutory_candidates,
            key=lambda i: scores[i],
        )
    else:
        selected_index = best_index

    return chunks[selected_index]


def search_legal_sources(
    question,
    top_k=5,
    min_similarity=MIN_SIMILARITY_THRESHOLD,
    *,
    evaluation_mode=False,
):
    """
    Return unique, eligible legal documents ranked by matching chunks.

    Only sources with an eligible registry status, current verification
    date, and current substantive content-review date can be returned.

    Similarity is a retrieval signal, not a probability of legal correctness.
    """
    if not isinstance(question, str) or not question.strip():
        return []

    if not isinstance(top_k, int) or isinstance(top_k, bool) or top_k < 1:
        raise ValueError("top_k must be a positive integer.")

    if (
        not isinstance(min_similarity, (int, float))
        or isinstance(min_similarity, bool)
        or not -1.0 <= min_similarity <= 1.0
    ):
        raise ValueError("min_similarity must be between -1 and 1.")

    chunks, document_embeddings, model = load_resources()

    if not isinstance(evaluation_mode, bool):
        raise ValueError("evaluation_mode must be a boolean.")

    if evaluation_mode:
        # Offline evaluation only: test retrieval candidates
        # without approving them for legal-AI production use.
        eligible_indices = list(range(len(chunks)))

        print(
            "WARNING: Evaluation mode enabled. "
            "Results are unapproved retrieval candidates."
        )
    else:
        # Production mode: fail closed.
        eligibility = get_source_eligibility()
        document_sources = get_document_source_ids()

        eligible_indices = [
            index
            for index, chunk in enumerate(chunks)
            if is_document_eligible(
                chunk.get("document_id"),
                eligibility,
                document_sources,
            )
        ]

    print(
        f"Eligible legal chunks: {len(eligible_indices)} "
        f"of {len(chunks)}"
    )

    if not eligible_indices:
        print(
            "No eligible legal sources are available. "
            "Check registry status, verification dates, and review dates."
        )
        return []

    eligible_chunks = [chunks[index] for index in eligible_indices]
    eligible_embeddings = document_embeddings[eligible_indices]

    query_embedding = model.encode(
        [f"query: {question.strip()}"],
        normalize_embeddings=True,
    )

    similarities = cosine_similarity(
        query_embedding,
        eligible_embeddings,
    )[0]

    # Group relevant chunks by document.
    chunks_by_document = {}

    for index, raw_score in enumerate(similarities):
        score = float(raw_score)

        if score < min_similarity:
            continue

        chunk = eligible_chunks[index]
        document_id = chunk["document_id"]

        chunks_by_document.setdefault(document_id, []).append(
            {
                "score": score,
                "chunk": chunk,
            }
        )

    best_by_document = {}

    for document_id, candidates in chunks_by_document.items():
        candidate_chunks = [item["chunk"] for item in candidates]
        candidate_scores = [item["score"] for item in candidates]

        selected_chunk = select_best_chunk(
            candidate_chunks,
            candidate_scores,
        )

        # Find the score for the exact selected chunk.
        selected_index = next(
            i
            for i, candidate_chunk in enumerate(candidate_chunks)
            if candidate_chunk is selected_chunk
        )
        selected_score = candidate_scores[selected_index]

        best_by_document[document_id] = {
            "score": selected_score,
            "chunk": selected_chunk,
        }

    ranked = sorted(
        best_by_document.values(),
        key=lambda item: item["score"],
        reverse=True,
    )[:top_k]

    results = []

    for item in ranked:
        chunk = item["chunk"]

        citation = {
            "title": chunk["title"],
            "section": chunk["section"],
            "authority": chunk["authority"],
            "source_url": chunk["source_url"],
            "official_source": chunk.get("official_source", False),
        }

        results.append(
            {
                "score": round(item["score"], 4),
                "document_id": chunk["document_id"],
                "title": chunk["title"],
                "section": chunk["section"],
                "text": chunk["text"],
                "source_url": chunk["source_url"],
                "authority": chunk["authority"],
                "official_source": chunk.get("official_source", False),
                "citation": citation,
            }
        )

    return results


def print_results(results):
    """Display retrieved sources and their citation metadata."""
    print("\n" + "=" * 70)
    print("TOP LEGAL SOURCES")
    print("=" * 70)

    if not results:
        print("No eligible, sufficiently relevant source found.")
        return

    for rank, result in enumerate(results, start=1):
        print(f"\n[{rank}] Similarity: {result['score']}")
        print(f"Title: {result['title']}")
        print(f"Section: {result['section']}")
        print(f"Authority: {result['authority']}")
        print(f"Official source: {result['official_source']}")
        print(f"Source: {result['source_url']}")
        print("\nLegal text:")
        print(result["text"])
        print("-" * 70)


if __name__ == "__main__":
    question = input("\nAsk a legal knowledge question: ")
    results = search_legal_sources(question, top_k=5)
    print_results(results)
