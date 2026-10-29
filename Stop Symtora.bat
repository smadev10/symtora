@echo off
cd /d "%~dp0"
docker compose down
echo.
echo Symtora is stopped. Your accounts and entries are kept for next time.
pause
