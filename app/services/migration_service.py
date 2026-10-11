import json
import logging
import os
import shutil
from datetime import datetime, timezone
from pymongo.collection import Collection

from app.database import (
    get_word_reports_collection,
    get_reported_words_collection,
    init_db_indexes
)

logger = logging.getLogger(__name__)

DEFAULT_DATA_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "reported_words.json"
)

DEFAULT_BACKUP_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "reported_words.backup.json"
)


def migrate_json_to_mongo(
    json_path: str = DEFAULT_DATA_FILE,
    backup_path: str = DEFAULT_BACKUP_FILE
) -> dict:
    """
    Safely and idempotently migrates reported words from JSON file into MongoDB.
    - Preserves the original JSON file as a backup.
    - Does not duplicate records if run multiple times.
    - Inspects, detects, and reports inconsistencies or duplicate entries in the source JSON.
    - Calculates report counts and averages accurately from distinct user reports.
    """
    if not os.path.exists(json_path):
        return {
            "success": False,
            "error": f"Source JSON file not found: {json_path}",
            "migrated_reports": 0,
            "migrated_words": 0
        }

    # 1. Ensure backup copy exists without overwriting original
    try:
        if not os.path.exists(backup_path):
            shutil.copy2(json_path, backup_path)
            logger.info(f"Created backup file at {backup_path}")
    except Exception as e:
        logger.warning(f"Failed to create backup copy: {e}")

    # 2. Read source JSON
    with open(json_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"Failed to parse JSON file: {e}",
                "migrated_reports": 0,
                "migrated_words": 0
            }

    if not isinstance(data, list):
        return {
            "success": False,
            "error": "Source JSON root must be a list of word records.",
            "migrated_reports": 0,
            "migrated_words": 0
        }

    # 3. Ensure database indexes exist
    init_db_indexes()
    word_reports_col: Collection = get_word_reports_collection()
    reported_words_col: Collection = get_reported_words_collection()

    inconsistencies: list[str] = []
    seen_in_json: set[tuple[str, str]] = set()

    total_words_in_json = len(data)
    total_reports_in_json = 0
    newly_inserted_reports = 0
    already_existing_reports = 0
    processed_words: set[str] = set()

    for item in data:
        if not isinstance(item, dict):
            inconsistencies.append(f"Invalid record type: {type(item)}. Expected dict.")
            continue

        raw_word = item.get("word")
        if not raw_word or not isinstance(raw_word, str) or not raw_word.strip():
            inconsistencies.append(f"Word entry missing or empty: {item}")
            continue

        word = raw_word.strip().lower()
        processed_words.add(word)

        reports = item.get("reports", [])
        if not isinstance(reports, list):
            inconsistencies.append(f"Reports field for word '{word}' is not a list.")
            continue

        for r in reports:
            total_reports_in_json += 1
            if not isinstance(r, dict):
                inconsistencies.append(f"Invalid report structure in word '{word}': {r}")
                continue

            raw_user_id = r.get("user_id")
            if not raw_user_id or not str(raw_user_id).strip():
                inconsistencies.append(f"Report for word '{word}' missing user_id: {r}")
                continue

            user_id = str(raw_user_id).strip()

            toxicity_score = r.get("toxicity_score")
            try:
                toxicity_score = float(toxicity_score)
                if not (0.0 <= toxicity_score <= 1.0):
                    inconsistencies.append(
                        f"Toxicity score {toxicity_score} out of bounds [0, 1] for word '{word}', user '{user_id}'."
                    )
                    continue
            except (ValueError, TypeError):
                inconsistencies.append(
                    f"Invalid non-numeric toxicity score '{toxicity_score}' for word '{word}', user '{user_id}'."
                )
                continue

            # Duplicate check within JSON file
            key = (word, user_id)
            if key in seen_in_json:
                inconsistencies.append(
                    f"Duplicate report in source JSON for word '{word}' from user '{user_id}'. Using first occurrence."
                )
                continue
            seen_in_json.add(key)

            # Idempotent upsert into word_reports using unique (word, user_id)
            result = word_reports_col.update_one(
                {"word": word, "user_id": user_id},
                {
                    "$setOnInsert": {
                        "word": word,
                        "user_id": user_id,
                        "toxicity_score": toxicity_score,
                        "created_at": datetime.now(timezone.utc),
                        "migrated_from_json": True
                    }
                },
                upsert=True
            )

            if result.upserted_id is not None:
                newly_inserted_reports += 1
            else:
                already_existing_reports += 1

    # 4. Re-aggregate reported_words collection from distinct user reports
    words_upserted = 0
    for word in processed_words:
        pipeline = [
            {"$match": {"word": word}},
            {
                "$group": {
                    "_id": "$word",
                    "count": {"$sum": 1},
                    "avg_toxicity": {"$avg": "$toxicity_score"}
                }
            }
        ]
        agg = list(word_reports_col.aggregate(pipeline))
        if agg:
            count = agg[0]["count"]
            avg_score = round(float(agg[0]["avg_toxicity"]), 4)
            verified = count >= 5

            reported_words_col.update_one(
                {"word": word},
                {
                    "$set": {
                        "word": word,
                        "report_count": count,
                        "average_toxicity": avg_score,
                        "verified": verified,
                        "updated_at": datetime.now(timezone.utc)
                    },
                    "$setOnInsert": {
                        "created_at": datetime.now(timezone.utc)
                    }
                },
                upsert=True
            )
            words_upserted += 1

    return {
        "success": True,
        "backup_file": backup_path,
        "total_words_in_json": total_words_in_json,
        "total_reports_in_json": total_reports_in_json,
        "newly_inserted_reports": newly_inserted_reports,
        "already_existing_reports": already_existing_reports,
        "words_upserted": words_upserted,
        "inconsistencies_count": len(inconsistencies),
        "inconsistencies": inconsistencies
    }
