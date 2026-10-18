[CmdletBinding()]
param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$Viewer = "falcon",
  [switch]$IncludeMutationProbes,
  [string]$OutDir = "C:\Users\acer\Asolaria\reports",
  [int]$TimeoutSec = 12
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-JsonApi {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [ValidateSet("GET", "POST")][string]$Method = "GET",
    [hashtable]$Headers = @{},
    [object]$Body = $null,
    [int]$Timeout = 10
  )

  $statusCode = 0
  $responseBody = ""
  try {
    $requestParams = @{
      Uri = $Url
      Method = $Method
      Headers = $Headers
      TimeoutSec = $Timeout
      ErrorAction = "Stop"
    }
    $iwr = Get-Command Invoke-WebRequest -ErrorAction SilentlyContinue
    if ($iwr -and $iwr.Parameters -and $iwr.Parameters.ContainsKey("UseBasicParsing")) {
      $requestParams["UseBasicParsing"] = $true
    }
    if ($Method -eq "POST") {
      $requestParams["ContentType"] = "application/json"
      $requestParams["Body"] = (($Body | ConvertTo-Json -Depth 8 -Compress))
    }
    $raw = Invoke-WebRequest @requestParams
    $statusCode = [int]$raw.StatusCode
    $responseBody = [string]$raw.Content
    $data = $null
    if (-not [string]::IsNullOrWhiteSpace($responseBody)) {
      $data = $responseBody | ConvertFrom-Json -ErrorAction Stop
    }
    return [pscustomobject]@{
      ok = $true
      statusCode = $statusCode
      url = $Url
      method = $Method
      error = ""
      data = $data
      body = $responseBody
    }
  } catch {
    $ex = $_.Exception
    try {
      if ($ex.Response -and $ex.Response.StatusCode) {
        $statusCode = [int]$ex.Response.StatusCode
      }
    } catch {
      $statusCode = 0
    }
    try {
      if ($ex.Response) {
        $stream = $ex.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $responseBody = $reader.ReadToEnd()
          $reader.Close()
        }
      }
    } catch {
      $responseBody = ""
    }

    $parsed = $null
    if (-not [string]::IsNullOrWhiteSpace($responseBody)) {
      try {
        $parsed = $responseBody | ConvertFrom-Json -ErrorAction Stop
      } catch {
        $parsed = $null
      }
    }
    return [pscustomobject]@{
      ok = $false
      statusCode = $statusCode
      url = $Url
      method = $Method
      error = [string]$ex.Message
      data = $parsed
      body = $responseBody
    }
  }
}

function Get-QueryParam {
  param(
    [string]$Url,
    [string]$Name
  )
  $key = [Regex]::Escape([string]$Name)
  $match = [Regex]::Match([string]$Url, "(?:\?|&)$key=([^&]+)")
  if (-not $match.Success) {
    return ""
  }
  try {
    return [System.Uri]::UnescapeDataString($match.Groups[1].Value)
  } catch {
    return $match.Groups[1].Value
  }
}

function Resolve-RemoteBase {
  param([string]$Url)
  try {
    $uri = [System.Uri]$Url
    if (-not $uri.Scheme -or -not $uri.Host) {
      return ""
    }
    $builder = New-Object System.UriBuilder($uri.Scheme, $uri.Host, $uri.Port)
    $builder.Path = ""
    return $builder.Uri.AbsoluteUri.TrimEnd("/")
  } catch {
    return ""
  }
}

if (-not (Test-Path -LiteralPath $OutDir)) {
  New-Item -Path $OutDir -ItemType Directory -Force | Out-Null
}

$base = $BaseUrl.TrimEnd("/")
$health = Invoke-JsonApi -Url "$base/api/health" -Timeout $TimeoutSec
if (-not $health.ok -or -not $health.data) {
  $result = [pscustomobject]@{
    ok = $false
    error = "Failed to query /api/health"
    baseUrl = $base
    health = $health
  }
  $result | ConvertTo-Json -Depth 10
  exit 1
}

$paths = $health.data.uiControl.paths
$localConsole = [string]$paths.local_console
if ([string]::IsNullOrWhiteSpace($localConsole)) {
  $localConsole = [string]$paths.localConsole
}
$remoteConsole = [string]$paths.remote_console
if ([string]::IsNullOrWhiteSpace($remoteConsole)) {
  $remoteConsole = [string]$paths.remoteConsole
}
$token = Get-QueryParam -Url $localConsole -Name "token"
$remoteBase = Resolve-RemoteBase -Url $remoteConsole

if ([string]::IsNullOrWhiteSpace($token)) {
  $result = [pscustomobject]@{
    ok = $false
    error = "No mobile token found in /api/health uiControl paths."
    baseUrl = $base
    localConsole = $localConsole
    remoteConsole = $remoteConsole
  }
  $result | ConvertTo-Json -Depth 10
  exit 1
}

$headers = @{}
if (-not [string]::IsNullOrWhiteSpace($Viewer)) {
  $headers["x-asolaria-viewer"] = $Viewer
}

$localStatus = Invoke-JsonApi -Url "$base/api/mobile/control/status?token=$token" -Headers $headers -Timeout $TimeoutSec
$remoteStatus = $null
if (-not [string]::IsNullOrWhiteSpace($remoteBase)) {
  $remoteStatus = Invoke-JsonApi -Url "$remoteBase/api/mobile/control/status?token=$token&channel=public_internet" -Headers $headers -Timeout $TimeoutSec
}

