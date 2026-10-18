param(
  [switch]$IncludeMainApp = $true
)

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
  $args = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$PSCommandPath`""
  )
  if (-not $IncludeMainApp) { $args += "-IncludeMainApp:`$false" }
  Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $args | Out-Null
  exit 0
}

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Stop-NodeScriptProcess {
  param([string]$ScriptPath)
  $needle = $ScriptPath.Replace("\", "\\")
  $targets = @()
  try {
    $targets = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
      Where-Object { $_.CommandLine -like "*$needle*" })
  } catch {
    $targets = @()
  }
  foreach ($proc in $targets) {
    try { Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop } catch {}
  }
  return $targets.Count
}

Ensure-Elevated
$root = Get-AsolariaRoot

$gatewayScript = Join-Path $root "src\gateway\server.js"
$sandboxScript = Join-Path $root "services\sandbox-manager\server.js"

$stoppedGateway = Stop-NodeScriptProcess -ScriptPath $gatewayScript
$stoppedSandbox = Stop-NodeScriptProcess -ScriptPath $sandboxScript

$stoppedMain = 0
if ($IncludeMainApp) {
  $stopMainScript = Join-Path $PSScriptRoot "Stop-Asolaria.ps1"
  & $stopMainScript
  $stoppedMain = 1
}

Write-Host "Control-plane stop complete."
Write-Host " - gateway processes stopped: $stoppedGateway"
Write-Host " - sandbox processes stopped: $stoppedSandbox"
if ($IncludeMainApp) {
  Write-Host " - main app stop requested: yes"
}
