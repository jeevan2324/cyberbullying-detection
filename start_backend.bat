@echo off
echo ============================================
echo   Just Post - Backend Setup
echo ============================================
cd backend

if not exist "node_modules" (
    echo [1/2] Installing Node.js packages...
    npm install
)

echo [2/2] Starting Express server on port 5000...
npm run dev
