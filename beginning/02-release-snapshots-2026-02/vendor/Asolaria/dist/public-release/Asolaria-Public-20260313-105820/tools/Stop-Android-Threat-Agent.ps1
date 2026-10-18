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
$pidFile = Join-Path $root "logs\android-threat-agent.pid"
$running = @(Get-RunningAgentProcesses)
if ($running.Count -eq 0) {
  Write-Host "No android threat agent process is running."
  if (Test-Path -LiteralPath $pidFile) {
    Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
  }
  return
}

foreach ($proc in $running) {
  try {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
    Write-Host ("Stopped android threat agent pid={0}" -f $proc.ProcessId)
  } catch {
    Write-Warning ("Failed to stop pid={0}: {1}" -f $proc.ProcessId, $_.Exception.Message)
  }
}

if (Test-Path -LiteralPath $pidFile) {
  Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
}
