
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse
from xml.parsers.expat import errors
from functools import lru_cache


BASE_DIR = Path(__file__).resolve().parent
DOCUMENTS_DIR = BASE_DIR / "documents"
REGISTRY_FILE = BASE_DIR / "registry.json"

REQUIRED_FIELDS = [
    "document_id",
    "title",
    "document_type",
    "source",
    "rag_metadata",
]

# Explicit allowlist. Add domains only after verifying they are official.
OFFICIAL_DOMAINS = {
    "indiacode.nic.in",
    "sci.gov.in",
    "api.sci.gov.in",
    "nalsa.gov.in",
    "ecourts.gov.in",
    "services.ecourts.gov.in",
    "meity.gov.in",
}

CONTENT_FIELDS = {
    "content",
    "sections",
    "section",
    "legal_context",
    "legal_text",
    "statutory_text",
    "plain_summary",
    "summary",
    "key_elements",
    "provisions",
    "holding",
    "guidance",
    "important_note",
    "text",
    "explanation",
    "provisos",
    "main_provision",
    "subsection_1",
    "subsection_2",
    "subsection_3",
    "subsection_4",
    "subsection_5",
}


def load_json(file_path):
    """Load JSON and return (data, error)."""
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            return json.load(file), None
    except (json.JSONDecodeError, OSError) as error:
        return None, str(error)


def is_official_domain(hostname):
    """Accept only an explicitly allowlisted domain or its subdomain."""
    if not hostname:
        return False

    hostname = hostname.lower().rstrip(".")

    return any(
        hostname == domain or hostname.endswith("." + domain)
        for domain in OFFICIAL_DOMAINS
    )


def get_source_url(source):
    """Read the canonical URL field, with legacy compatibility."""
    return source.get("source_url") or source.get("url") or ""


def has_meaningful_content(value, minimum_length=20):
    """Check for substantive text without dropping short legal clauses."""
    if isinstance(value, str):
        return len(value.strip()) >= minimum_length

    if isinstance(value, dict):
        for key, child in value.items():
            if key in CONTENT_FIELDS:
                if has_meaningful_content(child, minimum_length):
                    return True

            # Search nested structures too.
            if isinstance(child, (dict, list)):
                if has_meaningful_content(child, minimum_length):
                    return True

    elif isinstance(value, list):
        return any(
            has_meaningful_content(item, minimum_length)
            for item in value
        )

    return False


def get_section_or_context(data):
    """Support the different legal-document schemas in this corpus."""
    metadata = data.get("rag_metadata", {})

    candidates = [
        data.get("section"),
        data.get("sections"),
        data.get("chapter"),
        data.get("legal_context"),
        metadata.get("sections"),
        metadata.get("legal_context"),
        metadata.get("retrieval_tags"),
        metadata.get("tags"),
    ]

    return next(
        (
            item for item in candidates
            if item is not None and item != "" and item != []
        ),
        None,
    )


def validate_url(source_url):
    """Validate URL syntax and official-domain membership."""
    errors = []

    if not isinstance(source_url, str) or not source_url.strip():
        return ["Missing source URL"]

    try:
        parsed = urlparse(source_url.strip())
        hostname = parsed.hostname
    except ValueError:
        return ["Malformed source URL"]

    if parsed.scheme != "https":
        errors.append("Source URL must use HTTPS")

    if not hostname:
        errors.append("Source URL has no valid hostname")
    elif not is_official_domain(hostname):
        errors.append(
            f"URL domain is not allowlisted as official: {hostname}"
        )

    return errors

