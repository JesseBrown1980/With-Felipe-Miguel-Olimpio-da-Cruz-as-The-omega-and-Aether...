param(
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-State {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try {
    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json)
  } catch {
    return $null
  }
}

$runtimeDir = "C:\Users\acer\Asolaria\runtime"
$statePath = Join-Path $runtimeDir "caption-ocr-bridge.json"
$state = Read-State -Path $statePath
if (-not $state) {
  throw "caption_ocr_bridge_state_not_found"
}

$workerPid = [int]($state.pid | ForEach-Object { $_ })
if ($workerPid -gt 0) {
  $proc = Get-Process -Id $workerPid -ErrorAction SilentlyContinue
  if ($proc) {
    Stop-Process -Id $workerPid -Force:$Force.IsPresent -ErrorAction SilentlyContinue
  }
}

$stdoutLogPath = [string]$state.stdoutLogPath
$stderrLogPath = [string]$state.stderrLogPath

if (Test-Path -LiteralPath $statePath) {
  Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}

[pscustomobject]@{
  stoppedAt = (Get-Date).ToString("o")
  pid = $workerPid
  stdoutLogPath = $stdoutLogPath
  stderrLogPath = $stderrLogPath
} | ConvertTo-Json -Depth 6
