param(
  [int]$Port = 4791,
  [int]$HttpsPort = 5444,
  [string]$InstanceRoot = "$env:USERPROFILE\Asolaria-PublicRuntime",
  [switch]$OpenBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-InstanceFolders {
  param([string]$RootPath)
  foreach ($name in @("data", "captures", "logs")) {
    $target = Join-Path $RootPath $name
    New-Item -Path $target -ItemType Directory -Force | Out-Null
  }
}

function Set-PublicProcessEnv {
  param(
    [string]$RootPath,
    [int]$HttpPort,
    [int]$TlsPort
  )

  $defaults = [ordered]@{
    ASOLARIA_PROFILE = "public"
    ASOLARIA_PUBLIC_MODE = "true"
    ASOLARIA_INSTANCE_ROOT = $RootPath
    ASOLARIA_PORT = "$HttpPort"
    ASOLARIA_HTTPS_PORT = "$TlsPort"
    ASOLARIA_APPROVAL_MODE = "manual"
    ASOLARIA_APPROVAL_PREFERENCE = "balanced"
    ASOLARIA_NOTEBOOK_AUTO_MODE = "off"
    ASOLARIA_OPENCLAW_MODE = "disabled"
    ASOLARIA_ALLOW_EXTERNAL_POSTING = "false"
    ASOLARIA_GUARDIAN_MODE = "strict"
    ASOLARIA_GUARDIAN_PRESET = "empty"
    ASOLARIA_GUARDIAN_ALERTS_ENABLED = "false"
    ASOLARIA_GUARDIAN_RISK_THRESHOLD = "critical"
    ASOLARIA_GUARDIAN_AUTO_BLOCK_CRITICAL = "true"
    ASOLARIA_GUARDIAN_REQUIRE_OWNER_FOR_CRITICAL = "true"
    ASOLARIA_LOCAL_OPS_ENABLED = "false"
    ASOLARIA_BROWSER_TASKS_ENABLED = "false"
    ASOLARIA_SLACK_ENABLED = "false"
    ASOLARIA_GITHUB_ENABLED = "false"
    ASOLARIA_GOOGLE_ENABLED = "false"
    ASOLARIA_GCP_ENABLED = "false"
    ASOLARIA_VERTEX_ENABLED = "false"
    ASOLARIA_CONNECTION_PREFERENCE = "private_internet,vpn,usb"
    ASOLARIA_CONNECTION_AVAILABLE = "private_internet,vpn,usb"
    ASOLARIA_ALLOW_PUBLIC_INTERNET = "false"
    ASOLARIA_PUBLIC_INTERNET_IS_PRIVATE = "false"
    ASOLARIA_REMOTE_APPROVAL_BASE_URL = ""
    ASOLARIA_NETWORK_REMOTE_AUTH_REQUIRED = "true"
    ASOLARIA_NETWORK_REQUIRE_ENCRYPTED_REMOTE = "true"
    ASOLARIA_NETWORK_STEALTH_DENY = "true"
    ASOLARIA_CODEX_WEB_SEARCH = "false"
    ASOLARIA_STARTUP_AUTORUN = "false"
  }

  foreach ($name in $defaults.Keys) {
    Set-Item -Path ("Env:{0}" -f $name) -Value $defaults[$name]
  }
}

function Test-Health {
  param([int]$HttpPort)
  try {
    $resp = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/health" -f $HttpPort) -TimeoutSec 2
    return [bool]$resp.ok
  } catch {
    return $false
  }
}

function Wait-ForHealth {
  param(
    [int]$HttpPort,
    [int]$Seconds = 35
  )
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Health -HttpPort $HttpPort) {
      return $true
    }
    Start-Sleep -Milliseconds 700
  }
  return $false
}

function Start-PublicServerIfNeeded {
  param(
    [string]$RootPath,
    [int]$HttpPort
  )

  if (Test-Health -HttpPort $HttpPort) {
    return 0
  }

  $nodePath = Resolve-NodePath
  if (-not $nodePath) {
    throw "Node executable not found."
  }

  $asolariaRoot = Get-AsolariaRoot
  $serverEntry = Join-Path $asolariaRoot "server.js"
  $logsDir = Join-Path $RootPath "logs"
  New-Item -Path $logsDir -ItemType Directory -Force | Out-Null
  $stdoutLog = Join-Path $logsDir "public-server.out.log"
  $stderrLog = Join-Path $logsDir "public-server.err.log"

  $proc = Start-Process -FilePath $nodePath `
    -ArgumentList "`"$serverEntry`"" `
    -WorkingDirectory $asolariaRoot `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog

  return $proc.Id
}

$resolvedRoot = [System.IO.Path]::GetFullPath($InstanceRoot)
Ensure-InstanceFolders -RootPath $resolvedRoot
Set-PublicProcessEnv -RootPath $resolvedRoot -HttpPort $Port -TlsPort $HttpsPort
$serverPid = Start-PublicServerIfNeeded -RootPath $resolvedRoot -HttpPort $Port
$healthy = Wait-ForHealth -HttpPort $Port
if (-not $healthy) {
  throw "Public profile failed to become healthy on port $Port. PID=$serverPid"
}

if ($OpenBrowser.IsPresent) {
  Start-Process ("http://127.0.0.1:{0}" -f $Port) | Out-Null
}

Write-Host ("Public Asolaria is running.")
Write-Host ("HTTP: http://127.0.0.1:{0}" -f $Port)
Write-Host ("Instance root: {0}" -f $resolvedRoot)
