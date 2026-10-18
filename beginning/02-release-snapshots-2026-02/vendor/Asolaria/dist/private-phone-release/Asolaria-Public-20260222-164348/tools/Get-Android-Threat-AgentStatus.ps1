Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-RunningAgentProcesses {
  $pattern = '(?i)\s-File\s+"?[^"]*Keep-Android-Threat-Agent\.ps1"?(\s|$)'
  return Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
    Where-Object { [string]$_.CommandLine -match $pattern }
}

$root = Get-AsolariaRoot
$logsDir = Join-Path $root "logs"
$pidFile = Join-Path $logsDir "android-threat-agent.pid"
$running = @(Get-RunningAgentProcesses)
$latestLog = $null
if (Test-Path -LiteralPath $logsDir) {
  $latestLog = Get-ChildItem -LiteralPath $logsDir -Filter "android-threat-agent-*.log" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

$status = [ordered]@{
  running = ($running.Count -gt 0)
  count = $running.Count
  pids = @($running | ForEach-Object { [int]$_.ProcessId })
  pidFile = $pidFile
  pidFileExists = (Test-Path -LiteralPath $pidFile)
  latestLog = if ($latestLog) { $latestLog.FullName } else { "" }
}

$status | ConvertTo-Json -Depth 4

if ($latestLog) {
  Write-Host ""
  Write-Host "Latest log tail:"
  Get-Content -Path $latestLog.FullName -Tail 20
}
