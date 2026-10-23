@echo off
REM SmartAgri Control Center - Windows Automated Setup Script
TITLE SmartAgri Control Center Setup

echo ==========================================================
echo       SmartAgri Control Center - Windows Setup
echo ==========================================================
echo.

WHERE node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js is installed.
node -v
echo.

echo [1/2] Installing root and frontend dependencies...
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install root dependencies.
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed.
echo.

echo [2/2] Installing serial bridge dependencies in \server...
IF EXIST server (
    cd server
    call npm install
    cd ..
    echo [OK] Server bridge dependencies installed.
) ELSE (
    echo [WARN] server directory not found.
)

echo.
echo ==========================================================
echo SETUP COMPLETED SUCCESSFULLY!
echo ==========================================================
echo.
echo To start using SmartAgri:
echo 1. Check your Arduino COM port in Device Manager (e.g. COM3, COM5).
echo 2. Verify COM port in server\index.js or run: set SERIAL_PORT=COM5
echo 3. Start the Serial Bridge:
echo      npm run bridge
echo 4. In another command prompt, start the web dashboard:
echo      npm run dev
echo.
echo Note: If Arduino is not plugged in, use the 'Simulate Arduino feed' button in the dashboard!
echo ==========================================================
pause
