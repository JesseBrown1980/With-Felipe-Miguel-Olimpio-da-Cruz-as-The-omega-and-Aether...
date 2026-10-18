param(
  [string]$WindowTitle = "Verve",
  [int]$WindowId = 0,
  [int]$IntervalSec = 5,
  [string]$OutputRoot = "C:\Users\acer\Asolaria\captures\verve-live",
  [switch]$StartRecorder,
  [ValidateSet("balanced","small","crisp")]
  [string]$RecorderProfile = "balanced",
  [switch]$RecorderNoAudio
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Directory {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "path_empty"
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Read-State {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try {
    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Write-State {
  param(
    [string]$Path,
    [Parameter(Mandatory = $true)]$Value
  )
  $Value | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $Path -Encoding UTF8
}

$runtimeDir = "C:\Users\acer\Asolaria\runtime"
Ensure-Directory -Path $runtimeDir
Ensure-Directory -Path $OutputRoot

$statePath = Join-Path $runtimeDir "verve-live-monitor.json"
$existing = Read-State -Path $statePath
if ($existing -and $existing.workerPid) {
  $running = Get-Process -Id ([int]$existing.workerPid) -ErrorAction SilentlyContinue
  if ($running) {
    throw ("verve_live_monitor_already_running pid={0}" -f [int]$existing.workerPid)
  }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$sessionDir = Join-Path $OutputRoot ("session-{0}" -f $stamp)
Ensure-Directory -Path $sessionDir

$workerScript = Join-Path $PSScriptRoot "Run-Verve-LiveMonitorWorker.ps1"
if (-not (Test-Path -LiteralPath $workerScript)) {
  throw ("worker_script_missing: {0}" -f $workerScript)
}

$stopSignalPath = Join-Path $runtimeDir ("verve-live-monitor-stop-{0}.sig" -f $stamp)
$domains = @("app.vervecopilot.com", "vervecopilot.com")

$state = [ordered]@{
  startedAt = (Get-Date).ToString("o")
  sessionTag = $stamp
  sessionDir = $sessionDir
  windowTitle = $WindowTitle
  windowId = [int]$WindowId
  intervalSec = [Math]::Max(1, $IntervalSec)
  verveDomains = $domains
  workerPid = 0
  workerStartedAt = $null
  workerExitedAt = $null
  stopSignalPath = $stopSignalPath
  recorderStarted = $false
  recorderProfile = $RecorderProfile
  recorderNoAudio = [bool]$RecorderNoAudio.IsPresent
  recorder = $null
  recorderStartError = $null
  networkLog = $null
  eventsLog = $null
  snapDir = $null
}
Write-State -Path $statePath -Value $state

if ($StartRecorder.IsPresent) {
  $recorderScript = Join-Path $PSScriptRoot "Start-Asolaria-MeetingRecording.ps1"
  if (-not (Test-Path -LiteralPath $recorderScript)) {
    $state.recorderStartError = ("recorder_script_missing: {0}" -f $recorderScript)
  } else {
    try {
      $startArgs = @("-NoProfile", "-File", $recorderScript, "-Profile", $RecorderProfile, "-OutputDir", $sessionDir)
      if ($RecorderNoAudio.IsPresent) {
        $startArgs += "-NoAudio"
      }
      $recJson = & powershell.exe @startArgs
      $recObj = $recJson | ConvertFrom-Json -ErrorAction Stop
      $state.recorderStarted = $true
      $state.recorder = $recObj
    } catch {
      $state.recorderStarted = $false
      $state.recorderStartError = $_.Exception.Message
    }
  }
  Write-State -Path $statePath -Value $state
}

$workerProc = Start-Process `
  -FilePath "powershell.exe" `
  -ArgumentList @("-NoProfile", "-File", $workerScript, "-StatePath", $statePath, "-StopSignalPath", $stopSignalPath) `
  -WindowStyle Hidden `
  -PassThru

$state.workerPid = [int]$workerProc.Id
$state.workerStartedAt = (Get-Date).ToString("o")
Write-State -Path $statePath -Value $state

Start-Sleep -Milliseconds 700
$finalState = Read-State -Path $statePath
[pscustomobject]$finalState | ConvertTo-Json -Depth 10
