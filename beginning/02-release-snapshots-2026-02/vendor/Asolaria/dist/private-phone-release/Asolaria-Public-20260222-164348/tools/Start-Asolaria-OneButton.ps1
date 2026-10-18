param(
  [int]$Port = 4781,
  [switch]$StartupMode,
  [switch]$OpenPhoneDashboard,
  [switch]$StartProMirror,
  [switch]$HelpRecovery,
  [switch]$ForceReconnect,
  [switch]$SkipAutoStartupInstall,
  [switch]$SkipPublicTunnelKeeper,
  [switch]$SkipTunnelMonitor,
  [switch]$NoUi
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

  $argList = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$PSCommandPath`"",
    "-Port", "$Port"
  )
  if ($StartupMode.IsPresent) { $argList += "-StartupMode" }
  if ($OpenPhoneDashboard.IsPresent) { $argList += "-OpenPhoneDashboard" }
  if ($StartProMirror.IsPresent) { $argList += "-StartProMirror" }
  if ($HelpRecovery.IsPresent) { $argList += "-HelpRecovery" }
  if ($ForceReconnect.IsPresent) { $argList += "-ForceReconnect" }
  if ($SkipAutoStartupInstall.IsPresent) { $argList += "-SkipAutoStartupInstall" }
  if ($SkipPublicTunnelKeeper.IsPresent) { $argList += "-SkipPublicTunnelKeeper" }
  if ($SkipTunnelMonitor.IsPresent) { $argList += "-SkipTunnelMonitor" }
  if ($NoUi.IsPresent) { $argList += "-NoUi" }

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

function Ensure-Dir {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Path cannot be empty."
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Set-ConnectionEnvDefaults {
  $desired = [ordered]@{
    ASOLARIA_CONNECTION_PREFERENCE = "usb,vpn,private_internet,public_internet"
    ASOLARIA_CONNECTION_AVAILABLE = "usb,vpn,private_internet,public_internet"
    ASOLARIA_ALLOW_PUBLIC_INTERNET = "true"
    ASOLARIA_PUBLIC_INTERNET_IS_PRIVATE = "true"
    ASOLARIA_UI_CHROME_EMAIL = "plasmatoid@gmail.com"
  }

  foreach ($name in $desired.Keys) {
    [Environment]::SetEnvironmentVariable($name, [string]$desired[$name], "Process")
  }

  $processRemoteBase = [string][Environment]::GetEnvironmentVariable("ASOLARIA_REMOTE_APPROVAL_BASE_URL", "Process")
  if ([string]::IsNullOrWhiteSpace($processRemoteBase)) {
    $userRemoteBase = [string][Environment]::GetEnvironmentVariable("ASOLARIA_REMOTE_APPROVAL_BASE_URL", "User")
    if ([string]::IsNullOrWhiteSpace($userRemoteBase)) {
      $userRemoteBase = [string][Environment]::GetEnvironmentVariable("ASOLARIA_REMOTE_APPROVAL_BASE_URL", "Machine")
    }
    if (-not [string]::IsNullOrWhiteSpace($userRemoteBase)) {
      [Environment]::SetEnvironmentVariable("ASOLARIA_REMOTE_APPROVAL_BASE_URL", $userRemoteBase, "Process")
    }
  }
}

function Ensure-PersistentRoutingDefaults {
  [Environment]::SetEnvironmentVariable(
    "ASOLARIA_CONNECTION_PREFERENCE",
    "usb,vpn,private_internet,public_internet",
    "User"
  )
  [Environment]::SetEnvironmentVariable(
    "ASOLARIA_CONNECTION_AVAILABLE",
    "usb,vpn,private_internet,public_internet",
    "User"
  )
}

function Get-ListeningProcessIds {
  $ids = @()
  try {
    $rows = Get-NetTCPConnection -State Listen -ErrorAction Stop |
      Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($value in @($rows)) {
      $num = 0
      if ([int]::TryParse([string]$value, [ref]$num) -and $num -gt 0) {
        $ids += $num
      }
    }
  } catch {
    # ignore probe failures; cleanup falls back to command line rules only
  }
  return @($ids | Select-Object -Unique)
}

function Stop-StaleNodeWorkers {
  param(
    [int[]]$ProtectedPids = @()
  )

  $result = [ordered]@{
    ok = $true
    inspected = 0
    candidates = 0
    stopped = @()
    failed = @()
  }

  $listeningPids = @(Get-ListeningProcessIds)
  $nodeRows = @()
  try {
    $nodeRows = @(Get-CimInstance Win32_Process -Filter "name='node.exe'" -ErrorAction Stop)
  } catch {
    return [pscustomobject]$result
  }

  foreach ($row in $nodeRows) {
    $result.inspected = [int]$result.inspected + 1
    $procId = [int]$row.ProcessId
    if ($ProtectedPids -contains $procId) { continue }
    if ($listeningPids -contains $procId) { continue }

    $cmdLine = [string]$row.CommandLine
    $normalized = ($cmdLine -replace "\s+", " ").Trim()
    if ([string]::IsNullOrWhiteSpace($normalized)) { continue }

    if ($normalized -match '(?i)^".*\\node\.exe"\s*$') {
      $result.candidates = [int]$result.candidates + 1
      try {
        Stop-Process -Id $procId -Force -ErrorAction Stop
        $result.stopped += $procId
      } catch {
        $result.ok = $false
        $result.failed += ("{0}:{1}" -f $procId, $_.Exception.Message)
      }
    }
  }

  return [pscustomobject]$result
}

function Convert-WmiDateToDateTime {
  param(
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }

  try {
    return [System.Management.ManagementDateTimeConverter]::ToDateTime($Value)
  } catch {
    return $null
  }
}

function Stop-StaleBrowserWorkers {
  param(
    [int[]]$ProtectedPids = @(),
    [int]$MinAgeMinutes = 20
  )

  $result = [ordered]@{
    ok = $true
    inspected = 0
    candidates = 0
    stopped = @()
    failed = @()
  }

  $tempRoot = [string][System.IO.Path]::GetTempPath()
  if ([string]::IsNullOrWhiteSpace($tempRoot)) {
    $tempRoot = [string]$env:TEMP
  }
  $tempRoot = $tempRoot.TrimEnd("\")
  $tempLower = $tempRoot.ToLowerInvariant()
  $now = Get-Date

  $rows = @()
  try {
    $rows = @(
      Get-CimInstance Win32_Process -ErrorAction Stop |
        Where-Object { $_.Name -in @("chrome.exe", "msedge.exe") }
    )
  } catch {
    return [pscustomobject]$result
  }

  foreach ($row in $rows) {
    $result.inspected = [int]$result.inspected + 1
    $procId = [int]$row.ProcessId
    if ($ProtectedPids -contains $procId) { continue }

    $cmdLine = [string]$row.CommandLine
    if ([string]::IsNullOrWhiteSpace($cmdLine)) { continue }
    $normalized = ($cmdLine -replace "\s+", " ").Trim()
    $lower = $normalized.ToLowerInvariant()

    $isManagedTempProfile = $lower.Contains($tempLower + "\asolaria-chrome\") -or $lower.Contains($tempLower + "\playwright_")
    if (-not $isManagedTempProfile) { continue }

    # Kill root automation browsers only (utility/renderer children are tied to root).
    if ($lower -match "--type=") { continue }

    $isAutomation = $lower.Contains("--headless") -or $lower.Contains("--remote-debugging-pipe") -or $lower.Contains("--no-startup-window")
    if (-not $isAutomation) { continue }

    $parentId = [int]$row.ParentProcessId
    $parentAlive = $false
    if ($parentId -gt 0) {
      try {
        $null = Get-Process -Id $parentId -ErrorAction Stop
        $parentAlive = $true
      } catch {
        $parentAlive = $false
      }
    }
    if ($parentAlive) { continue }

    $createdAt = Convert-WmiDateToDateTime -Value ([string]$row.CreationDate)
    if ($createdAt -ne $null) {
      $ageMinutes = [double](New-TimeSpan -Start $createdAt -End $now).TotalMinutes
      if ($ageMinutes -lt [double][Math]::Max(1, $MinAgeMinutes)) {
        continue
      }
    }

    $result.candidates = [int]$result.candidates + 1
    try {
      Stop-Process -Id $procId -Force -ErrorAction Stop
      $result.stopped += $procId
    } catch {
      $result.ok = $false
      $result.failed += ("{0}:{1}" -f $procId, $_.Exception.Message)
    }
  }

  return [pscustomobject]$result
}

function Ensure-AutoStartupTask {
  param(
    [string]$RepoRoot
  )

  $scriptPath = Join-Path $RepoRoot "tools\Start-Asolaria-OneButton.ps1"
  if (-not (Test-Path -LiteralPath $scriptPath)) {
    throw "One-button script not found: $scriptPath"
  }

  $taskName = "Asolaria One Button Startup"
  $userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $argString = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -Port $Port -StartupMode -SkipAutoStartupInstall"

  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argString
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
  $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

  Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Force | Out-Null

  return [pscustomobject]@{
    ok = $true
    mode = "scheduled_task"
    target = $taskName
    details = "Registered for logon with highest privileges."
  }
}

function Ensure-AutoStartupShortcut {
  param(
    [string]$RepoRoot
  )

  $startupPath = [Environment]::GetFolderPath("Startup")
  Ensure-Dir -Path $startupPath

  $targetPath = Join-Path $RepoRoot "Start-Asolaria-OneButton.cmd"
  if (-not (Test-Path -LiteralPath $targetPath)) {
    throw "One-button command not found: $targetPath"
  }

  $shortcutPath = Join-Path $startupPath "Asolaria One Button Startup.lnk"
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $targetPath
  $shortcut.Arguments = "-StartupMode -SkipAutoStartupInstall"
  $shortcut.WorkingDirectory = $RepoRoot
  $shortcut.Description = "Auto-start Asolaria one-button flow at logon."
  $shortcut.Save()

  return [pscustomobject]@{
    ok = $true
    mode = "startup_shortcut"
    target = $shortcutPath
    details = "Created Startup folder shortcut."
  }
}

function Ensure-AutoStartup {
  param(
    [string]$RepoRoot
  )

  try {
    return Ensure-AutoStartupTask -RepoRoot $RepoRoot
  } catch {
    try {
      return Ensure-AutoStartupShortcut -RepoRoot $RepoRoot
    } catch {
      return [pscustomobject]@{
        ok = $false
        mode = "none"
        target = ""
        details = $_.Exception.Message
      }
    }
  }
}

function Wait-ForHealth {
  param(
    [int]$Seconds = 45
  )

  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $null = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/health" -f $Port) -TimeoutSec 3
      return $true
    } catch {
      Start-Sleep -Milliseconds 800
    }
  }
  return $false
}

function Test-ServerHealthy {
  try {
    $health = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/health" -f $Port) -TimeoutSec 3
    return [pscustomobject]@{
      ok = $true
      health = $health
      error = ""
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      health = $null
      error = $_.Exception.Message
    }
  }
}

function Test-GatewayHealthy {
  try {
    $null = Invoke-RestMethod -Uri "http://127.0.0.1:4791/health" -TimeoutSec 2
    return $true
  } catch {
    return $false
  }
}

function Resolve-NodePath {
  try {
    $cmd = Get-Command node -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {
    # continue
  }

  foreach ($candidate in @("C:\nvm4w\nodejs\node.exe", "C:\Program Files\nodejs\node.exe")) {
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  return ""
}

function Get-GatewayProcess {
  param([string]$GatewayScriptPath)

  if ([string]::IsNullOrWhiteSpace($GatewayScriptPath)) {
    return @()
  }
  $needle = $GatewayScriptPath.Replace("\", "\\")
  try {
    return @(
      Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
        Where-Object { $_.CommandLine -like "*$needle*" }
    )
  } catch {
    return @()
  }
}

function Ensure-GatewayControlPlane {
  param(
    [string]$RepoRoot,
    [int]$TimeoutSeconds = 20
  )

  $state = [ordered]@{
    ok = $true
    started = $false
    running = $false
    pid = 0
    reason = ""
  }

  if (Test-GatewayHealthy) {
    $state.running = $true
    $state.reason = "already_healthy"
    return [pscustomobject]$state
  }

  $gatewayScript = Join-Path $RepoRoot "src\gateway\server.js"
  if (-not (Test-Path -LiteralPath $gatewayScript)) {
    $state.ok = $false
    $state.reason = "gateway_script_missing"
    return [pscustomobject]$state
  }

  $setupScript = Join-Path $PSScriptRoot "Setup-Asolaria-Rebuild.ps1"
  if (Test-Path -LiteralPath $setupScript) {
    try {
      & $setupScript | Out-Null
    } catch {
      # Non-fatal here; gateway may still boot with existing token.
    }
  }

  $existing = @(Get-GatewayProcess -GatewayScriptPath $gatewayScript)
  if ($existing.Count -gt 0) {
    try {
      $state.pid = [int]$existing[0].ProcessId
    } catch {
      $state.pid = 0
    }
  } else {
    $nodePath = Resolve-NodePath
    if ([string]::IsNullOrWhiteSpace($nodePath)) {
      $state.ok = $false
      $state.reason = "node_not_found"
      return [pscustomobject]$state
    }

    $logDir = Join-Path $RepoRoot "logs"
    Ensure-Dir -Path $logDir
    try {
      $proc = Start-Process -FilePath $nodePath `
        -ArgumentList "`"$gatewayScript`"" `
        -WorkingDirectory (Split-Path -Parent $gatewayScript) `
        -WindowStyle Hidden `
        -PassThru `
        -RedirectStandardOutput (Join-Path $logDir "gateway.out.log") `
        -RedirectStandardError (Join-Path $logDir "gateway.err.log")
      $state.started = $true
      $state.pid = [int]$proc.Id
    } catch {
      $state.ok = $false
      $state.reason = ("gateway_start_failed: " + $_.Exception.Message)
      return [pscustomobject]$state
    }
  }

  $deadline = (Get-Date).AddSeconds([Math]::Max(5, [Math]::Min(60, $TimeoutSeconds)))
  while ((Get-Date) -lt $deadline) {
    if (Test-GatewayHealthy) {
      $state.running = $true
      $state.reason = if ($state.started) { "started" } else { "healthy_after_wait" }
      return [pscustomobject]$state
    }
    Start-Sleep -Milliseconds 500
  }

  $state.ok = $false
  $state.running = $false
  $state.reason = "gateway_health_timeout"
  return [pscustomobject]$state
}

