[CmdletBinding()]
param(
  [string]$UserDataPath = (Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data"),
  [string]$OutputRoot = "",
  [string]$OpenUrl = "https://accounts.google.com/",
  [string[]]$IncludeProfile = @(),
  [string[]]$ExcludeProfile = @(),
  [int]$LaunchWaitMs = 3200,
  [int]$BetweenProfilesMs = 800,
  [switch]$IncludePerScreen,
  [switch]$NoWindowClose,
  [switch]$RequireVpnForRestricted,
  [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $scriptDir = [string]$PSScriptRoot
  if ([string]::IsNullOrWhiteSpace($scriptDir)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  }
  $repoRoot = Split-Path -Parent $scriptDir
  $OutputRoot = Join-Path (Join-Path $repoRoot "captures") "chrome-profile-verify"
}

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }
  $raw = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }
  return $raw | ConvertFrom-Json -ErrorAction Stop
}

function Write-JsonFileNoBom {
  param(
    [string]$Path,
    [Parameter(Mandatory = $true)]$Value
  )
  $jsonText = $Value | ConvertTo-Json -Depth 100
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $jsonText, $utf8NoBom)
}

function Ensure-Directory {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Directory path cannot be empty."
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Resolve-ChromePath {
  $candidates = @(
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  $command = Get-Command chrome.exe -ErrorAction SilentlyContinue
  if ($command -and -not [string]::IsNullOrWhiteSpace($command.Source)) {
    return $command.Source
  }

  throw "Google Chrome executable was not found."
}

function Get-PropertyValue {
  param(
    $Object,
    [string]$Name
  )
  if ($null -eq $Object) {
    return $null
  }
  $prop = $Object.PSObject.Properties[$Name]
  if ($null -eq $prop) {
    return $null
  }
  return $prop.Value
}

function ConvertTo-Tag {
  param([string]$Value)
  $safe = ([string]$Value -replace "[^a-zA-Z0-9._-]", "_").Trim("_")
  if ([string]::IsNullOrWhiteSpace($safe)) {
    return "item"
  }
  if ($safe.Length -gt 80) {
    return $safe.Substring(0, 80)
  }
  return $safe
}

function Parse-JsonText {
  param([string]$Raw)
  $text = [string]$Raw
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }
  try {
    return $text | ConvertFrom-Json -ErrorAction Stop
  } catch {
    $start = $text.IndexOf("{")
    $end = $text.LastIndexOf("}")
    if ($start -ge 0 -and $end -gt $start) {
      $slice = $text.Substring($start, $end - $start + 1)
      return $slice | ConvertFrom-Json -ErrorAction Stop
    }
    throw
  }
}

function Test-ExpressVpnRunning {
  $names = @("ExpressVPN", "ExpressVPNService", "ExpressVPN.UI", "ExpressVPNSystemService")
  foreach ($name in $names) {
    if (Get-Process -Name $name -ErrorAction SilentlyContinue) {
      return $true
    }
  }
  return $false
}

function Matches-ProfileFilter {
  param(
    $Profile,
    [string[]]$Patterns
  )
  if (@($Patterns).Count -eq 0) {
    return $true
  }
  $hay = @(
    [string]$Profile.directory,
    [string]$Profile.displayName,
    [string]$Profile.email
  )
  $hayLower = @($hay | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_.ToLowerInvariant() })
  foreach ($pattern in @($Patterns)) {
    $needle = [string]$pattern
    if ([string]::IsNullOrWhiteSpace($needle)) {
      continue
    }
    $needle = $needle.Trim()
    $needleLower = $needle.ToLowerInvariant()
    $isWildcard = $needle.Contains("*") -or $needle.Contains("?")

    foreach ($field in $hayLower) {
      if ($isWildcard) {
        if ($field -like $needleLower) {
          return $true
        }
      } else {
        if ($field -eq $needleLower) {
          return $true
        }
      }
    }
  }
  return $false
}

