param(
  [int]$CheckIntervalSeconds = 60,
  [int]$MaxHours = 0,
  [double]$MemoryWarnPercent = 80,
  [double]$CpuWarnPercent = 85,
  [double]$GpuWarnPercent = 90,
  [int]$AlertCooldownSeconds = 600,
  [int]$TopProcessCount = 6,
  [string]$ThreadId = "asolaria-system-supervisor-20260302",
  [string]$BridgeRoot = "",
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

function Get-RunningSupervisorProcesses {
  $rows = @()
  try {
    $rows = @(Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction Stop)
  } catch {
    return @()
  }
  $result = @()
  foreach ($row in $rows) {
    $cmd = [string]$row.CommandLine
    if ([string]::IsNullOrWhiteSpace($cmd)) { continue }
    if ($cmd -match '(?i)Keep-Asolaria-SystemSupervisor\.ps1') {
      $result += $row
    }
  }
  return @($result)
}

function Stop-Processes {
  param([object[]]$Rows)
  $stopped = @()
  foreach ($row in @($Rows)) {
    $targetPid = [int]$row.ProcessId
    if ($targetPid -le 0) { continue }
    try {
      Stop-Process -Id $targetPid -Force -ErrorAction Stop
      $stopped += $targetPid
    } catch {}
  }
  return @($stopped)
}

$repoRoot = Get-AsolariaRoot
$logsDir = Join-Path $repoRoot "logs"
Ensure-Dir -Path $logsDir

$monitorScript = Join-Path $PSScriptRoot "Keep-Asolaria-SystemSupervisor.ps1"
if (-not (Test-Path -LiteralPath $monitorScript)) {
  throw "System supervisor script not found: $monitorScript"
}

$pidFilePath = Join-Path $logsDir "system-supervisor.pid"
$logPath = Join-Path $logsDir ("system-supervisor-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".log")
$statePath = Join-Path $logsDir "system-supervisor.state.json"

$current = @(Get-RunningSupervisorProcesses)
if ($current.Count -gt 0) {
  if (-not $Restart.IsPresent -and -not $RunOnce.IsPresent) {
    Write-Host ("System supervisor is already running (count={0})." -f $current.Count)
    foreach ($proc in $current) {
      Write-Host (" - pid={0}" -f [int]$proc.ProcessId)
    }
    return
  }
  $stopped = Stop-Processes -Rows $current
  foreach ($stoppedPid in @($stopped)) {
    Write-Host ("Stopped existing system supervisor pid={0}" -f $stoppedPid)
  }
}

$argList = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$monitorScript`"",
  "-CheckIntervalSeconds", "$CheckIntervalSeconds",
  "-MaxHours", "$MaxHours",
  "-MemoryWarnPercent", "$MemoryWarnPercent",
  "-CpuWarnPercent", "$CpuWarnPercent",
  "-GpuWarnPercent", "$GpuWarnPercent",
  "-AlertCooldownSeconds", "$AlertCooldownSeconds",
  "-TopProcessCount", "$TopProcessCount",
  "-ThreadId", "$ThreadId",
  "-LogPath", "`"$logPath`"",
  "-StatePath", "`"$statePath`""
)
if (-not [string]::IsNullOrWhiteSpace($BridgeRoot)) {
  $argList += "-BridgeRoot"
  $argList += "`"$BridgeRoot`""
}
if ($RunOnce.IsPresent) {
  $argList += "-RunOnce"
  & powershell.exe @argList
  return
}

$proc = Start-Process -FilePath "powershell.exe" -ArgumentList $argList -WindowStyle Hidden -PassThru
Set-Content -LiteralPath $pidFilePath -Value ([string]$proc.Id) -Encoding ASCII

Write-Host "Asolaria system supervisor started."
Write-Host ("PID: {0}" -f [int]$proc.Id)
Write-Host ("PID file: {0}" -f $pidFilePath)
Write-Host ("Log file: {0}" -f $logPath)
Write-Host ("State file: {0}" -f $statePath)
