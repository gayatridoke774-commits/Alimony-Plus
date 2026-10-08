import json
from pathlib import Path


DOCUMENTS_DIR = Path(__file__).parent / "documents"


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
    "notification_date"
}

MAX_CHARS = 1800
MIN_CHARS = 80


def load_sources():
    """Load all legal JSON documents."""

    sources = []

    for file_path in sorted(DOCUMENTS_DIR.glob("*.json")):

        with open(file_path, "r", encoding="utf-8") as file:
            data = json.load(file)

        sources.append(data)

    return sources


def text_from_value(value):
    """Convert JSON content into readable text."""

    if isinstance(value, str):
        return value

    return json.dumps(
        value,
        ensure_ascii=False,
        indent=2
    )


def split_large_text(text, max_chars=MAX_CHARS):
    """
    Split large text into smaller pieces.

    We split by lines first so that JSON/legal statements
    are less likely to be cut in the middle.
    """

    if len(text) <= max_chars:
        return [text]

    lines = text.splitlines()

    pieces = []
    current = []

    current_length = 0

    for line in lines:

        line_length = len(line) + 1

        if current and current_length + line_length > max_chars:

            pieces.append("\n".join(current))

            current = []
            current_length = 0

        current.append(line)
        current_length += line_length

    if current:
        pieces.append("\n".join(current))

    return pieces


def create_chunks(document):
    """
    Create meaningful retrieval chunks from one legal document.
    """

    chunks = []

    document_id = document.get("document_id")
    title = document.get("title")
    document_type = document.get("document_type")

    source = document.get("source", {})
    rag_metadata = document.get("rag_metadata", {})

    base_metadata = {
        "document_id": document_id,
        "title": title,
        "document_type": document_type,
        "source_url": source.get("url"),
        "authority": source.get("authority"),
        "official_source": source.get("official_source"),
        "jurisdiction": rag_metadata.get("jurisdiction"),
        "language": rag_metadata.get("language")
    }

    for section_name, section_content in document.items():

        if section_name in SKIP_FIELDS:
            continue

        text = text_from_value(section_content)

        if len(text.strip()) < MIN_CHARS:
            continue

        pieces = split_large_text(text)

        for index, piece in enumerate(pieces, start=1):

            if len(pieces) == 1:
                chunk_id = f"{document_id}_{section_name}"
            else:
                chunk_id = f"{document_id}_{section_name}_{index}"

            chunk = {
                "chunk_id": chunk_id,
                "content": piece,
                "metadata": {
                    **base_metadata,
                    "section": section_name
                }
            }

            chunks.append(chunk)

    return chunks


def main():

    print("=" * 60)
    print("ALIMONY PLUS - LEGAL CHUNKER")
    print("=" * 60)

    sources = load_sources()

    all_chunks = []

    for document in sources:

        chunks = create_chunks(document)

        all_chunks.extend(chunks)

        print(
            f"✅ {document.get('document_id')} "
            f"→ {len(chunks)} chunks"
        )

    print("\n" + "-" * 60)

    print(f"Documents loaded : {len(sources)}")
    print(f"Total chunks     : {len(all_chunks)}")

    if all_chunks:

        sizes = [
            len(chunk["content"])
            for chunk in all_chunks
        ]

        average_size = sum(sizes) / len(sizes)

        print(f"Smallest chunk   : {min(sizes)} characters")
        print(f"Largest chunk    : {max(sizes)} characters")
        print(f"Average size     : {average_size:.0f} characters")

    print("-" * 60)

    
    print("\nExample chunks:")
    print("=" * 60)

    for chunk in all_chunks[:3]:

        print(f"\nChunk ID : {chunk['chunk_id']}")
        print(f"Section  : {chunk['metadata']['section']}")
        print(f"Title    : {chunk['metadata']['title']}")
        print(f"Size     : {len(chunk['content'])} characters")

        print("\nContent:")
        print(chunk["content"][:400])

        if len(chunk["content"]) > 400:
            print("...")


if __name__ == "__main__":
    main()