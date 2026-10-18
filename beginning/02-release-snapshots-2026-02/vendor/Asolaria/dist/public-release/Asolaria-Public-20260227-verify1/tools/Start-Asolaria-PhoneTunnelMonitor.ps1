param(
  [int]$Port = 4781,
  [int]$CheckIntervalSeconds = 300,
  [int]$MaxHours = 0,
  [object]$PhoneOnlyMode = $false,
  [switch]$IncludeRawProbe,
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

function Resolve-Bool {
  param(
    [object]$Value,
    [bool]$Default = $false
  )

  if ($null -eq $Value) {
    return $Default
  }

  if ($Value -is [bool]) {
    return [bool]$Value
  }

  if ($Value -is [int] -or $Value -is [long]) {
    return ([int64]$Value) -ne 0
  }

  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $Default
  }

  $normalized = $text.Trim().ToLowerInvariant()
  if ($normalized -in @("true", "1", "yes", "y", "on")) {
    return $true
  }
  if ($normalized -in @("false", "0", "no", "n", "off")) {
    return $false
  }

  return $Default
}

function Get-RunningMonitorProcesses {
  return Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
    Where-Object { $_.CommandLine -like "*Keep-Asolaria-PhoneTunnelSmoke.ps1*" }
}

$root = Get-AsolariaRoot
$logsDir = Join-Path $root "logs"
Ensure-Dir $logsDir

$pidFile = Join-Path $logsDir "phone-tunnel-smoke-monitor.pid"
$current = @(Get-RunningMonitorProcesses)
if ($current.Count -gt 0) {
  if (-not $Restart.IsPresent) {
    Write-Host ("Phone tunnel smoke monitor is already running (count={0})." -f $current.Count)
    foreach ($proc in $current) {
      Write-Host (" - pid={0}" -f $proc.ProcessId)
    }
    return
  }

  foreach ($proc in $current) {
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      Write-Host ("Stopped existing monitor pid={0}" -f $proc.ProcessId)
    } catch {
      Write-Warning ("Failed to stop monitor pid={0}: {1}" -f $proc.ProcessId, $_.Exception.Message)
    }
  }
}

$monitorScript = Join-Path $PSScriptRoot "Keep-Asolaria-PhoneTunnelSmoke.ps1"
$logPath = Join-Path $logsDir ("phone-tunnel-smoke-monitor-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".log")
$stableReportPath = Join-Path $root "reports\phone-tunnel-smoke-latest.md"
$phoneOnly = Resolve-Bool -Value $PhoneOnlyMode -Default $true
$phoneOnlyNumeric = if ($phoneOnly) { 1 } else { 0 }
$argList = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $monitorScript,
  "-Port", "$Port",
  "-CheckIntervalSeconds", "$CheckIntervalSeconds",
  "-MaxHours", "$MaxHours",
  "-PhoneOnlyMode", "$phoneOnlyNumeric",
  "-LogPath", $logPath,
  "-StableReportPath", $stableReportPath
)
if ($IncludeRawProbe.IsPresent) {
  $argList += "-IncludeRawProbe"
}

$proc = Start-Process -FilePath "powershell.exe" -ArgumentList $argList -WindowStyle Hidden -PassThru
$proc.Id | Set-Content -Path $pidFile -Encoding ASCII

Write-Host "Phone tunnel smoke monitor started."
Write-Host ("PID: {0}" -f $proc.Id)
Write-Host ("PID file: {0}" -f $pidFile)
Write-Host ("Log file: {0}" -f $logPath)
Write-Host ("Stable report: {0}" -f $stableReportPath)
