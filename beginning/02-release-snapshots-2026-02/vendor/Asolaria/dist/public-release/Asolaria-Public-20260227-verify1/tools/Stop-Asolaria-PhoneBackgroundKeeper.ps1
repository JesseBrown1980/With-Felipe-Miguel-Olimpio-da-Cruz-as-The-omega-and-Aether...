Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-RunningKeeperProcesses {
  return Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
    Where-Object { $_.CommandLine -like "*Keep-Asolaria-PhoneBackground.ps1*" }
}

$root = Get-AsolariaRoot
$pidFile = Join-Path $root "logs\phone-link-keeper.pid"
$running = @(Get-RunningKeeperProcesses)
if ($running.Count -eq 0) {
  Write-Host "No phone background keeper process is running."
  if (Test-Path $pidFile) {
    Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
  }
  return
}

foreach ($proc in $running) {
  try {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
    Write-Host ("Stopped phone background keeper pid={0}" -f $proc.ProcessId)
  } catch {
    Write-Warning ("Failed to stop pid={0}: {1}" -f $proc.ProcessId, $_.Exception.Message)
  }
}

if (Test-Path $pidFile) {
  Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
}
