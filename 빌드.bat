@echo off
title Blog Factory - Build
color 0B

echo.
echo  =====================================================
echo    Blog Factory  - Build EXE
echo  =====================================================
echo.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :no_node

where pkg >nul 2>nul
if errorlevel 1 (
    echo  Installing pkg globally...
    npm install -g pkg
    if errorlevel 1 goto :pkg_fail
)

echo  [1/4] Installing server packages...
call npm install
if errorlevel 1 goto :npm_fail

echo.
echo  [2/4] Building React client...
cd client
call npm install
if errorlevel 1 (
    cd ..
    goto :npm_fail
)
call npm run build
if errorlevel 1 (
    cd ..
    goto :build_fail
)
cd ..

echo.
echo  [3/4] Bundling BlogFactory.exe  (may take a few minutes)...
call pkg . --targets node18-win-x64 --output BlogFactory.exe
if errorlevel 1 goto :pkg_fail

echo.
echo  [4/4] Assembling dist folder...

if exist "dist" rmdir /s /q "dist"
mkdir "dist"
mkdir "dist\client"
mkdir "dist\data"

copy /y "BlogFactory.exe"   "dist\BlogFactory.exe"  >nul
xcopy /e /i /q "client\dist" "dist\client\dist"   >nul
copy /y "Deploy_Start.bat"  "dist\Start.bat"         >nul
copy /y "Stop.bat"          "dist\Stop.bat"          >nul

echo.
echo  =====================================================
echo    Build complete!
echo.
echo    dist\ folder is ready for distribution.
echo    Users just double-click  Start.bat  to run.
echo  =====================================================
echo.
pause
exit /b 0

:no_node
echo.
echo  ERROR: Node.js not found.
echo  Install from: https://nodejs.org  (LTS version)
echo.
pause
exit /b 1

:npm_fail
echo.
echo  ERROR: npm install failed.
echo.
pause
exit /b 1

:build_fail
echo.
echo  ERROR: React build failed.
echo.
pause
exit /b 1

:pkg_fail
echo.
echo  ERROR: pkg build failed.
echo.
pause
exit /b 1
