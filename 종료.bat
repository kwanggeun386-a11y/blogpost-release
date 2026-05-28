@echo off
title Blog Factory - Stop

echo.
echo  Stopping Blog Factory...
echo.

taskkill /f /im BlogFactory.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

echo  Done.
timeout /t 2 /nobreak >nul
