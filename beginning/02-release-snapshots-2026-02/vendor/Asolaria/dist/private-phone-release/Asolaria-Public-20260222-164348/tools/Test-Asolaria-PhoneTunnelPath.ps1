param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$Channel = "auto",
  [switch]$SkipAdbChecks,
  [switch]$IncludePhoneRawProbe,
  [string]$ReportPath,
  [bool]$AllowInsecureRemoteTls = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Mask-Token {
  param([string]$Token)
  $value = [string]$Token
  if (-not $value) { return "" }
  if ($value.Length -le 4) { return ("*" * $value.Length) }
  return ("*" * ($value.Length - 4)) + $value.Substring($value.Length - 4)
}

function Probe-Json {
  param(
    [string]$Url,
    [hashtable]$Headers = @{},
    [int]$TimeoutSec = 10,
    [bool]$SkipCertValidation = $false
  )
  try {
    $data = $null
    if ($SkipCertValidation) {
      $curlCmd = Get-Command curl.exe -ErrorAction SilentlyContinue
      if ($curlCmd) {
        $tempBodyPath = Join-Path $env:TEMP ("asolaria-probe-json-" + [Guid]::NewGuid().ToString("N") + ".json")
        try {
          $args = @("-s", "-k", "-o", $tempBodyPath, "-w", "%{http_code}", "--max-time", "$TimeoutSec")
          foreach ($entry in $Headers.GetEnumerator()) {
            $args += @("-H", ("{0}: {1}" -f [string]$entry.Key, [string]$entry.Value))
          }
          $args += $Url
          $statusRaw = & $curlCmd.Source @args 2>$null
          $statusCode = 0
          [void][int]::TryParse([string]$statusRaw, [ref]$statusCode)
          $body = ""
          if (Test-Path $tempBodyPath) {
            $body = [string](Get-Content -Path $tempBodyPath -Raw -ErrorAction SilentlyContinue)
          }
          if ($statusCode -lt 200 -or $statusCode -ge 300) {
            throw ("HTTP status " + [string]$statusCode)
          }
          if ($body) {
            $data = $body | ConvertFrom-Json -ErrorAction Stop
          } else {
            $data = @{}
          }
        } finally {
          if (Test-Path $tempBodyPath) {
            Remove-Item -Path $tempBodyPath -Force -ErrorAction SilentlyContinue
          }
        }
      } else {
        $previousCallback = [System.Net.ServicePointManager]::ServerCertificateValidationCallback
        $previousProtocols = [System.Net.ServicePointManager]::SecurityProtocol
        try {
          [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
          [System.Net.ServicePointManager]::SecurityProtocol = `
            [System.Net.SecurityProtocolType]::Tls12 -bor `
            [System.Net.SecurityProtocolType]::Tls11 -bor `
            [System.Net.SecurityProtocolType]::Tls
          $data = Invoke-RestMethod -Uri $Url -Headers $Headers -TimeoutSec $TimeoutSec
        } finally {
          [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $previousCallback
          [System.Net.ServicePointManager]::SecurityProtocol = $previousProtocols
        }
      }
    } else {
      $data = Invoke-RestMethod -Uri $Url -Headers $Headers -TimeoutSec $TimeoutSec
    }
    return [pscustomobject]@{
      ok = $true
      url = $Url
      error = ""
      data = $data
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      url = $Url
      error = $_.Exception.Message
      data = $null
    }
  }
}

function Probe-HttpStatus {
  param(
    [string]$Url,
    [int]$TimeoutSec = 10,
    [bool]$SkipCertValidation = $false
  )

  try {
    $curlCmd = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($curlCmd) {
      $curlArgs = @("-s", "-o", "NUL", "-w", "%{http_code}", "--max-time", "$TimeoutSec")
      if ($SkipCertValidation) {
        $curlArgs += "-k"
      }
      $curlArgs += $Url
      $raw = & $curlCmd.Source @curlArgs 2>$null
      $value = [string]$raw
      $parsed = 0
      if ([int]::TryParse($value, [ref]$parsed)) {
        return $parsed
      }
    }
  } catch {
    # fallback to Invoke-WebRequest below
  }

  try {
    $response = $null
    if ($SkipCertValidation) {
      $previousCallback = [System.Net.ServicePointManager]::ServerCertificateValidationCallback
      $previousProtocols = [System.Net.ServicePointManager]::SecurityProtocol
      try {
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
        [System.Net.ServicePointManager]::SecurityProtocol = `
          [System.Net.SecurityProtocolType]::Tls12 -bor `
          [System.Net.SecurityProtocolType]::Tls11 -bor `
          [System.Net.SecurityProtocolType]::Tls
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec $TimeoutSec
      } finally {
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $previousCallback
        [System.Net.ServicePointManager]::SecurityProtocol = $previousProtocols
      }
    } else {
      $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec $TimeoutSec
    }
    return [int]$response.StatusCode
  } catch {
    return 0
  }
}

function Resolve-RemoteBaseFromBootstrap {
  param([object]$Bootstrap)

  if (-not $Bootstrap) { return "" }
  $configured = [string]$Bootstrap.connection.remoteBaseUrl
  if ($configured) {
    return $configured.TrimEnd("/")
  }

  $remoteConsole = [string]$Bootstrap.urls.remoteConsole
  if (-not $remoteConsole) { return "" }
  try {
    $uri = [System.Uri]$remoteConsole
    $builder = New-Object System.UriBuilder($uri.Scheme, $uri.Host, $uri.Port)
    $builder.Path = ""
    return $builder.Uri.AbsoluteUri.TrimEnd("/")
  } catch {
    return ""
  }
}

function Resolve-RemoteChannel {
  param(
    [string]$RemoteBase,
    [string]$RequestedChannel
  )

  $requested = [string]$RequestedChannel
  if (-not [string]::IsNullOrWhiteSpace($requested)) {
    $normalized = $requested.Trim().ToLowerInvariant()
    if ($normalized -ne "auto") {
      return $normalized
    }
  }

  if ([string]::IsNullOrWhiteSpace([string]$RemoteBase)) {
    return "private_internet"
  }
  try {
    $uri = [System.Uri]$RemoteBase
    $remoteHost = [string]$uri.Host
  } catch {
    return "private_internet"
  }
  if ([string]::IsNullOrWhiteSpace($remoteHost)) {
    return "private_internet"
  }

  $hostText = $remoteHost.Trim().ToLowerInvariant()
  if ($hostText -eq "127.0.0.1" -or $hostText -eq "localhost") {
    return "usb"
  }
  if ($hostText.EndsWith(".ts.net")) {
    return "vpn"
  }

  $parts = $hostText.Split(".")
  if ($parts.Count -eq 4) {
    $a = 0
    $b = 0
    if ([int]::TryParse($parts[0], [ref]$a) -and [int]::TryParse($parts[1], [ref]$b)) {
      if ($a -eq 100 -and $b -ge 64 -and $b -le 127) {
        return "vpn"
      }
    }
  }
  return "public_internet"
}

function Get-LocalIpv4Addresses {
  $set = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
  try {
    $rows = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop
    foreach ($row in @($rows)) {
      $ip = [string]$row.IPAddress
      if ([string]::IsNullOrWhiteSpace($ip)) { continue }
      [void]$set.Add($ip)
    }
  } catch {
    # Fallback below.
  }

  try {
    $hostIps = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
      Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork } |
      ForEach-Object { [string]$_.IPAddressToString }
    foreach ($ip in @($hostIps)) {
      if ([string]::IsNullOrWhiteSpace($ip)) { continue }
      [void]$set.Add($ip)
    }
  } catch {
    # Best effort only.
  }

  [void]$set.Add("127.0.0.1")
  return @($set.ToArray())
}

function Test-RemoteHostIsLocal {
  param([string]$HostName)

  $targetHostName = [string]$HostName
  if ([string]::IsNullOrWhiteSpace($targetHostName)) { return $false }
  if ($targetHostName -eq "localhost" -or $targetHostName -eq "127.0.0.1") { return $true }

  $localIps = @(Get-LocalIpv4Addresses)
  if ($localIps.Count -lt 1) { return $false }
  $localSet = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($ip in @($localIps)) {
    if (-not [string]::IsNullOrWhiteSpace([string]$ip)) {
      [void]$localSet.Add([string]$ip)
    }
  }

  try {
    $resolvedIps = [System.Net.Dns]::GetHostAddresses($targetHostName) |
      Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork } |
      ForEach-Object { [string]$_.IPAddressToString }
    foreach ($ip in @($resolvedIps)) {
      if ($localSet.Contains([string]$ip)) {
        return $true
      }
    }
  } catch {
    return $false
  }
  return $false
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
  return ""
}

