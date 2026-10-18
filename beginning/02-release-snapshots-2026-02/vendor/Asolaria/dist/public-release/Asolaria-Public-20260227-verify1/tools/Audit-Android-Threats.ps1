param(
  [string]$DeviceId = "",
  [switch]$Quarantine,
  [string[]]$TargetPackages = @(),
  [switch]$UninstallUserApps,
  [switch]$AllowSystemTargets,
  [string]$ReportPath = "",
  [int]$Top = 20
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Resolve-AdbPath {
  try {
    $cmd = Get-Command adb -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {
    # Continue through known locations.
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

function Invoke-Adb {
  param(
    [Parameter(Mandatory = $true)][string]$AdbPath,
    [Parameter(Mandatory = $true)][string[]]$Args,
    [switch]$IgnoreExitCode
  )

  $allArgs = @()
  if (-not [string]::IsNullOrWhiteSpace($DeviceId)) {
    $allArgs += @("-s", $DeviceId)
  }
  $allArgs += $Args

  $output = & $AdbPath @allArgs 2>&1
  $code = $LASTEXITCODE
  if (-not $IgnoreExitCode.IsPresent -and $code -ne 0) {
    $joined = [string](@($output) -join [Environment]::NewLine)
    throw "ADB command failed (exit $code): adb $($allArgs -join ' ')`n$joined"
  }
  return @($output | ForEach-Object { [string]$_ })
}

function Get-AuthorizedDevices {
  param([string]$AdbPath)
  $rows = Invoke-Adb -AdbPath $AdbPath -Args @("devices", "-l") -IgnoreExitCode
  $devices = New-Object System.Collections.Generic.List[object]
  foreach ($row in $rows) {
    $line = [string]$row
    if ($line -match "^(\S+)\s+device\b") {
      $devices.Add([pscustomobject]@{
          serial = [string]$matches[1]
          raw = $line
        })
    }
  }
  return @($devices.ToArray())
}

function New-PackageSet {
  return New-Object "System.Collections.Generic.HashSet[string]" ([System.StringComparer]::OrdinalIgnoreCase)
}

function Parse-PackageLines {
  param([string[]]$Lines)
  $set = New-PackageSet
  foreach ($row in @($Lines)) {
    $line = [string]$row
    if ($line -match "^package:([A-Za-z0-9._-]+)$") {
      [void]$set.Add([string]$matches[1])
    }
  }
  return $set
}

function Parse-PackageInstallerMap {
  param([string[]]$Lines)
  $map = @{}
  foreach ($row in @($Lines)) {
    $line = [string]$row
    if ($line -match "^package:([A-Za-z0-9._-]+)\s+installer=(.*)$") {
      $pkg = [string]$matches[1]
      $installer = [string]$matches[2]
      $map[$pkg] = $installer.Trim()
    } elseif ($line -match "^package:([A-Za-z0-9._-]+)$") {
      $pkg = [string]$matches[1]
      if (-not $map.ContainsKey($pkg)) {
        $map[$pkg] = ""
      }
    }
  }
  return $map
}

function Parse-AppOpsPackages {
  param([string[]]$Lines)
  $set = New-PackageSet
  foreach ($row in @($Lines)) {
    $line = [string]$row
    if ($line -match "^\s*([A-Za-z0-9._-]+)\s*:") {
      [void]$set.Add([string]$matches[1])
      continue
    }
    if ($line -match "^\s*([A-Za-z0-9._-]+)/") {
      [void]$set.Add([string]$matches[1])
      continue
    }
    if ($line -match "\b([A-Za-z0-9._-]{3,}\.[A-Za-z0-9._-]+)\b") {
      [void]$set.Add([string]$matches[1])
    }
  }
  return $set
}

function Parse-SecureSettingPackages {
  param([string]$Value)
  $set = New-PackageSet
  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text) -or $text -eq "null") {
    return $set
  }
  $parts = $text -split ":"
  foreach ($part in $parts) {
    $entry = [string]$part
    if ($entry -match "^([A-Za-z0-9._-]+)/") {
      [void]$set.Add([string]$matches[1])
    } elseif ($entry -match "^([A-Za-z0-9._-]+\.[A-Za-z0-9._-]+)$") {
      [void]$set.Add([string]$matches[1])
    }
  }
  return $set
}

function Parse-DpmPackages {
  param([string[]]$Lines)
  $set = New-PackageSet
  foreach ($row in @($Lines)) {
    $line = [string]$row
    if ($line -match "([A-Za-z0-9._-]+)/[A-Za-z0-9._$-]+") {
      [void]$set.Add([string]$matches[1])
      continue
    }
    if ($line -match "ComponentInfo\{([A-Za-z0-9._-]+)/[A-Za-z0-9._$-]+\}") {
      [void]$set.Add([string]$matches[1])
    }
  }
  return $set
}

function Get-PackageTimeInfo {
  param(
    [string]$AdbPath,
    [string]$PackageName
  )
  $rows = Invoke-Adb -AdbPath $AdbPath -Args @("shell", "dumpsys", "package", $PackageName) -IgnoreExitCode
  $first = ""
  $last = ""
  foreach ($row in @($rows)) {
    $line = [string]$row
    if (-not $first -and $line -match "firstInstallTime=([0-9:\-\sTZ+.]+)") {
      $first = [string]$matches[1].Trim()
    }
    if (-not $last -and $line -match "lastUpdateTime=([0-9:\-\sTZ+.]+)") {
      $last = [string]$matches[1].Trim()
    }
    if ($first -and $last) {
      break
    }
  }
  return [pscustomobject]@{
    firstInstallTime = $first
    lastUpdateTime = $last
  }
}

function Parse-Time {
  param([string]$Value)
  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }
  try {
    return [datetime]::Parse($text, [System.Globalization.CultureInfo]::InvariantCulture)
  } catch {
    try {
      return Get-Date -Date $text -ErrorAction Stop
    } catch {
      return $null
    }
  }
  return $null
}

function Get-ResolveActivity {
  param(
    [string]$AdbPath,
    [string[]]$ResolveArgs
  )
  $rows = Invoke-Adb -AdbPath $AdbPath -Args $ResolveArgs -IgnoreExitCode
  $value = ""
  foreach ($row in @($rows)) {
    $line = [string]$row
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line -match "^priority=") { continue }
    if ($line -match "^ResolverActivity") { continue }
    $value = $line.Trim()
  }
  return $value
}

