@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\Start-Asolaria-Phone.ps1" -OpenDesktopUi -OpenOnPhone -CopyUrl
echo.
echo Asolaria phone connector finished.
pause
endlocal
