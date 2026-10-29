@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1"
rem Keeps the window open if PowerShell could not even run the script (e.g. started from inside the ZIP).
if errorlevel 1 pause
