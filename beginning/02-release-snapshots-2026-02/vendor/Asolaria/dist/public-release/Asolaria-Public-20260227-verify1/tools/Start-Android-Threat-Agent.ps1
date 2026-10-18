param(
  [int]$CheckIntervalSeconds = 90,
  [int]$MaxHours = 24,
  [int]$Top = 25,
  [switch]$AutoQuarantineHighRisk,
  [int]$QuarantineScoreThreshold = 85,
  [switch]$Restart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Get-RunningAgentProcesses {
  $pattern = '(?i)\s-File\s+"?[^"]*Keep-Android-Threat-Agent\.ps1"?(\s|$)'
  return Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
    Where-Object { [string]$_.CommandLine -match $pattern }
}

$root = Get-AsolariaRoot
$logsDir = Join-Path $root "logs"
Ensure-Dir $logsDir

$pidFile = Join-Path $logsDir "android-threat-agent.pid"
$current = @(Get-RunningAgentProcesses)
if ($current.Count -gt 0) {
  if (-not $Restart.IsPresent) {
    Write-Host ("Android threat agent is already running (count={0})." -f $current.Count)
    foreach ($proc in $current) {
      Write-Host (" - pid={0}" -f $proc.ProcessId)
    }
    return
  }

  foreach ($proc in $current) {
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      Write-Host ("Stopped existing android threat agent pid={0}" -f $proc.ProcessId)
    } catch {
      Write-Warning ("Failed to stop android threat agent pid={0}: {1}" -f $proc.ProcessId, $_.Exception.Message)
    }
  }
}

$agentScript = Join-Path $PSScriptRoot "Keep-Android-Threat-Agent.ps1"
$logPath = Join-Path $logsDir ("android-threat-agent-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".log")
$argList = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$agentScript`"",
  "-CheckIntervalSeconds", "$CheckIntervalSeconds",
  "-MaxHours", "$MaxHours",
  "-Top", "$Top",
  "-QuarantineScoreThreshold", "$QuarantineScoreThreshold",
  "-LogPath", "`"$logPath`""
)
if ($AutoQuarantineHighRisk.IsPresent) {
  $argList += "-AutoQuarantineHighRisk"
}

$proc = Start-Process -FilePath "powershell.exe" -ArgumentList $argList -WindowStyle Hidden -PassThru
$proc.Id | Set-Content -Path $pidFile -Encoding ASCII

Write-Host "Android threat agent started."
Write-Host ("PID: {0}" -f $proc.Id)
Write-Host ("PID file: {0}" -f $pidFile)
Write-Host ("Log file: {0}" -f $logPath)
