
import json
import re
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DOCUMENTS_DIR = BASE_DIR / "documents"
OUTPUT_FILE = BASE_DIR / "chunks.json"

TARGET_CHUNK_SIZE = 1800

# Metadata fields must not be indexed as legal content.
SKIP_FIELDS = {
    "document_id",
    "title",
    "document_type",
    "source",
    "rag_metadata",
    "act_number",
    "notification_date",
    "source_id",
    "source_url",
    "url",
    "authority",
    "official_source",
    "jurisdiction",
    "language",
    "last_verified_on",
    "reviewed_on",
    "document_url",
    "version",
    "effective_from",
    "enactment_date",
    "judgment_date",
    "date_of_judgment",
    "notification_number",
    "citation",
    "court",
    "status",
    "retrieval_note",
}


def format_label(key):
    """Convert structured JSON keys into readable legal headings."""
    key = str(key).strip()
    normalized = key.replace("-", "_").replace(" ", "_")
    normalized = re.sub(r"_+", "_", normalized).strip("_")

    simple_labels = {
        "act": "Act",
        "chapter": "Chapter",
        "chapters": "Chapter",
        "section": "Section",
        "sections": "Section",
        "subsection": "Subsection",
        "subsections": "Subsection",
        "sub_section": "Subsection",
        "sub_sections": "Subsection",
        "clause": "Clause",
        "clauses": "Clause",
        "subclause": "Subclause",
        "subclauses": "Subclause",
        "sub_clause": "Subclause",
        "sub_clauses": "Subclause",
        "proviso": "Proviso",
        "provisos": "Proviso",
        "explanation": "Explanation",
        "explanations": "Explanation",
        "illustration": "Illustration",
        "illustrations": "Illustration",
        "rule": "Rule",
        "rules": "Rule",
        "article": "Article",
        "articles": "Article",
        "paragraph": "Paragraph",
        "paragraphs": "Paragraph",
    }

    if normalized.lower() in simple_labels:
        return simple_labels[normalized.lower()]

    # Convert single-letter keys into legal clause labels.
    if re.fullmatch(r"[a-z]", normalized, flags=re.IGNORECASE):
        return f"Clause ({normalized.lower()})"

    patterns = [
        (r"^section_(.+)$", "Section"),
        (r"^chapter_(.+)$", "Chapter"),
        (r"^subsections?_(.+)$", "Subsection"),
        (r"^sub_sections?_(.+)$", "Subsection"),
        (r"^clauses?_(.+)$", "Clause"),
        (r"^subclauses?_(.+)$", "Subclause"),
        (r"^sub_clauses?_(.+)$", "Subclause"),
        (r"^provisos?_(.+)$", "Proviso"),
        (r"^explanations?_(.+)$", "Explanation"),
        (r"^illustrations?_(.+)$", "Illustration"),
        (r"^rules?_(.+)$", "Rule"),
        (r"^articles?_(.+)$", "Article"),
        (r"^paragraphs?_(.+)$", "Paragraph"),
    ]

    for pattern, label in patterns:
        match = re.match(pattern, normalized, flags=re.IGNORECASE)

        if match:
            suffix = match.group(1).replace("_", " ").strip()
            return f"{label} {suffix}" if suffix else label

    return key.replace("_", " ").replace("-", " ").strip().title()


def get_section_name(data, field_name, rendered_text=""):
    """Determine the most specific section label available for a chunk."""
    field_name = str(field_name).lower()

    if field_name.startswith("section_"):
        return format_label(field_name)

    # Prefer the section hierarchy present in the rendered chunk.
    if rendered_text:
        for line in rendered_text.splitlines():
            heading = line.strip()

            if heading.startswith("Section "):
                section_part = heading.split(" > ", 1)[0]

                if section_part.startswith("Section ") and section_part != "Section":
                    return section_part

    metadata = data.get("rag_metadata", {})

    if isinstance(metadata, dict):
        sections = metadata.get("sections", [])

        if isinstance(sections, list) and sections:
            if len(sections) == 1:
                return f"Section {sections[0]}"

            return "Sections " + ", ".join(map(str, sections))

    for key in ("section_number", "section_no", "section_id"):
        value = data.get(key)

        if value:
            return str(value)

    if field_name == "legal_context":
        return "Legal context"

    return format_label(field_name)


def render_content(value, hierarchy=()):
    """
    Render nested JSON content while retaining its heading hierarchy.
    Preserve short text and number list items where appropriate.
    """
    if isinstance(value, str):
        text = value.strip()

        if not text:
            return ""

        if hierarchy and text.casefold() == hierarchy[-1].casefold():
            return ""

        heading = " > ".join(hierarchy)
        return f"{heading}\n{text}" if heading else text

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)

    if isinstance(value, bool) or value is None:
        return ""

    if isinstance(value, list):
        parts = []

        for index, item in enumerate(value, start=1):
            item_hierarchy = hierarchy

            if hierarchy and hierarchy[-1].casefold() in {
                "proviso",
                "clause",
                "subclause",
            }:
                numbered_label = f"{hierarchy[-1]} {index}"
                item_hierarchy = hierarchy[:-1] + (numbered_label,)

            rendered = render_content(item, item_hierarchy)

            if rendered.strip():
                parts.append(rendered)

        return "\n\n".join(parts)

    if isinstance(value, dict):
        parts = []

        for key, item in value.items():
            if str(key).lower() in SKIP_FIELDS:
                continue

            label = format_label(key)

            if hierarchy and label.casefold() == hierarchy[-1].casefold():
                next_hierarchy = hierarchy
            else:
                next_hierarchy = hierarchy + (label,)

            rendered = render_content(item, next_hierarchy)

            if rendered.strip():
                parts.append(rendered)

        return "\n\n".join(parts)

    return ""


