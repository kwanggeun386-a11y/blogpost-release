@echo off
title Blog Factory
color 0A

echo.
echo  ======================================
echo    Blog Factory  - Starting
echo  ======================================
echo.

cd /d "%~dp0"

if not exist "BlogFactory.exe" goto :no_exe

echo  URL : http://localhost:3001
echo.
echo  Press Ctrl+C or close this window to stop.
echo.
start /b cmd /c "timeout /t 2 /nobreak > nul && start http://localhost:3001"
BlogFactory.exe
pause
exit /b 0

:no_exe
echo.
echo  ERROR: BlogFactory.exe not found.
echo  Make sure BlogFactory.exe is in the same folder.
echo.
pause
exit /b 1
