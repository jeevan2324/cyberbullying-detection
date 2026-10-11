# AI-Based Cyberbullying Detection & Moderation API

A FastAPI-powered service designed to detect and moderate harmful, toxic, and cyberbullying content across text and images.

---

## Features

- **Text Toxicity Analysis**: Assesses input text for toxicity, applying customizable moderation levels (`beginner`, `intermediate`, `strict`) to recommend actions (`allow`, `blur`, `hide`, `block`).
- **Image Toxicity Analysis (OCR)**: Extracts text from uploaded images using Tesseract OCR and performs deep content moderation.
- **Community Moderation Vocabulary**: Allows reporting offensive words with aggregated community verification and automatic synchronization with MongoDB.
- **RESTful Endpoints & Swagger UI**: Interactive API documentation generated automatically at `/docs`.

---

## Project Structure

```text
API_02/
├── app/
│   ├── api/
│   │   ├── dependencies.py          # API key verification
│   │   └── routes/
│   │       ├── analyze.py           # Text moderation endpoints
│   │       ├── image.py             # OCR & image moderation
│   │       └── report_word.py       # Word reporting & MongoDB aggregation
│   ├── config.py                    # Environment & settings configuration
│   ├── database.py                  # MongoDB client & indexes
│   ├── main.py                      # FastAPI app entry point & CORS
│   ├── services/
│   │   ├── migration_service.py     # Data migration utilities
│   │   └── toxicity_service.py      # ML model inference & vocabulary lookup
│   └── v3_merged/                   # Model tokenizer and configs
├── datasets/                        # Data cleaning, preparation & evaluation scripts
├── scripts/                         # Database migration scripts
├── tests/                           # Integration and functional test suite
├── .env.example                     # Environment template
└── requirements.txt                 # Project dependencies
```

---

## Getting Started

### 1. Prerequisites

- Python 3.10+
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally or a remote MongoDB Atlas URI)
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) (required for image analysis)

### 2. Installation

Clone the repository and set up a virtual environment:

```bash
git clone https://github.com/jeevan2324/cyberbullying-detection.git
cd cyberbullying-detection

python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Model Weights

The large fine-tuned model weights file (`model.safetensors`, ~1.1 GB) is excluded from version control to comply with repository file limits.
Place your trained weights file into the model directory:
```text
app/v3_merged/model.safetensors
```

### 4. Configuration

Copy the example environment configuration and update with your settings:

```bash
cp .env.example .env
```

Edit `.env`:
```ini
APP_NAME=AI-Based Cyberbullying Detection & Moderation API
DEBUG=True
API_KEY=your_secret_api_key
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=cyberbullying_db
```

### 5. Running the API

Start the development server with Uvicorn:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Once running:
- **API Root**: `http://127.0.0.1:8000/`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **Health Check**: `http://127.0.0.1:8000/health`

---

## API Endpoints

All analysis and report endpoints require the `x-api-key` header:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/analyze/text` | Moderate text input (`beginner`, `intermediate`, `strict`) |
| `POST` | `/api/v1/analyze/image` | Upload image for OCR extraction and moderation |
| `POST` | `/api/v1/report/word` | Report toxic words to community database |
| `GET` | `/health` | Health check endpoint reporting API and DB status |
| `GET` | `/docs` | Swagger interactive UI |

---

## Testing

Run the test suite using pytest:

```bash
pytest tests/
```
