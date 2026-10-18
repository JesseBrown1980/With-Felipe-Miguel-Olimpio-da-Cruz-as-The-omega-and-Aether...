param(
  [int]$Port = 4781,
  [int]$CheckIntervalSeconds = 45,
  [int]$MaxHours = 24,
  [int]$UnhealthyRestartThreshold = 4,
  [string]$CloudflaredPath = "",
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

function Get-RunningKeeperProcesses {
  $rows = @()
  try {
    $rows = @(Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction Stop)
  } catch {
    return @()
  }

  $signaturePattern = ('(?i)Keep-Asolaria-PublicTunnel\.ps1"\s+-Port\s+{0}(\s|$)' -f $Port)
  $result = @()
  foreach ($row in $rows) {
    $cmd = [string]$row.CommandLine
    if ([string]::IsNullOrWhiteSpace($cmd)) { continue }
    if ($cmd -notmatch $signaturePattern) { continue }
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
    } catch {
      # continue
    }
  }
  return @($stopped)
}

$repoRoot = Get-AsolariaRoot
$logsDir = Join-Path $repoRoot "logs"
Ensure-Dir -Path $logsDir

$keeperScript = Join-Path $PSScriptRoot "Keep-Asolaria-PublicTunnel.ps1"
if (-not (Test-Path -LiteralPath $keeperScript)) {
  throw "Keeper script not found: $keeperScript"
}

$keeperPidFilePath = Join-Path $logsDir "public-tunnel-keeper.pid"
$logPath = Join-Path $logsDir ("public-tunnel-keeper-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".log")

$current = @(Get-RunningKeeperProcesses)
if ($current.Count -gt 0) {
  if (-not $Restart.IsPresent -and -not $RunOnce.IsPresent) {
    Write-Host ("Public tunnel keeper is already running (count={0})." -f $current.Count)
    foreach ($proc in $current) {
      Write-Host (" - pid={0}" -f [int]$proc.ProcessId)
    }
    return
  }

  $stopped = Stop-Processes -Rows $current
  foreach ($stoppedProcessId in $stopped) {
    Write-Host ("Stopped existing public tunnel keeper pid={0}" -f $stoppedProcessId)
  }
}

$argList = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$keeperScript`"",
  "-Port", "$Port",
  "-CheckIntervalSeconds", "$CheckIntervalSeconds",
  "-MaxHours", "$MaxHours",
  "-UnhealthyRestartThreshold", "$UnhealthyRestartThreshold",
  "-LogPath", "`"$logPath`""
)
if (-not [string]::IsNullOrWhiteSpace($CloudflaredPath)) {
  $argList += @("-CloudflaredPath", "`"$CloudflaredPath`"")
}
if ($RunOnce.IsPresent) {
  $argList += "-RunOnce"
  & powershell.exe @argList
  return
}

$proc = Start-Process -FilePath "powershell.exe" -ArgumentList $argList -WindowStyle Hidden -PassThru
Set-Content -LiteralPath $keeperPidFilePath -Value ([string]$proc.Id) -Encoding ASCII

Write-Host "Public tunnel keeper started."
Write-Host ("PID: {0}" -f $proc.Id)
Write-Host ("PID file: {0}" -f $keeperPidFilePath)
Write-Host ("Log file: {0}" -f $logPath)
