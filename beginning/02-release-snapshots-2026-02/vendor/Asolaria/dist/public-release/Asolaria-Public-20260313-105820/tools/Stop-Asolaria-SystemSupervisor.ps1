Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RunningSupervisorProcesses {
  try {
    return @(Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
        Where-Object { [string]$_.CommandLine -match '(?i)Keep-Asolaria-SystemSupervisor\.ps1' })
  } catch {
    return @()
  }
}

$running = @(Get-RunningSupervisorProcesses)
if ($running.Count -lt 1) {
  Write-Host "No Asolaria system supervisor process is running."
  exit 0
}

$stopped = 0
foreach ($proc in $running) {
  try {
    Stop-Process -Id ([int]$proc.ProcessId) -Force -ErrorAction Stop
    Write-Host ("Stopped system supervisor pid={0}" -f [int]$proc.ProcessId)
    $stopped += 1
  } catch {
    Write-Warning ("Failed to stop pid={0}: {1}" -f [int]$proc.ProcessId, $_.Exception.Message)
  }
}

Write-Host ("Stopped count: {0}" -f $stopped)