function Get-AdbAuthorizedDevices {
  param([string]$AdbPath)
  if (-not $AdbPath) { return @() }
  try {
    $output = & $AdbPath devices 2>$null
    $devices = @()
    foreach ($line in @($output)) {
      if ($line -match "^(\S+)\s+device$") {
        $devices += [string]$matches[1]
      }
    }
    return $devices
  } catch {
    return @()
  }
}

function Test-AdbReverseMapping {
  param(
    [string]$AdbPath,
    [int]$Port
  )
  if (-not $AdbPath) { return $false }
  try {
    $output = & $AdbPath reverse --list 2>$null
    foreach ($line in @($output)) {
      if ([string]$line -match ("tcp:{0}\s+tcp:{0}" -f $Port)) {
        return $true
      }
    }
  } catch {
    return $false
  }
  return $false
}

function Test-PhonePingHost {
  param(
    [string]$AdbPath,
    [string]$TargetHost
  )

  $result = [ordered]@{
    attempted = $false
    ok = $false
    host = [string]$TargetHost
    output = ""
    error = ""
  }

  if (-not $AdbPath -or -not $TargetHost) {
    return [pscustomobject]$result
  }

  try {
    $result.attempted = $true
    $output = & $AdbPath shell "toybox ping -c 1 $TargetHost" 2>$null
    $joined = [string](@($output) -join "`n")
    $result.output = $joined
    if ($joined -match "1 received" -or $joined -match "0% packet loss") {
      $result.ok = $true
    }
  } catch {
    $result.error = $_.Exception.Message
  }
  return [pscustomobject]$result
}

