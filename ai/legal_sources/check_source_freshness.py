import json
from datetime import date
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DOCUMENTS_DIR = BASE_DIR / "documents"


def get_review_date(document):
    """
    Get the review date from the source metadata.
    """

    rag_metadata = document.get("rag_metadata", {})

    return (
        rag_metadata.get("reviewed_on")
        or document.get("reviewed_on")
        or document.get("source", {}).get("reviewed_on")
        or ""
    )


def check_document(file_path):
    """
    Check one legal source for basic maintenance metadata.
    """

    with open(file_path, "r", encoding="utf-8") as f:
        document = json.load(f)

    source = document.get("source", {})
    rag_metadata = document.get("rag_metadata", {})

    document_id = document.get(
        "document_id",
        file_path.stem
    )

    title = document.get(
        "title",
        "Unknown title"
    )

    official_source = source.get(
        "official_source",
        False
    )

    authority = source.get(
        "authority",
        ""
    )

    source_url = (
    source.get("url")
    or source.get("source_url")
    or ""
    )

    review_date = get_review_date(document)

    status = "OK"

    if not official_source:
        status = "REVIEW"

    if not authority:
        status = "REVIEW"

    if not source_url:
        status = "REVIEW"

    print(f"\nDocument: {document_id}")
    print(f"Title: {title}")
    print(f"Authority: {authority}")
    print(f"Official source: {official_source}")
    print(f"Review date: {review_date}")
    print(f"Source URL: {source_url}")
    print(f"Status: {status}")

    return status


def main():

    print("=" * 70)
    print("LEGAL SOURCE MAINTENANCE CHECK")
    print("=" * 70)

    files = sorted(
        DOCUMENTS_DIR.glob("*.json")
    )

    if not files:
        print("No legal source files found.")
        return

    total = 0
    valid = 0
    review_required = 0

    for file_path in files:

        total += 1

        status = check_document(file_path)

        if status == "OK":
            valid += 1
        else:
            review_required += 1

    print("\n" + "=" * 70)
    print("MAINTENANCE SUMMARY")
    print("=" * 70)

    print(f"Total sources : {total}")
    print(f"Valid sources : {valid}")
    print(f"Needs review  : {review_required}")

    if review_required == 0:
        print("\nRESULT: ALL SOURCES PASSED MAINTENANCE CHECK")
    else:
        print("\nRESULT: SOME SOURCES NEED REVIEW")


if __name__ == "__main__":
    main()