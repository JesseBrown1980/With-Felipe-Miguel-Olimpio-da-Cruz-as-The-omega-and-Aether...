@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%kitty-tts-adapter.ps1" -OutputPath "%~1" -Text "%~2" -Voice "%~3"
exit /b %ERRORLEVEL%
