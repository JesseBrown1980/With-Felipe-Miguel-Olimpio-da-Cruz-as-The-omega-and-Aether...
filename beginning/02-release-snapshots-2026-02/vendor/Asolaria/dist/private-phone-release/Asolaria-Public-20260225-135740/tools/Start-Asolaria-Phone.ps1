param(
  [int]$Port = 4781,
  [switch]$OpenDesktopUi = $false,
  [switch]$OpenOnPhone = $false,
  [switch]$CopyUrl = $true,
  [switch]$ForceRemotePhoneUrl,
  [int]$WaitForPhoneSeconds = 45,
  [string]$AdbWifiEndpoint = "",
  [bool]$EnableTailnetProxy = $true,
  [int]$TailnetProxyPort = 4782,
  [bool]$EnableBackgroundKeeper = $true,
  [int]$BackgroundKeeperCheckIntervalSeconds = 20,
  [int]$BackgroundKeeperMaxHours = 12,
  [bool]$PhoneOnlyMode = $true,
  [bool]$RunPhoneTunnelSmokeTest = $true,
  [bool]$PhoneTunnelSmokeIncludeRawProbe = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Set-AsolariaProcessEnvDefaults {
  param(
    [bool]$PhoneOnlyMode = $true
  )

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

  $connectionChannels = if ($PhoneOnlyMode) {
    "usb,vpn,private_internet"
  } else {
    "usb,vpn,private_internet,public_internet"
  }
  $allowPublicInternet = if ($PhoneOnlyMode) { "false" } else { "true" }
  $publicInternetPrivate = if ($PhoneOnlyMode) { "false" } else { "true" }
  $remoteAuthRequired = if ($PhoneOnlyMode) { "true" } else { "false" }

  $defaults = [ordered]@{
    ASOLARIA_NOTEBOOK_AUTO_MODE = "auto"
    ASOLARIA_CODEX_WEB_SEARCH = "true"
    # USB-first for direct local reliability, with secure fallbacks when USB is unavailable.
    ASOLARIA_CONNECTION_PREFERENCE = $connectionChannels
    ASOLARIA_CONNECTION_AVAILABLE = $connectionChannels
    ASOLARIA_ALLOW_PUBLIC_INTERNET = $allowPublicInternet
    ASOLARIA_PUBLIC_INTERNET_IS_PRIVATE = $publicInternetPrivate
    ASOLARIA_UI_CHROME_EMAIL = "plasmatoid@gmail.com"
    ASOLARIA_NETWORK_REMOTE_AUTH_REQUIRED = $remoteAuthRequired
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
    "-WaitForPhoneSeconds", "$WaitForPhoneSeconds",
    "-AdbWifiEndpoint", "$AdbWifiEndpoint",
    "-EnableTailnetProxy:$EnableTailnetProxy",
    "-TailnetProxyPort", "$TailnetProxyPort",
    "-EnableBackgroundKeeper:$EnableBackgroundKeeper",
    "-BackgroundKeeperCheckIntervalSeconds", "$BackgroundKeeperCheckIntervalSeconds",
    "-BackgroundKeeperMaxHours", "$BackgroundKeeperMaxHours",
    "-PhoneOnlyMode:$PhoneOnlyMode",
    "-RunPhoneTunnelSmokeTest:$RunPhoneTunnelSmokeTest",
    "-PhoneTunnelSmokeIncludeRawProbe:$PhoneTunnelSmokeIncludeRawProbe"
  )
  if ($OpenDesktopUi.IsPresent) { $argList += "-OpenDesktopUi" }
  if ($OpenOnPhone.IsPresent) { $argList += "-OpenOnPhone" }
  if ($CopyUrl.IsPresent) { $argList += "-CopyUrl" }
  if ($ForceRemotePhoneUrl.IsPresent) { $argList += "-ForceRemotePhoneUrl" }

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
  $root = Get-AsolariaRoot
  $serverEntry = Join-Path $root "server.js"
  $existing = Get-ServerProcess
  if ($existing) {
    return $existing[0].ProcessId
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

  return $proc.Id
}

function Wait-ForHealth {
  param([int]$Seconds = 35)

  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $null = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/health" -f $Port) -TimeoutSec 2
      return $true
    } catch {
      Start-Sleep -Milliseconds 650
    }
  }
  return $false
}

