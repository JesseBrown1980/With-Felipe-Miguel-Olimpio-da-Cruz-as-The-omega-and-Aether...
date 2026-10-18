param(
  [int]$AppPort = 4781,
  [switch]$OpenBrowser,
  [switch]$IncludeSandbox = $true
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
    "-File", "`"$PSCommandPath`"",
    "-AppPort", "$AppPort"
  )
  if ($OpenBrowser.IsPresent) { $args += "-OpenBrowser" }
  if (-not $IncludeSandbox) { $args += "-IncludeSandbox:`$false" }
  Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $args | Out-Null
  exit 0
}

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Resolve-NodePath {
  try {
    $cmd = Get-Command node -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {}
  foreach ($candidate in @("C:\nvm4w\nodejs\node.exe", "C:\Program Files\nodejs\node.exe")) {
    if (Test-Path $candidate) { return $candidate }
  }
  return $null
}

function Get-NodeProcessByScript {
  param([string]$ScriptPath)
  $needle = $ScriptPath.Replace("\", "\\")
  try {
    return @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
      Where-Object { $_.CommandLine -like "*$needle*" })
  } catch {
    return @()
  }
}

function Start-NodeService {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [string]$WorkingDirectory,
    [string]$StdoutPath,
    [string]$StderrPath
  )

  $existing = Get-NodeProcessByScript -ScriptPath $ScriptPath
  if ($existing.Count -gt 0) {
    return $existing[0].ProcessId
  }

  $nodePath = Resolve-NodePath
  if (-not $nodePath) {
    throw "Node executable not found for service '$Name'."
  }

  New-Item -Path (Split-Path $StdoutPath -Parent) -ItemType Directory -Force | Out-Null

  $proc = Start-Process -FilePath $nodePath `
    -ArgumentList "`"$ScriptPath`"" `
    -WorkingDirectory $WorkingDirectory `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput $StdoutPath `
    -RedirectStandardError $StderrPath

  return $proc.Id
}

function Wait-Health {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 25
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $null = Invoke-RestMethod -Uri $Url -TimeoutSec 3
      return $true
    } catch {
      Start-Sleep -Milliseconds 700
    }
  }
  return $false
}

Ensure-Elevated

$root = Get-AsolariaRoot
$logDir = Join-Path $root "logs"
New-Item -Path $logDir -ItemType Directory -Force | Out-Null

# Start existing core app first (reuses current startup defaults and cert setup behavior).
$startMainScript = Join-Path $PSScriptRoot "Start-Asolaria.ps1"
$mainArgs = @("-Port", "$AppPort")
if ($OpenBrowser.IsPresent) { $mainArgs += "-OpenBrowser" }
& $startMainScript @mainArgs

# Ensure gateway token exists.
$setupScript = Join-Path $PSScriptRoot "Setup-Asolaria-Rebuild.ps1"
& $setupScript

$gatewayScript = Join-Path $root "src\gateway\server.js"
$gatewayPid = Start-NodeService `
  -Name "gateway" `
  -ScriptPath $gatewayScript `
  -WorkingDirectory (Split-Path $gatewayScript -Parent) `
  -StdoutPath (Join-Path $logDir "gateway.out.log") `
  -StderrPath (Join-Path $logDir "gateway.err.log")

$gatewayHealthy = Wait-Health -Url "http://127.0.0.1:4791/health" -TimeoutSeconds 30
if (-not $gatewayHealthy) {
  throw "Gateway did not become healthy on 127.0.0.1:4791. PID=$gatewayPid"
}

$sandboxPid = 0
$sandboxHealthy = $false
if ($IncludeSandbox) {
  $sandboxScript = Join-Path $root "services\sandbox-manager\server.js"
  $sandboxPid = Start-NodeService `
    -Name "sandbox" `
    -ScriptPath $sandboxScript `
    -WorkingDirectory (Split-Path $sandboxScript -Parent) `
    -StdoutPath (Join-Path $logDir "sandbox-manager.out.log") `
    -StderrPath (Join-Path $logDir "sandbox-manager.err.log")
  $sandboxHealthy = Wait-Health -Url "http://127.0.0.1:5443/health" -TimeoutSeconds 30
  if (-not $sandboxHealthy) {
    throw "Sandbox manager did not become healthy on 127.0.0.1:5443. PID=$sandboxPid"
  }
}

Write-Host "Asolaria control plane is online."
Write-Host " - app: http://127.0.0.1:$AppPort"
Write-Host " - gateway: http://127.0.0.1:4791 (PID $gatewayPid)"
if ($IncludeSandbox) {
  Write-Host " - sandbox: http://127.0.0.1:5443 (PID $sandboxPid)"
}
