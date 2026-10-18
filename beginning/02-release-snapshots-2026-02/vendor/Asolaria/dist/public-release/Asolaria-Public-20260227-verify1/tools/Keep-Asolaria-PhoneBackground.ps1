param(
  [int]$Port = 4781,
  [int]$CheckIntervalSeconds = 20,
  [int]$MaxHours = 0,
  [string]$LogPath = "",
  [string]$AdbWifiEndpoint = "",
  [int]$AdbWifiPort = 5555,
  [int]$WirelessRetrySeconds = 60,
  [int]$EnableWirelessFallback = 1,
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

function Compact-LogValue {
  param(
    [string]$Value,
    [int]$MaxChars = 180
  )

  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return ""
  }
  $normalized = ($text -replace "\s+", " ").Trim()
  if ($normalized.Length -gt $MaxChars) {
    return ($normalized.Substring(0, $MaxChars) + "...")
  }
  return $normalized
}

function Normalize-AdbWifiEndpoint {
  param(
    [string]$Value,
    [int]$DefaultPort = 5555
  )

  $raw = [string]$Value
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return ""
  }
  $candidate = $raw.Trim()
  if ($candidate -match "^\d{1,3}(?:\.\d{1,3}){3}$") {
    return ("{0}:{1}" -f $candidate, $DefaultPort)
  }
  if ($candidate -match "^\d{1,3}(?:\.\d{1,3}){3}:\d+$") {
    return $candidate
  }
  return ""
}

function Get-AdbEndpointCachePath {
  param([string]$RootPath)
  return (Join-Path $RootPath "data\phone-adb-endpoint.txt")
}

function Resolve-AdbWifiEndpoint {
  param(
    [string]$ExplicitEndpoint,
    [string]$RootPath,
    [int]$DefaultPort = 5555
  )

  $normalized = Normalize-AdbWifiEndpoint -Value $ExplicitEndpoint -DefaultPort $DefaultPort
  if (-not [string]::IsNullOrWhiteSpace($normalized)) {
    return $normalized
  }

  foreach ($scope in @("Process", "User", "Machine")) {
    $envValue = [string][Environment]::GetEnvironmentVariable("ASOLARIA_PHONE_ADB_WIFI_ENDPOINT", $scope)
    $normalized = Normalize-AdbWifiEndpoint -Value $envValue -DefaultPort $DefaultPort
    if (-not [string]::IsNullOrWhiteSpace($normalized)) {
      return $normalized
    }
  }

  $cachePath = Get-AdbEndpointCachePath -RootPath $RootPath
  if (Test-Path -LiteralPath $cachePath) {
    try {
      $cached = [string](Get-Content -LiteralPath $cachePath -Raw -ErrorAction Stop)
      $normalized = Normalize-AdbWifiEndpoint -Value $cached -DefaultPort $DefaultPort
      if (-not [string]::IsNullOrWhiteSpace($normalized)) {
        return $normalized
      }
    } catch {
      return ""
    }
  }

  return ""
}

function Persist-AdbWifiEndpoint {
  param(
    [string]$Endpoint,
    [string]$RootPath
  )

  $normalized = Normalize-AdbWifiEndpoint -Value $Endpoint -DefaultPort $AdbWifiPort
  if ([string]::IsNullOrWhiteSpace($normalized)) {
    return
  }

  [Environment]::SetEnvironmentVariable("ASOLARIA_PHONE_ADB_WIFI_ENDPOINT", $normalized, "Process")
  [Environment]::SetEnvironmentVariable("ASOLARIA_PHONE_ADB_WIFI_ENDPOINT", $normalized, "User")

  $cachePath = Get-AdbEndpointCachePath -RootPath $RootPath
  $cacheDir = Split-Path -Parent $cachePath
  if (-not [string]::IsNullOrWhiteSpace($cacheDir)) {
    Ensure-Dir -Path $cacheDir
  }
  Set-Content -Path $cachePath -Value $normalized -Encoding ASCII
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
  $authorizedSerials = New-Object System.Collections.Generic.List[string]
  foreach ($line in $devices.output) {
    if ($line -match "^(\S+)\s+device$") {
      $authorized++
      [void]$authorizedSerials.Add([string]$matches[1])
    } elseif ($line -match "^\S+\s+unauthorized$") {
      $unauthorized++
    }
  }

  return [pscustomobject]@{
    startExit = $start.exitCode
    authorized = $authorized
    unauthorized = $unauthorized
    authorizedSerials = @($authorizedSerials.ToArray())
    devicesOutput = $devices.output
  }
}

