param(
  [int]$Port = 4781,
  [int]$CheckIntervalSeconds = 20,
  [int]$MaxHours = 0,
  [string]$AdbWifiEndpoint = "",
  [int]$AdbWifiPort = 5555,
  [int]$WirelessRetrySeconds = 60,
  [int]$EnableWirelessFallback = 1,
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

function Wait-ForKeeperProcess {
  param(
    [int]$TimeoutSeconds = 12,
    [int]$PollMilliseconds = 400
  )

  $deadline = (Get-Date).AddSeconds([Math]::Max(2, $TimeoutSeconds))
  while ((Get-Date) -lt $deadline) {
    $matches = @(Get-RunningKeeperProcesses)
    if ($matches.Count -gt 0) {
      return ($matches | Sort-Object ProcessId -Descending | Select-Object -First 1)
    }
    Start-Sleep -Milliseconds ([Math]::Max(100, $PollMilliseconds))
  }

  return $null
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
  "-File", $keeperScript,
  "-Port", "$Port",
  "-CheckIntervalSeconds", "$CheckIntervalSeconds",
  "-MaxHours", "$MaxHours",
  "-AdbWifiPort", "$AdbWifiPort",
  "-WirelessRetrySeconds", "$WirelessRetrySeconds",
  "-EnableWirelessFallback", "$EnableWirelessFallback",
  "-LogPath", $logPath
)
if (-not [string]::IsNullOrWhiteSpace($AdbWifiEndpoint)) {
  $argList += @("-AdbWifiEndpoint", "$AdbWifiEndpoint")
}

$proc = Start-Process -FilePath "powershell.exe" -ArgumentList $argList -WorkingDirectory $root -WindowStyle Hidden -PassThru
$keeperProc = Wait-ForKeeperProcess
if (-not $keeperProc) {
  throw ("Phone background keeper failed to stay running after launch. Check log: {0}" -f $logPath)
}

$keeperProc.ProcessId | Set-Content -Path $pidFile -Encoding ASCII

Write-Host "Phone background keeper started."
Write-Host ("PID: {0}" -f $keeperProc.ProcessId)
if ($keeperProc.ProcessId -ne $proc.Id) {
  Write-Host ("Launch PID: {0}" -f $proc.Id)
}
Write-Host ("PID file: {0}" -f $pidFile)
Write-Host ("Log file: {0}" -f $logPath)
