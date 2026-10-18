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
$statePath = Join-Path $runtimeDir "verve-live-monitor.json"
$state = Read-State -Path $statePath
if (-not $state) {
  throw "verve_live_monitor_state_not_found"
}

$workerPid = 0
if ($state.workerPid) {
  $workerPid = [int]$state.workerPid
}
$stopSignalPath = [string]$state.stopSignalPath
if (-not [string]::IsNullOrWhiteSpace($stopSignalPath)) {
  New-Item -ItemType File -Path $stopSignalPath -Force | Out-Null
}

$waitMs = if ($Force.IsPresent) { 4000 } else { 15000 }
$deadline = (Get-Date).AddMilliseconds($waitMs)
while ((Get-Date) -lt $deadline) {
  if ($workerPid -le 0) { break }
  $running = Get-Process -Id $workerPid -ErrorAction SilentlyContinue
  if (-not $running) { break }
  Start-Sleep -Milliseconds 300
}

if ($workerPid -gt 0) {
  $running = Get-Process -Id $workerPid -ErrorAction SilentlyContinue
  if ($running) {
    Stop-Process -Id $workerPid -Force -ErrorAction SilentlyContinue
  }
}

$recorderStop = $null
if ([bool]$state.recorderStarted -and (Test-Path -LiteralPath "C:\Users\acer\Asolaria\runtime\meeting-recorder.json")) {
  $stopRecorderScript = Join-Path $PSScriptRoot "Stop-Asolaria-MeetingRecording.ps1"
  if (Test-Path -LiteralPath $stopRecorderScript) {
    try {
      $raw = & powershell.exe -NoProfile -File $stopRecorderScript
      $recorderStop = $raw | ConvertFrom-Json -ErrorAction Stop
    } catch {
      $recorderStop = [pscustomobject]@{
        error = $_.Exception.Message
      }
    }
  }
}

$sessionDir = [string]$state.sessionDir
$snapDir = [string]$state.snapDir
$networkLog = [string]$state.networkLog
$eventsLog = [string]$state.eventsLog

$snapCount = 0
if (-not [string]::IsNullOrWhiteSpace($snapDir) -and (Test-Path -LiteralPath $snapDir)) {
  $snapCount = @(Get-ChildItem -LiteralPath $snapDir -Filter "*.png" -File -ErrorAction SilentlyContinue).Count
}

$networkSize = 0
if (-not [string]::IsNullOrWhiteSpace($networkLog) -and (Test-Path -LiteralPath $networkLog)) {
  $networkSize = (Get-Item -LiteralPath $networkLog).Length
}

$eventSize = 0
if (-not [string]::IsNullOrWhiteSpace($eventsLog) -and (Test-Path -LiteralPath $eventsLog)) {
  $eventSize = (Get-Item -LiteralPath $eventsLog).Length
}

if (Test-Path -LiteralPath $statePath) {
  Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}
if (-not [string]::IsNullOrWhiteSpace($stopSignalPath) -and (Test-Path -LiteralPath $stopSignalPath)) {
  Remove-Item -LiteralPath $stopSignalPath -Force -ErrorAction SilentlyContinue
}

[pscustomobject]@{
  stoppedAt = (Get-Date).ToString("o")
  sessionDir = $sessionDir
  snapDir = $snapDir
  snapshots = [int]$snapCount
  networkLog = $networkLog
  networkLogBytes = [int64]$networkSize
  eventsLog = $eventsLog
  eventsLogBytes = [int64]$eventSize
  recorderStop = $recorderStop
} | ConvertTo-Json -Depth 10
