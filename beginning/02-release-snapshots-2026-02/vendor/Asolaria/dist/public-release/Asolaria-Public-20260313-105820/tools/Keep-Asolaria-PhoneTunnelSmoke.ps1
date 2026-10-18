param(
  [int]$Port = 4781,
  [int]$CheckIntervalSeconds = 300,
  [int]$MaxHours = 0,
  [string]$LogPath = "",
  [string]$StableReportPath = "",
  [switch]$IncludeRawProbe,
  [int]$TailnetProxyPort = 4782,
  [object]$PhoneOnlyMode = $true,
  [switch]$DisableRouteFailover,
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

function Resolve-Bool {
  param(
    [object]$Value,
    [bool]$Default = $false
  )

  if ($null -eq $Value) {
    return $Default
  }

  if ($Value -is [bool]) {
    return [bool]$Value
  }

  if ($Value -is [int] -or $Value -is [long]) {
    return ([int64]$Value) -ne 0
  }

  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $Default
  }

  $normalized = $text.Trim().ToLowerInvariant()
  if ($normalized -in @("true", "1", "yes", "y", "on")) {
    return $true
  }
  if ($normalized -in @("false", "0", "no", "n", "off")) {
    return $false
  }

  return $Default
}

function Write-Log {
  param(
    [string]$Path,
    [string]$Message
  )
  $line = ("[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Message)
  try {
    Add-Content -Path $Path -Value $line -Encoding UTF8 -ErrorAction Stop
  } catch {
    Start-Sleep -Milliseconds 150
    try {
      Add-Content -Path $Path -Value $line -Encoding UTF8 -ErrorAction Stop
    } catch {
      # Best-effort logging only; keep the monitor alive even if the log file is briefly busy.
    }
  }
}

function Normalize-BaseUrl {
  param([string]$Url)
  return [string]([string]$Url).Trim().TrimEnd("/")
}

function Parse-Ipv4Parts {
  param([string]$HostName)

  $hostText = [string]$HostName
  if ([string]::IsNullOrWhiteSpace($hostText)) {
    return @()
  }

  $parts = $hostText.Trim().Split(".")
  if ($parts.Count -ne 4) {
    return @()
  }

  $numbers = New-Object System.Collections.Generic.List[int]
  foreach ($part in $parts) {
    $value = 0
    if (-not [int]::TryParse([string]$part, [ref]$value)) {
      return @()
    }
    if ($value -lt 0 -or $value -gt 255) {
      return @()
    }
    [void]$numbers.Add($value)
  }
  return @($numbers.ToArray())
}

function Test-IsCarrierGradeNatIpv4 {
  param([string]$HostName)

  $parts = @(Parse-Ipv4Parts -HostName $HostName)
  if ($parts.Count -ne 4) {
    return $false
  }
  return ($parts[0] -eq 100 -and $parts[1] -ge 64 -and $parts[1] -le 127)
}

function Test-IsPrivateIpv4 {
  param([string]$HostName)

  $parts = @(Parse-Ipv4Parts -HostName $HostName)
  if ($parts.Count -ne 4) {
    return $false
  }
  if ($parts[0] -eq 10) { return $true }
  if ($parts[0] -eq 127) { return $true }
  if ($parts[0] -eq 192 -and $parts[1] -eq 168) { return $true }
  if ($parts[0] -eq 172 -and $parts[1] -ge 16 -and $parts[1] -le 31) { return $true }
  return $false
}

function Resolve-ChannelFromBaseUrl {
  param([string]$BaseUrl)

  $base = Normalize-BaseUrl -Url $BaseUrl
  if ([string]::IsNullOrWhiteSpace($base)) {
    return "private_internet"
  }

  try {
    $uri = [System.Uri]$base
    $parsedHost = [string]$uri.Host
  } catch {
    return "private_internet"
  }

  $normalizedHost = [string]$parsedHost
  if ([string]::IsNullOrWhiteSpace($normalizedHost)) {
    return "private_internet"
  }
  $normalizedHost = $normalizedHost.Trim().ToLowerInvariant()
  if ($normalizedHost -eq "127.0.0.1" -or $normalizedHost -eq "localhost") {
    return "usb"
  }
  if ($normalizedHost.EndsWith(".ts.net") -or $normalizedHost.EndsWith(".tailnet") -or (Test-IsCarrierGradeNatIpv4 -HostName $normalizedHost)) {
    return "vpn"
  }
  if (Test-IsPrivateIpv4 -HostName $normalizedHost) {
    return "private_internet"
  }
  return "public_internet"
}

function Resolve-TailscalePath {
  try {
    $cmd = Get-Command tailscale -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {
    # continue
  }

  $candidates = @(
    "C:\Program Files\Tailscale\tailscale.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }
  return ""
}

function Get-TailnetPrivateBaseUrl {
  param(
    [string]$TailscalePath,
    [int]$ProxyPort
  )

  if ([string]::IsNullOrWhiteSpace($TailscalePath)) {
    return [pscustomobject]@{
      ok = $false
      reason = "tailscale_not_found"
      baseUrl = ""
    }
  }

  try {
    $rawStatus = & $TailscalePath status --json 2>$null
    if (-not $rawStatus) {
      return [pscustomobject]@{
        ok = $false
        reason = "tailscale_status_empty"
        baseUrl = ""
      }
    }
    $status = $rawStatus | ConvertFrom-Json -ErrorAction Stop
    $dnsName = [string]$status.Self.DNSName
    if ([string]::IsNullOrWhiteSpace($dnsName)) {
      return [pscustomobject]@{
        ok = $false
        reason = "tailscale_dns_missing"
        baseUrl = ""
      }
    }
    if ($dnsName.EndsWith(".")) {
      $dnsName = $dnsName.Substring(0, $dnsName.Length - 1)
    }
    $baseUrl = "http://${dnsName}:$ProxyPort"
    return [pscustomobject]@{
      ok = $true
      reason = "ok"
      baseUrl = (Normalize-BaseUrl -Url $baseUrl)
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      reason = ("tailscale_status_failed: " + $_.Exception.Message)
      baseUrl = ""
    }
  }
}

function Resolve-RemoteBaseFromBootstrap {
  param([object]$Bootstrap)

  if (-not $Bootstrap) { return "" }
  $configured = Normalize-BaseUrl -Url ([string]$Bootstrap.connection.remoteBaseUrl)
  if (-not [string]::IsNullOrWhiteSpace($configured)) {
    return $configured
  }

  $remoteConsole = [string]$Bootstrap.urls.remoteConsole
  if ([string]::IsNullOrWhiteSpace($remoteConsole)) {
    return ""
  }
  try {
    $uri = [System.Uri]$remoteConsole
    $builder = New-Object System.UriBuilder($uri.Scheme, $uri.Host, $uri.Port)
    $builder.Path = ""
    $builder.Query = ""
    return Normalize-BaseUrl -Url $builder.Uri.AbsoluteUri
  } catch {
    return ""
  }
}

function Invoke-MobileBootstrapProbe {
  param([int]$LocalPort)

  $url = ("http://127.0.0.1:{0}/api/mobile/bootstrap" -f $LocalPort)
  try {
    $bootstrap = Invoke-RestMethod -Uri $url -TimeoutSec 8
    return [pscustomobject]@{
      ok = $true
      token = [string]$bootstrap.token
      currentRemoteBaseUrl = Resolve-RemoteBaseFromBootstrap -Bootstrap $bootstrap
      error = ""
      bootstrap = $bootstrap
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      token = ""
      currentRemoteBaseUrl = ""
      error = $_.Exception.Message
      bootstrap = $null
    }
  }
}

function Invoke-HealthProbe {
  param(
    [string]$BaseUrl,
    [string]$Token,
    [string]$Channel,
    [int]$TimeoutSec = 6
  )

  $base = Normalize-BaseUrl -Url $BaseUrl
  if ([string]::IsNullOrWhiteSpace($base)) {
    return [pscustomobject]@{
      ok = $false
      reason = "base_url_missing"
      error = "Base URL is empty."
      baseUrl = ""
      channel = [string]$Channel
    }
  }

  $headers = @{}
  if (-not [string]::IsNullOrWhiteSpace([string]$Token)) {
    $headers["x-asolaria-mobile-token"] = [string]$Token
    $headers["x-asolaria-token"] = [string]$Token
  }
  if (-not [string]::IsNullOrWhiteSpace([string]$Channel)) {
    $headers["x-asolaria-channel"] = [string]$Channel
  }

  $healthUrl = "$base/api/health"
  if (-not [string]::IsNullOrWhiteSpace([string]$Channel)) {
    $healthUrl = ("{0}?channel={1}" -f $healthUrl, [Uri]::EscapeDataString([string]$Channel))
  }

  $invokeParams = @{
    Uri = $healthUrl
    Headers = $headers
    TimeoutSec = [Math]::Max(2, $TimeoutSec)
  }

  function Invoke-RelaxedTlsProbe {
    param([hashtable]$Params)

    $oldCallback = [System.Net.ServicePointManager]::ServerCertificateValidationCallback
    $oldProtocol = [System.Net.ServicePointManager]::SecurityProtocol
    try {
      [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls -bor [System.Net.SecurityProtocolType]::Tls11 -bor [System.Net.SecurityProtocolType]::Tls12
      [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
      return Invoke-RestMethod @Params
    } finally {
      [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $oldCallback
      [System.Net.ServicePointManager]::SecurityProtocol = $oldProtocol
    }
  }

  try {
    $resp = Invoke-RestMethod @invokeParams
    $healthOk = [bool]$resp.ok
    return [pscustomobject]@{
      ok = $healthOk
      reason = if ($healthOk) { "ok" } else { "health_not_ok" }
      error = ""
      baseUrl = $base
      channel = [string]$Channel
    }
  } catch {
    $initialError = $_.Exception.Message
    $isHttps = $base.StartsWith("https://", [System.StringComparison]::OrdinalIgnoreCase)
    $trustError = $initialError -match "(?i)trust|certificate|certificado|confian|ssl/tls|secure channel"
    if ($isHttps -and $trustError) {
      try {
        $resp = Invoke-RelaxedTlsProbe -Params $invokeParams
        $healthOk = [bool]$resp.ok
        return [pscustomobject]@{
          ok = $healthOk
          reason = if ($healthOk) { "ok_relaxed_tls" } else { "health_not_ok_relaxed_tls" }
          error = ""
          baseUrl = $base
          channel = [string]$Channel
        }
      } catch {
        $retryError = $_.Exception.Message
        return [pscustomobject]@{
          ok = $false
          reason = "probe_failed"
          error = ("initial=" + $initialError + "; retry=" + $retryError)
          baseUrl = $base
          channel = [string]$Channel
        }
      }
    }

    return [pscustomobject]@{
      ok = $false
      reason = "probe_failed"
      error = $initialError
      baseUrl = $base
      channel = [string]$Channel
    }
  }
}

function Invoke-MobileConnectionUpdate {
  param(
    [int]$LocalPort,
    [string]$Token,
    [string]$RemoteBaseUrl,
    [bool]$PhoneOnlyMode = $true
  )

  $normalized = Normalize-BaseUrl -Url $RemoteBaseUrl
  if ([string]::IsNullOrWhiteSpace($Token) -or [string]::IsNullOrWhiteSpace($normalized)) {
    return [pscustomobject]@{
      ok = $false
      reason = "missing_token_or_base_url"
      remoteBaseUrl = $normalized
      selectedChannel = ""
    }
  }

  $preferredChannels = @("usb", "private_internet", "public_internet")

  $headers = @{ "x-asolaria-mobile-token" = [string]$Token }
  $payload = @{
    remoteBaseUrl = $normalized
    preference = $preferredChannels
    available = $preferredChannels
    allowPublicInternet = $true
    publicInternetPrivate = $false
    remoteAuthRequired = $true
    requireEncryptedRemote = $true
    stealthDeny = $true
  } | ConvertTo-Json -Depth 4

  try {
    $response = Invoke-RestMethod -Method Post `
      -Uri ("http://127.0.0.1:{0}/api/mobile/connections" -f $LocalPort) `
      -Headers $headers `
      -ContentType "application/json" `
      -Body $payload `
      -TimeoutSec 8

    return [pscustomobject]@{
      ok = $true
      reason = "ok"
      remoteBaseUrl = Normalize-BaseUrl -Url ([string]$response.remoteBaseUrl)
      selectedChannel = [string]$response.connectionRouting.selected.channel
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      reason = ("mobile_connection_update_failed: " + $_.Exception.Message)
      remoteBaseUrl = $normalized
      selectedChannel = ""
    }
  }
}

function Invoke-Smoke {
  param(
    [string]$ScriptPath,
    [int]$HttpPort,
    [switch]$WithRawProbe,
    [string]$FixedReportPath
  )

  $args = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $ScriptPath,
    "-BaseUrl", ("http://127.0.0.1:{0}" -f $HttpPort),
    "-Channel", "auto"
  )
  if ($WithRawProbe.IsPresent) {
    $args += "-IncludePhoneRawProbe"
  }
  if (-not [string]::IsNullOrWhiteSpace($FixedReportPath)) {
    $args += @("-ReportPath", $FixedReportPath)
  }

  try {
    $output = & powershell.exe @args
    $jsonText = [string](@($output) -join [Environment]::NewLine)
    $parsed = $jsonText | ConvertFrom-Json -ErrorAction Stop
    return [pscustomobject]@{
      ok = [bool]$parsed.ok
      reason = if ([bool]$parsed.ok) { "ok" } else { "smoke_failed" }
      parsed = $parsed
      error = ""
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      reason = "smoke_run_failed"
      parsed = $null
      error = $_.Exception.Message
    }
  }
}

function Invoke-PublicTunnelUrlSync {
  param(
    [string]$ScriptPath,
    [string]$RootPath
  )

  if (-not (Test-Path -LiteralPath $ScriptPath)) {
    return [pscustomobject]@{
      ok = $false
      changed = $false
      url = ""
      error = "sync_script_missing"
    }
  }

  try {
    $raw = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -ProjectRoot $RootPath -RequireHealth
    $text = [string](@($raw) -join [Environment]::NewLine)
    $parsed = $text | ConvertFrom-Json -ErrorAction Stop
    return [pscustomobject]@{
      ok = [bool]$parsed.ok
      changed = [bool]$parsed.changed
      url = [string]$parsed.url
      error = ""
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      changed = $false
      url = ""
      error = $_.Exception.Message
    }
  }
}

function Read-PublicTunnelUrlArtifact {
  param([string]$Path)
  try {
    $raw = [string](Get-Content -LiteralPath $Path -Raw -ErrorAction Stop)
    return Normalize-BaseUrl -Url $raw
  } catch {
    return ""
  }
}

function Invoke-RouteFailover {
  param(
    [int]$LocalPort,
    [object]$PublicSync,
    [string]$PublicUrlArtifactPath,
    [string]$TailscalePath,
    [int]$TailnetPort,
    [bool]$PhoneOnlyMode = $true
  )

  $bootstrap = Invoke-MobileBootstrapProbe -LocalPort $LocalPort
  if (-not [bool]$bootstrap.ok) {
    return [pscustomobject]@{
      ok = $false
      mode = "bootstrap_failed"
      switched = $false
      currentBaseUrl = ""
      selectedBaseUrl = ""
      selectedChannel = ""
      privateHealthy = $false
      publicHealthy = $false
      currentHealthy = $false
      tailscaleStatus = "bootstrap_not_reached"
      updateReason = [string]$bootstrap.error
      phoneOnlyMode = [bool]$PhoneOnlyMode
    }
  }

  $token = [string]$bootstrap.token
  $currentBaseUrl = Normalize-BaseUrl -Url ([string]$bootstrap.currentRemoteBaseUrl)
  $privateInfo = Get-TailnetPrivateBaseUrl -TailscalePath $TailscalePath -ProxyPort $TailnetPort
  $privateBaseUrl = Normalize-BaseUrl -Url ([string]$privateInfo.baseUrl)

  $publicBaseFromSync = ""
  if ($PublicSync) {
    $publicBaseFromSync = Normalize-BaseUrl -Url ([string]$PublicSync.url)
  }
  $publicBaseUrl = if (-not [string]::IsNullOrWhiteSpace($publicBaseFromSync)) {
    $publicBaseFromSync
  } else {
    Read-PublicTunnelUrlArtifact -Path $PublicUrlArtifactPath
  }

  $privateChannel = Resolve-ChannelFromBaseUrl -BaseUrl $privateBaseUrl
  $publicChannel = Resolve-ChannelFromBaseUrl -BaseUrl $publicBaseUrl
  $currentChannel = Resolve-ChannelFromBaseUrl -BaseUrl $currentBaseUrl
  $currentIsPublic = ($currentChannel -eq "public_internet")

  $privateProbe = Invoke-HealthProbe -BaseUrl $privateBaseUrl -Token $token -Channel $privateChannel -TimeoutSec 6
  $publicProbe = Invoke-HealthProbe -BaseUrl $publicBaseUrl -Token $token -Channel $publicChannel -TimeoutSec 6
  $currentProbe = Invoke-HealthProbe -BaseUrl $currentBaseUrl -Token $token -Channel $currentChannel -TimeoutSec 6

  $mode = "no_healthy_route"
  $targetBaseUrl = ""
  if ([bool]$privateProbe.ok) {
    $mode = "private_primary"
    $targetBaseUrl = $privateBaseUrl
  } elseif ((-not $PhoneOnlyMode) -and [bool]$publicProbe.ok) {
    $mode = "public_fallback"
    $targetBaseUrl = $publicBaseUrl
  } elseif ([bool]$currentProbe.ok -and -not [string]::IsNullOrWhiteSpace($currentBaseUrl) -and ((-not $PhoneOnlyMode) -or (-not $currentIsPublic))) {
    $mode = "keep_current_healthy"
    $targetBaseUrl = $currentBaseUrl
  } elseif (-not [string]::IsNullOrWhiteSpace($currentBaseUrl) -and ((-not $PhoneOnlyMode) -or (-not $currentIsPublic))) {
    $mode = "keep_current_unhealthy"
    $targetBaseUrl = $currentBaseUrl
  } elseif ($PhoneOnlyMode -and [bool]$publicProbe.ok) {
    $mode = "public_blocked_phone_only"
  }

  $switched = $false
  $update = [pscustomobject]@{
    ok = $false
    reason = "not_required"
    remoteBaseUrl = $targetBaseUrl
    selectedChannel = Resolve-ChannelFromBaseUrl -BaseUrl $targetBaseUrl
  }
  if (-not [string]::IsNullOrWhiteSpace($targetBaseUrl) -and $targetBaseUrl -ne $currentBaseUrl) {
    $update = Invoke-MobileConnectionUpdate -LocalPort $LocalPort -Token $token -RemoteBaseUrl $targetBaseUrl -PhoneOnlyMode $PhoneOnlyMode
    $switched = [bool]$update.ok
    if (-not [bool]$update.ok) {
      $mode = ($mode + "_update_failed")
    }
  }

  $selectedBaseUrl = if ([bool]$update.ok) {
    Normalize-BaseUrl -Url ([string]$update.remoteBaseUrl)
  } elseif (-not [string]::IsNullOrWhiteSpace($targetBaseUrl)) {
    $targetBaseUrl
  } else {
    $currentBaseUrl
  }
  $selectedChannel = Resolve-ChannelFromBaseUrl -BaseUrl $selectedBaseUrl

  $overallOk = $false
  if ($mode.StartsWith("private_primary")) {
    $overallOk = [bool]$privateProbe.ok
  } elseif ($mode.StartsWith("public_fallback")) {
    $overallOk = [bool]$publicProbe.ok
  } elseif ($mode -eq "keep_current_healthy") {
    $overallOk = [bool]$currentProbe.ok
  } else {
    $overallOk = $false
  }

  return [pscustomobject]@{
    ok = $overallOk
    mode = $mode
    switched = $switched
    currentBaseUrl = $currentBaseUrl
    selectedBaseUrl = $selectedBaseUrl
    selectedChannel = $selectedChannel
    privateBaseUrl = $privateBaseUrl
    privateHealthy = [bool]$privateProbe.ok
    privateReason = [string]$privateProbe.reason
    privateError = [string]$privateProbe.error
    publicBaseUrl = $publicBaseUrl
    publicHealthy = [bool]$publicProbe.ok
    publicReason = [string]$publicProbe.reason
    publicError = [string]$publicProbe.error
    currentHealthy = [bool]$currentProbe.ok
    currentReason = [string]$currentProbe.reason
    currentError = [string]$currentProbe.error
    tailscaleStatus = [string]$privateInfo.reason
    updateReason = [string]$update.reason
    phoneOnlyMode = [bool]$PhoneOnlyMode
  }
}

$root = Get-AsolariaRoot
$logsDir = Join-Path $root "logs"
Ensure-Dir $logsDir

if ([string]::IsNullOrWhiteSpace($LogPath)) {
  $LogPath = Join-Path $logsDir ("phone-tunnel-smoke-monitor-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".log")
}
if ([string]::IsNullOrWhiteSpace($StableReportPath)) {
  $StableReportPath = Join-Path $root "reports\phone-tunnel-smoke-latest.md"
}

$PhoneOnlyMode = Resolve-Bool -Value $PhoneOnlyMode -Default $true

$smokeScript = Join-Path $PSScriptRoot "Test-Asolaria-PhoneTunnelPath.ps1"
if (-not (Test-Path $smokeScript)) {
  Write-Log -Path $LogPath -Message "smoke_script_missing"
  throw "Smoke script not found: $smokeScript"
}
$syncScript = Join-Path $PSScriptRoot "Sync-Asolaria-PublicTunnelUrl.ps1"
$publicTunnelUrlFilePath = Join-Path $logsDir "cloudflared-asolaria-url.txt"
$routeFailoverEnabled = -not $DisableRouteFailover.IsPresent
$tailscalePath = ""
if ($routeFailoverEnabled) {
  $tailscalePath = Resolve-TailscalePath
}

$startedAt = Get-Date
$deadline = if ($MaxHours -gt 0) { $startedAt.AddHours($MaxHours) } else { [DateTime]::MaxValue }
$lastState = ""
$lastSyncState = ""
$lastRouteState = ""

Write-Log -Path $LogPath -Message ("monitor_start port={0} interval_s={1} max_hours={2} raw_probe={3} route_failover={4} tailnet_proxy_port={5}" -f `
  $Port, `
  $CheckIntervalSeconds, `
  $MaxHours, `
  $IncludeRawProbe.IsPresent, `
  $routeFailoverEnabled, `
  $TailnetProxyPort)
Write-Log -Path $LogPath -Message ("monitor_policy phone_only={0}" -f $PhoneOnlyMode)

while ($true) {
  try {
  $sync = [pscustomobject]@{
    ok = $false
    changed = $false
    url = ""
    error = if ($PhoneOnlyMode) { "public_sync_disabled_phone_only" } else { "" }
  }
  if (-not $PhoneOnlyMode) {
    $sync = Invoke-PublicTunnelUrlSync -ScriptPath $syncScript -RootPath $root
  }
  $syncState = ("url_sync_ok={0}; changed={1}; url={2}; error={3}" -f [bool]$sync.ok, [bool]$sync.changed, [string]$sync.url, [string]$sync.error)
  if ($syncState -ne $lastSyncState) {
    Write-Log -Path $LogPath -Message $syncState
    $lastSyncState = $syncState
  }

  $routeFailover = [pscustomobject]@{
    ok = $false
    mode = "disabled"
    switched = $false
    currentBaseUrl = ""
    selectedBaseUrl = ""
    selectedChannel = ""
    privateHealthy = $false
    publicHealthy = $false
    currentHealthy = $false
    updateReason = "disabled"
    tailscaleStatus = "disabled"
    phoneOnlyMode = [bool]$PhoneOnlyMode
  }
  if ($routeFailoverEnabled) {
    $routeFailover = Invoke-RouteFailover `
      -LocalPort $Port `
      -PublicSync $sync `
      -PublicUrlArtifactPath $publicTunnelUrlFilePath `
      -TailscalePath $tailscalePath `
      -TailnetPort $TailnetProxyPort `
      -PhoneOnlyMode $PhoneOnlyMode
  }
  $routeState = ("route_ok={0}; mode={1}; switched={2}; selected={3}; selected_channel={4}; current={5}; private_ok={6}; public_ok={7}; current_ok={8}; tailscale={9}; update_reason={10}; phone_only={11}" -f `
    [bool]$routeFailover.ok, `
    [string]$routeFailover.mode, `
    [bool]$routeFailover.switched, `
    [string]$routeFailover.selectedBaseUrl, `
    [string]$routeFailover.selectedChannel, `
    [string]$routeFailover.currentBaseUrl, `
    [bool]$routeFailover.privateHealthy, `
    [bool]$routeFailover.publicHealthy, `
    [bool]$routeFailover.currentHealthy, `
    [string]$routeFailover.tailscaleStatus, `
    [string]$routeFailover.updateReason, `
    [bool]$routeFailover.phoneOnlyMode)
  if ($routeState -ne $lastRouteState) {
    Write-Log -Path $LogPath -Message $routeState
    $lastRouteState = $routeState
  }

  $smoke = Invoke-Smoke -ScriptPath $smokeScript -HttpPort $Port -WithRawProbe:$IncludeRawProbe -FixedReportPath $StableReportPath

  if ($smoke.parsed) {
    $stateText = ("ok={0}; reason={1}; remote={2}; session={3}; control={4}; keeper_running={5}; reverse={6}; ping={7}; raw_status={8}; route_mode={9}; route_base={10}; route_switched={11}; report={12}" -f `
      [bool]$smoke.parsed.ok, `
      [string]$smoke.reason, `
      [string]$smoke.parsed.remote.baseUrl, `
      [bool]$smoke.parsed.remote.sessionOk, `
      [bool]$smoke.parsed.remote.controlOk, `
      [bool]$smoke.parsed.remote.keeperRunning, `
      [bool]$smoke.parsed.adb.reversePresent, `
      [bool]$smoke.parsed.phonePing.ok, `
      [int]$smoke.parsed.rawProbe.statusCode, `
      [string]$routeFailover.mode, `
      [string]$routeFailover.selectedBaseUrl, `
      [bool]$routeFailover.switched, `
      [string]$smoke.parsed.reportPath)
  } else {
    $stateText = ("ok=false; reason={0}; error={1}; route_mode={2}; route_base={3}; route_switched={4}" -f `
      [string]$smoke.reason, `
      [string]$smoke.error, `
      [string]$routeFailover.mode, `
      [string]$routeFailover.selectedBaseUrl, `
      [bool]$routeFailover.switched)
  }

    if ($stateText -ne $lastState) {
      Write-Log -Path $LogPath -Message $stateText
      $lastState = $stateText
    }
  } catch {
    Write-Log -Path $LogPath -Message ("monitor_tick_error " + $_.Exception.Message)
  }

  if ($RunOnce.IsPresent) {
    break
  }
  if ((Get-Date) -ge $deadline) {
    Write-Log -Path $LogPath -Message "monitor_stop reason=max_hours_reached"
    break
  }
  Start-Sleep -Seconds $CheckIntervalSeconds
}

Write-Log -Path $LogPath -Message "monitor_exit"
