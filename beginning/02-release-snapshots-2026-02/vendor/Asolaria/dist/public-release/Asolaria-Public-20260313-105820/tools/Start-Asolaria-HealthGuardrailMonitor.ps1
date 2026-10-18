param(
  [int]$HttpPort = 4781,
  [int]$HttpsPort = 5443,
  [int]$OliPort = 8787,
  [int]$CheckIntervalSeconds = 300,
  [int]$MaxHours = 0,
  [int]$OliAlertCooldownSeconds = 1800,
  [string]$ThreadId = "asolaria-upgrade-20260301",
  [string]$StatePath = "",
  [switch]$SkipOli,
  [switch]$Restart,
  [switch]$RunOnce
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Get-RunningMonitorProcesses {
  param([int]$Port)
  $rows = @()
  try {
    $rows = @(Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction Stop)
  } catch {
    return @()
  }
  $pattern = ('(?i)Keep-Asolaria-HealthGuardrail\.ps1"\s+-HttpPort\s+{0}(\s|$)' -f $Port)
  $result = @()
  foreach ($row in $rows) {
    $cmd = [string]$row.CommandLine
    if ([string]::IsNullOrWhiteSpace($cmd)) { continue }
    if ($cmd -notmatch $pattern) { continue }
    $result += $row
  }
  return @($result)
}

function Stop-Processes {
  param([object[]]$Rows)
  $stopped = @()
  foreach ($row in @($Rows)) {
    $processId = [int]$row.ProcessId
    if ($processId -le 0) { continue }
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      $stopped += $processId
    } catch {}
  }
  return @($stopped)
}

$repoRoot = Get-AsolariaRoot
$logsDir = Join-Path $repoRoot "logs"
Ensure-Dir -Path $logsDir

$monitorScript = Join-Path $PSScriptRoot "Keep-Asolaria-HealthGuardrail.ps1"
if (-not (Test-Path -LiteralPath $monitorScript)) {
  throw "Health guardrail monitor script not found: $monitorScript"
}

$pidFilePath = Join-Path $logsDir "health-guardrail-monitor.pid"
$logPath = Join-Path $logsDir ("health-guardrail-monitor-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".log")
if ([string]::IsNullOrWhiteSpace($StatePath)) {
  $StatePath = Join-Path $logsDir "health-guardrail-monitor.state.json"
}

$current = @(Get-RunningMonitorProcesses -Port $HttpPort)
if ($current.Count -gt 0) {
  if (-not $Restart.IsPresent -and -not $RunOnce.IsPresent) {
    Write-Host ("Health guardrail monitor is already running (count={0})." -f $current.Count)
    foreach ($proc in $current) {
      Write-Host (" - pid={0}" -f [int]$proc.ProcessId)
    }
    return
  }
  $stopped = Stop-Processes -Rows $current
  foreach ($stoppedPid in @($stopped)) {
    Write-Host ("Stopped existing health guardrail monitor pid={0}" -f $stoppedPid)
  }
}

$argList = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$monitorScript`"",
  "-HttpPort", "$HttpPort",
  "-HttpsPort", "$HttpsPort",
  "-OliPort", "$OliPort",
  "-CheckIntervalSeconds", "$CheckIntervalSeconds",
  "-MaxHours", "$MaxHours",
  "-OliAlertCooldownSeconds", "$OliAlertCooldownSeconds",
  "-ThreadId", "$ThreadId",
  "-LogPath", "`"$logPath`"",
  "-StatePath", "`"$StatePath`""
)
if ($SkipOli.IsPresent) {
  $argList += "-SkipOli"
}
if ($RunOnce.IsPresent) {
  $argList += "-RunOnce"
  & powershell.exe @argList
  return
}

$proc = Start-Process -FilePath "powershell.exe" -ArgumentList $argList -WindowStyle Hidden -PassThru
Set-Content -LiteralPath $pidFilePath -Value ([string]$proc.Id) -Encoding ASCII

Write-Host "Health guardrail monitor started."
Write-Host ("PID: {0}" -f [int]$proc.Id)
Write-Host ("PID file: {0}" -f $pidFilePath)
Write-Host ("Log file: {0}" -f $logPath)
Write-Host ("State file: {0}" -f $StatePath)
