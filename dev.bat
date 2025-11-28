@echo off
echo ========================================
echo   FlashBack USB - Development Mode
echo ========================================
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting development server...
echo Press Ctrl+C to stop
echo.
npm run dev
