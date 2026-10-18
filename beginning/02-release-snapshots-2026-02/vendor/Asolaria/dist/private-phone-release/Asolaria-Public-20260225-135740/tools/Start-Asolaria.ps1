param(
  [int]$Port = 4781,
  [switch]$OpenBrowser,
  [switch]$RequireInternet,
  [int]$NetworkBootstrapMaxWaitSeconds = 120,
  [string]$TrustedWifiProfiles = "",
  [switch]$SkipNetworkBootstrap
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Set-AsolariaProcessEnvDefaults {
  function Resolve-PreferredEnvValue {
    param(
      [string]$Name,
      [string]$DefaultValue
    )
    $userValue = [Environment]::GetEnvironmentVariable($Name, "User")
    if (-not [string]::IsNullOrWhiteSpace([string]$userValue)) {
      return [string]$userValue
    }
    $machineValue = [Environment]::GetEnvironmentVariable($Name, "Machine")
    if (-not [string]::IsNullOrWhiteSpace([string]$machineValue)) {
      return [string]$machineValue
    }
    return [string]$DefaultValue
  }

  $defaults = [ordered]@{
    ASOLARIA_APPROVAL_MODE = "smart"
    ASOLARIA_APPROVAL_PREFERENCE = "pay_priority"
    ASOLARIA_APPROVAL_WAIT_MS = "30000"
    ASOLARIA_NOTEBOOK_AUTO_MODE = "auto"
    ASOLARIA_CODEX_WEB_SEARCH = "true"
    # OpenClaw is intentionally disabled by default; Asolaria-native skills/connectors should be used instead.
    ASOLARIA_OPENCLAW_MODE = "disabled"
    ASOLARIA_GUARDIAN_MODE = "off"
    ASOLARIA_GUARDIAN_ALERTS_ENABLED = "false"
    ASOLARIA_GUARDIAN_RISK_THRESHOLD = "critical"
    ASOLARIA_GUARDIAN_AUTO_BLOCK_CRITICAL = "false"
    ASOLARIA_GUARDIAN_REQUIRE_OWNER_FOR_CRITICAL = "false"
    ASOLARIA_CONNECTION_PREFERENCE = "usb,vpn,private_internet,public_internet"
    ASOLARIA_CONNECTION_AVAILABLE = "usb,vpn,private_internet,public_internet"
    ASOLARIA_ALLOW_PUBLIC_INTERNET = "true"
    ASOLARIA_PUBLIC_INTERNET_IS_PRIVATE = "true"
    ASOLARIA_UI_CHROME_EMAIL = "plasmatoid@gmail.com"
    ASOLARIA_NETWORK_REMOTE_AUTH_REQUIRED = "false"
    ASOLARIA_NETWORK_REQUIRE_ENCRYPTED_REMOTE = "true"
    ASOLARIA_NETWORK_STEALTH_DENY = "true"
    ASOLARIA_HTTPS_ENABLE = "true"
    ASOLARIA_HTTPS_PORT = "5443"
  }

  foreach ($name in $defaults.Keys) {
    $current = [Environment]::GetEnvironmentVariable($name, "Process")
    if ([string]::IsNullOrWhiteSpace($current)) {
      Set-Item -Path ("Env:{0}" -f $name) -Value $defaults[$name]
    }
  }

  # Keep HTTPS startup behavior stable even when running from shells with stale process-level env values.
  Set-Item -Path "Env:ASOLARIA_HTTPS_ENABLE" -Value (Resolve-PreferredEnvValue -Name "ASOLARIA_HTTPS_ENABLE" -DefaultValue "true")
  Set-Item -Path "Env:ASOLARIA_HTTPS_PORT" -Value (Resolve-PreferredEnvValue -Name "ASOLARIA_HTTPS_PORT" -DefaultValue "5443")
  Set-Item -Path "Env:ASOLARIA_REMOTE_APPROVAL_BASE_URL" -Value (Resolve-PreferredEnvValue -Name "ASOLARIA_REMOTE_APPROVAL_BASE_URL" -DefaultValue "")
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
    "-Port", "$Port",
    "-NetworkBootstrapMaxWaitSeconds", "$NetworkBootstrapMaxWaitSeconds"
  )
  if ($OpenBrowser.IsPresent) {
    $argList += "-OpenBrowser"
  }
  if ($RequireInternet.IsPresent) {
    $argList += "-RequireInternet"
  }
  if ($SkipNetworkBootstrap.IsPresent) {
    $argList += "-SkipNetworkBootstrap"
  }
  if (-not [string]::IsNullOrWhiteSpace($TrustedWifiProfiles)) {
    $argList += @("-TrustedWifiProfiles", "$TrustedWifiProfiles")
  }

  Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $argList | Out-Null
  exit 0
}

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Open-AsolariaUiUrl {
  param(
    [string]$Url
  )

  $launcher = Join-Path $PSScriptRoot "Open-Asolaria-Ui.ps1"
  if (-not (Test-Path -LiteralPath $launcher)) {
    throw ("UI launcher helper not found: " + $launcher)
  }
  return (& $launcher -Url $Url)
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

function Get-CurrentSessionId {
  try {
    return [int][System.Diagnostics.Process]::GetCurrentProcess().SessionId
  } catch {
    return -1
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
  $currentSessionId = Get-CurrentSessionId
  $sessionMismatch = $false
  if ($currentSessionId -gt 0 -and $existing.Count -gt 0) {
    $sessionRows = @()
    foreach ($row in $existing) {
      $rowSession = -1
      try { $rowSession = [int]$row.SessionId } catch { $rowSession = -1 }
      if ($rowSession -eq $currentSessionId) {
        $sessionRows += $row
      }
    }
    $sessionMismatch = ($sessionRows.Count -lt 1)
  }
  if ($existing.Count -gt 0) {
    if ((Test-AppHealth -Port $Port -TimeoutSec 2) -and -not $sessionMismatch) {
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
  try {
    $launch = Open-AsolariaUiUrl -Url $url
    if ($launch -and $launch.ok) {
      Write-Host ("UI launch profile: " + [string]$launch.profileDirectory + " (" + [string]$launch.profileEmail + ")")
    }
  } catch {
    Write-Warning ("Failed to auto-open UI with managed Chrome profile: " + $_.Exception.Message)
  }
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

function Ensure-NetworkBootstrap {
  param(
    [string]$RepoRoot,
    [int]$MaxWaitSeconds,
    [string]$TrustedProfiles
  )

  $bridgeRoot = Join-Path (Split-Path -Parent $RepoRoot) "codex-bridge"
  if (-not (Test-Path -LiteralPath $bridgeRoot)) {
    return [pscustomobject]@{
      ok = $false
      reason = "bridge_root_missing"
      details = ""
      connectAttempts = 0
      connectedProfile = ""
    }
  }

  $networkScript = Join-Path $bridgeRoot "Ensure-NetworkReady.ps1"
  if (-not (Test-Path -LiteralPath $networkScript)) {
    return [pscustomobject]@{
      ok = $false
      reason = "network_script_missing"
      details = ""
      connectAttempts = 0
      connectedProfile = ""
    }
  }

  $profilesFile = Join-Path $bridgeRoot "trusted-wifi-networks.txt"
  $safeMaxWait = [Math]::Max(0, [Math]::Min(600, $MaxWaitSeconds))

  try {
    $result = & $networkScript `
      -TrustedProfiles $TrustedProfiles `
      -TrustedProfilesFile $profilesFile `
      -MaxWaitSeconds $safeMaxWait `
      -ProbeIntervalSeconds 4 `
      -ConnectRetrySeconds 12 `
      -Quiet

    if ($result -is [System.Array]) {
      if ($result.Length -gt 0) {
        $result = $result[$result.Length - 1]
      } else {
        $result = $null
      }
    }

    if ($null -eq $result) {
      return [pscustomobject]@{
        ok = $false
        reason = "network_script_no_result"
        details = ""
        connectAttempts = 0
        connectedProfile = ""
      }
    }

    return [pscustomobject]@{
      ok = [bool]$result.ok
      reason = [string]$result.reason
      details = [string]$result.lastConnectOutput
      connectAttempts = [int]$result.connectAttempts
      connectedProfile = [string]$result.connectedProfile
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      reason = "network_script_exception"
      details = $_.Exception.Message
      connectAttempts = 0
      connectedProfile = ""
    }
  }
}

Ensure-Elevated
Set-AsolariaProcessEnvDefaults
Ensure-HttpsCert
$repoRoot = Get-AsolariaRoot
if (-not $SkipNetworkBootstrap.IsPresent) {
  $networkWait = if ($RequireInternet.IsPresent) {
    $NetworkBootstrapMaxWaitSeconds
  } else {
    [Math]::Min($NetworkBootstrapMaxWaitSeconds, 20)
  }
  $networkBootstrap = Ensure-NetworkBootstrap `
    -RepoRoot $repoRoot `
    -MaxWaitSeconds $networkWait `
    -TrustedProfiles $TrustedWifiProfiles
  if (-not $networkBootstrap.ok -and $RequireInternet.IsPresent) {
    throw ("Network bootstrap failed before Start-Asolaria: reason={0}; attempts={1}; profile={2}; details={3}" -f `
      [string]$networkBootstrap.reason,
      [string]$networkBootstrap.connectAttempts,
      [string]$networkBootstrap.connectedProfile,
      [string]$networkBootstrap.details)
  }
}
$serverPid = Start-ServerIfNeeded -Port $Port
$healthy = Wait-ForHealth

if (-not $healthy) {
  throw "Asolaria failed to become healthy on port $Port. PID=$serverPid"
}

if ($OpenBrowser.IsPresent) {
  Open-Ui
}