function To-Array {
  param($Set)
  if ($null -eq $Set) {
    return @()
  }
  if ($Set -is [string]) {
    return @([string]$Set)
  }
  $items = New-Object System.Collections.Generic.List[string]
  foreach ($item in @($Set)) {
    if ($null -ne $item) {
      $items.Add([string]$item)
    }
  }
  return @($items.ToArray() | Sort-Object -Unique)
}

function Get-ItemCount {
  param($Value)
  return @($Value).Length
}

function Write-MarkdownReport {
  param(
    [object]$Audit,
    [string]$Path
  )
  $lines = @()
  $lines += "# Android Threat Audit"
  $lines += ""
  $lines += ("- checkedAt: " + [string]$Audit.checkedAt)
  $lines += ("- device: " + [string]$Audit.deviceSerial)
  $lines += ("- model: " + [string]$Audit.deviceModel)
  $lines += ("- android: " + [string]$Audit.androidVersion)
  $lines += ("- userPackages: " + [string]$Audit.counts.userPackages)
  $lines += ("- suspiciousTop: " + [string]$Audit.counts.suspiciousTop)
  $lines += ""
  $lines += "## High-Risk Signals"
  $lines += ("- overlayAllowed: " + [string]$Audit.counts.overlayAllowed)
  $lines += ("- accessibilityEnabled: " + [string]$Audit.counts.accessibilityEnabled)
  $lines += ("- activeAdmins: " + [string]$Audit.counts.activeAdmins)
  $lines += ("- notificationListeners: " + [string]$Audit.counts.notificationListeners)
  $lines += ("- owners: " + [string]$Audit.counts.owners)
  $lines += ""
  $lines += "## Defaults"
  $lines += ("- browser: " + [string]$Audit.defaults.browserActivity)
  $lines += ("- home: " + [string]$Audit.defaults.homeActivity)
  $lines += ""
  $lines += "## Top Suspicious Packages"
  foreach ($row in @($Audit.suspiciousTop)) {
    $lines += ("- " + [string]$row.package + " | score=" + [string]$row.score + " | installer=" + [string]$row.installer + " | reasons=" + [string](@($row.reasons) -join ", "))
  }
  $lines += ""
  if ($Audit.quarantine -and @($Audit.quarantine.results).Count -gt 0) {
    $lines += "## Quarantine Actions"
    foreach ($row in @($Audit.quarantine.results)) {
      $lines += ("- " + [string]$row.package + " | ok=" + [string]$row.ok + " | " + [string]$row.summary)
    }
    $lines += ""
  }
  Set-Content -Path $Path -Value $lines -Encoding UTF8
}