function Invoke-PhoneRawHttpProbe {
  param(
    [string]$AdbPath,
    [string]$TargetHost,
    [int]$Port
  )

  $result = [ordered]@{
    attempted = $false
    statusCode = 0
    statusLine = ""
    error = ""
  }

  if (-not $AdbPath -or -not $TargetHost -or $Port -lt 1) {
    return [pscustomobject]$result
  }

  $tempPath = Join-Path $env:TEMP ("asolaria-phone-http-" + [Guid]::NewGuid().ToString("N") + ".txt")
  $remotePath = "/data/local/tmp/asolaria-phone-http-req.txt"
  try {
    $request = "GET /api/health HTTP/1.1`r`nHost: ${TargetHost}:$Port`r`nConnection: close`r`n`r`n"
    [System.IO.File]::WriteAllText($tempPath, $request, [System.Text.Encoding]::ASCII)
    & $AdbPath push $tempPath $remotePath 2>$null | Out-Null
    $result.attempted = $true
    $output = & $AdbPath shell "cat $remotePath | toybox nc -w 6 $TargetHost $Port" 2>$null
    $status = [string](@($output) | Select-Object -First 1)
    $result.statusLine = $status
    if ($status -match "HTTP/\d\.\d\s+(\d{3})") {
      $result.statusCode = [int]$matches[1]
    }
  } catch {
    $result.error = $_.Exception.Message
  } finally {
    if (Test-Path $tempPath) {
      Remove-Item -Path $tempPath -Force -ErrorAction SilentlyContinue
    }
  }
  return [pscustomobject]$result
}

