import json
from pathlib import Path


# Folder containing our legal JSON documents
DOCUMENTS_DIR = Path(__file__).parent / "documents"


def load_legal_sources():
    """
    Load all legal JSON documents from the documents folder.
    """

    sources = []

    json_files = sorted(DOCUMENTS_DIR.glob("*.json"))

    for file_path in json_files:

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                data = json.load(file)

            sources.append({
                "filename": file_path.name,
                "document": data
            })

        except json.JSONDecodeError as error:
            print(f"❌ Could not read {file_path.name}")
            print(f"   JSON error: {error}")

    return sources


def main():

    print("=" * 60)
    print("ALIMONY PLUS - LEGAL SOURCE LOADER")
    print("=" * 60)

    sources = load_legal_sources()

    print(f"\nLoaded {len(sources)} legal sources.\n")

    for source in sources:

        document = source["document"]

        print(
            f"✅ {source['filename']} "
            f"→ {document.get('title', 'No title')}"
        )

    print("\n" + "-" * 60)
    print(f"Total sources loaded: {len(sources)}")
    print("-" * 60)


if __name__ == "__main__":
    main()