param(
  [int]$Port = 4781,
  [switch]$ApplyFixes,
  [switch]$SkipCleanup,
  [switch]$CleanupApply,
  [switch]$SkipPhoneSmoke,
  [bool]$AllowInsecureRemoteTls = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Probe-Json {
  param(
    [string]$Url,
    [hashtable]$Headers = @{},
    [int]$TimeoutSec = 6,
    [bool]$SkipCertValidation = $false
  )
  try {
    $data = $null
    if ($SkipCertValidation) {
      $curlCmd = Get-Command curl.exe -ErrorAction SilentlyContinue
      if ($curlCmd) {
        $tempBodyPath = Join-Path $env:TEMP ("asolaria-heal-probe-" + [Guid]::NewGuid().ToString("N") + ".json")
        try {
          $args = @("-s", "-k", "-o", $tempBodyPath, "-w", "%{http_code}", "--max-time", "$TimeoutSec")
          foreach ($entry in $Headers.GetEnumerator()) {
            $args += @("-H", ("{0}: {1}" -f [string]$entry.Key, [string]$entry.Value))
          }
          $args += $Url
          $statusRaw = & $curlCmd.Source @args 2>$null
          $statusCode = 0
          [void][int]::TryParse([string]$statusRaw, [ref]$statusCode)
          if ($statusCode -lt 200 -or $statusCode -ge 300) {
            throw ("HTTP status " + [string]$statusCode)
          }
          $body = [string](Get-Content -Path $tempBodyPath -Raw -ErrorAction SilentlyContinue)
          if ($body) {
            $data = $body | ConvertFrom-Json -ErrorAction Stop
          } else {
            $data = @{}
          }
        } finally {
          if (Test-Path -LiteralPath $tempBodyPath) {
            Remove-Item -LiteralPath $tempBodyPath -Force -ErrorAction SilentlyContinue
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
      data = $data
      error = ""
      url = $Url
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      data = $null
      error = $_.Exception.Message
      url = $Url
    }
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
    if (Test-Path -LiteralPath $path) {
      return $path
    }
  }
  return ""
}

function Get-AdbAuthorizedDevices {
  param([string]$AdbPath)
  if (-not $AdbPath) { return @() }
  try {
    $rows = & $AdbPath devices 2>$null
    $devices = @()
    foreach ($row in @($rows)) {
      if ([string]$row -match "^(\S+)\s+device$") {
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
    [int]$ListenPort
  )
  if (-not $AdbPath) { return $false }
  try {
    $rows = & $AdbPath reverse --list 2>$null
    foreach ($row in @($rows)) {
      if ([string]$row -match ("tcp:{0}\s+tcp:{0}" -f $ListenPort)) {
        return $true
      }
    }
    return $false
  } catch {
    return $false
  }
}

function Ensure-AdbReverse {
  param(
    [string]$AdbPath,
    [int]$ListenPort
  )
  if (-not $AdbPath) {
    return [pscustomobject]@{ ok = $false; reason = "adb_not_found" }
  }
  try {
    & $AdbPath reverse ("tcp:{0}" -f $ListenPort) ("tcp:{0}" -f $ListenPort) | Out-Null
    return [pscustomobject]@{ ok = $true; reason = "ok" }
  } catch {
    return [pscustomobject]@{ ok = $false; reason = $_.Exception.Message }
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
  param([string]$RemoteBase)
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
  return "private_internet"
}

function Get-ShortcutAudit {
  param([string]$RepoRoot)
  $targets = @(
    (Join-Path $env:USERPROFILE "Desktop"),
    [Environment]::GetFolderPath("Desktop"),
    [Environment]::GetFolderPath("Startup"),
    "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp"
  ) | Select-Object -Unique

  $wsh = New-Object -ComObject WScript.Shell
  $rows = New-Object System.Collections.Generic.List[object]

  foreach ($dir in $targets) {
    if (-not (Test-Path -LiteralPath $dir)) { continue }
    Get-ChildItem -LiteralPath $dir -Filter "*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {
      $shortcut = $wsh.CreateShortcut($_.FullName)
      $name = [string]$_.Name
      $target = [string]$shortcut.TargetPath
      $args = [string]$shortcut.Arguments

      $isAsolariaShortcut = $name -match "Asolaria|ADB Health|Phone Connect|Control Plane|Stop Asolaria"
      if (-not $isAsolariaShortcut) { return }

      $exists = if ([string]::IsNullOrWhiteSpace($target)) { $false } else { Test-Path -LiteralPath $target }
      $looksLegacy = $target -match "CodexSandboxOffline"
      $outsideRepo = ($target -and $target -match "Asolaria") -and (-not $target.StartsWith($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase))

      $rows.Add([pscustomobject]@{
          name = $name
          shortcutPath = $_.FullName
          targetPath = $target
          arguments = $args
          exists = $exists
          legacy = $looksLegacy
          outsideRepo = $outsideRepo
          broken = (-not $exists) -or $looksLegacy -or $outsideRepo
        })
    }
  }

  $all = @($rows.ToArray())
  $broken = @($all | Where-Object { $_.broken })
  return [pscustomobject]@{
    total = $all.Count
    broken = $broken.Count
    items = $all
    brokenItems = $broken
  }
}

function Ensure-ServerHealthy {
  param(
    [string]$RepoRoot,
    [int]$HttpPort
  )
  $health = Probe-Json -Url ("http://127.0.0.1:{0}/api/health" -f $HttpPort)
  if ($health.ok) {
    return $health
  }
  if (-not $ApplyFixes.IsPresent) {
    return $health
  }

  $starter = Join-Path $RepoRoot "tools\Start-Asolaria.ps1"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $starter -Port $HttpPort | Out-Null
  Start-Sleep -Seconds 1
  return Probe-Json -Url ("http://127.0.0.1:{0}/api/health" -f $HttpPort)
}

$repoRoot = Resolve-RepoRoot
$reportsDir = Join-Path $repoRoot "reports"
Ensure-Dir -Path $reportsDir

$health = Ensure-ServerHealthy -RepoRoot $repoRoot -HttpPort $Port
$bootstrap = Probe-Json -Url ("http://127.0.0.1:{0}/api/mobile/bootstrap" -f $Port)
$bootstrapData = $bootstrap.data
$token = if ($bootstrap.ok) { [string]$bootstrapData.token } else { "" }
$remoteBase = if ($bootstrap.ok) { Resolve-RemoteBaseFromBootstrap -Bootstrap $bootstrapData } else { "" }
$remoteChannel = Resolve-RemoteChannel -RemoteBase $remoteBase

$authHeaders = @{}
if ($token) {
  $authHeaders = @{
    "x-asolaria-mobile-token" = $token
    "x-asolaria-token" = $token
    "x-asolaria-channel" = $remoteChannel
  }
}

$remoteHealth = [pscustomobject]@{ ok = $false; error = "remote_base_missing"; data = $null; url = "" }
$remoteSession = [pscustomobject]@{ ok = $false; error = "remote_base_missing"; data = $null; url = "" }
$remoteControl = [pscustomobject]@{ ok = $false; error = "remote_base_missing"; data = $null; url = "" }
if ($remoteBase) {
  $remoteSkipCertValidation = $false
  if ($AllowInsecureRemoteTls) {
    try {
      $remoteUri = [System.Uri]$remoteBase
      if ([string]$remoteUri.Scheme -eq "https") {
        $remoteSkipCertValidation = $true
      }
    } catch {
      $remoteSkipCertValidation = $false
    }
  }
  $remoteHealth = Probe-Json -Url ("{0}/api/health?channel={1}" -f $remoteBase, [Uri]::EscapeDataString($remoteChannel)) -Headers $authHeaders -SkipCertValidation $remoteSkipCertValidation
  $remoteSession = Probe-Json -Url ("{0}/api/mobile/session?channel={1}" -f $remoteBase, [Uri]::EscapeDataString($remoteChannel)) -Headers $authHeaders -SkipCertValidation $remoteSkipCertValidation
  $remoteControl = Probe-Json -Url ("{0}/api/mobile/control/status?channel={1}" -f $remoteBase, [Uri]::EscapeDataString($remoteChannel)) -Headers $authHeaders -SkipCertValidation $remoteSkipCertValidation
}

$adbPath = Resolve-AdbPath
$adbAuthorized = @(Get-AdbAuthorizedDevices -AdbPath $adbPath)
$reversePresent = Test-AdbReverseMapping -AdbPath $adbPath -ListenPort $Port
$reverseFix = [pscustomobject]@{ attempted = $false; ok = $false; reason = "not_requested" }

if ($ApplyFixes.IsPresent -and $adbPath -and $adbAuthorized.Count -gt 0 -and -not $reversePresent) {
  $reverseFix = Ensure-AdbReverse -AdbPath $adbPath -ListenPort $Port
  $reverseFix | Add-Member -NotePropertyName attempted -NotePropertyValue $true -Force
  $reversePresent = Test-AdbReverseMapping -AdbPath $adbPath -ListenPort $Port
}

$shortcutAudit = Get-ShortcutAudit -RepoRoot $repoRoot
$shortcutRepair = [pscustomobject]@{ attempted = $false; ok = $false; reason = "not_requested" }
if ($ApplyFixes.IsPresent -and $shortcutAudit.broken -gt 0) {
  $installer = Join-Path $repoRoot "tools\Install-Asolaria-DesktopShortcuts.ps1"
  try {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $installer -IncludeControlPlaneShortcuts -CleanupActiveDesktopLegacy | Out-Null
    $shortcutRepair = [pscustomobject]@{ attempted = $true; ok = $true; reason = "reinstalled_shortcuts" }
    $shortcutAudit = Get-ShortcutAudit -RepoRoot $repoRoot
  } catch {
    $shortcutRepair = [pscustomobject]@{ attempted = $true; ok = $false; reason = $_.Exception.Message }
  }
}

$notebookGoogle = Probe-Json -Url ("http://127.0.0.1:{0}/api/integrations/google/status" -f $Port)
$notebookGeminiApi = Probe-Json -Url ("http://127.0.0.1:{0}/api/integrations/gemini_api/status" -f $Port)
$notebookVertex = Probe-Json -Url ("http://127.0.0.1:{0}/api/integrations/vertex/status" -f $Port)

$phoneSmoke = [pscustomobject]@{
  ok = $false
  reason = "skipped"
  reportPath = ""
  remoteBaseUrl = $remoteBase
  notes = @()
}
if (-not $SkipPhoneSmoke.IsPresent) {
  $smokeScript = Join-Path $repoRoot "tools\Test-Asolaria-PhoneTunnelPath.ps1"
  if (Test-Path -LiteralPath $smokeScript) {
    try {
      $smokeRaw = & powershell -NoProfile -ExecutionPolicy Bypass -File $smokeScript -BaseUrl ("http://127.0.0.1:{0}" -f $Port) -Channel auto
      $smokeJson = [string](@($smokeRaw) -join [Environment]::NewLine) | ConvertFrom-Json -ErrorAction Stop
      $phoneSmoke = [pscustomobject]@{
        ok = [bool]$smokeJson.ok
        reason = if ([bool]$smokeJson.ok) { "ok" } else { "smoke_failed" }
        reportPath = [string]$smokeJson.reportPath
        remoteBaseUrl = [string]$smokeJson.remote.baseUrl
        notes = @($smokeJson.notes)
      }
    } catch {
      $phoneSmoke = [pscustomobject]@{
        ok = $false
        reason = "smoke_run_failed"
        reportPath = ""
        remoteBaseUrl = $remoteBase
        notes = @($_.Exception.Message)
      }
    }
  }
}

$cleanup = [pscustomobject]@{
  attempted = $false
  ok = $true
  dryRun = $true
  reportPath = ""
  error = ""
}
if (-not $SkipCleanup.IsPresent) {
  $cleanupScript = Join-Path $repoRoot "tools\Clean-Asolaria-DataArtifacts.ps1"
  if (Test-Path -LiteralPath $cleanupScript) {
    $cleanup.attempted = $true
    try {
      $cleanupRaw = if ($CleanupApply) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $cleanupScript -Apply
      } else {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $cleanupScript
      }
      $cleanupJson = [string](@($cleanupRaw) -join [Environment]::NewLine) | ConvertFrom-Json -ErrorAction Stop
      $cleanup.ok = [bool]$cleanupJson.ok
      $cleanup.dryRun = [bool]$cleanupJson.dryRun
      $cleanup.reportPath = [string]$cleanupJson.reportPath
    } catch {
      $cleanup.ok = $false
      $cleanup.error = $_.Exception.Message
    }
  }
}

$compatibility = [ordered]@{
  serverHealth = [bool]$health.ok
  mobileBootstrap = [bool]$bootstrap.ok
  remoteHealth = [bool]$remoteHealth.ok
  remoteSession = [bool]$remoteSession.ok
  remoteControl = [bool]$remoteControl.ok
  adb = [bool]($adbPath -and $adbAuthorized.Count -gt 0)
  adbReverse = [bool]$reversePresent
  phoneSmoke = [bool]$phoneSmoke.ok
  notebookPath = [bool]($notebookGoogle.ok -and $notebookGeminiApi.ok -and $notebookVertex.ok)
  shortcuts = [bool]($shortcutAudit.broken -eq 0)
}

$overallOk = $true
$overallOk = $overallOk -and $compatibility.serverHealth
$overallOk = $overallOk -and $compatibility.mobileBootstrap
$overallOk = $overallOk -and $compatibility.remoteSession
$overallOk = $overallOk -and $compatibility.remoteControl
$overallOk = $overallOk -and $compatibility.notebookPath
$overallOk = $overallOk -and $compatibility.shortcuts

$reportStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $reportsDir ("heal-cure-asolaria-phone-" + $reportStamp + ".md")
$reportLines = @(
  "# Heal/Cure Asolaria + Phone Compatibility Report",
  "",
  ("Generated: " + (Get-Date).ToString("o")),
  ("Overall ok: " + [string]$overallOk),
  ("Apply fixes: " + [string]$ApplyFixes.IsPresent),
  "",
  "## Core",
  ("- Local /api/health: " + [string]$health.ok),
  ("- Local /api/mobile/bootstrap: " + [string]$bootstrap.ok),
  ("- Remote base URL: " + [string]$remoteBase),
  ("- Remote /api/health (auth): " + [string]$remoteHealth.ok),
  ("- Remote /api/mobile/session: " + [string]$remoteSession.ok),
  ("- Remote /api/mobile/control/status: " + [string]$remoteControl.ok),
  "",
  "## ADB",
  ("- adb path: " + [string]$adbPath),
  ("- authorized devices: " + [string]$adbAuthorized.Count),
  ("- reverse tcp:" + [string]$Port + ": " + [string]$reversePresent),
  ("- reverse fix attempted: " + [string]$reverseFix.attempted + " ok=" + [string]$reverseFix.ok + " reason=" + [string]$reverseFix.reason),
  "",
  "## NotebookLM Path",
  ("- Google status endpoint: " + [string]$notebookGoogle.ok),
  ("- Gemini API status endpoint: " + [string]$notebookGeminiApi.ok),
  ("- Vertex status endpoint: " + [string]$notebookVertex.ok),
  "",
  "## Shortcuts",
  ("- audited: " + [string]$shortcutAudit.total),
  ("- broken/outdated: " + [string]$shortcutAudit.broken),
  ("- repair attempted: " + [string]$shortcutRepair.attempted + " ok=" + [string]$shortcutRepair.ok + " reason=" + [string]$shortcutRepair.reason),
  "",
  "## Smoke",
  ("- run: " + [string](-not $SkipPhoneSmoke.IsPresent)),
  ("- ok: " + [string]$phoneSmoke.ok),
  ("- reason: " + [string]$phoneSmoke.reason),
  ("- report: " + [string]$phoneSmoke.reportPath),
  "",
  "## Cleanup",
  ("- attempted: " + [string]$cleanup.attempted),
  ("- ok: " + [string]$cleanup.ok),
  ("- dryRun: " + [string]$cleanup.dryRun),
  ("- report: " + [string]$cleanup.reportPath),
  ("- error: " + [string]$cleanup.error),
  ""
)

if ($shortcutAudit.brokenItems.Count -gt 0) {
  $reportLines += "## Broken Shortcuts"
  foreach ($item in $shortcutAudit.brokenItems) {
    $reportLines += ("- " + $item.shortcutPath + " -> " + $item.targetPath)
  }
  $reportLines += ""
}

if ($phoneSmoke.notes.Count -gt 0) {
  $reportLines += "## Smoke Notes"
  foreach ($note in @($phoneSmoke.notes)) {
    $reportLines += ("- " + [string]$note)
  }
  $reportLines += ""
}

$reportLines | Set-Content -LiteralPath $reportPath -Encoding UTF8

$summary = [ordered]@{
  ok = $overallOk
  reportPath = $reportPath
  compatibility = $compatibility
  local = [ordered]@{
    healthOk = [bool]$health.ok
    healthError = [string]$health.error
    bootstrapOk = [bool]$bootstrap.ok
    bootstrapError = [string]$bootstrap.error
  }
  remote = [ordered]@{
    baseUrl = [string]$remoteBase
    healthOk = [bool]$remoteHealth.ok
    healthError = [string]$remoteHealth.error
    sessionOk = [bool]$remoteSession.ok
    sessionError = [string]$remoteSession.error
    controlOk = [bool]$remoteControl.ok
    controlError = [string]$remoteControl.error
  }
  adb = [ordered]@{
    path = [string]$adbPath
    authorizedCount = [int]$adbAuthorized.Count
    authorizedDevices = @($adbAuthorized)
    reversePresent = [bool]$reversePresent
    reverseFix = $reverseFix
  }
  notebook = [ordered]@{
    googleStatusOk = [bool]$notebookGoogle.ok
    geminiApiStatusOk = [bool]$notebookGeminiApi.ok
    vertexStatusOk = [bool]$notebookVertex.ok
  }
  shortcuts = [ordered]@{
    total = [int]$shortcutAudit.total
    broken = [int]$shortcutAudit.broken
    repair = $shortcutRepair
  }
  phoneSmoke = $phoneSmoke
  cleanup = $cleanup
}

$summary | ConvertTo-Json -Depth 12