function Ensure-Reverse {
  param(
    [string]$AdbPath,
    [int]$ForwardPort,
    [string[]]$AuthorizedSerials = @()
  )

  $serialCandidates = New-Object System.Collections.Generic.List[string]
  $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)

  $usbFirst = @()
  $other = @()
  foreach ($serial in @($AuthorizedSerials)) {
    $value = [string]$serial
    if ([string]::IsNullOrWhiteSpace($value)) { continue }
    if (-not $seen.Add($value)) { continue }
    if ($value.Contains(":")) {
      $other += $value
    } else {
      $usbFirst += $value
    }
  }
  foreach ($serial in @($usbFirst + $other)) {
    [void]$serialCandidates.Add([string]$serial)
  }
  if ($serialCandidates.Count -lt 1) {
    [void]$serialCandidates.Add("")
  }

  $failures = New-Object System.Collections.Generic.List[string]
  foreach ($serial in @($serialCandidates.ToArray())) {
    $prefix = if ([string]::IsNullOrWhiteSpace($serial)) { @() } else { @("-s", $serial) }
    $listArgs = @($prefix + @("reverse", "--list"))
    $setArgs = @($prefix + @("reverse", ("tcp:{0}" -f $ForwardPort), ("tcp:{0}" -f $ForwardPort)))

    $list = Invoke-AdbRaw -AdbPath $AdbPath -AdbArgs $listArgs
    if ($list.exitCode -eq 0) {
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
          ok = $true
          detail = if ([string]::IsNullOrWhiteSpace($serial)) { "reverse_present" } else { ("reverse_present serial=" + $serial) }
        }
      }
    }

    $set = Invoke-AdbRaw -AdbPath $AdbPath -AdbArgs $setArgs
    if ($set.exitCode -eq 0) {
      return [pscustomobject]@{
        changed = $true
        ok = $true
        detail = if ([string]::IsNullOrWhiteSpace($serial)) {
          "reverse_set"
        } else {
          ("reverse_set serial=" + $serial)
        }
      }
    }

    # Transient ADB transport races are common right after reconnect/restart.
    Start-Sleep -Milliseconds 350
    $setRetry = Invoke-AdbRaw -AdbPath $AdbPath -AdbArgs $setArgs
    if ($setRetry.exitCode -eq 0) {
      return [pscustomobject]@{
        changed = $true
        ok = $true
        detail = if ([string]::IsNullOrWhiteSpace($serial)) {
          "reverse_set_retry"
        } else {
          ("reverse_set_retry serial=" + $serial)
        }
      }
    }

    $detail = Compact-LogValue -Value (($setRetry.output + $set.output) -join " | ")
    if ([string]::IsNullOrWhiteSpace($serial)) {
      $failures.Add("default:" + $detail) | Out-Null
    } else {
      $failures.Add(($serial + ":" + $detail)) | Out-Null
    }
  }

  return [pscustomobject]@{
    changed = $true
    ok = $false
    detail = ("reverse_failed " + [string](@($failures.ToArray()) -join "; "))
  }
}

