@echo off
echo ============================================
echo   Just Post - AI Moderation Service Setup
echo ============================================

cd ai_service

if not exist "venv" (
    echo [1/3] Creating Python virtual environment...
    python -m venv venv
)

echo [2/3] Activating venv and installing packages...
call venv\Scripts\activate.bat
pip install -r requirements.txt

echo [3/3] Starting FastAPI AI service on port 8000...
uvicorn main:app --reload --port 8000
