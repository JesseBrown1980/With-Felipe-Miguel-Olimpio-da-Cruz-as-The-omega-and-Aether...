param(
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$statePath = "C:\Users\acer\Asolaria\runtime\meeting-recorder.json"
if (-not (Test-Path -LiteralPath $statePath)) {
  throw "meeting_recorder_state_not_found"
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
$targetPid = 0
if ($state.ffmpegPid) {
  $targetPid = [int]$state.ffmpegPid
} elseif ($state.pid) {
  $targetPid = [int]$state.pid
}
$workerPid = 0
if ($state.workerPid) {
  $workerPid = [int]$state.workerPid
}

$stopSignalPath = [string]$state.stopSignalPath
if (-not [string]::IsNullOrWhiteSpace($stopSignalPath)) {
  New-Item -ItemType File -Path $stopSignalPath -Force | Out-Null
}

$waitMs = if ($Force.IsPresent) { 3000 } else { 20000 }
$deadline = (Get-Date).AddMilliseconds($waitMs)
while ((Get-Date) -lt $deadline) {
  $ffRunning = $false
  $wkRunning = $false
  if ($targetPid -gt 0) {
    $ffRunning = [bool](Get-Process -Id $targetPid -ErrorAction SilentlyContinue)
  }
  if ($workerPid -gt 0) {
    $wkRunning = [bool](Get-Process -Id $workerPid -ErrorAction SilentlyContinue)
  }
  if (-not $ffRunning -and -not $wkRunning) {
    break
  }
  Start-Sleep -Milliseconds 400
}

if ($targetPid -gt 0) {
  $p = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
  if ($p) {
    Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
  }
}
if ($workerPid -gt 0) {
  $w = Get-Process -Id $workerPid -ErrorAction SilentlyContinue
  if ($w) {
    Stop-Process -Id $workerPid -Force -ErrorAction SilentlyContinue
  }
}

if (-not [string]::IsNullOrWhiteSpace($stopSignalPath) -and (Test-Path -LiteralPath $stopSignalPath)) {
  Remove-Item -LiteralPath $stopSignalPath -Force -ErrorAction SilentlyContinue
}
$argsPath = [string]$state.argsPath
if (-not [string]::IsNullOrWhiteSpace($argsPath) -and (Test-Path -LiteralPath $argsPath)) {
  Remove-Item -LiteralPath $argsPath -Force -ErrorAction SilentlyContinue
}

if (Test-Path -LiteralPath $statePath) {
  Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}

$outPath = [string]$state.output
$size = 0
if (-not [string]::IsNullOrWhiteSpace($outPath) -and (Test-Path -LiteralPath $outPath)) {
  $size = (Get-Item -LiteralPath $outPath).Length
}
$duration = $null
if (-not [string]::IsNullOrWhiteSpace($outPath) -and (Test-Path -LiteralPath $outPath)) {
  $ffprobe = Get-Command ffprobe -ErrorAction SilentlyContinue
  if ($ffprobe) {
    try {
      $probe = ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $outPath 2>$null
      if ($probe) {
        $duration = [double]$probe
      }
    } catch {}
  }
}

[pscustomobject]@{
  stoppedAt = (Get-Date).ToString("o")
  output = $outPath
  bytes = [int64]$size
  mb = [math]::Round(($size / 1MB), 2)
  durationSec = if ($null -ne $duration) { [math]::Round($duration, 2) } else { $null }
  logStdout = [string]$state.logStdout
  logStderr = [string]$state.logStderr
} | ConvertTo-Json -Depth 5
