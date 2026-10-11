from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.api.dependencies import verify_api_key
from app.services.toxicity_service import analyze_toxicity


router = APIRouter(
    prefix="/api/v1/analyze",
    tags=["Analysis"],
    dependencies=[Depends(verify_api_key)]
)


class TextRequest(BaseModel):
    text: str
    moderation_level: str = "intermediate"


@router.post("/text")
def analyze_text(request: TextRequest):

    result = analyze_toxicity(request.text)

    toxicity_score = result["toxicity_score"]
    is_toxic = result["is_toxic"]

    # Normalize moderation level
    level = request.moderation_level.lower()

    if level not in ["beginner", "intermediate", "strict"]:
        level = "intermediate"

    # =========================================================
    # MODERATION LOGIC
    # =========================================================

    if toxicity_score < 0.30:
        action = "allow"

    elif toxicity_score < 0.80:

        if level == "beginner":
            action = "allow"

        elif level == "intermediate":
            action = "blur"

        else:  # strict
            action = "blur"

    else:

        if level == "beginner":
            action = "hide"

        elif level == "intermediate":
            action = "hide"

        else:  # strict
            action = "block"

    return {
        "success": True,
        "input_type": "text",
        "text": request.text,
        "toxicity_score": toxicity_score,
        "toxicity_level": result["toxicity_level"],
        "is_toxic": is_toxic,
        "moderation_level": level,
        "action": action,
        "reported_word_match": result["reported_word_match"],
        "reported_word_score": result["reported_word_score"]
    }