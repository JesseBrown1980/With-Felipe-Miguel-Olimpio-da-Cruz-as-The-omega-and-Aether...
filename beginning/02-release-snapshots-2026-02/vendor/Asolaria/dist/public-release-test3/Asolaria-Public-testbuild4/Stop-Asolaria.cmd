@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\Stop-Asolaria.ps1"
endlocal
