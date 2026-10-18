@echo off
setlocal
set "ASOLARIA_CONNECTION_PREFERENCE=usb,vpn,private_internet,public_internet"
set "ASOLARIA_CONNECTION_AVAILABLE=usb,vpn,private_internet,public_internet"
set "AUTH_SCRIPT=%~dp0tools\Require-Asolaria-DesktopAuth.ps1"
if exist "%AUTH_SCRIPT%" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%AUTH_SCRIPT%" -Reason "Open Asolaria desktop app"
  if errorlevel 1 (
    endlocal
    exit /b 1
  )
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\Start-Asolaria-OneButton.ps1" %*
endlocal
