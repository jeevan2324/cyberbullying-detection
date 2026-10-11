import os
import json
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification


# ============================================================
# MODEL PATH
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

MODEL_PATH = os.path.join(BASE_DIR, "v3_merged")

# Reported words file
REPORT_FILE = os.path.join(
    BASE_DIR,
    "data",
    "reported_words.json"
)


# ============================================================
# LOAD V3 MODEL
# ============================================================

print("========== LOADING V3 MODEL ==========")
print("Model path:", MODEL_PATH)

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("Device:", device)

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_PATH
)

model.to(device)
model.eval()

print("========== V3 MODEL READY ==========")
print("Labels:", model.config.num_labels)


# ============================================================
# LOAD VERIFIED REPORTED WORDS
# ============================================================

def load_verified_words():
    # 1. Try querying MongoDB verified words
    try:
        from app.database import get_reported_words_collection
        reported_words_col = get_reported_words_collection()
        docs = reported_words_col.find({"verified": True})
        verified_words = [
            {
                "word": item["word"].lower(),
                "toxicity_score": float(item["average_toxicity"])
            }
            for item in docs
        ]
        if verified_words:
            return verified_words
    except Exception as e:
        # Graceful fallback if MongoDB is temporarily unavailable
        pass

    # 2. Fallback to JSON file if MongoDB is unreachable or has no records
    if not os.path.exists(REPORT_FILE):
        return []

    try:
        with open(REPORT_FILE, "r", encoding="utf-8") as f:
            reports = json.load(f)

        verified_words = []

        for item in reports:

            if item.get("verified") is True:

                verified_words.append({
                    "word": item["word"].lower(),
                    "toxicity_score": item["average_toxicity"]
                })

        return verified_words

    except Exception as e:

        print("Error loading reported words:", e)

        return []


# ============================================================
# ANALYZE TOXICITY
# ============================================================

def analyze_toxicity(text: str):

    if not text or not text.strip():
        return {
            "error": "Text cannot be empty"
        }

    # ========================================================
    # V3 MODEL PREDICTION
    # ========================================================

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=128
    )

    inputs = {
        key: value.to(device)
        for key, value in inputs.items()
    }

    with torch.no_grad():

        outputs = model(**inputs)

        probabilities = torch.softmax(
            outputs.logits,
            dim=-1
        )[0]

    non_toxic_score = probabilities[0].item()
    toxic_score = probabilities[1].item()

    prediction = 1 if toxic_score >= 0.5 else 0


    # ========================================================
    # CHECK VERIFIED REPORTED WORDS
    # ========================================================

    verified_words = load_verified_words()

    matched_word = None
    reported_word_score = None

    text_lower = text.lower()

    for item in verified_words:

        word = item["word"]

        if word in text_lower:

            matched_word = word
            reported_word_score = item["toxicity_score"]

            # Use the stronger toxicity score
            toxic_score = max(
                toxic_score,
                reported_word_score
            )

            prediction = 1

            break


    # ========================================================
    # TOXICITY LEVEL
    # ========================================================

    if toxic_score < 0.30:

        toxicity_level = "low"

    elif toxic_score < 0.80:

        toxicity_level = "medium"

    else:

        toxicity_level = "high"


    # ========================================================
    # ACTION
    # ========================================================

    if toxicity_level == "low":

        action = "allow"

    elif toxicity_level == "medium":

        action = "blur"

    else:

        action = "hide"


    # ========================================================
    # RETURN
    # ========================================================

    return {
        "text": text,

        "prediction": prediction,

        "toxicity_score": round(
            toxic_score,
            4
        ),

        "non_toxic_score": round(
            1 - toxic_score,
            4
        ),

        "toxicity_level": toxicity_level,

        "is_toxic": prediction == 1,

        "action": action,

        "reported_word_match": matched_word,

        "reported_word_score": (
            round(reported_word_score, 4)
            if reported_word_score is not None
            else None
        )
    }