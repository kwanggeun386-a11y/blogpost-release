@echo off
title Blog Factory
color 0A

echo.
echo  ======================================
echo    Blog Factory  - Starting
echo  ======================================
echo.

cd /d "%~dp0"

if exist "BlogFactory.exe" goto :run_exe

where node >nul 2>nul
if errorlevel 1 goto :no_node

if not exist "node_modules" (
    echo  Installing packages (first run only)...
    echo.
    npm install
    echo.
)

echo  Mode: Node.js
echo  URL : http://localhost:3001
echo.
echo  Press Ctrl+C or close this window to stop.
echo.
start /b cmd /c "timeout /t 2 /nobreak > nul && start http://localhost:3001"
node server/index.js
pause
exit /b 0

:run_exe
echo  Mode: BlogFactory.exe  (standalone)
echo  URL : http://localhost:3001
echo.
echo  Press Ctrl+C or close this window to stop.
echo.
start /b cmd /c "timeout /t 2 /nobreak > nul && start http://localhost:3001"
BlogFactory.exe
pause
exit /b 0

:no_node
echo.
echo  ERROR: Node.js not found.
echo  Install from: https://nodejs.org  (LTS version)
echo  Then run this file again.
echo.
pause
exit /b 1
