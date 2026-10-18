param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ForwardArgs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonScript = Join-Path $scriptDir "transcribe_whisper.py"
if (-not (Test-Path -LiteralPath $pythonScript)) {
  throw "Whisper adapter script not found: $pythonScript"
}

# Prefer an explicit interpreter when provided, then a known local Anaconda Python
# (where faster-whisper is installed), and finally fall back to PATH python.
$pythonCmd = [string]$env:ASOLARIA_WHISPER_PYTHON
if ([string]::IsNullOrWhiteSpace($pythonCmd)) {
  $condaPython = "C:\Users\acer\anaconda3\python.exe"
  if (Test-Path -LiteralPath $condaPython) {
    $pythonCmd = $condaPython
  } else {
    $pythonCmd = "python"
  }
}

& $pythonCmd $pythonScript @ForwardArgs
exit $LASTEXITCODE
