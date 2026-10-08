import json
from pathlib import Path


DOCUMENTS_DIR = Path(__file__).parent / "documents"


REQUIRED_FIELDS = [
    "document_id",
    "title",
    "document_type",
    "source",
    "rag_metadata"
]


def validate_document(file_path):
    """Validate one legal JSON document."""

    try:
        with open(file_path, "r", encoding="utf-8") as file:
            data = json.load(file)

    except json.JSONDecodeError as error:
        return False, f"Invalid JSON: {error}"

    missing_fields = [
        field for field in REQUIRED_FIELDS
        if field not in data
    ]

    if missing_fields:
        return False, f"Missing fields: {missing_fields}"

    source = data.get("source", {})

    if source.get("official_source") is not True:
        return False, "Source is not marked as official"

    return True, "Valid"


def main():
    print("=" * 60)
    print("ALIMONY PLUS - LEGAL SOURCE VALIDATOR")
    print("=" * 60)

    json_files = sorted(DOCUMENTS_DIR.glob("*.json"))

    if not json_files:
        print("\nNo JSON files found.")
        return

    valid_count = 0
    invalid_count = 0

    print(f"\nFound {len(json_files)} JSON files.\n")

    for file_path in json_files:

        is_valid, message = validate_document(file_path)

        if is_valid:
            print(f"✅ {file_path.name} -> {message}")
            valid_count += 1
        else:
            print(f"❌ {file_path.name} -> {message}")
            invalid_count += 1

    print("\n" + "-" * 60)
    print(f"Valid sources   : {valid_count}")
    print(f"Invalid sources : {invalid_count}")
    print("-" * 60)

    if invalid_count == 0:
        print("\n🎉 All legal sources passed validation!")
    else:
        print("\n⚠️ Some sources need to be fixed.")


if __name__ == "__main__":
    main()