function Try-Discover-AdbWifiEndpoint {
  param(
    [string]$AdbPath,
    [string[]]$AuthorizedSerials,
    [int]$DefaultPort = 5555
  )

  foreach ($serial in @($AuthorizedSerials)) {
    $text = [string]$serial
    if ($text -match "^\d{1,3}(?:\.\d{1,3}){3}:\d+$") {
      return $text
    }
  }

  foreach ($serial in @($AuthorizedSerials)) {
    $text = [string]$serial
    if ([string]::IsNullOrWhiteSpace($text)) { continue }
    if ($text -like "emulator-*") { continue }
    if ($text.Contains(":")) { continue }

    $ipAddress = ""
    $ipQuery = Invoke-AdbRaw -AdbPath $AdbPath -AdbArgs @("-s", $text, "shell", "getprop", "dhcp.wlan0.ipaddress")
    if ($ipQuery.exitCode -eq 0) {
      $candidate = [string](@($ipQuery.output) -join "").Trim()
      if ($candidate -match "^\d{1,3}(?:\.\d{1,3}){3}$") {
        $ipAddress = $candidate
      }
    }

    if ([string]::IsNullOrWhiteSpace($ipAddress)) {
      $addr = Invoke-AdbRaw -AdbPath $AdbPath -AdbArgs @("-s", $text, "shell", "ip", "-f", "inet", "addr", "show", "wlan0")
      foreach ($line in @($addr.output)) {
        if ($line -match "inet\s+(\d{1,3}(?:\.\d{1,3}){3})\/") {
          $ipAddress = [string]$matches[1]
          break
        }
      }
    }

    if (-not [string]::IsNullOrWhiteSpace($ipAddress)) {
      $null = Invoke-AdbRaw -AdbPath $AdbPath -AdbArgs @("-s", $text, "tcpip", "$DefaultPort")
      return ("{0}:{1}" -f $ipAddress, $DefaultPort)
    }
  }

  return ""
}