function Write-MarkdownReport {
  param(
    [object]$Result,
    [string]$OutputPath
  )

  $reportDir = Split-Path -Parent $OutputPath
  if (-not (Test-Path $reportDir)) {
    New-Item -Path $reportDir -ItemType Directory -Force | Out-Null
  }

  $lines = @(
    ("# Phone Tunnel Smoke Test - " + [string]$Result.checkedAt),
    "",
    "## Summary",
    ("- pass: " + [string]$Result.ok),
    ("- baseUrl: " + [string]$Result.baseUrl),
    ("- remoteBaseUrl: " + [string]$Result.remote.baseUrl),
    ("- tokenHint: " + [string]$Result.tokenHint),
    "",
    "## Remote Checks",
    ("- /api/health: " + [string]$Result.remote.healthOk),
    ("- mobile-console.html status: " + [string]$Result.remote.consoleStatusCode),
    ("- /api/mobile/session: " + [string]$Result.remote.sessionOk + " (route=" + [string]$Result.remote.sessionChannel + ")"),
    ("- /api/mobile/control/status: " + [string]$Result.remote.controlOk),
    ("- control plane healthy: " + [string]$Result.remote.controlPlaneHealthy),
    ("- keeper running: " + [string]$Result.remote.keeperRunning + " pid=" + [string]$Result.remote.keeperPid + " staleSeconds=" + [string]$Result.remote.keeperStaleSeconds),
    "",
    "## ADB Checks",
    ("- adb path: " + [string]$Result.adb.path),
    ("- authorized devices: " + [string]$Result.adb.authorizedCount),
    ("- reverse tcp:" + [string]$Result.localPort + " present: " + [string]$Result.adb.reversePresent),
    "",
    "## Phone Network",
    ("- ping attempted: " + [string]$Result.phonePing.attempted),
    ("- ping ok: " + [string]$Result.phonePing.ok),
    ("- raw probe attempted: " + [string]$Result.rawProbe.attempted),
    ("- raw probe status: " + [string]$Result.rawProbe.statusCode),
    ("- raw probe line: " + [string]$Result.rawProbe.statusLine),
    ""
  )

  if ($Result.notes -and $Result.notes.Count -gt 0) {
    $lines += "## Notes"
    foreach ($note in @($Result.notes)) {
      $lines += ("- " + [string]$note)
    }
    $lines += ""
  }

  Set-Content -Path $OutputPath -Value $lines -Encoding ascii
}

$base = ([string]$BaseUrl).TrimEnd("/")
$localPort = 0
try {
  $baseUri = [System.Uri]$base
  $localPort = [int]$baseUri.Port
} catch {
  $localPort = 4781
}

$localHealth = Probe-Json -Url "$base/api/health"
$bootstrapProbe = Probe-Json -Url "$base/api/mobile/bootstrap"
$bootstrap = $bootstrapProbe.data
$token = if ($bootstrapProbe.ok) { [string]$bootstrap.token } else { "" }
$tokenHint = Mask-Token -Token $token
$remoteBase = if ($bootstrapProbe.ok) { Resolve-RemoteBaseFromBootstrap -Bootstrap $bootstrap } else { "" }
$effectiveChannel = Resolve-RemoteChannel -RemoteBase $remoteBase -RequestedChannel $Channel

$remoteHealth = [pscustomobject]@{ ok = $false; data = $null; error = "remote_base_missing" }
$remoteSession = [pscustomobject]@{ ok = $false; data = $null; error = "remote_base_missing" }
$remoteControl = [pscustomobject]@{ ok = $false; data = $null; error = "remote_base_missing" }
$remoteConsoleStatusCode = 0
$remoteSessionChannel = ""
$keeperRunning = $false
$keeperPid = 0
$keeperStaleSeconds = -1
$remoteHostLooksLocal = $false
$remoteProbeMode = "direct"

