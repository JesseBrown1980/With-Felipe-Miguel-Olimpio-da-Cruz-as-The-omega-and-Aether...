param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$Account = "plasmatoid@gmail.com",
  [string]$Project = "winged-complex-390417",
  [string]$Location = "global",
  [string]$NotebookTitle = "Asolaria Enterprise Memory",
  [int]$IntervalSec = 90,
  [int]$MaxHours = 1
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$targetScript = Join-Path $PSScriptRoot "Complete-NotebookLM-Upgrade-Loop.ps1"
$coreSyncScript = Join-Path $PSScriptRoot "Sync-Asolaria-Core-NotebookLM.ps1"
$logsDir = Join-Path $repoRoot "logs"
if (-not (Test-Path -LiteralPath $logsDir)) {
  New-Item -Path $logsDir -ItemType Directory -Force | Out-Null
}
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $logsDir ("notebooklm-build-loop-" + $stamp + ".log")

if (-not (Test-Path -LiteralPath $targetScript)) {
  "Missing script: $targetScript" | Set-Content -Path $logPath -Encoding UTF8
  throw "Missing script: $targetScript"
}
if (-not (Test-Path -LiteralPath $coreSyncScript)) {
  "Missing script: $coreSyncScript" | Set-Content -Path $logPath -Encoding UTF8
  throw "Missing script: $coreSyncScript"
}

try {
  & $targetScript `
    -BaseUrl $BaseUrl `
    -Account $Account `
    -Project $Project `
    -Location $Location `
    -IntervalSec $IntervalSec `
    -MaxHours $MaxHours *>&1 | Tee-Object -FilePath $logPath | Out-Null
  if (($LASTEXITCODE -as [int]) -ne $null -and [int]$LASTEXITCODE -ne 0) {
    throw "NotebookLM upgrade loop failed with exit code $LASTEXITCODE."
  }

  "Running NotebookLM core sync..." | Tee-Object -FilePath $logPath -Append | Out-Null
  & $coreSyncScript `
    -BaseUrl $BaseUrl `
    -Account $Account `
    -Project $Project `
    -Location $Location `
    -NotebookTitle $NotebookTitle *>&1 | Tee-Object -FilePath $logPath -Append | Out-Null
  if (($LASTEXITCODE -as [int]) -ne $null -and [int]$LASTEXITCODE -ne 0) {
    throw "NotebookLM core sync failed with exit code $LASTEXITCODE."
  }
} catch {
  ("ERROR: " + $_.Exception.Message) | Tee-Object -FilePath $logPath -Append | Out-Null
  throw
}

exit 0
