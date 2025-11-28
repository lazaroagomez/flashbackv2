@echo off
echo ========================================
echo   FlashBack USB - Building Application
echo ========================================
echo.

cd /d "%~dp0"

echo Installing dependencies...
call npm install

echo.
echo Building application...
call npm run package:win

echo.
echo ========================================
echo   Build complete!
echo   Output: dist-electron\FlashBack USB Setup 1.0.0.exe
echo ========================================
pause
