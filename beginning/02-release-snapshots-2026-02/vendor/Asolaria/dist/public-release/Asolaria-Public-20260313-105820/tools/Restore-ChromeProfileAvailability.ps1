[CmdletBinding()]
param(
  [string]$UserDataPath = (Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data"),
  [string]$ShortcutFolder = (Join-Path ([Environment]::GetFolderPath("Desktop")) "Chrome Profiles"),
  [switch]$WarmProfiles,
  [switch]$SkipUnhide,
  [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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

function Normalize-ShortcutName {
  param([string]$InputName)
  $invalid = [System.IO.Path]::GetInvalidFileNameChars()
  $safe = -join ($InputName.ToCharArray() | ForEach-Object {
      if ($invalid -contains $_) { "_" } else { $_ }
    })
  $collapsed = ($safe -replace "\s+", " ").Trim()
  if ($collapsed.Length -gt 120) {
    return $collapsed.Substring(0, 120).Trim()
  }
  return $collapsed
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

function Save-LocalStateBackup {
  param([string]$LocalStatePath)
  $stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
  $backupPath = "$LocalStatePath.bak-$stamp.json"
  Copy-Item -LiteralPath $LocalStatePath -Destination $backupPath -Force
  return $backupPath
}

if (-not (Test-Path -LiteralPath $UserDataPath)) {
  throw "Chrome user data folder not found: $UserDataPath"
}

$chromePath = Resolve-ChromePath
$localStatePath = Join-Path $UserDataPath "Local State"
$localState = Read-JsonFile -Path $localStatePath
if ($null -eq $localState) {
  throw "Chrome Local State file was not found or could not be parsed: $localStatePath"
}

$infoCache = Get-PropertyValue -Object (Get-PropertyValue -Object $localState -Name "profile") -Name "info_cache"
$backupPath = ""
$unhiddenCount = 0

if (-not $SkipUnhide.IsPresent -and $null -ne $infoCache) {
  foreach ($profileProp in $infoCache.PSObject.Properties) {
    $entry = $profileProp.Value
    if ($null -eq $entry) {
      continue
    }
    $isOmitted = Get-PropertyValue -Object $entry -Name "is_omitted"
    if ($isOmitted -eq $true) {
      $entry.is_omitted = $false
      $unhiddenCount += 1
    }
  }
  if ($unhiddenCount -gt 0) {
    $backupPath = Save-LocalStateBackup -LocalStatePath $localStatePath
    Write-JsonFileNoBom -Path $localStatePath -Value $localState
  }
}

$profileDirs = Get-ChildItem -LiteralPath $UserDataPath -Directory -ErrorAction Stop |
  Where-Object { $_.Name -eq "Default" -or $_.Name -like "Profile *" } |
  Sort-Object Name

$restrictedRegex = "(spinutech)"
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
    $profileObj = Get-PropertyValue -Object $prefs -Name "profile"
    $displayName = [string](Get-PropertyValue -Object $profileObj -Name "name")
  }
  if ([string]::IsNullOrWhiteSpace($displayName)) {
    $displayName = $profileKey
  }

  $email = [string](Get-PropertyValue -Object $cacheEntry -Name "user_name")
  if ([string]::IsNullOrWhiteSpace($email)) {
    $accountInfo = Get-PropertyValue -Object $prefs -Name "account_info"
    if ($null -ne $accountInfo) {
      foreach ($account in @($accountInfo)) {
        $candidate = [string](Get-PropertyValue -Object $account -Name "email")
        if (-not [string]::IsNullOrWhiteSpace($candidate)) {
          $email = $candidate
          break
        }
      }
    }
  }

  $identity = ("{0} {1}" -f $displayName, $email).ToLowerInvariant()
  $isRestricted = $identity -match $restrictedRegex
  $profiles.Add([ordered]@{
      directory = $profileKey
      displayName = $displayName
      email = $email
      restricted = [bool]$isRestricted
    })
}

Ensure-Dir -Path $ShortcutFolder
$removedShortcuts = New-Object System.Collections.Generic.List[string]
if (Test-Path -LiteralPath $ShortcutFolder) {
  foreach ($existing in @(Get-ChildItem -LiteralPath $ShortcutFolder -Filter "Chrome - *.lnk" -File -ErrorAction SilentlyContinue)) {
    $existingPath = [string]$existing.FullName
    Remove-Item -LiteralPath $existingPath -Force -ErrorAction SilentlyContinue
    $removedShortcuts.Add($existingPath)
  }
}
$shell = New-Object -ComObject WScript.Shell
$shortcutWrites = New-Object System.Collections.Generic.List[Object]
$nameCounts = @{}

foreach ($profile in $profiles) {
  $suffix = if ([string]::IsNullOrWhiteSpace([string]$profile.email)) { "" } else { " - $($profile.email)" }
  $restrictedTag = if ($profile.restricted) { " [VPN Charleston]" } else { "" }
  $baseName = Normalize-ShortcutName ("Chrome - $($profile.displayName)$suffix$restrictedTag")
  if (-not $nameCounts.ContainsKey($baseName)) {
    $nameCounts[$baseName] = 0
  }
  $nameCounts[$baseName] += 1
  if ($nameCounts[$baseName] -gt 1) {
    $baseName = Normalize-ShortcutName ("$baseName ($($profile.directory))")
  }

  $shortcutPath = Join-Path $ShortcutFolder ("$baseName.lnk")
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $chromePath
  $shortcut.Arguments = "--profile-directory=""$($profile.directory)"" --new-window"
  $shortcut.WorkingDirectory = Split-Path -Path $chromePath -Parent
  $shortcut.Description = if ($profile.restricted) {
    "Restricted profile. Connect ExpressVPN Charleston, SC before sign-in/use."
  } else {
    "Chrome profile launcher."
  }
  $shortcut.Save()

  $shortcutWrites.Add([ordered]@{
      path = $shortcutPath
      directory = $profile.directory
      restricted = [bool]$profile.restricted
    })

  if ($WarmProfiles.IsPresent) {
    Start-Process -FilePath $chromePath -ArgumentList @(
      "--profile-directory=$($profile.directory)",
      "--new-window",
      "chrome://version/"
    ) -WindowStyle Normal | Out-Null
    Start-Sleep -Milliseconds 180
  }
}

$summary = [ordered]@{
  chromePath = $chromePath
  userDataPath = $UserDataPath
  localState = $localStatePath
  backupPath = $backupPath
  skipUnhide = [bool]$SkipUnhide.IsPresent
  unhiddenProfiles = $unhiddenCount
  shortcutFolder = $ShortcutFolder
  profilesFound = $profiles.Count
  restrictedProfiles = @($profiles | Where-Object { $_.restricted }).Count
  shortcutsWritten = $shortcutWrites.Count
  staleShortcutsRemoved = $removedShortcuts.Count
  warmedProfiles = [bool]$WarmProfiles.IsPresent
}

if ($Json.IsPresent) {
  $summary | ConvertTo-Json -Depth 8
  return
}

Write-Host "Chrome profile availability refresh complete."
Write-Host (" - user data:          " + $summary.userDataPath)
Write-Host (" - local state backup: " + ($(if ($summary.backupPath) { $summary.backupPath } else { "(none)" })))
Write-Host (" - profiles unhidden:  " + $summary.unhiddenProfiles)
Write-Host (" - profiles found:     " + $summary.profilesFound)
Write-Host (" - restricted profiles:" + " " + $summary.restrictedProfiles)
Write-Host (" - shortcut folder:    " + $summary.shortcutFolder)
Write-Host (" - shortcuts written:  " + $summary.shortcutsWritten)
Write-Host (" - stale removed:      " + $summary.staleShortcutsRemoved)
Write-Host (" - warmed profiles:    " + $summary.warmedProfiles)