$repoRoot = Resolve-RepoRoot
$logsDir = Join-Path $repoRoot "logs"
$reportsDir = Join-Path $repoRoot "reports"
if (-not (Test-Path -LiteralPath $logsDir)) { New-Item -Path $logsDir -ItemType Directory -Force | Out-Null }
if (-not (Test-Path -LiteralPath $reportsDir)) { New-Item -Path $reportsDir -ItemType Directory -Force | Out-Null }

$adbPath = Resolve-AdbPath
if (-not $adbPath) {
  throw "adb.exe not found. Install Android platform-tools first."
}

Invoke-Adb -AdbPath $adbPath -Args @("start-server") -IgnoreExitCode | Out-Null
$devices = @(Get-AuthorizedDevices -AdbPath $adbPath)
if ($devices.Count -lt 1) {
  $instructions = @(
    "ADB does not detect an authorized phone.",
    "1) Keep phone unlocked.",
    "2) Enable Developer options + USB debugging.",
    "3) USB mode must be File Transfer (not charge only).",
    "4) Accept the RSA prompt: 'Always allow from this computer'.",
    "5) Re-run: adb devices -l"
  )
  $payload = [pscustomobject]@{
    ok = $false
    reason = "no_authorized_device"
    adbPath = $adbPath
    instructions = $instructions
  }
  $payload | ConvertTo-Json -Depth 6
  exit 2
}

$activeSerial = if ([string]::IsNullOrWhiteSpace($DeviceId)) { [string]$devices[0].serial } else { [string]$DeviceId }
$DeviceId = $activeSerial

$model = [string]((Invoke-Adb -AdbPath $adbPath -Args @("shell", "getprop", "ro.product.model") -IgnoreExitCode) -join "").Trim()
$androidVersion = [string]((Invoke-Adb -AdbPath $adbPath -Args @("shell", "getprop", "ro.build.version.release") -IgnoreExitCode) -join "").Trim()

$userPackagesSet = Parse-PackageLines -Lines (Invoke-Adb -AdbPath $adbPath -Args @("shell", "cmd", "package", "list", "packages", "-3") -IgnoreExitCode)
$installerMap = Parse-PackageInstallerMap -Lines (Invoke-Adb -AdbPath $adbPath -Args @("shell", "cmd", "package", "list", "packages", "-3", "-i") -IgnoreExitCode)

$overlayAllowed = Parse-AppOpsPackages -Lines (Invoke-Adb -AdbPath $adbPath -Args @("shell", "cmd", "appops", "query-op", "--user", "0", "SYSTEM_ALERT_WINDOW", "allow") -IgnoreExitCode)
$notificationAllowed = Parse-AppOpsPackages -Lines (Invoke-Adb -AdbPath $adbPath -Args @("shell", "cmd", "appops", "query-op", "--user", "0", "POST_NOTIFICATION", "allow") -IgnoreExitCode)
$accessibilityEnabled = Parse-SecureSettingPackages -Value ([string]((Invoke-Adb -AdbPath $adbPath -Args @("shell", "settings", "get", "secure", "enabled_accessibility_services") -IgnoreExitCode) -join "").Trim())
$notificationListeners = Parse-SecureSettingPackages -Value ([string]((Invoke-Adb -AdbPath $adbPath -Args @("shell", "settings", "get", "secure", "enabled_notification_listeners") -IgnoreExitCode) -join "").Trim())
$activeAdmins = Parse-DpmPackages -Lines (Invoke-Adb -AdbPath $adbPath -Args @("shell", "dpm", "list", "active-admins") -IgnoreExitCode)
$owners = Parse-DpmPackages -Lines (Invoke-Adb -AdbPath $adbPath -Args @("shell", "dpm", "list", "owners") -IgnoreExitCode)

if ($null -eq $overlayAllowed) { $overlayAllowed = New-PackageSet }
if ($null -eq $notificationAllowed) { $notificationAllowed = New-PackageSet }
if ($null -eq $accessibilityEnabled) { $accessibilityEnabled = New-PackageSet }
if ($null -eq $notificationListeners) { $notificationListeners = New-PackageSet }
if ($null -eq $activeAdmins) { $activeAdmins = New-PackageSet }
if ($null -eq $owners) { $owners = New-PackageSet }

