@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\Start-Asolaria-ControlPlane.ps1"
endlocal