function Get-UsbTransportSerials {
  param(
    [string[]]$AuthorizedSerials
  )

  $result = New-Object System.Collections.Generic.List[string]
  foreach ($serial in @($AuthorizedSerials)) {
    $value = [string]$serial
    if ([string]::IsNullOrWhiteSpace($value)) { continue }
    if ($value -match "^\d{1,3}(?:\.\d{1,3}){3}:\d+$") { continue }
    [void]$result.Add($value)
  }
  return @($result.ToArray())
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

$wirelessFallbackEnabled = ([int]$EnableWirelessFallback -ne 0)
$wirelessEndpoint = ""
if ($wirelessFallbackEnabled) {
  $wirelessEndpoint = Resolve-AdbWifiEndpoint -ExplicitEndpoint $AdbWifiEndpoint -RootPath $root -DefaultPort $AdbWifiPort
  if (-not [string]::IsNullOrWhiteSpace($wirelessEndpoint)) {
    Persist-AdbWifiEndpoint -Endpoint $wirelessEndpoint -RootPath $root
    Write-Log -Path $LogPath -Message ("wireless_endpoint_loaded endpoint={0}" -f $wirelessEndpoint)
  } else {
    Write-Log -Path $LogPath -Message "wireless_endpoint_missing"
  }
} else {
  Write-Log -Path $LogPath -Message "wireless_fallback_disabled"
}

$wirelessRetryWindow = [Math]::Max(10, $WirelessRetrySeconds)
$lastWirelessConnectAttempt = [DateTime]::MinValue
$lastWirelessDiscoveryAttempt = [DateTime]::MinValue
$wirelessDiscoveryIntervalSeconds = 300

$startedAt = Get-Date
$deadline = if ($MaxHours -gt 0) { $startedAt.AddHours($MaxHours) } else { [DateTime]::MaxValue }
$lastState = ""

while ($true) {
  $health = Test-Health -HttpPort $Port
  $adbState = Get-AdbState -AdbPath $adbPath
  $now = Get-Date

  $wirelessConnectAttempted = $false
  $wirelessConnectOutcome = ""
  $wirelessDiscoveryOutcome = ""

  if ($wirelessFallbackEnabled) {
    if (
      $adbState.authorized -gt 0 -and (
        [string]::IsNullOrWhiteSpace($wirelessEndpoint) -or
        ($now - $lastWirelessDiscoveryAttempt).TotalSeconds -ge $wirelessDiscoveryIntervalSeconds
      )
    ) {
      $lastWirelessDiscoveryAttempt = $now
      $discoveredEndpoint = Try-Discover-AdbWifiEndpoint `
        -AdbPath $adbPath `
        -AuthorizedSerials $adbState.authorizedSerials `
        -DefaultPort $AdbWifiPort
      $discoveredEndpoint = Normalize-AdbWifiEndpoint -Value $discoveredEndpoint -DefaultPort $AdbWifiPort
      if (-not [string]::IsNullOrWhiteSpace($discoveredEndpoint)) {
        if ($discoveredEndpoint -ne $wirelessEndpoint) {
          $wirelessEndpoint = $discoveredEndpoint
          Persist-AdbWifiEndpoint -Endpoint $wirelessEndpoint -RootPath $root
          $wirelessDiscoveryOutcome = ("discovered:{0}" -f $wirelessEndpoint)
        } else {
          $wirelessDiscoveryOutcome = "discovered_existing"
        }
      } elseif ([string]::IsNullOrWhiteSpace($wirelessEndpoint)) {
        $wirelessDiscoveryOutcome = "discovery_failed"
      }
    }

    if (
      $adbState.authorized -lt 1 -and
      -not [string]::IsNullOrWhiteSpace($wirelessEndpoint) -and
      ($now - $lastWirelessConnectAttempt).TotalSeconds -ge $wirelessRetryWindow
    ) {
      $wirelessConnectAttempted = $true
      $lastWirelessConnectAttempt = $now
      $connectResult = Invoke-AdbRaw -AdbPath $adbPath -AdbArgs @("connect", $wirelessEndpoint)
      $wirelessConnectOutcome = Compact-LogValue -Value ($connectResult.output -join " | ")
      $connectedText = ([string]$wirelessConnectOutcome).ToLowerInvariant()
      if (
        $connectResult.exitCode -eq 0 -or
        $connectedText.Contains("connected to") -or
        $connectedText.Contains("already connected")
      ) {
        $adbState = Get-AdbState -AdbPath $adbPath
      }
    } elseif ($adbState.authorized -lt 1 -and [string]::IsNullOrWhiteSpace($wirelessEndpoint)) {
      $wirelessConnectOutcome = "endpoint_missing"
    }
  }

  $wirelessStatus = ""
  if ($wirelessFallbackEnabled) {
    $endpointDisplay = if ([string]::IsNullOrWhiteSpace($wirelessEndpoint)) { "none" } else { $wirelessEndpoint }
    $wirelessStatus = ("; wireless_endpoint={0}" -f $endpointDisplay)
    if (-not [string]::IsNullOrWhiteSpace($wirelessDiscoveryOutcome)) {
      $wirelessStatus += ("; wireless_discovery={0}" -f $wirelessDiscoveryOutcome)
    }
    if ($wirelessConnectAttempted) {
      $wirelessStatus += "; wireless_connect_tried=true"
    }
    if (-not [string]::IsNullOrWhiteSpace($wirelessConnectOutcome)) {
      $wirelessStatus += ("; wireless_connect={0}" -f $wirelessConnectOutcome)
    }
  } else {
    $wirelessStatus = "; wireless_fallback=false"
  }

  if ($adbState.authorized -gt 0) {
    $usbSerials = @(Get-UsbTransportSerials -AuthorizedSerials $adbState.authorizedSerials)
    if ($usbSerials.Count -gt 0) {
      $reverse = Ensure-Reverse -AdbPath $adbPath -ForwardPort $Port -AuthorizedSerials $usbSerials
      $stateText = ("health={0}; authorized={1}; unauthorized={2}; usb_serials={3}; reverse_ok={4}; reverse_changed={5}; reverse_detail={6}{7}" -f `
        $health, $adbState.authorized, $adbState.unauthorized, [string](@($usbSerials) -join ","), $reverse.ok, $reverse.changed, (Compact-LogValue -Value $reverse.detail), $wirelessStatus)
    } else {
      $stateText = ("health={0}; authorized={1}; unauthorized={2}; reverse_skipped=no_usb_transport{3}" -f `
        $health, $adbState.authorized, $adbState.unauthorized, $wirelessStatus)
    }
  } else {
    $stateText = ("health={0}; authorized=0; unauthorized={1}; reverse_skipped=no_authorized_device{2}" -f $health, $adbState.unauthorized, $wirelessStatus)
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
