param(
  [Parameter(Mandatory = $true)]
  [string]$Url,
  [string]$PreferredEmail = "",
  [string]$PreferredProfileDirectory = "",
  [switch]$AllowRestrictedProfile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-ChromePath {
  $candidates = @(
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
  )
  foreach ($candidate in $candidates) {
    if (-not [string]::IsNullOrWhiteSpace([string]$candidate) -and (Test-Path -LiteralPath $candidate)) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }
  try {
    $command = Get-Command chrome.exe -ErrorAction Stop
    if ($command.Path) { return $command.Path }
    if ($command.Source) { return $command.Source }
  } catch {
    # continue
  }
  return $null
}

function Get-PropertyValue {
  param(
    [object]$Object,
    [string]$Name
  )
  if ($null -eq $Object -or [string]::IsNullOrWhiteSpace([string]$Name)) {
    return $null
  }
  if ($Object -is [System.Collections.IDictionary]) {
    return $Object[$Name]
  }
  $prop = $Object.PSObject.Properties[$Name]
  if ($prop) {
    return $prop.Value
  }
  return $null
}

function Read-JsonFile {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace([string]$Path) -or -not (Test-Path -LiteralPath $Path)) {
    return $null
  }
  try {
    return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Get-ChromeUserDataPath {
  $override = [string][Environment]::GetEnvironmentVariable("ASOLARIA_UI_CHROME_USER_DATA_DIR", "Process")
  if ([string]::IsNullOrWhiteSpace($override)) {
    $override = [string][Environment]::GetEnvironmentVariable("ASOLARIA_UI_CHROME_USER_DATA_DIR", "User")
  }
  if (-not [string]::IsNullOrWhiteSpace($override)) {
    return $override
  }
  return (Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data")
}

function Get-ChromeProfiles {
  param([string]$UserDataPath)

  $restrictedRegex = "(sp+i+n+utech|csi|emergencetek|emergene[\s_-]*tek)"
  $profiles = @()
  if ([string]::IsNullOrWhiteSpace([string]$UserDataPath) -or -not (Test-Path -LiteralPath $UserDataPath)) {
    return @()
  }

  $localState = Read-JsonFile -Path (Join-Path $UserDataPath "Local State")
  $infoCache = Get-PropertyValue -Object (Get-PropertyValue -Object $localState -Name "profile") -Name "info_cache"

  $dirs = @(
    Get-ChildItem -LiteralPath $UserDataPath -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -eq "Default" -or $_.Name -like "Profile *" } |
      Sort-Object Name
  )

  foreach ($dir in $dirs) {
    $cacheEntry = Get-PropertyValue -Object $infoCache -Name $dir.Name
    $displayName = [string](Get-PropertyValue -Object $cacheEntry -Name "name")
    $email = [string](Get-PropertyValue -Object $cacheEntry -Name "user_name")
    $gaiaName = [string](Get-PropertyValue -Object $cacheEntry -Name "gaia_name")
    if ([string]::IsNullOrWhiteSpace($displayName)) {
      $displayName = $dir.Name
    }
    $identity = ("{0}|{1}|{2}|{3}" -f $dir.Name, $displayName, $email, $gaiaName).ToLowerInvariant()
    $isRestricted = [regex]::IsMatch($identity, $restrictedRegex)
    $profiles += [pscustomobject]@{
      directory = [string]$dir.Name
      displayName = [string]$displayName
      email = [string]$email
      restricted = [bool]$isRestricted
    }
  }

  return @($profiles)
}

function Select-ChromeProfile {
  param(
    [object[]]$Profiles,
    [string]$Email,
    [string]$Directory,
    [bool]$AllowRestricted
  )
  $entries = @($Profiles)
  if ($entries.Count -lt 1) {
    return $null
  }

  $allowed = if ($AllowRestricted) {
    $entries
  } else {
    @($entries | Where-Object { -not $_.restricted })
  }

  if (-not [string]::IsNullOrWhiteSpace($Directory)) {
    $matchByDirectory = @($allowed | Where-Object {
        [string]::Equals([string]$_.directory, [string]$Directory, [System.StringComparison]::OrdinalIgnoreCase)
      })
    if ($matchByDirectory.Count -gt 0) {
      return $matchByDirectory[0]
    }
    return $null
  }

  if (-not [string]::IsNullOrWhiteSpace($Email)) {
    $matchByEmail = @($allowed | Where-Object {
        [string]::Equals([string]$_.email, [string]$Email, [System.StringComparison]::OrdinalIgnoreCase)
      })
    if ($matchByEmail.Count -gt 0) {
      return $matchByEmail[0]
    }
  }

  $profile3 = @($allowed | Where-Object {
      [string]::Equals([string]$_.directory, "Profile 3", [System.StringComparison]::OrdinalIgnoreCase)
    })
  if ($profile3.Count -gt 0) {
    return $profile3[0]
  }

  return $null
}

function Normalize-Url {
  param([string]$RawUrl)
  $value = [string]$RawUrl
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Url cannot be empty."
  }
  $value = $value.Trim()
  if ($value -notmatch "^[a-zA-Z][a-zA-Z0-9+.-]*://") {
    $value = "http://$value"
  }
  try {
    return ([Uri]$value).AbsoluteUri
  } catch {
    throw ("Invalid URL: " + $value)
  }
}

$resolvedUrl = Normalize-Url -RawUrl $Url
$resolvedEmail = if ([string]::IsNullOrWhiteSpace($PreferredEmail)) {
  [string][Environment]::GetEnvironmentVariable("ASOLARIA_UI_CHROME_EMAIL", "Process")
} else {
  [string]$PreferredEmail
}
if ([string]::IsNullOrWhiteSpace($resolvedEmail)) {
  $resolvedEmail = [string][Environment]::GetEnvironmentVariable("ASOLARIA_UI_CHROME_EMAIL", "User")
}
if ([string]::IsNullOrWhiteSpace($resolvedEmail)) {
  $resolvedEmail = "plasmatoid@gmail.com"
}

$resolvedDirectory = if ([string]::IsNullOrWhiteSpace($PreferredProfileDirectory)) {
  [string][Environment]::GetEnvironmentVariable("ASOLARIA_UI_CHROME_PROFILE_DIRECTORY", "Process")
} else {
  [string]$PreferredProfileDirectory
}
if ([string]::IsNullOrWhiteSpace($resolvedDirectory)) {
  $resolvedDirectory = [string][Environment]::GetEnvironmentVariable("ASOLARIA_UI_CHROME_PROFILE_DIRECTORY", "User")
}

$chromePath = Resolve-ChromePath
if ([string]::IsNullOrWhiteSpace([string]$chromePath)) {
  throw "Google Chrome executable was not found."
}

$userDataPath = Get-ChromeUserDataPath
$profiles = @(Get-ChromeProfiles -UserDataPath $userDataPath)
$selected = Select-ChromeProfile `
  -Profiles $profiles `
  -Email $resolvedEmail `
  -Directory $resolvedDirectory `
  -AllowRestricted $AllowRestrictedProfile.IsPresent

if ($null -eq $selected) {
  throw ("No permitted Chrome profile resolved (email={0}, directory={1})." -f $resolvedEmail, $resolvedDirectory)
}

if ($selected.restricted -and -not $AllowRestrictedProfile.IsPresent) {
  throw ("Resolved Chrome profile is restricted and cannot be used by default: {0}" -f [string]$selected.directory)
}

$args = @(
  "--profile-directory=$($selected.directory)",
  "--new-window",
  $resolvedUrl
)
$proc = Start-Process -FilePath $chromePath -ArgumentList $args -PassThru -WindowStyle Normal

[pscustomobject]@{
  ok = $true
  pid = [int]$proc.Id
  url = [string]$resolvedUrl
  chromePath = [string]$chromePath
  profileDirectory = [string]$selected.directory
  profileEmail = [string]$selected.email
  profileDisplayName = [string]$selected.displayName
  restricted = [bool]$selected.restricted
}
