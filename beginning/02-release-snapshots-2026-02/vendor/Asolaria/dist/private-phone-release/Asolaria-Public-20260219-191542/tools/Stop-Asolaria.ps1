Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-IsAdmin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-Elevated {
  if (Test-IsAdmin) {
    return
  }

  Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$PSCommandPath`""
  ) | Out-Null
  exit 0
}

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

Ensure-Elevated
$root = Get-AsolariaRoot

$targets = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like "*$root*server.js*" })

if ($targets.Count -eq 0) {
  $portTargets = Get-NetTCPConnection -LocalPort 4781 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  if ($portTargets) {
    $targets = @(foreach ($procId in $portTargets) {
      Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f [int]$procId)
    })
  }
}

foreach ($item in $targets) {
  Stop-Process -Id $item.ProcessId -Force
}
