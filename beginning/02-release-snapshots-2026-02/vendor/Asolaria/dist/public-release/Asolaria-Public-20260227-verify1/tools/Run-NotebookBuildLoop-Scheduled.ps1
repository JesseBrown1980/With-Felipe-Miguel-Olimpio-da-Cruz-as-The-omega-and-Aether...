param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$Account = "plasmatoid@gmail.com",
  [string]$Project = "winged-complex-390417",
  [string]$Location = "global",
  [int]$IntervalSec = 90,
  [int]$MaxHours = 1
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$targetScript = Join-Path $PSScriptRoot "Complete-NotebookLM-Upgrade-Loop.ps1"
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

try {
  & $targetScript `
    -BaseUrl $BaseUrl `
    -Account $Account `
    -Project $Project `
    -Location $Location `
    -IntervalSec $IntervalSec `
    -MaxHours $MaxHours *>&1 | Tee-Object -FilePath $logPath | Out-Null
} catch {
  ("ERROR: " + $_.Exception.Message) | Tee-Object -FilePath $logPath -Append | Out-Null
  throw
}

$exitCode = 0
if ($LASTEXITCODE -is [int]) {
  $exitCode = [int]$LASTEXITCODE
}
exit $exitCode