function Get-MobileBootstrap {
  param([int]$Attempts = 6)
  for ($i = 0; $i -lt $Attempts; $i++) {
    try {
      return Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/mobile/bootstrap" -f $Port) -TimeoutSec 3
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  throw "Failed to fetch mobile bootstrap URL."
}

function Remove-TokenFromUrl {
  param([string]$Url)
  $value = [string]$Url
  if (-not $value) {
    return ""
  }
  $clean = $value -replace "([?&])token=[^&]*", '$1'
  $clean = $clean -replace "\?&", "?"
  $clean = $clean -replace "[?&]$", ""
  return $clean
}

function Update-PhoneUrlsFile {
  param(
    [object]$Bootstrap,
    [int]$HttpPort = 4781
  )

  if (-not $Bootstrap) {
    return
  }

  $root = Get-AsolariaRoot
  $phoneUrlsPath = Join-Path $root "PHONE-URLS.md"
  $localConsole = Remove-TokenFromUrl([string]$Bootstrap.urls.localConsole)
  $remoteConsole = Remove-TokenFromUrl([string]$Bootstrap.urls.remoteConsole)
  $localApprovals = Remove-TokenFromUrl([string]$Bootstrap.urls.localApprovals)
  $remoteApprovals = Remove-TokenFromUrl([string]$Bootstrap.urls.remoteApprovals)

  $lanHost = ""
  if ($remoteConsole -match "^https://([^/:]+)") {
    $lanHost = $matches[1]
  }

  $lanHostIsPrivateIpv4 = $false
  if ($lanHost) {
    $parsedIp = $null
    if ([System.Net.IPAddress]::TryParse($lanHost, [ref]$parsedIp)) {
      if ($parsedIp.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork) {
        $octets = $parsedIp.GetAddressBytes()
        if (
          $octets[0] -eq 10 `
          -or ($octets[0] -eq 172 -and $octets[1] -ge 16 -and $octets[1] -le 31) `
          -or ($octets[0] -eq 192 -and $octets[1] -eq 168)
        ) {
          $lanHostIsPrivateIpv4 = $true
        }
      }
    }
  }

  $certUrl = ""
  if ($lanHostIsPrivateIpv4) {
    $certUrl = "http://${lanHost}:$HttpPort/asolaria-local.cer"
  }

  $generatedAt = Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'

  $content = @(
    "# Asolaria Phone URLs (Tokenless Bookmarks)",
    "",
    "Generated: $generatedAt",
    "",
    "## One-Time Setup (HTTPS Trust For Push)",
    ""
  )

  if ($certUrl) {
    $content += "- Download the Asolaria Local CA certificate to your phone:"
    $content += "  - $certUrl"
    $content += "- Install it on Android as a **CA certificate** (not a Wi-Fi certificate)."
    $content += "- Then fully close/reopen Chrome and use the HTTPS links below."
  } else {
    $content += "- Local certificate install is optional here (remote URL already uses trusted public TLS)."
    $content += "- For tunnel links, no local CA install is required."
  }
  $content += ""
  $content += "## Remote (Wi-Fi / cellular fallback)"
  $content += ""
  $content += "- Mobile Console (recommended bookmark):"
  $content += "  - $remoteConsole"
  $content += "- Mobile Approvals:"
  $content += "  - $remoteApprovals"
  $content += ""
  $content += "## USB-only (via ADB reverse)"
  $content += ""
  $content += "- Mobile Console:"
  $content += "  - $localConsole"
  $content += "- Mobile Approvals:"
  $content += "  - $localApprovals"
  $content += ""
  $content += "## Notes"
  $content += ""
  $content += "- These bookmarks intentionally do NOT include the mobile token."
  $content += "- First time you open a tokenless bookmark:"
  $content += "  - Paste the token into the page and tap Save Token."
  $content += "  - The phone browser will remember it (localStorage) for future visits."
  $content += "- This file is auto-generated by tools/Start-Asolaria-Phone.ps1."

  Set-Content -Path $phoneUrlsPath -Value $content -Encoding UTF8
}

function Test-IsPrivateIpv4Address {
  param([string]$IpAddress)

  $value = [string]$IpAddress
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $false
  }
  $parts = $value.Trim().Split(".")
  if ($parts.Count -ne 4) {
    return $false
  }
  $nums = @()
  foreach ($part in $parts) {
    $n = 0
    if (-not [int]::TryParse([string]$part, [ref]$n)) {
      return $false
    }
    if ($n -lt 0 -or $n -gt 255) {
      return $false
    }
    $nums += $n
  }
  if ($nums[0] -eq 10) { return $true }
  if ($nums[0] -eq 172 -and $nums[1] -ge 16 -and $nums[1] -le 31) { return $true }
  if ($nums[0] -eq 192 -and $nums[1] -eq 168) { return $true }
  return $false
}

function Get-PrivateLanHttpsBaseUrl {
  param([int]$HttpsPort = 5443)

  try {
    $allAddresses = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName())
  } catch {
    return ""
  }

  foreach ($address in @($allAddresses)) {
    if (-not $address) { continue }
    if ($address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
      continue
    }
    $text = [string]$address.IPAddressToString
    if (-not (Test-IsPrivateIpv4Address -IpAddress $text)) {
      continue
    }
    return ("https://{0}:{1}" -f $text, $HttpsPort)
  }
  return ""
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

  $wingetPackagesRoot = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
  if (Test-Path $wingetPackagesRoot) {
    $wingetAdb = Get-ChildItem $wingetPackagesRoot -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like "Google.PlatformTools*" } |
      ForEach-Object { Join-Path $_.FullName "platform-tools\adb.exe" } |
      Where-Object { Test-Path $_ } |
      Select-Object -First 1
    if ($wingetAdb) {
      return $wingetAdb
    }
  }
  return $null
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
  foreach ($path in $candidates) {
    if (Test-Path $path) {
      return $path
    }
  }
  return $null
}

