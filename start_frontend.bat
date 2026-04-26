@echo off
echo ============================================
echo   Just Post - Frontend Setup
echo ============================================
cd frontend

if not exist "node_modules" (
    echo [1/2] Installing Node.js packages...
    npm install
)

echo [2/2] Starting Vite dev server on port 5173...
npm run dev