function Build-ProfileList {
  param(
    [string]$Root,
    [object]$LocalState
  )
  $infoCache = Get-PropertyValue -Object (Get-PropertyValue -Object $LocalState -Name "profile") -Name "info_cache"
  $restrictedRegex = "(spinutech)"
  $profileDirs = Get-ChildItem -LiteralPath $Root -Directory -ErrorAction Stop |
    Where-Object { $_.Name -eq "Default" -or $_.Name -eq "Profile" -or $_.Name -like "Profile *" } |
    Sort-Object Name

  $profiles = New-Object System.Collections.Generic.List[Object]
  foreach ($dir in $profileDirs) {
    $profileKey = $dir.Name
    $cacheEntry = $null
    if ($null -ne $infoCache) {
      $cacheEntry = Get-PropertyValue -Object $infoCache -Name $profileKey
    }

    $prefsPath = Join-Path $dir.FullName "Preferences"
    $prefs = Read-JsonFile -Path $prefsPath

    $displayName = [string](Get-PropertyValue -Object $cacheEntry -Name "name")
    if ([string]::IsNullOrWhiteSpace($displayName)) {
      $displayName = [string](Get-PropertyValue -Object (Get-PropertyValue -Object $prefs -Name "profile") -Name "name")
    }
    if ([string]::IsNullOrWhiteSpace($displayName)) {
      $displayName = $profileKey
    }

    $emails = New-Object System.Collections.Generic.List[string]
    $fromCache = [string](Get-PropertyValue -Object $cacheEntry -Name "user_name")
    if (-not [string]::IsNullOrWhiteSpace($fromCache)) {
      $emails.Add($fromCache)
    }
    $accountInfo = Get-PropertyValue -Object $prefs -Name "account_info"
    foreach ($account in @($accountInfo)) {
      $candidate = [string](Get-PropertyValue -Object $account -Name "email")
      if (-not [string]::IsNullOrWhiteSpace($candidate)) {
        $emails.Add($candidate)
      }
    }
    $lastUsername = [string](Get-PropertyValue -Object (Get-PropertyValue -Object (Get-PropertyValue -Object $prefs -Name "google") -Name "services") -Name "last_username")
    if (-not [string]::IsNullOrWhiteSpace($lastUsername)) {
      $emails.Add($lastUsername)
    }

    $uniqueEmails = @($emails | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_.Trim() } | Sort-Object -Unique)
    $primaryEmail = if ($uniqueEmails.Count -gt 0) { [string]$uniqueEmails[0] } else { "" }

    $identity = ("{0} {1}" -f $displayName, $primaryEmail).ToLowerInvariant()
    $isRestricted = $identity -match $restrictedRegex

    $profiles.Add([ordered]@{
        directory = $profileKey
        displayName = $displayName
        email = $primaryEmail
        emails = $uniqueEmails
        restricted = [bool]$isRestricted
        hasLocalSigninSignal = [bool]($uniqueEmails.Count -gt 0)
      })
  }
  return $profiles
}

if (-not (Test-Path -LiteralPath $UserDataPath)) {
  throw "Chrome user data path was not found: $UserDataPath"
}

$chromePath = Resolve-ChromePath
$localStatePath = Join-Path $UserDataPath "Local State"
$localState = Read-JsonFile -Path $localStatePath
if ($null -eq $localState) {
  throw "Chrome Local State was not found or could not be parsed: $localStatePath"
}

$captureLayoutScript = Join-Path $PSScriptRoot "Capture-Layout-And-Window.ps1"
$desktopInputScript = Join-Path $PSScriptRoot "Invoke-DesktopInput.ps1"
if (-not (Test-Path -LiteralPath $captureLayoutScript)) {
  throw "Required script not found: $captureLayoutScript"
}
if (-not (Test-Path -LiteralPath $desktopInputScript)) {
  throw "Required script not found: $desktopInputScript"
}

$profiles = @(Build-ProfileList -Root $UserDataPath -LocalState $localState)
if (@($IncludeProfile).Count -gt 0) {
  $profiles = @($profiles | Where-Object { Matches-ProfileFilter -Profile $_ -Patterns $IncludeProfile })
}
if (@($ExcludeProfile).Count -gt 0) {
  $profiles = @($profiles | Where-Object { -not (Matches-ProfileFilter -Profile $_ -Patterns $ExcludeProfile) })
}

$vpnRunning = Test-ExpressVpnRunning
$runTag = (Get-Date).ToString("yyyyMMdd-HHmmss")
$runDir = Join-Path $OutputRoot $runTag
Ensure-Directory -Path $runDir

$report = [ordered]@{
  ok = $true
  startedAt = (Get-Date).ToString("o")
  finishedAt = ""
  runTag = $runTag
  runDir = $runDir
  userDataPath = $UserDataPath
  chromePath = $chromePath
  profileCount = @($profiles).Count
  vpnRunning = [bool]$vpnRunning
  requireVpnForRestricted = [bool]$RequireVpnForRestricted.IsPresent
  openUrl = $OpenUrl
  launchWaitMs = [int]$LaunchWaitMs
  betweenProfilesMs = [int]$BetweenProfilesMs
  includePerScreen = [bool]$IncludePerScreen.IsPresent
  closeWindowAfterCapture = [bool](-not $NoWindowClose.IsPresent)
  profiles = @()
  errors = @()
}

