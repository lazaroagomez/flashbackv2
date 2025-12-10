@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   FlashBack USB - Building Application
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

:: Set the exe file path (fixed filename, no version)
set "EXE_FILE=dist-electron\FlashBack-USB-Setup.exe"

echo.
echo ========================================
echo   Build complete
echo   Output: %EXE_FILE%
echo ========================================
echo.

:: Ask if user wants to upload to GitHub
set /p UPLOAD="Upload to GitHub releases? (y/n): "
if /i not "%UPLOAD%"=="y" goto :done

echo.
echo Creating GitHub release v%VERSION%...

:: Check if gh is available
where gh >nul 2>nul
if errorlevel 1 (
    echo ERROR: GitHub CLI ^(gh^) not found. Install it from https://cli.github.com
    pause
    exit /b 1
)

:: Delete existing release if it exists (to update)
gh release delete "v%VERSION%" --yes 2>nul

:: Create new release and upload files
gh release create "v%VERSION%" "%EXE_FILE%" "dist-electron\latest.yml" --title "v%VERSION%" --notes "Release v%VERSION%" --latest

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create release
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Release v%VERSION% uploaded to GitHub!
echo ========================================

:done
pause