def split_long_text(text, limit):
    """Split oversized text at paragraph, sentence, then word boundaries."""
    if len(text) <= limit:
        return [text]

    paragraphs = [
        part.strip()
        for part in re.split(r"\n\s*\n", text)
        if part.strip()
    ]

    pieces = []
    current = ""

    for paragraph in paragraphs:
        if len(paragraph) > limit:
            if current:
                pieces.append(current)
                current = ""

            sentences = re.split(r"(?<=[.!?])\s+", paragraph)
            sentence_group = ""

            for sentence in sentences:
                if len(sentence) > limit:
                    if sentence_group:
                        pieces.append(sentence_group)
                        sentence_group = ""

                    words = sentence.split()
                    word_group = ""

                    for word in words:
                        candidate = f"{word_group} {word}".strip()

                        if len(candidate) > limit and word_group:
                            pieces.append(word_group)
                            word_group = word
                        else:
                            word_group = candidate

                    if word_group:
                        pieces.append(word_group)

                else:
                    candidate = f"{sentence_group} {sentence}".strip()

                    if len(candidate) > limit and sentence_group:
                        pieces.append(sentence_group)
                        sentence_group = sentence
                    else:
                        sentence_group = candidate

            if sentence_group:
                pieces.append(sentence_group)

            continue

        candidate = f"{current}\n\n{paragraph}".strip()

        if len(candidate) > limit and current:
            pieces.append(current)
            current = paragraph
        else:
            current = candidate

    if current:
        pieces.append(current)

    return pieces or [text]


def create_chunks(data):
    """Create chunks with source metadata and embedded legal hierarchy."""
    chunks = []

    if not isinstance(data, dict):
        return chunks

    document_id = data.get("document_id", "")
    title = data.get("title", "")
    document_type = data.get("document_type", "")

    source = data.get("source", {})
    if not isinstance(source, dict):
        source = {}

    source_url = (
        source.get("source_url")
        or source.get("url")
        or ""
    )

    authority = source.get("authority", "")
    official_source = source.get("official_source", False)

    metadata = data.get("rag_metadata", {})
    if not isinstance(metadata, dict):
        metadata = {}

    jurisdiction = metadata.get("jurisdiction", "")
    language = metadata.get("language", "")

    for field_name, value in data.items():
        field_key = str(field_name).lower()

        if field_key in SKIP_FIELDS:
            continue

        # Skip top-level section identifiers as standalone content.
        # Keep section information in citation metadata and legal headings.
        if field_key in {
            "section",
            "section_number",
            "section_no",
        }:
            continue

        rendered = render_content(value).strip()

        if not rendered:
            continue

        for piece in split_long_text(rendered, TARGET_CHUNK_SIZE):
            piece = piece.strip()

            if not piece:
                continue

            section = get_section_name(data, field_name, piece)

            chunks.append({
                "document_id": document_id,
                "title": title,
                "document_type": document_type,
                "section": section,
                "text": piece,
                "source_url": source_url,
                "authority": authority,
                "official_source": official_source,
                "jurisdiction": jurisdiction,
                "language": language,
            })

    return chunks


def main():
    print("Loading legal source documents...")

    if not DOCUMENTS_DIR.exists():
        print(f"Documents directory not found: {DOCUMENTS_DIR}")
        raise SystemExit(1)

    files = sorted(DOCUMENTS_DIR.glob("*.json"))
    all_chunks = []
    errors = []

    print(f"Documents found: {len(files)}")

    if not files:
        print("No JSON source documents found.")
        raise SystemExit(1)

    for file_path in files:
        print(f"\nProcessing: {file_path.name}")

        try:
            with open(file_path, "r", encoding="utf-8-sig") as file:
                data = json.load(file)

            document_chunks = create_chunks(data)

            if not document_chunks:
                errors.append(
                    f"{file_path.name}: no content chunks generated"
                )

            print(f"Chunks created: {len(document_chunks)}")
            all_chunks.extend(document_chunks)

        except (OSError, json.JSONDecodeError) as error:
            errors.append(f"{file_path.name}: {error}")
            print(f"ERROR: {error}")

    if errors:
        print("\nProblems found:")

        for error in errors:
            print(f"- {error}")

        print("Output may be incomplete; resolve errors before using it.")
        raise SystemExit(1)

    if not all_chunks:
        print("No chunks generated. Existing output was not overwritten.")
        raise SystemExit(1)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(
            all_chunks,
            file,
            ensure_ascii=False,
            indent=2,
        )

    sizes = [len(chunk["text"]) for chunk in all_chunks]

    print("\n" + "=" * 70)
    print("CHUNKING COMPLETED")
    print("=" * 70)
    print(f"Total documents: {len(files)}")
    print(f"Total chunks: {len(all_chunks)}")
    print(f"Chunks under 80 characters: {sum(size < 80 for size in sizes)}")
    print(f"Smallest chunk: {min(sizes)} characters")
    print(f"Largest chunk: {max(sizes)} characters")
    print(f"Average chunk: {sum(sizes) / len(sizes):.1f} characters")
    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
