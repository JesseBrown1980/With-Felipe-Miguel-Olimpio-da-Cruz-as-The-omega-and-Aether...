Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "Complete-NotebookLM-Upgrade-Loop.ps1"

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
  -BaseUrl "http://127.0.0.1:4781" `
  -Account "plasmatoid@gmail.com" `
  -Project "winged-complex-390417" `
  -Location "global" `
  -IntervalSec 60 `
  -MaxHours 8