if ($remoteBase) {
  $remoteSkipCertValidation = $false
  if ($AllowInsecureRemoteTls) {
    try {
      $remoteScheme = [System.Uri]$remoteBase
      if ([string]$remoteScheme.Scheme -eq "https") {
        $remoteSkipCertValidation = $true
      }
    } catch {
      $remoteSkipCertValidation = $false
    }
  }
  $authHeaders = @{}
  if ($token) {
    $authHeaders = @{
      "x-asolaria-mobile-token" = $token
      "x-asolaria-token" = $token
      "x-asolaria-channel" = $effectiveChannel
    }
  }

  $healthUrl = "$remoteBase/api/health"
  if ($effectiveChannel) {
    $healthUrl = ("{0}?channel={1}" -f $healthUrl, [Uri]::EscapeDataString($effectiveChannel))
  }
  $remoteHealth = Probe-Json -Url $healthUrl -Headers $authHeaders -SkipCertValidation $remoteSkipCertValidation
  $remoteConsoleStatusCode = Probe-HttpStatus -Url ("$remoteBase/mobile-console.html?channel=" + [Uri]::EscapeDataString($effectiveChannel)) -SkipCertValidation $remoteSkipCertValidation
  if ($token) {
    $remoteSession = Probe-Json -Url ("$remoteBase/api/mobile/session?channel=" + [Uri]::EscapeDataString($effectiveChannel)) -Headers $authHeaders -SkipCertValidation $remoteSkipCertValidation
    $remoteControl = Probe-Json -Url ("$remoteBase/api/mobile/control/status?channel=" + [Uri]::EscapeDataString($effectiveChannel)) -Headers $authHeaders -SkipCertValidation $remoteSkipCertValidation
    if ($remoteSession.ok -and $remoteSession.data) {
      $remoteSessionChannel = [string]$remoteSession.data.connectionRouting.selected.channel
    }
    if ($remoteControl.ok -and $remoteControl.data) {
      $keeper = $remoteControl.data.phoneBridgeKeeper
      if ($keeper) {
        $keeperRunning = [bool]$keeper.running
        $keeperPid = [int]$keeper.pid
        try { $keeperStaleSeconds = [int]$keeper.latestLogStaleSeconds } catch { $keeperStaleSeconds = -1 }
      }
    }
  }
}

$adbPath = ""
$authorized = @()
$reversePresent = $false
$phonePing = [pscustomobject]@{
  attempted = $false
  ok = $false
  host = ""
  output = ""
  error = ""
}
$rawProbe = [pscustomobject]@{
  attempted = $false
  statusCode = 0
  statusLine = ""
  error = ""
}

if (-not $SkipAdbChecks) {
  $adbPath = Resolve-AdbPath
  if ($adbPath) {
    try { & $adbPath start-server | Out-Null } catch {}
    $authorized = @(Get-AdbAuthorizedDevices -AdbPath $adbPath)
    $reversePresent = Test-AdbReverseMapping -AdbPath $adbPath -Port $localPort

    $remoteHost = ""
    $remotePort = 0
    if ($remoteBase) {
      try {
        $remoteUri = [System.Uri]$remoteBase
        $remoteHost = [string]$remoteUri.Host
        $remotePort = [int]$remoteUri.Port
      } catch {
        $remoteHost = ""
        $remotePort = 0
      }
    }

    if ($authorized.Count -gt 0 -and $remoteHost) {
      $phonePing = Test-PhonePingHost -AdbPath $adbPath -TargetHost $remoteHost
      if ($IncludePhoneRawProbe) {
        $rawProbe = Invoke-PhoneRawHttpProbe -AdbPath $adbPath -TargetHost $remoteHost -Port $remotePort
      }
    }
  }
}

$notes = New-Object System.Collections.Generic.List[string]
if (-not $localHealth.ok) { $notes.Add("Local /api/health probe failed: " + [string]$localHealth.error) }
if (-not $bootstrapProbe.ok) { $notes.Add("Local /api/mobile/bootstrap probe failed: " + [string]$bootstrapProbe.error) }
if (-not $remoteBase) { $notes.Add("Remote base URL could not be resolved from bootstrap.") }
if ($remoteBase -and -not $remoteHealth.ok) { $notes.Add("Remote /api/health (auth) probe failed: " + [string]$remoteHealth.error) }
if ($remoteConsoleStatusCode -ne 200) { $notes.Add("Remote mobile console returned HTTP status " + [string]$remoteConsoleStatusCode + ".") }
if ($token -and -not $remoteSession.ok) { $notes.Add("Remote /api/mobile/session failed: " + [string]$remoteSession.error) }
if ($token -and -not $remoteControl.ok) { $notes.Add("Remote /api/mobile/control/status failed: " + [string]$remoteControl.error) }
if (-not $SkipAdbChecks -and -not $adbPath) { $notes.Add("ADB not found; skipped USB/phone checks.") }
if (-not $SkipAdbChecks -and $adbPath -and $authorized.Count -lt 1) { $notes.Add("ADB found but no authorized devices connected.") }
if (-not $SkipAdbChecks -and $authorized.Count -gt 0 -and -not $reversePresent) { $notes.Add("ADB reverse mapping tcp:" + [string]$localPort + " not present.") }
$controlPlaneHealthy = [bool]($remoteSession.ok -and $remoteControl.ok)
if ($phonePing.attempted -and -not $phonePing.ok) {
  if ($controlPlaneHealthy) {
    $notes.Add("Phone ping to remote host failed (advisory only; authenticated control plane checks are healthy).")
  } else {
    $notes.Add("Phone ping to remote host failed.")
  }
}
if ($remoteBase -and $AllowInsecureRemoteTls -and $remoteBase -match "^https://") {
  $notes.Add("Desktop remote probes used relaxed TLS validation for this smoke run.")
}

