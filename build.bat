@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   FlashBack USB - Building Application
echo ========================================
echo.

cd /d "%~dp0"

:: Extract version from package.json
for /f "tokens=2 delims=:," %%a in ('findstr /c:"\"version\"" package.json') do (
    set "VERSION=%%~a"
    set "VERSION=!VERSION: =!"
    set "VERSION=!VERSION:"=!"
)

echo Version: %VERSION%
echo.

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

echo Building application...
call npm run package:win
if errorlevel 1 (
    echo.
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build complete!
echo   Output: dist-electron\FlashBack USB Setup %VERSION%.exe
echo ========================================
pause
