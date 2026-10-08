import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DOCUMENTS_DIR = BASE_DIR / "documents"
OUTPUT_FILE = BASE_DIR / "chunks.json"

SKIP_FIELDS = {
    "document_id",
    "title",
    "document_type",
    "source",
    "rag_metadata",
    "act",
    "act_number",
    "chapter",
    "rules",
    "notification_date",
}


def text_from_value(value):
    """Convert JSON values into readable text."""
    if isinstance(value, str):
        return value.strip()

    if isinstance(value, dict):
        parts = []

        for key, item in value.items():
            if key in SKIP_FIELDS:
                continue

            item_text = text_from_value(item)

            if item_text:
                parts.append(f"{key}: {item_text}")

        return "\n".join(parts)

    if isinstance(value, list):
        parts = []

        for item in value:
            item_text = text_from_value(item)

            if item_text:
                parts.append(item_text)

        return "\n".join(parts)

    return str(value)


def split_long_text(text, max_chars=1800):
    """Split very large text into smaller chunks."""
    if len(text) <= max_chars:
        return [text]

    lines = text.splitlines()
    chunks = []
    current = ""

    for line in lines:
        if len(current) + len(line) + 1 <= max_chars:
            current += line + "\n"
        else:
            if current.strip():
                chunks.append(current.strip())

            current = line + "\n"

    if current.strip():
        chunks.append(current.strip())

    return chunks


all_chunks = []

json_files = sorted(DOCUMENTS_DIR.glob("*.json"))

for file_path in json_files:
    with open(file_path, "r", encoding="utf-8") as f:
        document = json.load(f)

    document_id = document.get("document_id")
    title = document.get("title")
    document_type = document.get("document_type")

    source = document.get("source", {})
    rag_metadata = document.get("rag_metadata", {})

    source_url = source.get("url", "")
    authority = source.get("authority", "")
    official_source = source.get("official_source", False)

    # Process meaningful fields only
    for field, value in document.items():

        if field in SKIP_FIELDS:
            continue

        text = text_from_value(value)

        if len(text) < 80:
            continue

        text_parts = split_long_text(text)

        for part in text_parts:

            if len(part) < 80:
                continue

            chunk = {
                "chunk_id": f"{document_id}_{len(all_chunks) + 1}",
                "document_id": document_id,
                "title": title,
                "document_type": document_type,
                "section": field,
                "text": part,
                "source_url": source_url,
                "authority": authority,
                "official_source": official_source,
                "jurisdiction": rag_metadata.get("jurisdiction", "India"),
                "language": rag_metadata.get("language", "English"),
            }

            all_chunks.append(chunk)


# Save chunks
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(all_chunks, f, ensure_ascii=False, indent=2)


# Statistics
sizes = [len(chunk["text"]) for chunk in all_chunks]

print()
print("Chunking completed successfully!")
print(f"Documents processed: {len(json_files)}")
print(f"Total chunks: {len(all_chunks)}")

if sizes:
    print(f"Smallest chunk: {min(sizes)} characters")
    print(f"Largest chunk: {max(sizes)} characters")
    print(f"Average chunk: {sum(sizes) // len(sizes)} characters")

print()
print(f"Saved to: {OUTPUT_FILE}")