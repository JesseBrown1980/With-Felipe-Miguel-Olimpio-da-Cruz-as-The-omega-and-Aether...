@echo off
setlocal
set "ASOLARIA_REMOTE_APPROVAL_BASE_URL="
set "ASOLARIA_CONNECTION_PREFERENCE=usb,vpn,private_internet,public_internet"
set "ASOLARIA_CONNECTION_AVAILABLE=usb,vpn,private_internet,public_internet"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\Start-Asolaria-Phone.ps1" -OpenDesktopUi:$false -OpenOnPhone:$false -CopyUrl -ForceRemotePhoneUrl -EnableTailnetProxy:$true -RunPhoneTunnelSmokeTest:$false
echo.
echo Asolaria phone connector finished.
pause
endlocal
