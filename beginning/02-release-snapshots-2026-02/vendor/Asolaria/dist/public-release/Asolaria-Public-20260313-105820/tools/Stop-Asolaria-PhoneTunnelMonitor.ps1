Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-RunningMonitorProcesses {
  return Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
    Where-Object { $_.CommandLine -like "*Keep-Asolaria-PhoneTunnelSmoke.ps1*" }
}

$root = Get-AsolariaRoot
$pidFile = Join-Path $root "logs\phone-tunnel-smoke-monitor.pid"
$running = @(Get-RunningMonitorProcesses)
if ($running.Count -eq 0) {
  Write-Host "No phone tunnel smoke monitor process is running."
  if (Test-Path $pidFile) {
    Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
  }
  return
}

foreach ($proc in $running) {
  try {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
    Write-Host ("Stopped phone tunnel smoke monitor pid={0}" -f $proc.ProcessId)
  } catch {
    Write-Warning ("Failed to stop pid={0}: {1}" -f $proc.ProcessId, $_.Exception.Message)
  }
}

if (Test-Path $pidFile) {
  Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
}