function Get-TailscaleStatus {
  param([string]$TailscalePath)

  if (-not $TailscalePath) { return $null }
  try {
    $raw = & $TailscalePath status --json 2>$null
    if (-not $raw) {
      return $null
    }
    return ($raw | ConvertFrom-Json -ErrorAction Stop)
  } catch {
    return $null
  }
}

function Try-Recover-TailscaleProfile {
  param([string]$TailscalePath)

  if (-not $TailscalePath) { return $false }

  $status = Get-TailscaleStatus -TailscalePath $TailscalePath
  if ($status -and [string]$status.BackendState -eq "Running") {
    return $true
  }

  $switchRows = @()
  try {
    $switchRows = @(& $TailscalePath switch --list 2>$null)
  } catch {
    return $false
  }
  if ($switchRows.Count -lt 2) {
    return $false
  }

  $selectedId = ""
  foreach ($row in $switchRows | Select-Object -Skip 1) {
    $line = [string]$row
    if ($line -match "^\s*([a-z0-9]+)\s+") {
      $selectedId = [string]$matches[1]
      break
    }
  }
  if (-not $selectedId) {
    return $false
  }

  try {
    & $TailscalePath switch $selectedId | Out-Null
  } catch {
    return $false
  }

  $deadline = (Get-Date).AddSeconds(6)
  while ((Get-Date) -lt $deadline) {
    $next = Get-TailscaleStatus -TailscalePath $TailscalePath
    if ($next -and [string]$next.BackendState -eq "Running") {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Get-TailnetDnsName {
  param([string]$TailscalePath)

  if (-not $TailscalePath) { return "" }
  try {
    $status = Get-TailscaleStatus -TailscalePath $TailscalePath
    if (-not $status) {
      return ""
    }
    $dns = [string]$status.Self.DNSName
    if (-not $dns) {
      return ""
    }
    if ($dns.EndsWith(".")) {
      $dns = $dns.Substring(0, $dns.Length - 1)
    }
    return $dns
  } catch {
    return ""
  }
}

function Ensure-TailnetProxy {
  param(
    [string]$TailscalePath,
    [int]$LocalPort,
    [int]$ProxyPort
  )

  if (-not $TailscalePath) {
    return [pscustomobject]@{
      enabled = $false
      configured = $false
      reason = "tailscale_not_found"
      dnsName = ""
      baseUrl = ""
      proxyPort = $ProxyPort
    }
  }

  $dnsName = Get-TailnetDnsName -TailscalePath $TailscalePath
  if (-not $dnsName) {
    $recovered = Try-Recover-TailscaleProfile -TailscalePath $TailscalePath
    if ($recovered) {
      $dnsName = Get-TailnetDnsName -TailscalePath $TailscalePath
    }
  }
  if (-not $dnsName) {
    return [pscustomobject]@{
      enabled = $false
      configured = $false
      reason = "tailscale_not_connected"
      dnsName = ""
      baseUrl = ""
      proxyPort = $ProxyPort
    }
  }

  $target = "http://127.0.0.1:$LocalPort"
  $baseUrl = "http://${dnsName}:$ProxyPort"
  try {
    & $TailscalePath serve --bg --http=$ProxyPort $target | Out-Null
  } catch {
    return [pscustomobject]@{
      enabled = $true
      configured = $false
      reason = ("tailscale_serve_failed: " + $_.Exception.Message)
      dnsName = $dnsName
      baseUrl = $baseUrl
      proxyPort = $ProxyPort
    }
  }

  $configured = $false
  try {
    $serveStatusRaw = & $TailscalePath serve status --json 2>$null
    if ($serveStatusRaw) {
      $serveStatus = $serveStatusRaw | ConvertFrom-Json -ErrorAction Stop
      $tcpEntry = $serveStatus.TCP."$ProxyPort"
      if ($tcpEntry) {
        $configured = $true
      }
    }
  } catch {
    $configured = $false
  }

  return [pscustomobject]@{
    enabled = $true
    configured = $configured
    reason = if ($configured) { "ok" } else { "serve_status_unverified" }
    dnsName = $dnsName
    baseUrl = $baseUrl
    proxyPort = $ProxyPort
  }
}

function Update-MobileRemoteConnection {
  param(
    [int]$LocalPort,
    [string]$Token,
    [string]$RemoteBaseUrl,
    [bool]$PhoneOnlyMode = $true
  )

  if (-not $Token -or -not $RemoteBaseUrl) {
    return [pscustomobject]@{
      ok = $false
      reason = "missing_token_or_remote_base_url"
      remoteBaseUrl = [string]$RemoteBaseUrl
    }
  }

  $preferredChannels = if ($PhoneOnlyMode) {
    @("usb", "vpn", "private_internet")
  } else {
    @("usb", "vpn", "private_internet", "public_internet")
  }

  $headers = @{ "x-asolaria-mobile-token" = [string]$Token }
  $payload = @{
    preference = $preferredChannels
    available = $preferredChannels
    remoteBaseUrl = [string]$RemoteBaseUrl
    allowPublicInternet = if ($PhoneOnlyMode) { $false } else { $true }
    publicInternetPrivate = if ($PhoneOnlyMode) { $false } else { $true }
    remoteAuthRequired = if ($PhoneOnlyMode) { $true } else { $false }
    requireEncryptedRemote = $true
    stealthDeny = $true
  } | ConvertTo-Json -Depth 6

  try {
    $response = Invoke-RestMethod -Method Post `
      -Uri ("http://127.0.0.1:{0}/api/mobile/connections" -f $LocalPort) `
      -Headers $headers `
      -ContentType "application/json" `
      -Body $payload `
      -TimeoutSec 6
    return [pscustomobject]@{
      ok = $true
      reason = "ok"
      remoteBaseUrl = [string]$response.remoteBaseUrl
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      reason = ("mobile_connection_update_failed: " + $_.Exception.Message)
      remoteBaseUrl = [string]$RemoteBaseUrl
    }
  }
}

function Get-AdbDeviceCount {
  param([string]$AdbPath)
  try {
    $output = & $AdbPath devices 2>$null
    $count = 0
    foreach ($line in $output) {
      if ($line -match "^\S+\s+device$") {
        $count++
      }
    }
    return $count
  } catch {
    return 0
  }
}

function Try-OpenUrlOnPhone {
  param(
    [string]$AdbPath,
    [string]$Url
  )

  if (-not $AdbPath) { return $false }
  if (-not $Url) { return $false }

  # Attempt 1: Native intent.
  try {
    & $AdbPath shell am start -a android.intent.action.VIEW -d $Url | Out-Null
    return $true
  } catch {
    # continue to UI fallback
  }

  # Attempt 2: UI automation fallback (more reliable on some devices and avoids intent restrictions).
  $remoteUiPath = "/sdcard/asolaria-ui.xml"
  $localUiPath = Join-Path $env:TEMP ("asolaria-ui-" + [Guid]::NewGuid().ToString("N") + ".xml")

  function Dump-Ui {
    try { & $AdbPath shell uiautomator dump $remoteUiPath | Out-Null } catch { return $false }
    try { & $AdbPath pull $remoteUiPath $localUiPath | Out-Null } catch { return $false }
    return $true
  }

  function Get-UrlBarBounds {
    param([string]$XmlPath)
    try {
      $content = Get-Content -LiteralPath $XmlPath -Raw -ErrorAction Stop
    } catch {
      return $null
    }

    # Prefer a focused URL bar (after tapping it).
    if ($content -match '<node[^>]*resource-id="com\.android\.chrome:id/url_bar"[^>]*focused="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*/>') {
      return [pscustomobject]@{ x1 = [int]$matches[1]; y1 = [int]$matches[2]; x2 = [int]$matches[3]; y2 = [int]$matches[4] }
    }

    # Otherwise, use the first URL bar found.
    if ($content -match '<node[^>]*resource-id="com\.android\.chrome:id/url_bar"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*/>') {
      return [pscustomobject]@{ x1 = [int]$matches[1]; y1 = [int]$matches[2]; x2 = [int]$matches[3]; y2 = [int]$matches[4] }
    }

    return $null
  }

  try {
    & $AdbPath shell monkey -p com.android.chrome -c android.intent.category.LAUNCHER 1 | Out-Null
  } catch {
    # continue
  }

  Start-Sleep -Milliseconds 650

  if (-not (Dump-Ui)) { return $false }
  $bounds = Get-UrlBarBounds -XmlPath $localUiPath
  if (-not $bounds) { return $false }

  $tapX = [int](($bounds.x1 + $bounds.x2) / 2)
  $tapY = [int](($bounds.y1 + $bounds.y2) / 2)
  try { & $AdbPath shell input tap $tapX $tapY | Out-Null } catch { return $false }
  Start-Sleep -Milliseconds 300

  # Refresh bounds (Chrome sometimes moves the URL bar to the top while editing).
  if (Dump-Ui) {
    $bounds2 = Get-UrlBarBounds -XmlPath $localUiPath
    if ($bounds2) {
      $tapX2 = [int](($bounds2.x1 + $bounds2.x2) / 2)
      $tapY2 = [int](($bounds2.y1 + $bounds2.y2) / 2)
      try { & $AdbPath shell input tap $tapX2 $tapY2 | Out-Null } catch {}
    }
  }

  Start-Sleep -Milliseconds 150

  # Best-effort sanitize; URLs should have no spaces.
  $safeUrl = ($Url -replace " ", "%s")

  try { & $AdbPath shell input text $safeUrl | Out-Null } catch { return $false }
  Start-Sleep -Milliseconds 150
  try { & $AdbPath shell input keyevent 66 | Out-Null } catch { return $false }
  return $true
}

function Try-BridgePhone {
  param(
    [string]$AdbPath,
    [string]$PhoneUrl,
    [string]$AdbWifiEndpoint = ""
  )

  if (-not $AdbPath) {
    return [pscustomobject]@{
      adbFound = $false
      bridged = $false
      openedOnPhone = $false
      reason = "adb_not_found"
    }
  }

  try {
    & $AdbPath start-server | Out-Null
  } catch {
    # continue
  }

  $devices = Get-AdbDeviceCount -AdbPath $AdbPath
  if ($devices -lt 1 -and $WaitForPhoneSeconds -gt 0) {
    Write-Host ("Waiting up to {0}s for an authorized USB debugging device..." -f $WaitForPhoneSeconds)
    $deadline = (Get-Date).AddSeconds($WaitForPhoneSeconds)
    while ((Get-Date) -lt $deadline) {
      Start-Sleep -Milliseconds 900
      $devices = Get-AdbDeviceCount -AdbPath $AdbPath
      if ($devices -ge 1) {
        break
      }
    }
  }
  $wirelessEndpoint = [string]$AdbWifiEndpoint
  if ([string]::IsNullOrWhiteSpace($wirelessEndpoint)) {
    $wirelessEndpoint = [string]$env:ASOLARIA_PHONE_ADB_WIFI_ENDPOINT
  }
  $wirelessConnectTried = $false
  $wirelessConnectOutput = ""
  if ($devices -lt 1 -and -not [string]::IsNullOrWhiteSpace($wirelessEndpoint)) {
    $wirelessConnectTried = $true
    try {
      $wirelessRaw = & $AdbPath connect $wirelessEndpoint 2>&1
      $wirelessConnectOutput = [string](@($wirelessRaw) -join " ").Trim()
    } catch {
      $wirelessConnectOutput = $_.Exception.Message
    }
    Start-Sleep -Milliseconds 900
    $devices = Get-AdbDeviceCount -AdbPath $AdbPath
  }
  if ($devices -lt 1) {
    return [pscustomobject]@{
      adbFound = $true
      bridged = $false
      openedOnPhone = $false
      reason = "no_authorized_device"
      adbPath = $AdbPath
      wirelessConnectTried = $wirelessConnectTried
      wirelessEndpoint = $wirelessEndpoint
      wirelessConnectOutput = $wirelessConnectOutput
    }
  }

  try {
    & $AdbPath reverse ("tcp:{0}" -f $Port) ("tcp:{0}" -f $Port) | Out-Null
    $opened = $false
    if ($OpenOnPhone.IsPresent) {
      try {
        $opened = Try-OpenUrlOnPhone -AdbPath $AdbPath -Url $PhoneUrl
      } catch {
        $opened = $false
      }
    }
    return [pscustomobject]@{
      adbFound = $true
      bridged = $true
      openedOnPhone = $opened
      reason = "ok"
      adbPath = $AdbPath
      wirelessConnectTried = $wirelessConnectTried
      wirelessEndpoint = $wirelessEndpoint
      wirelessConnectOutput = $wirelessConnectOutput
    }
  } catch {
    return [pscustomobject]@{
      adbFound = $true
      bridged = $false
      openedOnPhone = $false
      reason = ("adb_reverse_failed: " + $_.Exception.Message)
      adbPath = $AdbPath
      wirelessConnectTried = $wirelessConnectTried
      wirelessEndpoint = $wirelessEndpoint
      wirelessConnectOutput = $wirelessConnectOutput
    }
  }
}

function Sync-AsolariaCompanionRoute {
  param(
    [string]$AdbPath,
    [string]$BaseUrl,
    [string]$Token,
    [bool]$RequireBridge = $true,
    [bool]$BridgeActive = $false
  )

  if (-not $AdbPath) {
    return [pscustomobject]@{
      attempted = $false
      ok = $false
      reason = "adb_not_found"
    }
  }
  if ($RequireBridge -and -not $BridgeActive) {
    return [pscustomobject]@{
      attempted = $false
      ok = $false
      reason = "bridge_inactive"
    }
  }
  if (-not $BaseUrl) {
    return [pscustomobject]@{
      attempted = $false
      ok = $false
      reason = "missing_remote_base_url"
    }
  }
  if (-not $Token) {
    return [pscustomobject]@{
      attempted = $false
      ok = $false
      reason = "missing_mobile_token"
    }
  }

  try {
    & $AdbPath shell am start -n com.jessebrown.asolaria/.MainActivity --es asolaria.base_url $BaseUrl --es asolaria.token $Token | Out-Null
    return [pscustomobject]@{
      attempted = $true
      ok = $true
      reason = "ok"
      baseUrl = $BaseUrl
    }
  } catch {
    return [pscustomobject]@{
      attempted = $true
      ok = $false
      reason = ("sync_failed: " + $_.Exception.Message)
      baseUrl = $BaseUrl
    }
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

function Ensure-PhoneBackgroundKeeper {
  param(
    [int]$HttpPort,
    [int]$IntervalSeconds,
    [int]$MaxHours
  )

  $starter = Join-Path $PSScriptRoot "Start-Asolaria-PhoneBackgroundKeeper.ps1"
  if (-not (Test-Path $starter)) {
    return [pscustomobject]@{
      ok = $false
      reason = "starter_not_found"
      pid = 0
      logPath = ""
    }
  }

  try {
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $starter `
      -Port $HttpPort `
      -CheckIntervalSeconds $IntervalSeconds `
      -MaxHours $MaxHours
    $keeperPid = 0
    $logPath = ""
    $alreadyRunning = $false
    foreach ($line in @($output)) {
      $text = [string]$line
      if ($text -match "PID:\s*(\d+)") {
        $keeperPid = [int]$matches[1]
      }
      if ($text -match "pid=(\d+)") {
        $keeperPid = [int]$matches[1]
      }
      if ($text -match "already running") {
        $alreadyRunning = $true
      }
      if ($text -match "Log file:\s*(.+)$") {
        $logPath = [string]$matches[1]
      }
    }
    return [pscustomobject]@{
      ok = $true
      reason = if ($alreadyRunning) { "already_running" } else { "ok" }
      pid = $keeperPid
      logPath = $logPath
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      reason = ("keeper_start_failed: " + $_.Exception.Message)
      pid = 0
      logPath = ""
    }
  }
}

function Invoke-PhoneTunnelSmokeTest {
  param(
    [int]$HttpPort,
    [bool]$IncludeRawProbe = $false
  )

  $tester = Join-Path $PSScriptRoot "Test-Asolaria-PhoneTunnelPath.ps1"
  if (-not (Test-Path $tester)) {
    return [pscustomobject]@{
      ok = $false
      reason = "tester_not_found"
      reportPath = ""
      remoteBaseUrl = ""
      notes = @("Test-Asolaria-PhoneTunnelPath.ps1 not found.")
    }
  }

  $argList = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $tester,
    "-BaseUrl", ("http://127.0.0.1:{0}" -f $HttpPort),
    "-Channel", "auto"
  )
  if ($IncludeRawProbe) {
    $argList += "-IncludePhoneRawProbe"
  }

  try {
    $output = & powershell @argList
    $jsonText = [string](@($output) -join "`n")
    $parsed = $jsonText | ConvertFrom-Json -ErrorAction Stop
    return [pscustomobject]@{
      ok = [bool]$parsed.ok
      reason = if ($parsed.ok) { "ok" } else { "smoke_failed" }
      reportPath = [string]$parsed.reportPath
      remoteBaseUrl = [string]$parsed.remote.baseUrl
      notes = @($parsed.notes)
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      reason = ("smoke_run_failed: " + $_.Exception.Message)
      reportPath = ""
      remoteBaseUrl = ""
      notes = @()
    }
  }
}

Ensure-Elevated
Set-AsolariaProcessEnvDefaults -PhoneOnlyMode $PhoneOnlyMode
Ensure-HttpsCert

$serverPid = Start-ServerIfNeeded
$healthy = Wait-ForHealth
if (-not $healthy) {
  throw "Asolaria failed to become healthy on port $Port. PID=$serverPid"
}

$bootstrap = Get-MobileBootstrap
$tailnet = $null
$mobileConnectionUpdate = $null

if ($EnableTailnetProxy) {
  $tailscalePath = Resolve-TailscalePath
  $tailnet = Ensure-TailnetProxy -TailscalePath $tailscalePath -LocalPort $Port -ProxyPort $TailnetProxyPort
  if ($tailnet.enabled -and $tailnet.baseUrl) {
    $mobileConnectionUpdate = Update-MobileRemoteConnection `
      -LocalPort $Port `
      -Token ([string]$bootstrap.token) `
      -RemoteBaseUrl ([string]$tailnet.baseUrl) `
      -PhoneOnlyMode $PhoneOnlyMode
    if ($mobileConnectionUpdate.ok) {
      $bootstrap = Get-MobileBootstrap
    }
  }
}

if ($PhoneOnlyMode -and ((-not $mobileConnectionUpdate) -or (-not $mobileConnectionUpdate.ok))) {
  $httpsPort = 5443
  $envHttpsPort = [string]$env:ASOLARIA_HTTPS_PORT
  if (-not [string]::IsNullOrWhiteSpace($envHttpsPort)) {
    $parsedHttpsPort = 0
    if ([int]::TryParse($envHttpsPort, [ref]$parsedHttpsPort) -and $parsedHttpsPort -gt 0) {
      $httpsPort = $parsedHttpsPort
    }
  }
  $lanHttpsBaseUrl = Get-PrivateLanHttpsBaseUrl -HttpsPort $httpsPort
  if ($lanHttpsBaseUrl) {
    $mobileConnectionUpdate = Update-MobileRemoteConnection `
      -LocalPort $Port `
      -Token ([string]$bootstrap.token) `
      -RemoteBaseUrl $lanHttpsBaseUrl `
      -PhoneOnlyMode $PhoneOnlyMode
    if ($mobileConnectionUpdate.ok) {
      $bootstrap = Get-MobileBootstrap
    }
  }
}

$localConsoleUrl = [string]$bootstrap.urls.localConsole
$remoteConsoleUrl = [string]$bootstrap.urls.remoteConsole
$localApprovalUrl = [string]$bootstrap.urls.localApprovals
$remoteApprovalUrl = [string]$bootstrap.urls.remoteApprovals
$remoteBaseUrl = [string]$bootstrap.connection.remoteBaseUrl
if (-not $remoteBaseUrl -and $remoteConsoleUrl) {
  try {
    $remoteUri = [Uri]$remoteConsoleUrl
    $portPart = if ($remoteUri.IsDefaultPort) { "" } else { ":" + $remoteUri.Port }
    $remoteBaseUrl = ("{0}://{1}{2}" -f $remoteUri.Scheme, $remoteUri.Host, $portPart)
  } catch {
    $remoteBaseUrl = ""
  }
}

$localPhoneUrl = if ($localConsoleUrl) { $localConsoleUrl } else { [string]$bootstrap.urls.local }
$remotePhoneUrl = if ($remoteConsoleUrl) { $remoteConsoleUrl } else { [string]$bootstrap.urls.remote }
Update-PhoneUrlsFile -Bootstrap $bootstrap -HttpPort $Port

$targetPhoneUrl = if ($ForceRemotePhoneUrl.IsPresent -and $remotePhoneUrl) {
  $remotePhoneUrl
} elseif ($remotePhoneUrl) {
  # Prefer remote path so the phone session survives USB unplug.
  $remotePhoneUrl
} else {
  $localPhoneUrl
}

$adbPath = Resolve-AdbPath
$bridge = Try-BridgePhone -AdbPath $adbPath -PhoneUrl $targetPhoneUrl -AdbWifiEndpoint $AdbWifiEndpoint
$routeSync = Sync-AsolariaCompanionRoute `
  -AdbPath $adbPath `
  -BaseUrl $remoteBaseUrl `
  -Token ([string]$bootstrap.token) `
  -RequireBridge $false `
  -BridgeActive ([bool]$bridge.bridged)
$backgroundKeeper = $null
if ($EnableBackgroundKeeper) {
  $backgroundKeeper = Ensure-PhoneBackgroundKeeper `
    -HttpPort $Port `
    -IntervalSeconds $BackgroundKeeperCheckIntervalSeconds `
    -MaxHours $BackgroundKeeperMaxHours
}
$phoneTunnelSmoke = $null
if ($RunPhoneTunnelSmokeTest) {
  $phoneTunnelSmoke = Invoke-PhoneTunnelSmokeTest `
    -HttpPort $Port `
    -IncludeRawProbe $PhoneTunnelSmokeIncludeRawProbe
}

$phoneUrl = $targetPhoneUrl
if (-not $ForceRemotePhoneUrl.IsPresent -and -not $bridge.bridged -and $remotePhoneUrl) {
  $phoneUrl = $remotePhoneUrl
}

if ($CopyUrl.IsPresent -and $phoneUrl) {
  try {
    Set-Clipboard -Value $phoneUrl
  } catch {
    # ignore clipboard errors
  }
}

if ($OpenDesktopUi.IsPresent) {
  try {
    $uiLaunch = Open-AsolariaUiUrl -Url ("http://127.0.0.1:{0}" -f $Port)
    if ($uiLaunch -and $uiLaunch.ok) {
      Write-Host "Desktop UI opened."
      Write-Host ("Desktop UI profile: {0} ({1})" -f [string]$uiLaunch.profileDirectory, [string]$uiLaunch.profileEmail)
    }
  } catch {
    Write-Warning ("Failed to auto-open desktop UI with managed Chrome profile: " + $_.Exception.Message)
  }
}

Write-Host ""
Write-Host "Asolaria is running. PID=$serverPid Port=$Port"
Write-Host "Phone URL: $phoneUrl"
Write-Host "Phone Console (USB): $localPhoneUrl"
Write-Host "Phone Console (Remote): $remotePhoneUrl"
Write-Host "Approval Center (USB): $localApprovalUrl"
Write-Host "Approval Center (Remote): $remoteApprovalUrl"
Write-Host "USB URL: $localPhoneUrl"
Write-Host "Remote URL: $remotePhoneUrl"
Write-Host "URL copied to clipboard: $($CopyUrl.IsPresent)"
Write-Host "Phone-only mode: $PhoneOnlyMode"
Write-Host "ADB found: $($bridge.adbFound)"
Write-Host "USB bridge active: $($bridge.bridged)"
Write-Host "Opened on phone: $($bridge.openedOnPhone)"
Write-Host "Status: $($bridge.reason)"
if ($bridge -and $bridge.PSObject.Properties.Match("wirelessConnectTried").Count -gt 0) {
  Write-Host "ADB wireless connect tried: $($bridge.wirelessConnectTried)"
  if (-not [string]::IsNullOrWhiteSpace([string]$bridge.wirelessEndpoint)) {
    Write-Host "ADB wireless endpoint: $($bridge.wirelessEndpoint)"
  }
  if (-not [string]::IsNullOrWhiteSpace([string]$bridge.wirelessConnectOutput)) {
    Write-Host "ADB wireless output: $($bridge.wirelessConnectOutput)"
  }
}
Write-Host "Companion route sync attempted: $($routeSync.attempted)"
Write-Host "Companion route sync ok: $($routeSync.ok)"
Write-Host "Companion route sync status: $($routeSync.reason)"
$routeSyncBaseUrl = ""
if ($routeSync -and $routeSync.PSObject.Properties.Match("baseUrl").Count -gt 0) {
  $routeSyncBaseUrl = [string]$routeSync.baseUrl
}
if (-not [string]::IsNullOrWhiteSpace($routeSyncBaseUrl)) {
  Write-Host "Companion synced remote base: $routeSyncBaseUrl"
}
if ($tailnet) {
  Write-Host "Tailnet proxy enabled: $($tailnet.enabled)"
  Write-Host "Tailnet proxy configured: $($tailnet.configured)"
  Write-Host "Tailnet base URL: $($tailnet.baseUrl)"
  Write-Host "Tailnet status: $($tailnet.reason)"
}
if ($mobileConnectionUpdate) {
  Write-Host "Mobile remote route updated: $($mobileConnectionUpdate.ok)"
  Write-Host "Mobile remote route URL: $($mobileConnectionUpdate.remoteBaseUrl)"
  Write-Host "Mobile route status: $($mobileConnectionUpdate.reason)"
}
if ($backgroundKeeper) {
  Write-Host "Background keeper enabled: $EnableBackgroundKeeper"
  Write-Host "Background keeper status: $($backgroundKeeper.reason)"
  Write-Host "Background keeper PID: $($backgroundKeeper.pid)"
  Write-Host "Background keeper log: $($backgroundKeeper.logPath)"
}
if ($phoneTunnelSmoke) {
  Write-Host "Phone tunnel smoke test enabled: $RunPhoneTunnelSmokeTest"
  Write-Host "Phone tunnel smoke status: $($phoneTunnelSmoke.reason)"
  Write-Host "Phone tunnel smoke ok: $($phoneTunnelSmoke.ok)"
  Write-Host "Phone tunnel smoke remote: $($phoneTunnelSmoke.remoteBaseUrl)"
  Write-Host "Phone tunnel smoke report: $($phoneTunnelSmoke.reportPath)"
}
Write-Host ""
Write-Host "If phone did not open:"
Write-Host "1) Connect USB and enable USB debugging."
Write-Host "2) Authorize this PC on the phone prompt."
Write-Host ("3) Run: adb reverse tcp:{0} tcp:{0}" -f $Port)
Write-Host ("4) Open on phone: {0}" -f $phoneUrl)
