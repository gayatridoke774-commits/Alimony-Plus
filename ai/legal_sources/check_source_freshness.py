
import json
from datetime import date
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
REGISTRY_FILE = BASE_DIR / "registry.json"

# Project maintenance policies, not legal requirements.
VERIFICATION_MAX_AGE_DAYS = 90
CONTENT_REVIEW_MAX_AGE_DAYS = 180


def evaluate_date(value, max_age_days, today):
    """Return a date status and age in days, if available."""
    if value is None or value == "":
        return "MISSING", None

    try:
        parsed_date = date.fromisoformat(value)
    except (TypeError, ValueError):
        return "INVALID", None

    age = (today - parsed_date).days

    if age < 0:
        return "FUTURE DATE", age

    if age > max_age_days:
        return "STALE", age

    return "CURRENT", age


def check_source(source, today):
    """Check URL/source verification and substantive content-review dates."""
    source_id = source.get("source_id", "UNKNOWN")
    title = source.get("title", "Unknown title")

    verification_status, verification_age = evaluate_date(
        source.get("last_verified_on"),
        VERIFICATION_MAX_AGE_DAYS,
        today,
    )

    review_status, review_age = evaluate_date(
        source.get("reviewed_on"),
        CONTENT_REVIEW_MAX_AGE_DAYS,
        today,
    )

    verification_ok = verification_status == "CURRENT"
    review_ok = review_status == "CURRENT"
    overall_ok = verification_ok and review_ok

    print(f"\nSource ID: {source_id}")
    print(f"Title: {title}")

    print(
        f"Last verified: {source.get('last_verified_on') or 'Not recorded'}"
    )
    print(
        f"Verification age: "
        f"{verification_age if verification_age is not None else 'N/A'} days"
    )
    print(f"Verification status: {verification_status}")

    print(
        f"Content reviewed: {source.get('reviewed_on') or 'Not recorded'}"
    )
    print(
        f"Review age: "
        f"{review_age if review_age is not None else 'N/A'} days"
    )
    print(f"Content review status: {review_status}")

    print(f"Overall status: {'PASS' if overall_ok else 'REVIEW REQUIRED'}")

    return {
        "verification_ok": verification_ok,
        "review_ok": review_ok,
        "review_missing": review_status == "MISSING",
        "overall_ok": overall_ok,
    }


def main():
    print("=" * 72)
    print("ALIMONY PLUS - LEGAL SOURCE FRESHNESS CHECK")
    print("=" * 72)

    if not REGISTRY_FILE.exists():
        print(f"Registry not found: {REGISTRY_FILE}")
        raise SystemExit(1)

    try:
        with open(REGISTRY_FILE, "r", encoding="utf-8-sig") as file:
            registry = json.load(file)
    except (OSError, json.JSONDecodeError) as error:
        print(f"Cannot read registry: {error}")
        raise SystemExit(1)

    sources = registry.get("sources") if isinstance(registry, dict) else None

    if not isinstance(sources, list) or not sources:
        print("Registry must contain a non-empty sources list.")
        raise SystemExit(1)

    today = date.today()

    print(f"Check date: {today.isoformat()}")
    print(f"Verification age limit: {VERIFICATION_MAX_AGE_DAYS} days")
    print(f"Content review age limit: {CONTENT_REVIEW_MAX_AGE_DAYS} days")

    total = len(sources)
    verification_fresh = 0
    content_review_current = 0
    missing_review_dates = 0
    overall_passed = 0
    invalid_entries = 0

    for source in sources:
        if not isinstance(source, dict):
            invalid_entries += 1
            print("\nInvalid registry entry: expected a JSON object.")
            print("Overall status: REVIEW REQUIRED")
            continue

        result = check_source(source, today)

        if result["verification_ok"]:
            verification_fresh += 1

        if result["review_ok"]:
            content_review_current += 1

        if result["review_missing"]:
            missing_review_dates += 1

        if result["overall_ok"]:
            overall_passed += 1

    print("\n" + "=" * 72)
    print("FRESHNESS SUMMARY")
    print("=" * 72)
    print(f"Total registry entries          : {total}")
    print(f"Fresh source verifications      : {verification_fresh}/{total}")
    print(f"Current content reviews         : {content_review_current}/{total}")
    print(f"Missing content review dates    : {missing_review_dates}")
    print(f"Invalid registry entries        : {invalid_entries}")
    print(f"Overall passed                  : {overall_passed}/{total}")

    print("\nPolicy notes:")
    print(
        "The 90-day verification and 180-day content-review limits "
        "are project maintenance thresholds, not legal requirements."
    )
    print(
        "A fresh verification date does not prove that legal content "
        "has been substantively reviewed."
    )
    print(
        "Only record a content-review date after the relevant review "
        "has actually taken place."
    )

    if overall_passed != total:
        print("\nRESULT: REVIEW REQUIRED")
        raise SystemExit(1)

    print("\nRESULT: ALL SOURCES PASSED FRESHNESS CHECKS")


if __name__ == "__main__":
    main()
