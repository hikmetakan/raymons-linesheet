@echo off
title Raymons Linesheet Studio
echo ===================================================
echo   RAYMONS LINESHEET STUDIO - YEREL SUNUCU
echo ===================================================
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Node.js tespit edildi.
    echo Sunucu aciliyor: http://localhost:3000
    start http://localhost:3000
    node server.js
    pause
    exit /b
)

where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Python tespit edildi.
    echo Sunucu aciliyor: http://localhost:3000
    start http://localhost:3000
    python -m http.server 3000
    pause
    exit /b
)

echo [HATA] Bilgisayarda Node.js veya Python bulunamadi!
echo Projeyi calistirmak icin Node.js (https://nodejs.org) kurabilirsiniz.
echo.
pause
