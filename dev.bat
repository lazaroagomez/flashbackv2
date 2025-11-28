@echo off
setlocal enabledelayedexpansion
echo ========================================
echo   FlashBack USB - Development Mode
echo ========================================
echo.

cd /d "%~dp0"

:: Load environment variables from .env if it exists
if exist ".env" (
    echo Loading environment from .env...
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" (
            if not "%%a"=="" set "%%a=%%b"
        )
    )
    echo.
)

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
