param(
  [datetime]$EndAt,
  [int]$IntervalSeconds = 60,
  [int]$AsolariaPort = 4781,
  [string]$PhoneSerial = "R5CXA4MGQXV",
  [int]$PhoneBrightness = 2,
  [int]$PcBrightness = 1,
  [string]$LogPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Resolve-AdbPath {
  try {
    $cmd = Get-Command adb -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {}

  foreach ($candidate in @(
    "C:\Users\acer\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "C:\Android\platform-tools\adb.exe",
    "C:\platform-tools\adb.exe"
  )) {
    if (Test-Path $candidate) { return $candidate }
  }
  return $null
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

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Write-Log {
  param(
    [string]$Path,
    [string]$Message
  )
  $line = ("[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Message)
  Add-Content -Path $Path -Value $line -Encoding UTF8
}

function Set-WindowsDarkMode {
  $k = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
  if (-not (Test-Path $k)) {
    New-Item -Path $k -Force | Out-Null
  }
  Set-ItemProperty -Path $k -Name AppsUseLightTheme -Type DWord -Value 0
  Set-ItemProperty -Path $k -Name SystemUsesLightTheme -Type DWord -Value 0
}

function Set-PcBrightness {
  param([int]$Brightness = 1)

  $methods = Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction SilentlyContinue
  if (-not $methods) { return 0 }
  $applied = 0
  foreach ($method in $methods) {
    try {
      Invoke-CimMethod -InputObject $method -MethodName WmiSetBrightness -Arguments @{ Timeout = 0; Brightness = $Brightness } | Out-Null
      $applied++
    } catch {
      # no-op
    }
  }
  return $applied
}

function Set-DisplaySleepPolicy {
  try { powercfg /change monitor-timeout-ac 1 | Out-Null } catch {}
  try { powercfg /change monitor-timeout-dc 1 | Out-Null } catch {}
}

function Set-PhoneDark {
  param(
    [string]$AdbPath,
    [string]$Serial,
    [int]$Brightness
  )

  if (-not $AdbPath) { return $false }
  if ([string]::IsNullOrWhiteSpace($Serial)) { return $false }

  try {
    & $AdbPath -s $Serial shell cmd uimode night yes | Out-Null
    & $AdbPath -s $Serial shell settings put system screen_brightness_mode 0 | Out-Null
    & $AdbPath -s $Serial shell settings put system screen_brightness $Brightness | Out-Null
    & $AdbPath -s $Serial shell settings put secure night_display_activated 1 | Out-Null
    & $AdbPath -s $Serial shell settings put system screen_off_timeout 15000 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Test-AsolariaHealth {
  param([int]$Port)
  try {
    $null = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/health" -f $Port) -TimeoutSec 4
    return $true
  } catch {
    return $false
  }
}

function Ensure-AsolariaHealthy {
  param(
    [string]$RootPath,
    [int]$Port,
    [string]$NodePath
  )

  if (Test-AsolariaHealth -Port $Port) {
    return "healthy"
  }

  $restartScript = Join-Path $RootPath "tools\Restart-Asolaria-Main.ps1"
  if (Test-Path $restartScript) {
    try {
      & $restartScript -Port $Port | Out-Null
    } catch {
      # no-op; fallback start below
    }
  }

  Start-Sleep -Seconds 5
  if (Test-AsolariaHealth -Port $Port) {
    return "recovered_via_restart_script"
  }

  if ($NodePath) {
    $stdoutLog = Join-Path $RootPath "logs\server.out.log"
    $stderrLog = Join-Path $RootPath "logs\server.err.log"
    try {
      Start-Process -FilePath $NodePath `
        -ArgumentList (Join-Path $RootPath "server.js") `
        -WorkingDirectory $RootPath `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog | Out-Null
      Start-Sleep -Seconds 5
    } catch {
      # no-op
    }
  }

  if (Test-AsolariaHealth -Port $Port) {
    return "recovered_via_direct_node_start"
  }
  return "unhealthy"
}

function Read-Pid([string]$Path) {
  try {
    $raw = (Get-Content -LiteralPath $Path -Raw -ErrorAction Stop).Trim()
    if (-not $raw) { return $null }
    return [int]$raw
  } catch {
    return $null
  }
}

function Is-Running([Nullable[int]]$ProcId) {
  if (-not $ProcId) { return $false }
  try {
    $null = Get-Process -Id $ProcId -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Ensure-BridgeWatchdog {
  param([string]$BridgeRoot)

  $watchdogScript = Join-Path $BridgeRoot "watchdog.ps1"
  $pidFile = Join-Path $BridgeRoot "watchdog.pid"
  if (-not (Test-Path $watchdogScript)) {
    return "missing_watchdog_script"
  }

  $watchdogPid = Read-Pid -Path $pidFile
  if (Is-Running $watchdogPid) {
    return ("running_pid_{0}" -f $watchdogPid)
  }

  try {
    $proc = Start-Process -FilePath "powershell.exe" `
      -WorkingDirectory $BridgeRoot `
      -ArgumentList @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", $watchdogScript
      ) `
      -WindowStyle Hidden `
      -PassThru
    $proc.Id | Set-Content -Path $pidFile -Encoding ASCII
    return ("started_pid_{0}" -f $proc.Id)
  } catch {
    return ("failed_to_start_watchdog: " + $_.Exception.Message)
  }
}

if (-not $PSBoundParameters.ContainsKey("EndAt")) {
  throw "EndAt is required. Example: -EndAt '2026-02-28 08:00:00'"
}

$root = Get-AsolariaRoot
$bridgeRoot = "C:\Users\acer\codex-bridge"
$logsDir = Join-Path $root "logs"
Ensure-Dir -Path $logsDir

if ([string]::IsNullOrWhiteSpace($LogPath)) {
  $LogPath = Join-Path $logsDir ("dark-night-watch-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".log")
}

$adbPath = Resolve-AdbPath
$nodePath = Resolve-NodePath
$deadline = $EndAt

Set-WindowsDarkMode
Set-DisplaySleepPolicy
$pcApplied = Set-PcBrightness -Brightness $PcBrightness
$phoneApplied = Set-PhoneDark -AdbPath $adbPath -Serial $PhoneSerial -Brightness $PhoneBrightness
$healthStatus = Ensure-AsolariaHealthy -RootPath $root -Port $AsolariaPort -NodePath $nodePath
$watchdogStatus = Ensure-BridgeWatchdog -BridgeRoot $bridgeRoot

Write-Log -Path $LogPath -Message ("dark_watch_start deadline={0} interval_s={1} pc_brightness={2}% pc_endpoints={3} phone_dark={4} health={5} bridge_watchdog={6}" -f $deadline.ToString("o"), $IntervalSeconds, $PcBrightness, $pcApplied, $phoneApplied, $healthStatus, $watchdogStatus)

while ((Get-Date) -lt $deadline) {
  Set-WindowsDarkMode
  $pcApplied = Set-PcBrightness -Brightness $PcBrightness
  $phoneApplied = Set-PhoneDark -AdbPath $adbPath -Serial $PhoneSerial -Brightness $PhoneBrightness
  $healthStatus = Ensure-AsolariaHealthy -RootPath $root -Port $AsolariaPort -NodePath $nodePath
  $watchdogStatus = Ensure-BridgeWatchdog -BridgeRoot $bridgeRoot

  Write-Log -Path $LogPath -Message ("tick pc_endpoints={0} phone_dark={1} asolaria={2} bridge_watchdog={3}" -f $pcApplied, $phoneApplied, $healthStatus, $watchdogStatus)
  Start-Sleep -Seconds $IntervalSeconds
}

Write-Log -Path $LogPath -Message "dark_watch_stop reason=deadline_reached"
