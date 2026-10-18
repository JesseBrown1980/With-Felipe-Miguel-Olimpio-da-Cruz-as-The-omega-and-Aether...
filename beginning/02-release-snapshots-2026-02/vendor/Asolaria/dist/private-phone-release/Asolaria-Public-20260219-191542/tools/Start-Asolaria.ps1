param(
  [int]$Port = 4781,
  [switch]$OpenBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Set-AsolariaProcessEnvDefaults {
  $defaults = [ordered]@{
    ASOLARIA_APPROVAL_MODE = "smart"
    ASOLARIA_APPROVAL_PREFERENCE = "pay_priority"
    ASOLARIA_APPROVAL_WAIT_MS = "30000"
    ASOLARIA_NOTEBOOK_AUTO_MODE = "auto"
    # OpenClaw is intentionally disabled by default; Asolaria-native skills/connectors should be used instead.
    ASOLARIA_OPENCLAW_MODE = "disabled"
    ASOLARIA_GUARDIAN_MODE = "off"
    ASOLARIA_GUARDIAN_ALERTS_ENABLED = "false"
    ASOLARIA_GUARDIAN_RISK_THRESHOLD = "critical"
    ASOLARIA_GUARDIAN_AUTO_BLOCK_CRITICAL = "false"
    ASOLARIA_GUARDIAN_REQUIRE_OWNER_FOR_CRITICAL = "false"
    ASOLARIA_CONNECTION_PREFERENCE = "vpn,usb,private_internet,public_internet"
    ASOLARIA_CONNECTION_AVAILABLE = "usb,vpn,private_internet,public_internet"
    ASOLARIA_ALLOW_PUBLIC_INTERNET = "true"
    ASOLARIA_PUBLIC_INTERNET_IS_PRIVATE = "true"
    ASOLARIA_REMOTE_APPROVAL_BASE_URL = "http://127.0.0.1:4781"
    ASOLARIA_NETWORK_REMOTE_AUTH_REQUIRED = "true"
    ASOLARIA_NETWORK_REQUIRE_ENCRYPTED_REMOTE = "true"
    ASOLARIA_NETWORK_STEALTH_DENY = "true"
  }

  foreach ($name in $defaults.Keys) {
    $current = [Environment]::GetEnvironmentVariable($name, "Process")
    if ([string]::IsNullOrWhiteSpace($current)) {
      Set-Item -Path ("Env:{0}" -f $name) -Value $defaults[$name]
    }
  }
}

function Test-IsAdmin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-Elevated {
  if (Test-IsAdmin) {
    return
  }

  $argList = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$PSCommandPath`"",
    "-Port", "$Port"
  )
  if ($OpenBrowser.IsPresent) {
    $argList += "-OpenBrowser"
  }

  Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $argList | Out-Null
  exit 0
}

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-ServerProcess {
  $root = Get-AsolariaRoot
  try {
    return Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
      Where-Object { $_.CommandLine -like "*$root*server.js*" }
  } catch {
    return @()
  }
}

function Test-AppHealth {
  param(
    [int]$Port,
    [int]$TimeoutSec = 2
  )
  try {
    $null = Invoke-RestMethod -Uri ("http://localhost:{0}/api/health" -f $Port) -TimeoutSec $TimeoutSec
    return $true
  } catch {
    return $false
  }
}

function Stop-ServerProcesses {
  param([array]$Processes)
  $rows = @($Processes)
  if ($rows.Count -lt 1) {
    return @()
  }
  $stopped = @()
  foreach ($proc in $rows) {
    $procId = 0
    try { $procId = [int]$proc.ProcessId } catch { $procId = 0 }
    if ($procId -lt 1) { continue }
    try {
      Stop-Process -Id $procId -Force -ErrorAction Stop
      $stopped += $procId
    } catch {
      Write-Warning "Failed to stop existing Asolaria PID ${procId}: $($_.Exception.Message)"
    }
  }
  return $stopped
}

function Resolve-NodePath {
  try {
    $cmd = Get-Command node -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {
    # continue
  }

  $candidates = @(
    "C:\nvm4w\nodejs\node.exe",
    "C:\Program Files\nodejs\node.exe"
  )
  foreach ($path in $candidates) {
    if (Test-Path $path) {
      return $path
    }
  }
  return $null
}

function Start-ServerIfNeeded {
  param([int]$Port)
  $root = Get-AsolariaRoot
  $serverEntry = Join-Path $root "server.js"
  $existing = @(Get-ServerProcess)
  if ($existing.Count -gt 0) {
    if (Test-AppHealth -Port $Port -TimeoutSec 2) {
      return [int]$existing[0].ProcessId
    }
    [void](Stop-ServerProcesses -Processes $existing)
    Start-Sleep -Milliseconds 500
  }

  $nodePath = Resolve-NodePath
  if (-not $nodePath) {
    throw "Node executable not found. Ensure Node.js is installed and available on PATH for elevated PowerShell."
  }

  $logDir = Join-Path $root "logs"
  New-Item -Path $logDir -ItemType Directory -Force | Out-Null
  $stdoutLog = Join-Path $logDir "server.out.log"
  $stderrLog = Join-Path $logDir "server.err.log"

  $proc = Start-Process -FilePath $nodePath `
    -ArgumentList "`"$serverEntry`"" `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog

  return [int]$proc.Id
}

function Wait-ForHealth {
  param([int]$Seconds = 35)

  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $null = Invoke-RestMethod -Uri ("http://localhost:{0}/api/health" -f $Port) -TimeoutSec 2
      return $true
    } catch {
      Start-Sleep -Milliseconds 700
    }
  }
  return $false
}

function Open-Ui {
  $url = "http://localhost:$Port"
  Start-Process $url | Out-Null
}

function Ensure-HttpsCert {
  $scriptPath = Join-Path $PSScriptRoot "Ensure-Asolaria-HttpsCert.ps1"
  if (Test-Path $scriptPath) {
    try {
      & $scriptPath | Out-Null
    } catch {
      Write-Warning ("HTTPS certificate setup failed: " + $_.Exception.Message)
    }
  }
}

Ensure-Elevated
Set-AsolariaProcessEnvDefaults
Ensure-HttpsCert
$serverPid = Start-ServerIfNeeded -Port $Port
$healthy = Wait-ForHealth

if (-not $healthy) {
  throw "Asolaria failed to become healthy on port $Port. PID=$serverPid"
}

if ($OpenBrowser.IsPresent) {
  Open-Ui
}
