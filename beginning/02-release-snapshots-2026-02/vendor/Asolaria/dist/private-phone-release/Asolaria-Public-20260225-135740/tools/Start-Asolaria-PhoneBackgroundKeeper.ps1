param(
  [int]$Port = 4781,
  [int]$CheckIntervalSeconds = 20,
  [int]$MaxHours = 12,
  [switch]$Restart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Get-RunningKeeperProcesses {
  return Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
    Where-Object { $_.CommandLine -like "*Keep-Asolaria-PhoneBackground.ps1*" }
}

$root = Get-AsolariaRoot
$logsDir = Join-Path $root "logs"
Ensure-Dir $logsDir

$pidFile = Join-Path $logsDir "phone-link-keeper.pid"
$current = @(Get-RunningKeeperProcesses)
if ($current.Count -gt 0) {
  if (-not $Restart.IsPresent) {
    Write-Host ("Phone background keeper is already running (count={0})." -f $current.Count)
    foreach ($proc in $current) {
      Write-Host (" - pid={0}" -f $proc.ProcessId)
    }
    return
  }

  foreach ($proc in $current) {
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      Write-Host ("Stopped existing keeper pid={0}" -f $proc.ProcessId)
    } catch {
      Write-Warning ("Failed to stop keeper pid={0}: {1}" -f $proc.ProcessId, $_.Exception.Message)
    }
  }
}

$keeperScript = Join-Path $PSScriptRoot "Keep-Asolaria-PhoneBackground.ps1"
$logPath = Join-Path $logsDir ("phone-link-keeper-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".log")
$argList = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$keeperScript`"",
  "-Port", "$Port",
  "-CheckIntervalSeconds", "$CheckIntervalSeconds",
  "-MaxHours", "$MaxHours",
  "-LogPath", "`"$logPath`""
)

$proc = Start-Process -FilePath "powershell.exe" -ArgumentList $argList -WindowStyle Hidden -PassThru
$proc.Id | Set-Content -Path $pidFile -Encoding ASCII

Write-Host "Phone background keeper started."
Write-Host ("PID: {0}" -f $proc.Id)
Write-Host ("PID file: {0}" -f $pidFile)
Write-Host ("Log file: {0}" -f $logPath)
