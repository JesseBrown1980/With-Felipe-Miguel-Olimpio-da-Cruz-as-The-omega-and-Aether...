param(
  [int]$Port = 4781,
  [int]$CheckIntervalSeconds = 20,
  [int]$MaxHours = 12,
  [string]$LogPath = "",
  [switch]$RunOnce
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
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
    if (Test-Path $path) {
      return $path
    }
  }
  return $null
}

function Write-Log {
  param(
    [string]$Path,
    [string]$Message
  )
  $line = ("[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Message)
  Add-Content -Path $Path -Value $line -Encoding UTF8
}

function Test-Health {
  param([int]$HttpPort)
  try {
    $null = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/health" -f $HttpPort) -TimeoutSec 3
    return $true
  } catch {
    return $false
  }
}

function Invoke-AdbRaw {
  param(
    [string]$AdbPath,
    [string[]]$AdbArgs
  )

  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $AdbPath @AdbArgs 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }
  return [pscustomobject]@{
    output = @($output | ForEach-Object { "$_" })
    exitCode = $exitCode
  }
}

function Get-AdbState {
  param([string]$AdbPath)

  $start = Invoke-AdbRaw -AdbPath $AdbPath -AdbArgs @("start-server")
  $devices = Invoke-AdbRaw -AdbPath $AdbPath -AdbArgs @("devices")
  $authorized = 0
  $unauthorized = 0
  foreach ($line in $devices.output) {
    if ($line -match "^\S+\s+device$") {
      $authorized++
    } elseif ($line -match "^\S+\s+unauthorized$") {
      $unauthorized++
    }
  }

  return [pscustomobject]@{
    startExit = $start.exitCode
    authorized = $authorized
    unauthorized = $unauthorized
    devicesOutput = $devices.output
  }
}

function Ensure-Reverse {
  param(
    [string]$AdbPath,
    [int]$ForwardPort
  )

  $target = ("tcp:{0} tcp:{0}" -f $ForwardPort)
  $list = Invoke-AdbRaw -AdbPath $AdbPath -AdbArgs @("reverse", "--list")
  $already = $false
  foreach ($row in $list.output) {
    if ($row -match ("tcp:{0}\s+tcp:{0}" -f $ForwardPort)) {
      $already = $true
      break
    }
  }
  if ($already) {
    return [pscustomobject]@{
      changed = $false
      ok = ($list.exitCode -eq 0)
      detail = "reverse_present"
    }
  }

  $set = Invoke-AdbRaw -AdbPath $AdbPath -AdbArgs @("reverse", ("tcp:{0}" -f $ForwardPort), ("tcp:{0}" -f $ForwardPort))
  return [pscustomobject]@{
    changed = $true
    ok = ($set.exitCode -eq 0)
    detail = (($set.output -join " | ").Trim())
  }
}

$root = Get-AsolariaRoot
$logDir = Join-Path $root "logs"
Ensure-Dir $logDir

if ([string]::IsNullOrWhiteSpace($LogPath)) {
  $LogPath = Join-Path $logDir ("phone-link-keeper-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".log")
}

Write-Log -Path $LogPath -Message ("keeper_start port={0} interval_s={1} max_hours={2}" -f $Port, $CheckIntervalSeconds, $MaxHours)

$adbPath = Resolve-AdbPath
if (-not $adbPath) {
  Write-Log -Path $LogPath -Message "adb_not_found"
  throw "ADB executable not found."
}

$startedAt = Get-Date
$deadline = if ($MaxHours -gt 0) { $startedAt.AddHours($MaxHours) } else { [DateTime]::MaxValue }
$lastState = ""

while ($true) {
  $health = Test-Health -HttpPort $Port
  $adbState = Get-AdbState -AdbPath $adbPath

  if ($adbState.authorized -gt 0) {
    $reverse = Ensure-Reverse -AdbPath $adbPath -ForwardPort $Port
    $stateText = ("health={0}; authorized={1}; unauthorized={2}; reverse_ok={3}; reverse_changed={4}; reverse_detail={5}" -f `
      $health, $adbState.authorized, $adbState.unauthorized, $reverse.ok, $reverse.changed, $reverse.detail)
  } else {
    $stateText = ("health={0}; authorized=0; unauthorized={1}; reverse_skipped=no_authorized_device" -f $health, $adbState.unauthorized)
  }

  if ($stateText -ne $lastState) {
    Write-Log -Path $LogPath -Message $stateText
    $lastState = $stateText
  }

  if ($RunOnce.IsPresent) {
    break
  }
  if ((Get-Date) -ge $deadline) {
    Write-Log -Path $LogPath -Message "keeper_stop reason=max_hours_reached"
    break
  }
  Start-Sleep -Seconds $CheckIntervalSeconds
}

Write-Log -Path $LogPath -Message "keeper_exit"
