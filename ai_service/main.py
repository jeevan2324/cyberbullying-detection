from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from transformers import pipeline
import pytesseract
from PIL import Image
import io
import re
import os

# Tesseract Configuration for Windows
tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
if os.path.exists(tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = tesseract_path

app = FastAPI(title="Just Post AI Moderation Service")

# Task 4: Load BERT model
print("Loading unitary/toxic-bert model...")
try:
    # toxic-bert is very reliable and fast
    classifier = pipeline("text-classification", model="unitary/toxic-bert", device=-1)
except Exception as e:
    print(f"Error loading model: {e}")
    classifier = None

class ModerateRequest(BaseModel):
    text: str
    level: str # beginner, intermediate, strict

@app.get("/")
def root():
    return {"status": "AI Moderation Service is running"}

@app.post("/moderate")
def moderate(req: ModerateRequest):
    """
    Task 4: AI MODERATION LOGIC
    Rules based on moderation level and toxicity score.
    """
    if not classifier:
        print("[AI Error] Model not loaded. Returning 'allowed' by default.")
        return {"status": "allowed", "score": 0.0}

    try:
        # Run text through model (limit to 512 tokens)
        results = classifier(req.text[:512]) 
        
        # Results usually look like: [{'label': 'toxic', 'score': 0.98}]
        score = 0.0
        for res in results:
            if res['label'] == 'toxic' or res['label'] == 'LABEL_1' or res['label'] == 'toxic_comment':
                score = res['score']
                break
            # Handle non-toxic labels that might still have scores
            if res['label'] == 'non-toxic' or res['label'] == 'LABEL_0':
                score = 1.0 - res['score']

        # Task 4 Logic Implementation
        status = "allowed"

        if req.level == "beginner":
            if score > 0.8: status = "hidden"
        
        elif req.level == "intermediate":
            if score > 0.8: status = "hidden"
            elif score > 0.5: status = "blurred"
                
        elif req.level == "strict":
            if score > 0.3: status = "blocked"

        print(f"[Task 4] Level: {req.level} | Score: {score:.4f} | Status: {status} | Text: {req.text[:30]}")

        return {
            "status": status,
            "score": float(score)
        }
    except Exception as e:
        print(f"[AI Error] Prediction failed: {e}")
        return {"status": "allowed", "score": 0.0}

@app.post("/check-image")
async def check_image(
    moderation_level: str = Form("intermediate"),
    file: UploadFile = File(...)
):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        extracted_text = pytesseract.image_to_string(image)
        
        if not extracted_text.strip():
            return {"status": "allowed", "score": 0.0}
            
        req = ModerateRequest(text=extracted_text, level=moderation_level)
        return moderate(req)
    except Exception as e:
        print(f"Error processing image: {e}")
        return {"status": "allowed", "score": 0.0}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
