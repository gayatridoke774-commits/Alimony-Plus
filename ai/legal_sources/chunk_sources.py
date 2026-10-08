import json
from pathlib import Path


# ---------------------------------------------------------
# File paths
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
DOCUMENTS_DIR = BASE_DIR / "documents"
OUTPUT_FILE = BASE_DIR / "chunks.json"


# ---------------------------------------------------------
# Fields that should not become independent chunks
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# Convert JSON values into readable text
# ---------------------------------------------------------

def value_to_text(value):

    if isinstance(value, str):
        return value.strip()

    if isinstance(value, (int, float, bool)):
        return str(value)

    if isinstance(value, list):

        parts = []

        for item in value:

            text = value_to_text(item)

            if text:
                parts.append(text)

        return "\n".join(parts)

    if isinstance(value, dict):

        parts = []

        for key, item in value.items():

            text = value_to_text(item)

            if text:
                parts.append(
                    f"{key}: {text}"
                )

        return "\n".join(parts)

    return ""


# ---------------------------------------------------------
# Determine section name
# ---------------------------------------------------------

def get_section_name(data, field_name):

    # -----------------------------------------------------
    # Explicit section fields such as:
    # section_18
    # section_20
    # section_144
    # -----------------------------------------------------

    if field_name.startswith("section_"):

        section_number = field_name.replace(
            "section_",
            "",
            1
        )

        return f"Section {section_number}"

    # -----------------------------------------------------
    # Read section information from rag_metadata
    # -----------------------------------------------------

    rag_metadata = data.get(
        "rag_metadata",
        {}
    )

    if isinstance(rag_metadata, dict):

        sections = rag_metadata.get(
            "sections",
            []
        )

        if isinstance(sections, list) and sections:

            if len(sections) == 1:

                return f"Section {sections[0]}"

            return "Sections " + ", ".join(
                str(section)
                for section in sections
            )

    # -----------------------------------------------------
    # Other possible explicit fields
    # -----------------------------------------------------

    for key in [
        "section_number",
        "section_no",
        "section_id",
    ]:

        value = data.get(key)

        if value:

            return str(value)

    # -----------------------------------------------------
    # If this is legal_context, give it a readable label
    # -----------------------------------------------------

    if field_name == "legal_context":

        return "Legal context"

    # -----------------------------------------------------
    # Fallback
    # -----------------------------------------------------

    return field_name


# ---------------------------------------------------------
# Create chunks from one source document
# ---------------------------------------------------------

def create_chunks(data):

    chunks = []

    # -----------------------------------------------------
    # Basic document metadata
    # -----------------------------------------------------

    document_id = data.get(
        "document_id",
        ""
    )

    title = data.get(
        "title",
        ""
    )

    document_type = data.get(
        "document_type",
        ""
    )

    # -----------------------------------------------------
    # Source metadata
    # -----------------------------------------------------

    source = data.get(
        "source",
        {}
    )

    if not isinstance(source, dict):
        source = {}

    source_url = source.get(
        "url",
        ""
    )

    # IMPORTANT:
    # Authority comes from source.authority
    authority = source.get(
        "authority",
        ""
    )

    # IMPORTANT:
    # Official-source status comes from source.official_source
    official_source = source.get(
        "official_source",
        False
    )

    # -----------------------------------------------------
    # RAG metadata
    # -----------------------------------------------------

    rag_metadata = data.get(
        "rag_metadata",
        {}
    )

    if not isinstance(rag_metadata, dict):
        rag_metadata = {}

    jurisdiction = rag_metadata.get(
        "jurisdiction",
        ""
    )

    language = rag_metadata.get(
        "language",
        ""
    )

    # -----------------------------------------------------
    # Process document fields
    # -----------------------------------------------------

    for field_name, value in data.items():

        if field_name in SKIP_FIELDS:
            continue

        text = value_to_text(value)

        if not text:
            continue

        # Ignore extremely small pieces
        if len(text) < 80:
            continue

        section = get_section_name(
            data,
            field_name
        )

        # -------------------------------------------------
        # Create normal-sized chunk
        # -------------------------------------------------

        if len(text) <= 1800:

            chunks.append({
                "document_id": document_id,
                "title": title,
                "document_type": document_type,
                "section": section,
                "text": text,
                "source_url": source_url,
                "authority": authority,
                "official_source": official_source,
                "jurisdiction": jurisdiction,
                "language": language,
            })

        # -------------------------------------------------
        # Split large text
        # -------------------------------------------------

        else:

            lines = text.splitlines()

            current_chunk = []
            current_length = 0

            for line in lines:

                line = line.strip()

                if not line:
                    continue

                # Save current chunk if adding this line
                # would exceed the target size.
                if (
                    current_length + len(line) > 1800
                    and current_chunk
                ):

                    chunks.append({
                        "document_id": document_id,
                        "title": title,
                        "document_type": document_type,
                        "section": section,
                        "text": "\n".join(
                            current_chunk
                        ),
                        "source_url": source_url,
                        "authority": authority,
                        "official_source": official_source,
                        "jurisdiction": jurisdiction,
                        "language": language,
                    })

                    current_chunk = []
                    current_length = 0

                current_chunk.append(line)

                current_length += len(line)

            # Save remaining chunk
            if current_chunk:

                chunks.append({
                    "document_id": document_id,
                    "title": title,
                    "document_type": document_type,
                    "section": section,
                    "text": "\n".join(
                        current_chunk
                    ),
                    "source_url": source_url,
                    "authority": authority,
                    "official_source": official_source,
                    "jurisdiction": jurisdiction,
                    "language": language,
                })

    return chunks


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

def main():

    print("Loading legal source documents...")

    all_chunks = []

    files = sorted(
        DOCUMENTS_DIR.glob("*.json")
    )

    print(
        f"Documents found: {len(files)}"
    )

    for file_path in files:

        print(
            f"\nProcessing: {file_path.name}"
        )

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as f:

            data = json.load(f)

        document_chunks = create_chunks(
            data
        )

        print(
            f"Chunks created: "
            f"{len(document_chunks)}"
        )

        all_chunks.extend(
            document_chunks
        )

    # -----------------------------------------------------
    # Save chunks
    # -----------------------------------------------------

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            all_chunks,
            f,
            ensure_ascii=False,
            indent=2
        )

    # -----------------------------------------------------
    # Statistics
    # -----------------------------------------------------

    sizes = [
        len(chunk["text"])
        for chunk in all_chunks
    ]

    print("\n" + "=" * 70)
    print("CHUNKING COMPLETED")
    print("=" * 70)

    print(
        f"Total documents: {len(files)}"
    )

    print(
        f"Total chunks: {len(all_chunks)}"
    )

    if sizes:

        print(
            f"Smallest chunk: {min(sizes)} characters"
        )

        print(
            f"Largest chunk: {max(sizes)} characters"
        )

        print(
            f"Average chunk: "
            f"{sum(sizes) / len(sizes):.1f} characters"
        )

    print(
        f"Saved to: {OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()