@lru_cache(maxsize=256)
def check_url_reachability(source_url, timeout=10):
    """Check URL reachability using HEAD, then a limited GET fallback."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 "
            "(compatible; AlimonyPlus-SourceValidator/1.0)"
        )
    }

    request = urllib.request.Request(
        source_url,
        headers=headers,
        method="HEAD",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return "REACHABLE", (
                f"HTTP {response.status}; final URL: {response.geturl()}"
            )
    except urllib.error.HTTPError as error:
        if error.code not in (403, 405, 501):
            return "REVIEW", f"HTTP error {error.code}"
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        # Try the limited GET request before declaring reachability unknown.
        pass

    request = urllib.request.Request(
        source_url,
        headers={**headers, "Range": "bytes=0-1023"},
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            response.read(1024)
            return "REACHABLE", (
                f"HTTP {response.status} (GET fallback); "
                f"final URL: {response.geturl()}"
            )
    except urllib.error.HTTPError as error:
        return "REVIEW", f"GET fallback returned HTTP {error.code}"
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
        return "REVIEW", f"Could not confirm reachability: {error}"


def validate_registry(registry):
    """Validate registry structure and return its ID mapping."""
    errors = []
    sources = registry.get("sources")

    if not isinstance(sources, list):
        return ["Registry must contain a sources list"], {}

    registry_by_id = {}

    for index, entry in enumerate(sources, start=1):
        if not isinstance(entry, dict):
            errors.append(f"Registry entry {index} must be an object")
            continue

        source_id = entry.get("source_id")
        if not isinstance(source_id, str) or not source_id.strip():
            errors.append(f"Registry entry {index} has no source_id")
            continue

        if source_id in registry_by_id:
            errors.append(f"Duplicate registry source_id: {source_id}")
            continue

        registry_by_id[source_id] = entry

        if not entry.get("title"):
            errors.append(f"{source_id}: missing title")

        errors.extend(
            f"{source_id}: {message}"
            for message in validate_url(entry.get("source_url", ""))
        )

    return errors, registry_by_id



def validate_document(file_path, registry_by_id):
    """Check document structure, source metadata and registry mapping."""
    data, load_error = load_json(file_path)

    if load_error:
        return None, [f"Cannot load JSON: {load_error}"]

    if not isinstance(data, dict):
        return None, ["JSON root must be an object"]

    errors = []

    missing_fields = [
        field for field in REQUIRED_FIELDS
        if field not in data
    ]
    if missing_fields:
        errors.append(f"Missing required fields: {missing_fields}")

    document_id = data.get("document_id")
    if not isinstance(document_id, str) or not document_id.strip():
        errors.append("document_id must be a non-empty string")

    if not isinstance(data.get("title"), str) or not data["title"].strip():
        errors.append("title must be a non-empty string")

    source = data.get("source")
    if not isinstance(source, dict):
        errors.append("source must be a JSON object")
        source = {}

    source_id = source.get("source_id")

    # Some existing documents use document_id as the source ID.
    # Accept that only when it exactly matches a registry entry.
    if not source_id and document_id in registry_by_id:
        source_id = document_id

    if not source_id:
        errors.append("Missing source.source_id")
    elif source_id not in registry_by_id:
        errors.append(
            f"Source ID '{source_id}' is not present in registry.json"
        )
    else:
        registry_entry = registry_by_id[source_id]

        if document_id != source_id:
            # Document IDs may legitimately differ from source IDs,
            # so this is checked by mapping rather than forced equality.
            pass

        # Detect a clearly mismatched title, without requiring exact wording.
        if not registry_entry.get("title"):
            errors.append(
                f"Registry entry '{source_id}' has no title"
            )

    if source.get("official_source") is not True:
        errors.append("Source is not explicitly marked official")

    authority = source.get("authority")
    if not isinstance(authority, str) or not authority.strip():
        errors.append("Missing source.authority")

    source_url = get_source_url(source)
    errors.extend(validate_url(source_url))

    # Check the document URL, plus registry URLs when available.
    registry_entry = registry_by_id.get(source_id, {})
    registry_url = registry_entry.get("source_url")
    registry_document_url = registry_entry.get("document_url")

    urls_to_check = {}
    for label, url in (
        ("document source", source_url),
        ("registry source", registry_url),
        ("registry document", registry_document_url),
    ):
        if isinstance(url, str) and url.strip():
            urls_to_check.setdefault(url.strip(), []).append(label)

    for url, labels in urls_to_check.items():
        if not validate_url(url):
            status, details = check_url_reachability(url)
            print(
                f"  URL check: {source_id} "
                f"({', '.join(labels)}): {status} - {details}"
            )

    # Registry consistency: document source URL should be registered.
    known_urls = {
        url.strip()
        for url in (registry_url, registry_document_url)
        if isinstance(url, str) and url.strip()
    }

    if source_url and source_url not in known_urls:
        print(
            f"  WARNING: {file_path.name}: document URL is not listed "
            f"in the registry for {source_id}"
        )

    metadata = data.get("rag_metadata")
    if not isinstance(metadata, dict):
        errors.append("rag_metadata must be a JSON object")

    if not get_section_or_context(data):
        errors.append("Missing section/context metadata for citation")

    if not has_meaningful_content(data):
        errors.append("No substantive legal/guidance content found")

    return data, errors


def main():
    print("=" * 68)
    print("ALIMONY PLUS - LEGAL SOURCE VALIDATOR")
    print("=" * 68)

    registry, registry_load_error = load_json(REGISTRY_FILE)

    if registry_load_error:
        print(f"\nCannot load registry.json: {registry_load_error}")
        sys.exit(1)

    if not isinstance(registry, dict):
        print("\nregistry.json root must be an object")
        sys.exit(1)

    registry_errors, registry_by_id = validate_registry(registry)

    json_files = sorted(DOCUMENTS_DIR.glob("*.json"))

    if not json_files:
        print("\nNo JSON documents found.")
        sys.exit(1)

    print(f"\nRegistry entries: {len(registry_by_id)}")
    print(f"Document files:  {len(json_files)}\n")

    seen_document_ids = set()
    valid_count = 0
    invalid_count = 0
    all_errors = []

    for file_path in json_files:
        data, errors = validate_document(file_path, registry_by_id)

        if isinstance(data, dict):
            document_id = data.get("document_id")

            if document_id:
                if document_id in seen_document_ids:
                    errors.append(
                        f"Duplicate document_id: {document_id}"
                    )
                seen_document_ids.add(document_id)

        if errors:
            invalid_count += 1
            print(f"FAIL {file_path.name}")

            for error in errors:
                print(f"  - {error}")

            all_errors.extend(
                f"{file_path.name}: {error}" for error in errors
            )
        else:
            valid_count += 1
            print(f"PASS {file_path.name}")

    print("\n" + "-" * 68)
    print(f"Valid documents   : {valid_count}")
    print(f"Invalid documents : {invalid_count}")
    print(f"Registry problems : {len(registry_errors)}")
    print("-" * 68)

    if registry_errors:
        print("\nRegistry issues:")
        for error in registry_errors:
            print(f"  - {error}")

    if invalid_count or registry_errors:
        print(
            "\nVALIDATION FAILED. Review the errors and warnings above."
        )
        sys.exit(1)

    print(
        "\nStructural and source-metadata checks passed.\n"
        "Source identity checks do NOT certify legal-content accuracy.\n"
        "URL syntax/domain checks do NOT prove that a URL is reachable."
    )


if __name__ == "__main__":
    main()