function Resolve-AdbPath {
  try {
    $cmd = Get-Command adb -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {
    # continue
  }

  $candidates = @(
    "C:\Users\acer\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "C:\Android\platform-tools\adb.exe",
    "C:\platform-tools\adb.exe",
    "C:\Program Files\Android\platform-tools\adb.exe",
    "C:\Users\acer\AppData\Local\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe"
  )
  foreach ($path in $candidates) {
    if (Test-Path -LiteralPath $path) {
      return $path
    }
  }
  return ""
}

function Invoke-HelpRecovery {
  param(
    [string]$RepoRoot
  )

  $out = [ordered]@{
    requested = $HelpRecovery.IsPresent
    ok = $true
    windowsPath = "active"
    wslDetected = $false
    wslDistros = @()
    adbFound = $false
    adbAuthorizedDeviceCount = 0
    termuxLaunch = "skipped"
    fdroidLaunch = "skipped"
    smokeOk = $false
    smokeReason = "not_run"
    details = @()
  }

  $wslPath = "C:\Windows\System32\wsl.exe"
  if (Test-Path -LiteralPath $wslPath) {
    $out.wslDetected = $true
    try {
      $distros = & $wslPath -l -q 2>$null
      $rows = @(
        $distros |
          ForEach-Object { ([string]$_ -replace ([string][char]0), "").Trim() } |
          Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
      )
      $out.wslDistros = $rows
    } catch {
      $out.details += ("wsl_probe_failed: " + $_.Exception.Message)
    }
  }

  $adbPath = Resolve-AdbPath
  if ($adbPath) {
    $out.adbFound = $true
    try {
      & $adbPath start-server | Out-Null
      $devices = & $adbPath devices
      foreach ($line in @($devices)) {
        if ([string]$line -match "^\S+\s+device$") {
          $out.adbAuthorizedDeviceCount = [int]$out.adbAuthorizedDeviceCount + 1
        }
      }
    } catch {
      $out.details += ("adb_probe_failed: " + $_.Exception.Message)
    }

    if ($out.adbAuthorizedDeviceCount -gt 0) {
      try {
        & $adbPath shell monkey -p com.termux -c android.intent.category.LAUNCHER 1 | Out-Null
        $out.termuxLaunch = "ok"
      } catch {
        $out.termuxLaunch = ("failed: " + $_.Exception.Message)
        $out.ok = $false
      }
      try {
        & $adbPath shell monkey -p org.fdroid.fdroid -c android.intent.category.LAUNCHER 1 | Out-Null
        $out.fdroidLaunch = "ok"
      } catch {
        $out.fdroidLaunch = ("failed: " + $_.Exception.Message)
      }
    }
  } else {
    $out.details += "adb_not_found"
  }

  $smokeScript = Join-Path $RepoRoot "tools\Test-Asolaria-PhoneTunnelPath.ps1"
  if (Test-Path -LiteralPath $smokeScript) {
    try {
      $smokeOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $smokeScript `
        -BaseUrl ("http://127.0.0.1:{0}" -f $Port) `
        -Channel usb
      $smokeJson = [string](@($smokeOutput) -join [Environment]::NewLine)
      $smoke = $smokeJson | ConvertFrom-Json -ErrorAction Stop
      $out.smokeOk = [bool]$smoke.ok
      $out.smokeReason = if ($smoke.ok) { "ok" } else { "failed" }
      if (-not $smoke.ok) {
        $out.ok = $false
      }
    } catch {
      $out.smokeOk = $false
      $out.smokeReason = ("smoke_exception: " + $_.Exception.Message)
      $out.ok = $false
    }
  } else {
    $out.details += "smoke_script_missing"
  }

  return [pscustomobject]$out
}

function Get-MobileBootstrap {
  param(
    [int]$Attempts = 8
  )

  for ($i = 0; $i -lt $Attempts; $i++) {
    try {
      return Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/mobile/bootstrap" -f $Port) -TimeoutSec 4
    } catch {
      Start-Sleep -Milliseconds 650
    }
  }
  throw "Could not retrieve /api/mobile/bootstrap."
}

function Update-MobileConnections {
  param(
    [string]$Token,
    [string]$RemoteBaseUrl = ""
  )

  if ([string]::IsNullOrWhiteSpace($Token)) {
    return [pscustomobject]@{
      ok = $false
      error = "missing_mobile_token"
    }
  }

  $resolvedRemoteBaseUrl = [string]$RemoteBaseUrl
  if ([string]::IsNullOrWhiteSpace($resolvedRemoteBaseUrl)) {
    $resolvedRemoteBaseUrl = [string][Environment]::GetEnvironmentVariable("ASOLARIA_REMOTE_APPROVAL_BASE_URL", "Process")
  }
  if ([string]::IsNullOrWhiteSpace($resolvedRemoteBaseUrl)) {
    $resolvedRemoteBaseUrl = [string][Environment]::GetEnvironmentVariable("ASOLARIA_REMOTE_APPROVAL_BASE_URL", "User")
  }
  if ([string]::IsNullOrWhiteSpace($resolvedRemoteBaseUrl)) {
    $resolvedRemoteBaseUrl = [string][Environment]::GetEnvironmentVariable("ASOLARIA_REMOTE_APPROVAL_BASE_URL", "Machine")
  }
  $resolvedRemoteBaseUrl = [string]$resolvedRemoteBaseUrl

  $headers = @{ "x-asolaria-mobile-token" = [string]$Token }
  $payload = [ordered]@{
    preference = @("usb", "vpn", "private_internet", "public_internet")
    available = @("usb", "vpn", "private_internet", "public_internet")
    allowPublicInternet = $true
    publicInternetPrivate = $true
    remoteAuthRequired = $true
    requireEncryptedRemote = $true
    stealthDeny = $true
  }
  # Preserve existing remote routing unless we have an explicit replacement URL.
  if (-not [string]::IsNullOrWhiteSpace($resolvedRemoteBaseUrl)) {
    $payload.remoteBaseUrl = $resolvedRemoteBaseUrl
  }
  $body = $payload | ConvertTo-Json -Depth 6

  try {
    $result = Invoke-RestMethod `
      -Method Post `
      -Uri ("http://127.0.0.1:{0}/api/mobile/connections" -f $Port) `
      -Headers $headers `
      -ContentType "application/json" `
      -Body $body `
      -TimeoutSec 8
    return [pscustomobject]@{
      ok = $true
      result = $result
      error = ""
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      result = $null
      error = $_.Exception.Message
    }
  }
}

function Invoke-ManagedUiCleanup {
  param(
    [string]$Token,
    [int]$GraceMs = 220
  )

  if ([string]::IsNullOrWhiteSpace($Token)) {
    return [pscustomobject]@{
      ok = $false
      profileKilled = 0
      trackedClosed = 0
      error = "missing_mobile_token"
    }
  }

  $headers = @{ "x-asolaria-mobile-token" = [string]$Token }
  $body = @{
    closeTracked = $true
    graceMs = [int][Math]::Max(0, [Math]::Min(3000, $GraceMs))
    stopAttempts = 1
    stopProbeWaitMs = 60
    skipWhenMissing = $true
    includeBaseNames = $false
    targets = @("local_ui", "phone_mode", "local_console", "local_approvals")
  } | ConvertTo-Json -Depth 6

  try {
    $result = Invoke-RestMethod `
      -Method Post `
      -Uri ("http://127.0.0.1:{0}/api/mobile/ui/cleanup" -f $Port) `
      -Headers $headers `
      -ContentType "application/json" `
      -Body $body `
      -TimeoutSec 10

    return [pscustomobject]@{
      ok = $true
      profileKilled = [int]$result.profileKilled
      trackedClosed = [int]$result.tracked.closedCount
      result = $result
      error = ""
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      profileKilled = 0
      trackedClosed = 0
      result = $null
      error = $_.Exception.Message
    }
  }
}

function Start-TunnelMonitor {
  $monitorScript = Join-Path $PSScriptRoot "Start-Asolaria-PhoneTunnelMonitor.ps1"
  if (-not (Test-Path -LiteralPath $monitorScript)) {
    return [pscustomobject]@{
      ok = $false
      details = "monitor_script_missing"
    }
  }

  try {
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $monitorScript `
      -Port $Port `
      -CheckIntervalSeconds 300 `
      -MaxHours 24
    return [pscustomobject]@{
      ok = $true
      details = [string](@($output) -join "; ")
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      details = $_.Exception.Message
    }
  }
}

function Ensure-PhoneBackgroundKeeper {
  param(
    [int]$CheckIntervalSeconds = 20,
    [int]$MaxHours = 24
  )

  $keeperScript = Join-Path $PSScriptRoot "Start-Asolaria-PhoneBackgroundKeeper.ps1"
  if (-not (Test-Path -LiteralPath $keeperScript)) {
    return [pscustomobject]@{
      ok = $false
      details = "keeper_script_missing"
    }
  }

  try {
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $keeperScript `
      -Port $Port `
      -CheckIntervalSeconds $CheckIntervalSeconds `
      -MaxHours $MaxHours
    return [pscustomobject]@{
      ok = $true
      details = [string](@($output) -join "; ")
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      details = $_.Exception.Message
    }
  }
}

function Ensure-PublicTunnelKeeper {
  param(
    [int]$CheckIntervalSeconds = 45,
    [int]$MaxHours = 24
  )

  $keeperScript = Join-Path $PSScriptRoot "Start-Asolaria-PublicTunnelKeeper.ps1"
  if (-not (Test-Path -LiteralPath $keeperScript)) {
    return [pscustomobject]@{
      ok = $false
      details = "public_tunnel_keeper_script_missing"
    }
  }

  try {
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $keeperScript `
      -Port $Port `
      -CheckIntervalSeconds $CheckIntervalSeconds `
      -MaxHours $MaxHours
    return [pscustomobject]@{
      ok = $true
      details = [string](@($output) -join "; ")
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      details = $_.Exception.Message
    }
  }
}

function Write-StartupMethodCatalog {
  param(
    [string]$RepoRoot
  )

  $reportsDir = Join-Path $RepoRoot "reports"
  $logsDir = Join-Path $RepoRoot "logs"
  Ensure-Dir -Path $reportsDir
  Ensure-Dir -Path $logsDir

  $methods = [ordered]@{
    desktop_default = [ordered]@{
      cmd = (Join-Path $RepoRoot "Start-Asolaria.cmd")
      ps1 = (Join-Path $RepoRoot "tools\Start-Asolaria-OneButton.ps1")
      note = "Primary launcher icon target. Reuses running session and keeps phone bridge services alive."
    }
    desktop_one_button = [ordered]@{
      cmd = (Join-Path $RepoRoot "Start-Asolaria-OneButton.cmd")
      ps1 = (Join-Path $RepoRoot "tools\Start-Asolaria-OneButton.ps1")
      note = "One-button launcher with optional phone dashboard and recovery switches."
    }
    desktop_phone_connect = [ordered]@{
      cmd = (Join-Path $RepoRoot "Start-Asolaria-Phone.cmd")
      ps1 = (Join-Path $RepoRoot "tools\Start-Asolaria-Phone.ps1")
      note = "Direct phone bootstrap workflow (USB/tunnel URL copy + bridge setup)."
    }
    desktop_core_legacy = [ordered]@{
      cmd = (Join-Path $RepoRoot "Start-Asolaria-Core.cmd")
      ps1 = (Join-Path $RepoRoot "tools\Start-Asolaria.ps1")
      note = "Core legacy startup path without one-button orchestration."
    }
    desktop_control_plane = [ordered]@{
      cmd = (Join-Path $RepoRoot "Start-Asolaria-ControlPlane.cmd")
      ps1 = (Join-Path $RepoRoot "tools\Start-Asolaria-ControlPlane.ps1")
      note = "Core app plus control-plane tooling."
    }
    desktop_control_plane_sandbox = [ordered]@{
      cmd = (Join-Path $RepoRoot "Start-Asolaria-ControlPlane-Sandbox.cmd")
      ps1 = (Join-Path $RepoRoot "tools\Start-Asolaria-ControlPlane.ps1")
      note = "Control-plane + sandbox manager path (manual test path only)."
    }
    phone_background_keeper = [ordered]@{
      ps1 = (Join-Path $RepoRoot "tools\Start-Asolaria-PhoneBackgroundKeeper.ps1")
      note = "Maintains adb reverse and phone health checks in background."
    }
    phone_tunnel_monitor = [ordered]@{
      ps1 = (Join-Path $RepoRoot "tools\Start-Asolaria-PhoneTunnelMonitor.ps1")
      note = "Runs recurring tunnel smoke tests and writes latest report."
    }
    public_tunnel_keeper = [ordered]@{
      ps1 = (Join-Path $RepoRoot "tools\Start-Asolaria-PublicTunnelKeeper.ps1")
      note = "Maintains one managed cloudflared tunnel process and live URL artifact."
    }
    recovery = [ordered]@{
      ps1 = (Join-Path $RepoRoot "tools\Heal-Cure-Asolaria-Phone.ps1")
      note = "Compatibility and cleanup audit for phone connectors/artifacts."
    }
  }

  $catalog = [ordered]@{
    generatedAt = (Get-Date).ToString("o")
    root = $RepoRoot
    methods = $methods
  }

  $jsonPath = Join-Path $logsDir "startup-method-paths.json"
  $reportPath = Join-Path $reportsDir "startup-methods-latest.md"
  ($catalog | ConvertTo-Json -Depth 8) | Set-Content -Path $jsonPath -Encoding UTF8

  $lines = @(
    "# Asolaria Startup Method Catalog",
    "",
    ("Generated: " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")),
    ("JSON: " + $jsonPath),
    ""
  )
  foreach ($name in $methods.Keys) {
    $row = $methods[$name]
    $lines += ("## " + $name)
    if ($row.Contains("cmd") -and -not [string]::IsNullOrWhiteSpace([string]$row["cmd"])) {
      $lines += ("- cmd: " + [string]$row["cmd"])
    }
    if ($row.Contains("ps1") -and -not [string]::IsNullOrWhiteSpace([string]$row["ps1"])) {
      $lines += ("- ps1: " + [string]$row["ps1"])
    }
    $lines += ("- note: " + [string]$row["note"])
    $lines += ""
  }
  Set-Content -Path $reportPath -Value $lines -Encoding UTF8

  return [pscustomobject]@{
    ok = $true
    jsonPath = $jsonPath
    reportPath = $reportPath
    methods = $methods
  }
}

function Start-ProMirrorSession {
  try {
    $body = @{
      maxFps = 60
      videoBitRate = "8M"
      alwaysOnTop = $false
      noAudio = $true
      stayAwake = $true
      noControl = $false
    } | ConvertTo-Json -Depth 4
    $response = Invoke-RestMethod `
      -Method Post `
      -Uri ("http://127.0.0.1:{0}/api/phone/pro-mirror/start" -f $Port) `
      -ContentType "application/json" `
      -Body $body `
      -TimeoutSec 8
    return [pscustomobject]@{
      ok = $true
      details = [string](ConvertTo-Json $response -Depth 5 -Compress)
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      details = $_.Exception.Message
    }
  }
}

function Write-OneButtonReport {
  param(
    [string]$RepoRoot,
    [object]$Bootstrap,
    [object]$Health,
    [bool]$WasAlreadyRunning,
    [object]$StaleNodeCleanupState,
    [object]$ManagedUiCleanupState,
    [object]$StaleBrowserCleanupState,
    [object]$AutoStartupState,
    [object]$RoutingUpdateState,
    [object]$GatewayState,
    [object]$BackgroundKeeperState,
    [object]$PublicTunnelKeeperState,
    [object]$MonitorState,
    [object]$ProMirrorState,
    [object]$RecoveryState,
    [object]$StartupMethodCatalogState
  )

  $reportsDir = Join-Path $RepoRoot "reports"
  Ensure-Dir -Path $reportsDir
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $reportPath = Join-Path $reportsDir ("one-button-start-{0}.md" -f $stamp)
  $latestPath = Join-Path $reportsDir "one-button-start-latest.md"

  $selectedChannel = [string]$Health.connectionRouting.selected.channel
  $preferred = @($Health.connectionRouting.preferred) -join ","
  $localUrl = [string]$Bootstrap.urls.localConsole
  $remoteUrl = [string]$Bootstrap.urls.remoteConsole
  $token = [string]$Bootstrap.token
  $tokenHint = if ($token.Length -gt 8) { ("*" * ($token.Length - 8)) + $token.Substring($token.Length - 8) } else { "*" * $token.Length }

  $lines = @(
    "# Asolaria One-Button Startup Report",
    "",
    ("Generated: " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")),
    "",
    "## Runtime",
    ("- Startup mode: " + [string]$StartupMode.IsPresent),
    ("- Already running before launch: " + [string]$WasAlreadyRunning),
    ("- Selected channel: " + $selectedChannel),
    ("- Preferred order: " + $preferred),
    ("- Local console URL: " + $localUrl),
    ("- Remote console URL: " + $remoteUrl),
    ("- Mobile token hint: " + $tokenHint),
    "",
    "## One-Button Services",
    ("- Stale node cleanup: ok=" + [string]$StaleNodeCleanupState.ok + " inspected=" + [string]$StaleNodeCleanupState.inspected + " candidates=" + [string]$StaleNodeCleanupState.candidates + " stopped=" + [string](@($StaleNodeCleanupState.stopped) -join ",")),
    ("- Stale node cleanup failures: " + [string](@($StaleNodeCleanupState.failed) -join " | ")),
    ("- Managed UI cleanup: ok=" + [string]$ManagedUiCleanupState.ok + " trackedClosed=" + [string]$ManagedUiCleanupState.trackedClosed + " profileKilled=" + [string]$ManagedUiCleanupState.profileKilled + " error=" + [string]$ManagedUiCleanupState.error),
    ("- Stale browser cleanup: ok=" + [string]$StaleBrowserCleanupState.ok + " inspected=" + [string]$StaleBrowserCleanupState.inspected + " candidates=" + [string]$StaleBrowserCleanupState.candidates + " stopped=" + [string](@($StaleBrowserCleanupState.stopped) -join ",")),
    ("- Stale browser cleanup failures: " + [string](@($StaleBrowserCleanupState.failed) -join " | ")),
    ("- Auto startup: ok=" + [string]$AutoStartupState.ok + " mode=" + [string]$AutoStartupState.mode + " target=" + [string]$AutoStartupState.target),
    ("- Gateway ensure: ok=" + [string]$GatewayState.ok + " running=" + [string]$GatewayState.running + " started=" + [string]$GatewayState.started + " pid=" + [string]$GatewayState.pid + " reason=" + [string]$GatewayState.reason),
    ("- Routing refresh: ok=" + [string]$RoutingUpdateState.ok + " detail=" + [string]$RoutingUpdateState.error),
    ("- Background keeper: ok=" + [string]$BackgroundKeeperState.ok + " detail=" + [string]$BackgroundKeeperState.details),
    ("- Public tunnel keeper: ok=" + [string]$PublicTunnelKeeperState.ok + " detail=" + [string]$PublicTunnelKeeperState.details),
    ("- Tunnel monitor: ok=" + [string]$MonitorState.ok + " detail=" + [string]$MonitorState.details),
    ("- Pro mirror start: ok=" + [string]$ProMirrorState.ok + " detail=" + [string]$ProMirrorState.details),
    ("- Help recovery: requested=" + [string]$RecoveryState.requested + " ok=" + [string]$RecoveryState.ok + " smoke=" + [string]$RecoveryState.smokeReason),
    ("- Help recovery ADB: found=" + [string]$RecoveryState.adbFound + " devices=" + [string]$RecoveryState.adbAuthorizedDeviceCount + " termux=" + [string]$RecoveryState.termuxLaunch + " fdroid=" + [string]$RecoveryState.fdroidLaunch),
    ("- Help recovery WSL: detected=" + [string]$RecoveryState.wslDetected + " distros=" + [string](@($RecoveryState.wslDistros) -join ",")),
    ("- Help recovery details: " + [string](@($RecoveryState.details) -join " | ")),
    ("- Startup catalog report: " + [string]$StartupMethodCatalogState.reportPath),
    ("- Startup catalog JSON: " + [string]$StartupMethodCatalogState.jsonPath)
  )

  Set-Content -Path $reportPath -Value $lines -Encoding UTF8
  Set-Content -Path $latestPath -Value $lines -Encoding UTF8

  return $reportPath
}

Ensure-Elevated
Set-ConnectionEnvDefaults
Ensure-PersistentRoutingDefaults

$repoRoot = Get-AsolariaRoot
$startupMethodCatalogState = Write-StartupMethodCatalog -RepoRoot $repoRoot
$staleNodeCleanupState = Stop-StaleNodeWorkers
$staleBrowserCleanupState = [pscustomobject]@{
  ok = $true
  inspected = 0
  candidates = 0
  stopped = @()
  failed = @()
}
$managedUiCleanupState = [pscustomobject]@{
  ok = $true
  profileKilled = 0
  trackedClosed = 0
  error = "not_run"
}
$autoStartupState = [pscustomobject]@{
  ok = $true
  mode = "skipped"
  target = ""
  details = ""
}

if (-not $SkipAutoStartupInstall.IsPresent) {
  $autoStartupState = Ensure-AutoStartup -RepoRoot $repoRoot
}

$startPhoneScript = Join-Path $PSScriptRoot "Start-Asolaria-Phone.ps1"
if (-not (Test-Path -LiteralPath $startPhoneScript)) {
  throw "Start-Asolaria-Phone.ps1 not found at $startPhoneScript"
}

$startupProbe = Test-ServerHealthy
$wasAlreadyRunning = [bool]$startupProbe.ok
$startPhoneNeeded = (-not $startupProbe.ok) -or $ForceReconnect.IsPresent -or $HelpRecovery.IsPresent

if ($startPhoneNeeded) {
  $phoneWaitSeconds = if ($StartupMode.IsPresent -and -not $ForceReconnect.IsPresent -and -not $HelpRecovery.IsPresent) { 8 } else { 45 }
  & $startPhoneScript `
    -Port $Port `
    -OpenDesktopUi:$false `
    -OpenOnPhone:$false `
    -CopyUrl `
    -ForceRemotePhoneUrl `
    -WaitForPhoneSeconds $phoneWaitSeconds `
    -EnableTailnetProxy:$true `
    -RunPhoneTunnelSmokeTest:$false `
    -EnableBackgroundKeeper:$true | Out-Null

  if (-not (Wait-ForHealth -Seconds 45)) {
    throw "Asolaria is not healthy on port $Port."
  }
}

$bootstrap = Get-MobileBootstrap
$gatewayState = Ensure-GatewayControlPlane -RepoRoot $repoRoot -TimeoutSeconds 16
$routingUpdateState = Update-MobileConnections `
  -Token ([string]$bootstrap.token) `
  -RemoteBaseUrl ([string]$bootstrap.connection.remoteBaseUrl)
$managedUiCleanupState = Invoke-ManagedUiCleanup -Token ([string]$bootstrap.token)
$staleBrowserCleanupState = Stop-StaleBrowserWorkers -MinAgeMinutes 15

$backgroundKeeperState = Ensure-PhoneBackgroundKeeper -CheckIntervalSeconds 20 -MaxHours 24

$publicTunnelKeeperState = [pscustomobject]@{
  ok = $true
  details = "skipped"
}
if (-not $SkipPublicTunnelKeeper.IsPresent) {
  $publicTunnelKeeperState = Ensure-PublicTunnelKeeper -CheckIntervalSeconds 45 -MaxHours 24
}

$monitorState = [pscustomobject]@{
  ok = $true
  details = "skipped"
}
if (-not $SkipTunnelMonitor.IsPresent) {
  $monitorState = Start-TunnelMonitor
}

$proMirrorState = [pscustomobject]@{
  ok = $true
  details = "skipped"
}
if ($StartProMirror.IsPresent) {
  $proMirrorState = Start-ProMirrorSession
}

$recoveryState = [pscustomobject]@{
  requested = $false
  ok = $true
  windowsPath = "active"
  wslDetected = $false
  wslDistros = @()
  adbFound = $false
  adbAuthorizedDeviceCount = 0
  termuxLaunch = "skipped"
  fdroidLaunch = "skipped"
  smokeOk = $false
  smokeReason = "not_requested"
  details = @()
}
if ($HelpRecovery.IsPresent) {
  $recoveryState = Invoke-HelpRecovery -RepoRoot $repoRoot
}

$health = if ($startupProbe.ok -and -not $startPhoneNeeded -and $startupProbe.health) {
  $startupProbe.health
} else {
  Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/health" -f $Port) -TimeoutSec 4
}
$reportPath = Write-OneButtonReport `
  -RepoRoot $repoRoot `
  -Bootstrap $bootstrap `
  -Health $health `
  -WasAlreadyRunning $wasAlreadyRunning `
  -StaleNodeCleanupState $staleNodeCleanupState `
  -ManagedUiCleanupState $managedUiCleanupState `
  -StaleBrowserCleanupState $staleBrowserCleanupState `
  -AutoStartupState $autoStartupState `
  -RoutingUpdateState $routingUpdateState `
  -GatewayState $gatewayState `
  -BackgroundKeeperState $backgroundKeeperState `
  -PublicTunnelKeeperState $publicTunnelKeeperState `
  -MonitorState $monitorState `
  -ProMirrorState $proMirrorState `
  -RecoveryState $recoveryState `
  -StartupMethodCatalogState $startupMethodCatalogState

$uiLaunchMain = $null
$uiLaunchPhone = $null
$openUi = -not $NoUi.IsPresent
if ($openUi) {
  try {
    $uiLaunchMain = Open-AsolariaUiUrl -Url ("http://127.0.0.1:{0}" -f $Port)
  } catch {
    Write-Warning ("Failed to auto-open desktop UI with managed Chrome profile: " + $_.Exception.Message)
  }
  if ($OpenPhoneDashboard.IsPresent) {
    try {
      $uiLaunchPhone = Open-AsolariaUiUrl -Url ("http://127.0.0.1:{0}/phone-mode.html" -f $Port)
    } catch {
      Write-Warning ("Failed to auto-open phone dashboard with managed Chrome profile: " + $_.Exception.Message)
    }
  }
}

Write-Host "Asolaria one-button startup complete."
Write-Host ("Port: " + $Port)
Write-Host ("Startup mode: " + [string]$StartupMode.IsPresent)
Write-Host ("Already running before launch: " + [string]$wasAlreadyRunning)
Write-Host ("Selected channel: " + [string]$health.connectionRouting.selected.channel)
Write-Host ("Stale node cleanup: ok=" + [string]$staleNodeCleanupState.ok + " stopped=" + [string](@($staleNodeCleanupState.stopped) -join ","))
Write-Host ("Managed UI cleanup: ok=" + [string]$managedUiCleanupState.ok + " trackedClosed=" + [string]$managedUiCleanupState.trackedClosed + " profileKilled=" + [string]$managedUiCleanupState.profileKilled)
Write-Host ("Stale browser cleanup: ok=" + [string]$staleBrowserCleanupState.ok + " stopped=" + [string](@($staleBrowserCleanupState.stopped) -join ","))
Write-Host ("Auto startup: ok=" + [string]$autoStartupState.ok + " mode=" + [string]$autoStartupState.mode)
Write-Host ("Gateway ensure: ok=" + [string]$gatewayState.ok + " running=" + [string]$gatewayState.running + " started=" + [string]$gatewayState.started + " pid=" + [string]$gatewayState.pid + " reason=" + [string]$gatewayState.reason)
Write-Host ("Background keeper: ok=" + [string]$backgroundKeeperState.ok + " detail=" + [string]$backgroundKeeperState.details)
Write-Host ("Public tunnel keeper: ok=" + [string]$publicTunnelKeeperState.ok + " detail=" + [string]$publicTunnelKeeperState.details)
Write-Host ("Help recovery: requested=" + [string]$recoveryState.requested + " ok=" + [string]$recoveryState.ok + " smoke=" + [string]$recoveryState.smokeReason)
if ($openUi -and $uiLaunchMain -and $uiLaunchMain.ok) {
  Write-Host ("UI launch profile: " + [string]$uiLaunchMain.profileDirectory + " (" + [string]$uiLaunchMain.profileEmail + ")")
}
if ($OpenPhoneDashboard.IsPresent -and $uiLaunchPhone -and $uiLaunchPhone.ok) {
  Write-Host ("Phone dashboard profile: " + [string]$uiLaunchPhone.profileDirectory + " (" + [string]$uiLaunchPhone.profileEmail + ")")
}
Write-Host ("Local phone URL: " + [string]$bootstrap.urls.localConsole)
Write-Host ("Remote phone URL: " + [string]$bootstrap.urls.remoteConsole)
Write-Host ("Startup catalog: " + [string]$startupMethodCatalogState.reportPath)
Write-Host ("Report: " + $reportPath)
