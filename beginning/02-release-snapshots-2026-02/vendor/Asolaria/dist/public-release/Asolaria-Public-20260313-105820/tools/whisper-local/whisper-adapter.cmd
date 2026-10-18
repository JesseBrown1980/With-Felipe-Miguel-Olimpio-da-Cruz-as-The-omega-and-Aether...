@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "PYTHONUTF8=1"
python "%SCRIPT_DIR%transcribe_whisper.py" %*
set "EXIT_CODE=%ERRORLEVEL%"
exit /b %EXIT_CODE%