$defaultBrowser = Get-ResolveActivity -AdbPath $adbPath -ResolveArgs @("shell", "cmd", "package", "resolve-activity", "--brief", "-a", "android.intent.action.VIEW", "-d", "http://example.com")
$defaultHome = Get-ResolveActivity -AdbPath $adbPath -ResolveArgs @("shell", "cmd", "package", "resolve-activity", "--brief", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.HOME")

$candidate = New-PackageSet
foreach ($pkg in @($overlayAllowed)) { [void]$candidate.Add($pkg) }
foreach ($pkg in @($accessibilityEnabled)) { [void]$candidate.Add($pkg) }
foreach ($pkg in @($notificationListeners)) { [void]$candidate.Add($pkg) }
foreach ($pkg in @($activeAdmins)) { [void]$candidate.Add($pkg) }
foreach ($pkg in @($owners)) { [void]$candidate.Add($pkg) }

$keywordRegex = "(?i)(ad|ads|clean|booster|speed|vpn|proxy|locker|battery|security|antivirus|wallpaper|optimizer)"
foreach ($pkg in To-Array $userPackagesSet) {
  if ($pkg -match $keywordRegex) {
    [void]$candidate.Add($pkg)
  }
}

$trustedInstallers = New-PackageSet
[void]$trustedInstallers.Add("com.android.vending")
[void]$trustedInstallers.Add("com.sec.android.app.samsungapps")
[void]$trustedInstallers.Add("com.samsung.android.packageinstaller")
[void]$trustedInstallers.Add("com.google.android.packageinstaller")
[void]$trustedInstallers.Add("null")
[void]$trustedInstallers.Add("")

$suspicious = New-Object System.Collections.Generic.List[object]
$now = Get-Date
foreach ($pkg in To-Array $candidate) {
  $reasons = New-Object System.Collections.Generic.List[string]
  $score = 0
  $isUser = $userPackagesSet.Contains($pkg)

  if ($overlayAllowed.Contains($pkg)) { $score += 40; $reasons.Add("overlay_allowed") }
  if ($accessibilityEnabled.Contains($pkg)) { $score += 40; $reasons.Add("accessibility_enabled") }
  if ($notificationListeners.Contains($pkg)) { $score += 35; $reasons.Add("notification_listener_enabled") }
  if ($activeAdmins.Contains($pkg)) { $score += 45; $reasons.Add("active_device_admin") }
  if ($owners.Contains($pkg)) { $score += 60; $reasons.Add("device_or_profile_owner") }
  if ($notificationAllowed.Contains($pkg)) { $score += 5; $reasons.Add("notification_op_allowed") }
  if ($pkg -match $keywordRegex) { $score += 8; $reasons.Add("name_keyword_match") }
  if ($isUser) { $score += 5; $reasons.Add("third_party_app") }

  $installer = ""
  if ($installerMap.ContainsKey($pkg)) {
    $installer = [string]$installerMap[$pkg]
    if (-not $trustedInstallers.Contains($installer)) {
      $score += 20
      $reasons.Add("untrusted_installer:" + $installer)
    }
  }

  $timeInfo = Get-PackageTimeInfo -AdbPath $adbPath -PackageName $pkg
  $firstParsed = Parse-Time -Value $timeInfo.firstInstallTime
  $daysOld = $null
  if ($firstParsed) {
    $daysOld = [int][Math]::Floor((New-TimeSpan -Start $firstParsed -End $now).TotalDays)
    if ($daysOld -ge 0 -and $daysOld -le 30) {
      $score += 10
      $reasons.Add("installed_within_30_days")
    }
  }

  if ($score -gt 0) {
    $suspicious.Add([pscustomobject]@{
        package = $pkg
        score = $score
        reasons = @($reasons)
        isUserApp = $isUser
        installer = $installer
        firstInstallTime = [string]$timeInfo.firstInstallTime
        lastUpdateTime = [string]$timeInfo.lastUpdateTime
        ageDays = $daysOld
      })
  }
}

$sortedSuspicious = @($suspicious | Sort-Object -Property @{Expression = "score"; Descending = $true}, @{Expression = "package"; Descending = $false})
$topCount = [Math]::Max(1, [Math]::Min($Top, 200))
$topSuspicious = @($sortedSuspicious | Select-Object -First $topCount)

$quarantineResult = [pscustomobject]@{
  requested = [bool]$Quarantine.IsPresent
  targets = @($TargetPackages)
  uninstallUserApps = [bool]$UninstallUserApps.IsPresent
  results = @()
}

if ($Quarantine.IsPresent -and @($TargetPackages).Count -gt 0) {
  $rows = New-Object System.Collections.Generic.List[object]
  foreach ($pkgRaw in @($TargetPackages)) {
    $pkg = [string]$pkgRaw
    if ([string]::IsNullOrWhiteSpace($pkg)) { continue }
    $pkg = $pkg.Trim()
    $isUser = $userPackagesSet.Contains($pkg)
    if (-not $AllowSystemTargets.IsPresent -and -not $isUser) {
      $rows.Add([pscustomobject]@{
          package = $pkg
          ok = $false
          summary = "blocked_non_user_package"
          isUserApp = $isUser
          steps = @()
        })
      continue
    }

    $steps = New-Object System.Collections.Generic.List[string]
    $ok = $true
    try {
      Invoke-Adb -AdbPath $adbPath -Args @("shell", "am", "force-stop", $pkg) -IgnoreExitCode | Out-Null
      $steps.Add("force_stop")
    } catch {
      $ok = $false
      $steps.Add("force_stop_failed")
    }
    try {
      Invoke-Adb -AdbPath $adbPath -Args @("shell", "pm", "disable-user", "--user", "0", $pkg) -IgnoreExitCode | Out-Null
      $steps.Add("disable_user")
    } catch {
      $ok = $false
      $steps.Add("disable_user_failed")
    }
    if ($UninstallUserApps.IsPresent -and $isUser) {
      try {
        Invoke-Adb -AdbPath $adbPath -Args @("shell", "pm", "uninstall", "--user", "0", $pkg) -IgnoreExitCode | Out-Null
        $steps.Add("uninstall_user0")
      } catch {
        $ok = $false
        $steps.Add("uninstall_user0_failed")
      }
    }

    $rows.Add([pscustomobject]@{
        package = $pkg
        ok = $ok
        summary = [string](@($steps) -join ",")
        isUserApp = $isUser
        steps = @($steps)
      })
  }
  $quarantineResult = [pscustomobject]@{
    requested = $true
    targets = @($TargetPackages)
    uninstallUserApps = [bool]$UninstallUserApps.IsPresent
    results = @($rows.ToArray())
  }
}

$checkedAt = [DateTimeOffset]::UtcNow.ToString("o")
$audit = [ordered]@{
  ok = $true
  checkedAt = $checkedAt
  deviceSerial = $activeSerial
  deviceModel = $model
  androidVersion = $androidVersion
  adbPath = $adbPath
  defaults = [ordered]@{
    browserActivity = $defaultBrowser
    homeActivity = $defaultHome
  }
  signals = [ordered]@{
    overlayAllowed = To-Array $overlayAllowed
    accessibilityEnabled = To-Array $accessibilityEnabled
    notificationListeners = To-Array $notificationListeners
    activeAdmins = To-Array $activeAdmins
    owners = To-Array $owners
  }
  suspiciousTop = @($topSuspicious)
  quarantine = $quarantineResult
  counts = [ordered]@{
    userPackages = Get-ItemCount (To-Array $userPackagesSet)
    overlayAllowed = Get-ItemCount (To-Array $overlayAllowed)
    accessibilityEnabled = Get-ItemCount (To-Array $accessibilityEnabled)
    notificationListeners = Get-ItemCount (To-Array $notificationListeners)
    activeAdmins = Get-ItemCount (To-Array $activeAdmins)
    owners = Get-ItemCount (To-Array $owners)
    suspiciousTop = Get-ItemCount @($topSuspicious)
  }
}

$reportJsonPath = [string]$ReportPath
if ([string]::IsNullOrWhiteSpace($reportJsonPath)) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $reportJsonPath = Join-Path $reportsDir ("android-threat-audit-" + $stamp + ".json")
}

$reportDir = Split-Path -Parent $reportJsonPath
if (-not (Test-Path -LiteralPath $reportDir)) {
  New-Item -Path $reportDir -ItemType Directory -Force | Out-Null
}

$reportMdPath = [System.IO.Path]::ChangeExtension($reportJsonPath, ".md")
$latestJsonPath = Join-Path $reportsDir "android-threat-audit-latest.json"
$latestMdPath = Join-Path $reportsDir "android-threat-audit-latest.md"

$audit.reportPath = $reportJsonPath
$audit.reportMarkdownPath = $reportMdPath
$audit | ConvertTo-Json -Depth 12 | Set-Content -Path $reportJsonPath -Encoding UTF8
Write-MarkdownReport -Audit $audit -Path $reportMdPath
$audit | ConvertTo-Json -Depth 12 | Set-Content -Path $latestJsonPath -Encoding UTF8
Write-MarkdownReport -Audit $audit -Path $latestMdPath

$audit | ConvertTo-Json -Depth 12
