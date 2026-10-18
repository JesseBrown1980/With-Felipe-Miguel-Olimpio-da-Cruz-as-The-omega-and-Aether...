@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\ADB-HealthCheck.ps1" -FixUnauthorized
echo.
echo ADB health check finished.
pause
endlocal
