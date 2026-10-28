"""Fail-closed policy for sources allowed into legal AI context."""

import json
from datetime import date
from pathlib import Path

from check_source_freshness import (
    VERIFICATION_MAX_AGE_DAYS,
    CONTENT_REVIEW_MAX_AGE_DAYS,
    evaluate_date,
)

BASE_DIR = Path(__file__).resolve().parent
REGISTRY_FILE = BASE_DIR / "registry.json"
DOCUMENTS_DIR = BASE_DIR / "documents"

# These statuses need additional commencement/timeline verification.
BLOCKED_STATUSES = {
    "verified_source_commencement_requires_notification_check",
    "verified_source_commencement_timeline_requires_check",
}


def _read_json(path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _records(data, key):
    """Support either a JSON list or an object containing a list."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get(key), list):
        return data[key]
    return []


def get_source_eligibility(today=None):
    """Return source_id -> (eligible, reason), using current registry dates."""
    today = today or date.today()
    registry = _records(_read_json(REGISTRY_FILE), "sources")
    eligibility = {}

    for source in registry:
        source_id = source.get("source_id")
        if not source_id:
            continue

        status = source.get("status", "")
        verification, _ = evaluate_date(
            source.get("last_verified_on"),
            VERIFICATION_MAX_AGE_DAYS,
            today,
        )
        review, _ = evaluate_date(
            source.get("reviewed_on"),
            CONTENT_REVIEW_MAX_AGE_DAYS,
            today,
        )

        if status in BLOCKED_STATUSES:
            result = (False, "requires additional commencement/timeline verification")
        elif status != "verified_source":
            result = (False, f"source status is not eligible: {status or 'missing'}")
        elif verification != "CURRENT":
            result = (False, f"verification date is {verification.lower()}")
        elif review != "CURRENT":
            result = (False, f"content review date is {review.lower()}")
        else:
            result = (True, "eligible")

        eligibility[source_id] = result

    return eligibility


def get_document_source_ids():
    """Map each document_id in the chunk corpus to its registry source_id."""
    mapping = {}

    for path in DOCUMENTS_DIR.glob("*.json"):
        try:
            document = _read_json(path)
        except (OSError, json.JSONDecodeError):
            continue

        if not isinstance(document, dict):
            continue

        document_id = document.get("document_id")
        source = document.get("source")
        source_id = source.get("source_id") if isinstance(source, dict) else None

        if document_id and source_id:
            mapping[document_id] = source_id

    return mapping


def is_document_eligible(document_id, eligibility=None, document_sources=None):
    """Unknown or unmapped documents are excluded by default."""
    if eligibility is None:
        eligibility = get_source_eligibility()
    if document_sources is None:
        document_sources = get_document_source_ids()

    source_id = document_sources.get(document_id)
    if not source_id:
        return False

    result = eligibility.get(source_id)
    return bool(result and result[0])