for ($index = 0; $index -lt @($profiles).Count; $index += 1) {
  $profile = $profiles[$index]
  $entry = [ordered]@{
    index = [int]($index + 1)
    directory = [string]$profile.directory
    displayName = [string]$profile.displayName
    email = [string]$profile.email
    emails = @($profile.emails)
    restricted = [bool]$profile.restricted
    hasLocalSigninSignal = [bool]$profile.hasLocalSigninSignal
    startedAt = (Get-Date).ToString("o")
    finishedAt = ""
    status = ""
    reason = ""
    launch = $null
    focus = $null
    capture = $null
    close = $null
    errors = @()
  }

  if ($entry.restricted -and $RequireVpnForRestricted.IsPresent -and -not $vpnRunning) {
    $entry.status = "skipped"
    $entry.reason = "restricted profile requires VPN, but ExpressVPN process was not detected."
    $entry.finishedAt = (Get-Date).ToString("o")
    $report.profiles += $entry
    continue
  }

  try {
    $args = @(
      "--profile-directory=""$($entry.directory)""",
      "--new-window",
      $OpenUrl
    )
    $launched = Start-Process -FilePath $chromePath -ArgumentList $args -PassThru -WindowStyle Normal
    $entry.launch = [ordered]@{
      pid = [int]$launched.Id
      args = $args
    }
    Start-Sleep -Milliseconds $LaunchWaitMs

    $focusRaw = & $desktopInputScript -Action window_focus -WindowTitle "Google Chrome"
    $focusObj = Parse-JsonText -Raw ([string]$focusRaw)
    if ($null -ne $focusObj) {
      $entry.focus = $focusObj
    }
    Start-Sleep -Milliseconds 220

    $captureTag = "profile-{0:D2}-{1}" -f ($index + 1), (ConvertTo-Tag -Value ([string]$entry.directory))
    $captureArgs = @{
      OutputRoot = $runDir
      Tag = $captureTag
      WindowTitle = "Chrome"
      IncludeVirtualDesktop = $true
      Json = $true
    }
    if (-not $IncludePerScreen.IsPresent) {
      $captureArgs.SkipPerScreen = $true
    }

    $captureRaw = & $captureLayoutScript @captureArgs
    $captureObj = Parse-JsonText -Raw ([string]$captureRaw)
    $entry.capture = $captureObj

    $windowTitle = [string](Get-PropertyValue -Object (Get-PropertyValue -Object (Get-PropertyValue -Object $captureObj -Name "captures") -Name "window") -Name "title")
    $titleLower = $windowTitle.ToLowerInvariant()
    $looksLikeLoginPrompt = ($titleLower -match "sign in|login|log in|entrar|fazer login|acceder|anmelden")

    if ($entry.hasLocalSigninSignal -and -not $looksLikeLoginPrompt) {
      $entry.status = "likely_logged_in"
      $entry.reason = "Local account signals found and captured title does not look like login prompt."
    } elseif ($entry.hasLocalSigninSignal -and $looksLikeLoginPrompt) {
      $entry.status = "possible_reauth_needed"
      $entry.reason = "Local account signals found, but captured title may indicate sign-in prompt."
    } elseif (-not $entry.hasLocalSigninSignal -and $looksLikeLoginPrompt) {
      $entry.status = "login_needed"
      $entry.reason = "No local account signals and captured title may indicate sign-in prompt."
    } else {
      $entry.status = "unknown"
      $entry.reason = "No strong local sign-in signal; review screenshot evidence."
    }

    if (-not $NoWindowClose.IsPresent) {
      $closeRaw = & $desktopInputScript -Action window_close
      $closeObj = Parse-JsonText -Raw ([string]$closeRaw)
      if ($null -ne $closeObj) {
        $entry.close = $closeObj
      }
    }
  } catch {
    $entry.status = "error"
    $entry.reason = $_.Exception.Message
    $entry.errors += $_.Exception.Message
    $report.ok = $false
    $report.errors += ("profile {0}: {1}" -f $entry.directory, $_.Exception.Message)
  }

  $entry.finishedAt = (Get-Date).ToString("o")
  $report.profiles += $entry
  Start-Sleep -Milliseconds $BetweenProfilesMs
}

$report.finishedAt = (Get-Date).ToString("o")
$reportFile = Join-Path $runDir "report.json"
Write-JsonFileNoBom -Path $reportFile -Value $report

if ($Json.IsPresent) {
  $report | ConvertTo-Json -Depth 12
  return
}

$totals = [ordered]@{
  total = @($report.profiles).Count
  likelyLoggedIn = @($report.profiles | Where-Object { $_.status -eq "likely_logged_in" }).Count
  possibleReauthNeeded = @($report.profiles | Where-Object { $_.status -eq "possible_reauth_needed" }).Count
  loginNeeded = @($report.profiles | Where-Object { $_.status -eq "login_needed" }).Count
  unknown = @($report.profiles | Where-Object { $_.status -eq "unknown" }).Count
  skipped = @($report.profiles | Where-Object { $_.status -eq "skipped" }).Count
  errors = @($report.profiles | Where-Object { $_.status -eq "error" }).Count
}

Write-Host "Chrome one-by-one verification complete."
Write-Host (" - run dir:               " + $runDir)
Write-Host (" - profiles total:        " + $totals.total)
Write-Host (" - likely logged in:      " + $totals.likelyLoggedIn)
Write-Host (" - possible reauth needed:" + " " + $totals.possibleReauthNeeded)
Write-Host (" - login needed:          " + $totals.loginNeeded)
Write-Host (" - unknown:               " + $totals.unknown)
Write-Host (" - skipped:               " + $totals.skipped)
Write-Host (" - errors:                " + $totals.errors)
Write-Host (" - report:                " + $reportFile)
