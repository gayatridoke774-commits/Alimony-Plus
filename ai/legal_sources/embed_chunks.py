import json
from pathlib import Path

from sentence_transformers import SentenceTransformer


BASE_DIR = Path(__file__).resolve().parent
CHUNKS_FILE = BASE_DIR / "chunks.json"
OUTPUT_FILE = BASE_DIR / "embedded_chunks.json"


print("Loading E5-small model...")
model = SentenceTransformer("intfloat/multilingual-e5-small")

print("Loading chunks...")
with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
    chunks = json.load(f)

print(f"Chunks loaded: {len(chunks)}")

# E5 expects stored documents to use the "passage:" prefix.
texts = [
    f"passage: {chunk['text']}"
    for chunk in chunks
]

print("Generating embeddings...")

embeddings = model.encode(
    texts,
    normalize_embeddings=True,
    show_progress_bar=True
)

embedded_chunks = []

for chunk, embedding in zip(chunks, embeddings):
    embedded_chunks.append({
        **chunk,
        "embedding": embedding.tolist()
    })


with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(
        embedded_chunks,
        f,
        ensure_ascii=False,
        indent=2
    )


print()
print("Embedding completed successfully!")
print(f"Total embedded chunks: {len(embedded_chunks)}")
print(f"Embedding dimensions: {len(embedded_chunks[0]['embedding'])}")
print(f"Saved to: {OUTPUT_FILE}")