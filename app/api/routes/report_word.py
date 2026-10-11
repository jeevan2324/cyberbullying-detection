from datetime import datetime, timezone
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.api.dependencies import verify_api_key
from app.database import (
    get_word_reports_collection,
    get_reported_words_collection
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/report",
    tags=["Report Word"],
    dependencies=[Depends(verify_api_key)]
)


class WordReport(BaseModel):
    word: str
    toxicity_score: float
    # SECURITY NOTE:
    # In production, user identity MUST NOT be trusted from client-provided JSON body.
    # It should be extracted securely from an authenticated session/token (e.g., verified JWT claims).
    # Client-provided user_id is preserved here for existing API contract compatibility.
    user_id: str


@router.post("/word")
def report_word(request: WordReport):
    """
    Submits a user report for a potentially toxic word.
    
    Business Rules:
    - Normalizes word to lowercase and removes leading/trailing whitespace.
    - Validates word and user_id are non-empty.
    - Validates toxicity_score is between 0.0 and 1.0.
    - Enforces uniqueness per (word, user_id) at MongoDB database level.
    - Prevents same user from reporting the same word more than once.
    - Aggregates average toxicity score across distinct user reports.
    - Automatically marks word as verified once reported by 5 distinct users.
    
    Security Notice:
    - Client-provided user_id should be replaced with authenticated user claims (JWT/session)
      before production deployment to prevent identity spoofing.
    """
    word = request.word.strip().lower()
    user_id = request.user_id.strip()

    if not word:
        raise HTTPException(
            status_code=400,
            detail="Word cannot be empty."
        )

    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="user_id cannot be empty."
        )

    if not (0.0 <= request.toxicity_score <= 1.0):
        raise HTTPException(
            status_code=400,
            detail="toxicity_score must be between 0 and 1."
        )

    try:
        word_reports_col = get_word_reports_collection()
        reported_words_col = get_reported_words_collection()
    except PyMongoError as e:
        logger.error(f"MongoDB connection failure: {e}")
        raise HTTPException(
            status_code=503,
            detail="Database service temporarily unavailable."
        )

    now = datetime.now(timezone.utc)

    # ========================================================
    # 1. ATTEMPT INSERT OF INDIVIDUAL REPORT
    # Unique compound index on (word, user_id) guarantees
    # database-level idempotency and concurrency safety.
    # ========================================================
    try:
        word_reports_col.insert_one({
            "word": word,
            "user_id": user_id,
            "toxicity_score": float(request.toxicity_score),
            "created_at": now
        })
    except DuplicateKeyError:
        # User has already reported this word
        existing_word = reported_words_col.find_one({"word": word})
        if existing_word:
            return {
                "success": True,
                "message": "This user has already reported this word.",
                "word": word,
                "report_count": existing_word.get("report_count", 1),
                "average_toxicity": existing_word.get("average_toxicity", round(request.toxicity_score, 4)),
                "verified": existing_word.get("verified", False)
            }
        else:
            # Recompute aggregate if summary document is missing
            pass
    except PyMongoError as e:
        logger.error(f"Database error writing word report: {e}")
        raise HTTPException(
            status_code=503,
            detail="Database service temporarily unavailable."
        )

    # ========================================================
    # 2. RE-AGGREGATE WORD SUMMARY FROM DISTINCT USER REPORTS
    # Concurrency safe: aggregation reads all committed reports.
    # ========================================================
    try:
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
        agg_result = list(word_reports_col.aggregate(pipeline))

        if agg_result:
            report_count = agg_result[0]["count"]
            average_toxicity = round(float(agg_result[0]["avg_toxicity"]), 4)
        else:
            report_count = 1
            average_toxicity = round(float(request.toxicity_score), 4)

        verified = report_count >= 5

        # Upsert the aggregated summary record
        reported_words_col.update_one(
            {"word": word},
            {
                "$set": {
                    "word": word,
                    "report_count": report_count,
                    "average_toxicity": average_toxicity,
                    "verified": verified,
                    "updated_at": now
                },
                "$setOnInsert": {
                    "created_at": now
                }
            },
            upsert=True
        )

        # First report vs subsequent reports
        if report_count == 1:
            message = "Word reported successfully."
        elif verified:
            message = "Word verified and added to custom moderation vocabulary."
        else:
            message = "Report added successfully."

        return {
            "success": True,
            "message": message,
            "word": word,
            "report_count": report_count,
            "average_toxicity": average_toxicity,
            "verified": verified
        }

    except PyMongoError as e:
        logger.error(f"Database error aggregating reported words: {e}")
        raise HTTPException(
            status_code=503,
            detail="Database service temporarily unavailable."
        )