$overallOk = $true
$overallOk = $overallOk -and $localHealth.ok
$overallOk = $overallOk -and $bootstrapProbe.ok
$overallOk = $overallOk -and [bool]($remoteBase)
$overallOk = $overallOk -and $remoteHealth.ok
$overallOk = $overallOk -and ($remoteConsoleStatusCode -eq 200)
$overallOk = $overallOk -and $remoteSession.ok
$overallOk = $overallOk -and $remoteControl.ok
if (-not $SkipAdbChecks -and $authorized.Count -gt 0) {
  $overallOk = $overallOk -and $reversePresent
}
if ($phonePing.attempted) {
  if (-not $controlPlaneHealthy) {
    $overallOk = $overallOk -and $phonePing.ok
  }
}

$checkedAt = [DateTimeOffset]::UtcNow.ToString("o")
$result = [ordered]@{
  ok = [bool]$overallOk
  checkedAt = $checkedAt
  baseUrl = $base
  localPort = [int]$localPort
  tokenHint = $tokenHint
  local = [ordered]@{
    healthOk = [bool]$localHealth.ok
    healthError = [string]$localHealth.error
    bootstrapOk = [bool]$bootstrapProbe.ok
    bootstrapError = [string]$bootstrapProbe.error
  }
  remote = [ordered]@{
    baseUrl = [string]$remoteBase
    requestedChannel = [string]$Channel
    effectiveChannel = [string]$effectiveChannel
    healthOk = [bool]$remoteHealth.ok
    healthError = [string]$remoteHealth.error
    consoleStatusCode = [int]$remoteConsoleStatusCode
    sessionOk = [bool]$remoteSession.ok
    sessionError = [string]$remoteSession.error
    sessionChannel = [string]$remoteSessionChannel
    controlOk = [bool]$remoteControl.ok
    controlError = [string]$remoteControl.error
    controlPlaneHealthy = [bool]$controlPlaneHealthy
    keeperRunning = [bool]$keeperRunning
    keeperPid = [int]$keeperPid
    keeperStaleSeconds = [int]$keeperStaleSeconds
  }
  adb = [ordered]@{
    skipped = [bool]$SkipAdbChecks
    path = [string]$adbPath
    authorizedCount = [int]$authorized.Count
    authorizedDevices = @($authorized)
    reversePresent = [bool]$reversePresent
  }
  phonePing = [ordered]@{
    attempted = [bool]$phonePing.attempted
    ok = [bool]$phonePing.ok
    host = [string]$phonePing.host
    error = [string]$phonePing.error
  }
  rawProbe = [ordered]@{
    attempted = [bool]$rawProbe.attempted
    statusCode = [int]$rawProbe.statusCode
    statusLine = [string]$rawProbe.statusLine
    error = [string]$rawProbe.error
  }
  notes = @($notes)
}

$reportOutputPath = [string]$ReportPath
if (-not $reportOutputPath) {
  $root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  $reportsDir = Join-Path $root "reports"
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $reportOutputPath = Join-Path $reportsDir ("phone-tunnel-smoke-" + $stamp + ".md")
}

Write-MarkdownReport -Result $result -OutputPath $reportOutputPath
$result.reportPath = $reportOutputPath

$result | ConvertTo-Json -Depth 12