$localArm = $null
$remoteArm = $null
if ($IncludeMutationProbes) {
  $localArm = Invoke-JsonApi -Url "$base/api/mobile/control/arm?token=$token" -Method "POST" -Headers $headers -Body @{
    ttlMs = 15000
    by = "authority-audit-local"
  } -Timeout $TimeoutSec

  if (-not [string]::IsNullOrWhiteSpace($remoteBase)) {
    $remoteArm = Invoke-JsonApi -Url "$remoteBase/api/mobile/control/arm?token=$token&channel=public_internet" -Method "POST" -Headers $headers -Body @{
      ttlMs = 15000
      by = "authority-audit-remote"
    } -Timeout $TimeoutSec
  }
}

$localAuthority = if ($localStatus -and $localStatus.data) { $localStatus.data.authority } else { $null }
$remoteAuthority = if ($remoteStatus -and $remoteStatus.data) { $remoteStatus.data.authority } else { $null }
$localAllowed = if ($localAuthority) { [bool]$localAuthority.superMasterControlAllowed } else { $null }
$remoteAllowed = if ($remoteAuthority) { [bool]$remoteAuthority.superMasterControlAllowed } else { $null }
$localReason = if ($localAuthority) { [string]$localAuthority.reason } else { "" }
$remoteReason = if ($remoteAuthority) { [string]$remoteAuthority.reason } else { "" }

$summary = [pscustomobject]@{
  localAllowed = $localAllowed
  localReason = $localReason
  remoteAllowed = $remoteAllowed
  remoteReason = $remoteReason
  remoteArmStealth404 = if ($remoteArm) { ($remoteArm.statusCode -eq 404) } else { $null }
}

$generatedAt = Get-Date
$stamp = $generatedAt.ToString("yyyyMMdd-HHmmss")
$jsonPath = Join-Path $OutDir ("mobile-control-authority-audit-{0}.json" -f $stamp)
$mdPath = Join-Path $OutDir ("mobile-control-authority-audit-{0}.md" -f $stamp)
$jsonLatest = Join-Path $OutDir "mobile-control-authority-audit-latest.json"
$mdLatest = Join-Path $OutDir "mobile-control-authority-audit-latest.md"

$result = [pscustomobject]@{
  ok = $true
  generatedAt = $generatedAt.ToString("o")
  baseUrl = $base
  viewer = $Viewer
  includeMutationProbes = [bool]$IncludeMutationProbes
  remoteBase = $remoteBase
  tokenHint = ("*" * ([Math]::Max(0, $token.Length - 4))) + $token.Substring([Math]::Max(0, $token.Length - 4))
  summary = $summary
  probes = [pscustomobject]@{
    health = $health
    localStatus = $localStatus
    remoteStatus = $remoteStatus
    localArm = $localArm
    remoteArm = $remoteArm
  }
  report = [pscustomobject]@{
    jsonPath = $jsonPath
    mdPath = $mdPath
    jsonLatest = $jsonLatest
    mdLatest = $mdLatest
  }
}

$result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
Copy-Item -LiteralPath $jsonPath -Destination $jsonLatest -Force

$md = @()
$md += "# Asolaria Mobile Control Authority Audit"
$md += ""
$md += "- Generated: $($generatedAt.ToString("yyyy-MM-dd HH:mm:ss zzz"))"
$md += ("- Base URL: {0}" -f $base)
$md += ("- Viewer: {0}" -f $Viewer)
$md += ("- Mutation probes: {0}" -f ([bool]$IncludeMutationProbes))
$md += ("- Remote base: {0}" -f $remoteBase)
$md += ""
$md += "## Summary"
$md += ""
$md += ("- Local allowed: {0} ({1})" -f $localAllowed, $localReason)
$md += ("- Remote allowed: {0} ({1})" -f $remoteAllowed, $remoteReason)
if ($IncludeMutationProbes) {
  $localArmStatus = if ($localArm) { $localArm.statusCode } else { 0 }
  $remoteArmStatus = if ($remoteArm) { $remoteArm.statusCode } else { 0 }
  $md += ("- Local arm status: {0}" -f $localArmStatus)
  $md += ("- Remote arm status: {0}" -f $remoteArmStatus)
}
$md += ""
$md += "## Probe Status"
$md += ""
$md += ("- Health: ok={0} status={1}" -f $health.ok, $health.statusCode)
$md += ("- Local status: ok={0} status={1}" -f $localStatus.ok, $localStatus.statusCode)
if ($remoteStatus) {
  $md += ("- Remote status: ok={0} status={1}" -f $remoteStatus.ok, $remoteStatus.statusCode)
}
if ($IncludeMutationProbes -and $localArm) {
  $md += ("- Local arm: ok={0} status={1}" -f $localArm.ok, $localArm.statusCode)
}
if ($IncludeMutationProbes -and $remoteArm) {
  $md += ("- Remote arm: ok={0} status={1}" -f $remoteArm.ok, $remoteArm.statusCode)
}

$mdText = ($md -join [Environment]::NewLine)
$mdText | Set-Content -LiteralPath $mdPath -Encoding UTF8
Copy-Item -LiteralPath $mdPath -Destination $mdLatest -Force

$result | ConvertTo-Json -Depth 12
