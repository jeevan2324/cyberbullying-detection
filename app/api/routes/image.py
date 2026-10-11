from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from PIL import Image
import pytesseract
import io
import cv2
import numpy as np
from app.api.dependencies import verify_api_key
from app.services.toxicity_service import analyze_toxicity


router = APIRouter(
    prefix="/api/v1/analyze",
    tags=["Image Analysis"],
    dependencies=[Depends(verify_api_key)]
)


@router.post("/image")
async def analyze_image(
    file: UploadFile = File(...),
    moderation_level: str = Form("beginner")
):

    # Check file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image file."
        )

    # Read image
    contents = await file.read()

    try:
        image = Image.open(io.BytesIO(contents))
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted image."
        )

    # ==============================
    # IMAGE PREPROCESSING
    # ==============================

    # Convert PIL image to OpenCV format
    img = np.array(image)

    # Handle RGB/RGBA images
    if len(img.shape) == 3:
        if img.shape[2] == 4:
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)

        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    else:
        gray = img

    # Improve image size
    gray = cv2.resize(
        gray,
        None,
        fx=2,
        fy=2,
        interpolation=cv2.INTER_CUBIC
    )

    # Threshold image
    _, thresh = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    # ==============================
    # MULTILINGUAL OCR
    # English + Hindi
    # ==============================

    extracted_text = pytesseract.image_to_string(
        thresh,
        lang="eng+hin",
        config="--psm 6"
    ).strip()

    # ==============================
    # NO TEXT FOUND
    # ==============================

    if not extracted_text:
        return {
            "success": True,
            "input_type": "image",
            "filename": file.filename,
            "extracted_text": "",
            "message": "No text detected in image.",
            "toxicity_score": 0.0,
            "toxicity_level": "low",
            "is_toxic": False,
            "moderation_level": moderation_level,
            "action": "allow"
        }

    # ==============================
    # AI TOXICITY ANALYSIS
    # ==============================

    result = analyze_toxicity(extracted_text)

    toxicity_score = result["toxicity_score"]
    toxicity_level = result["toxicity_level"]
    is_toxic = result["is_toxic"]

    # ==============================
    # MODERATION LOGIC
    # ==============================

    if moderation_level == "beginner":

        if toxicity_score >= 0.8:
            action = "hide"
        else:
            action = "allow"

    elif moderation_level == "intermediate":

        if toxicity_score >= 0.8:
            action = "hide"
        elif toxicity_score >= 0.3:
            action = "blur"
        else:
            action = "allow"

    elif moderation_level == "strict":

        if toxicity_score >= 0.8:
            action = "block"
        elif toxicity_score >= 0.3:
            action = "blur"
        else:
            action = "allow"

    else:
        raise HTTPException(
            status_code=400,
            detail="moderation_level must be beginner, intermediate, or strict."
        )

    # ==============================
    # RESPONSE
    # ==============================

    return {
        "success": True,
        "input_type": "image",
        "filename": file.filename,
        "extracted_text": extracted_text,
        "toxicity_score": toxicity_score,
        "toxicity_level": toxicity_level,
        "is_toxic": is_toxic,
        "moderation_level": moderation_level,
        "action": action
    }