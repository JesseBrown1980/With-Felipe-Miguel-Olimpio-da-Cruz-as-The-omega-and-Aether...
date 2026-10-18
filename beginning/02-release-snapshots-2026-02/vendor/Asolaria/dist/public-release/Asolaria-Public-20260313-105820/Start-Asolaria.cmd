@echo off
setlocal
set "ASOLARIA_CONNECTION_PREFERENCE=usb,private_internet"
set "ASOLARIA_CONNECTION_AVAILABLE=usb,private_internet"
set "ASOLARIA_CONNECTION_ALLOW_PUBLIC=false"
set "ASOLARIA_ALLOW_PUBLIC_INTERNET=false"
set "ASOLARIA_PUBLIC_INTERNET_IS_PRIVATE=false"
set "ASOLARIA_NETWORK_REMOTE_AUTH_REQUIRED=true"
set "ASOLARIA_NETWORK_REQUIRE_ENCRYPTED_REMOTE=true"
set "ASOLARIA_NETWORK_STEALTH_DENY=true"
set "STARTUP_TASK=Asolaria One Button Startup"
set "USE_TASK_START=0"
if /I "%ASOLARIA_USE_TASK_START%"=="1" set "USE_TASK_START=1"
if /I "%ASOLARIA_USE_TASK_START%"=="true" set "USE_TASK_START=1"
if /I "%ASOLARIA_USE_TASK_START%"=="yes" set "USE_TASK_START=1"

if "%USE_TASK_START%"=="1" (
  schtasks /Query /TN "%STARTUP_TASK%" >nul 2>&1
  if not errorlevel 1 (
    schtasks /Run /TN "%STARTUP_TASK%" >nul 2>&1
    if not errorlevel 1 (
      timeout /t 2 /nobreak >nul
      powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\Open-Asolaria-Ui.ps1" -Url "http://127.0.0.1:4781/?startup=1&uiMode=simple" >nul 2>&1
      endlocal
      exit /b 0
    )
  )
)

set "AUTH_REQUIRED=0"
if /I "%ASOLARIA_DESKTOP_AUTH_REQUIRED%"=="1" set "AUTH_REQUIRED=1"
if /I "%ASOLARIA_DESKTOP_AUTH_REQUIRED%"=="true" set "AUTH_REQUIRED=1"
if /I "%ASOLARIA_DESKTOP_AUTH_REQUIRED%"=="yes" set "AUTH_REQUIRED=1"

if "%AUTH_REQUIRED%"=="1" (
  set "AUTH_SCRIPT=%~dp0tools\Require-Asolaria-DesktopAuth.ps1"
  if exist "%AUTH_SCRIPT%" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%AUTH_SCRIPT%" -Reason "Open Asolaria desktop app"
    if errorlevel 1 (
      endlocal
      exit /b 1
    )
  )
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\Start-Asolaria-OneButton.ps1" -SkipPublicTunnelKeeper -SkipTunnelMonitor -HealthGuardrailSkipOli %*
endlocal
