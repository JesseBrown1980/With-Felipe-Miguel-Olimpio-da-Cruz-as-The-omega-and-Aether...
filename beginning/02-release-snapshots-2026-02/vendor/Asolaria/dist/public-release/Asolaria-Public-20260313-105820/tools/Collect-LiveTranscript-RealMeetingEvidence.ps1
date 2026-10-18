param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$OutputDir = "",
  [string]$ZoomSessionId = "",
  [string]$ZoomLaneId = "",
  [string]$MeetSessionId = "",
  [string]$MeetLaneId = "",
  [string]$TeamsSessionId = "",
  [string]$TeamsLaneId = "",
  [int]$BridgeMaxEntries = 320
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-QueryString {
  param([hashtable]$Params)
  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($key in ($Params.Keys | Sort-Object)) {
    $value = $Params[$key]
    if ($null -eq $value) { continue }
    $text = [string]$value
    if ([string]::IsNullOrWhiteSpace($text)) { continue }
    $parts.Add(
      ("{0}={1}" -f [uri]::EscapeDataString([string]$key), [uri]::EscapeDataString($text))
    )
  }
  return [string]::Join("&", $parts)
}

function Invoke-JsonGet {
  param([Parameter(Mandatory = $true)][string]$Url)
  return Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec 20
}

function Invoke-TextGet {
  param([Parameter(Mandatory = $true)][string]$Url)
  return [string](Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec 20)
}

function Build-Scenario {
  param(
    [string]$Platform,
    [string]$SessionId,
    [string]$LaneId
  )
  return [pscustomobject]@{
    platform = [string]$Platform
    sessionId = [string]$SessionId
    laneId = [string]$LaneId
  }
}

function Write-JsonFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][object]$Value
  )
  ($Value | ConvertTo-Json -Depth 20) | Set-Content -Path $Path -Encoding UTF8
}

function Write-TextFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [string]$Value
  )
  [string]$Value | Set-Content -Path $Path -Encoding UTF8
}

function Get-SafeSlug {
  param([string]$Value)
  $raw = [string]$Value
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return "unknown"
  }
  $safe = ($raw.ToLowerInvariant() -replace "[^a-z0-9_.-]", "_").Trim("_")
  if ([string]::IsNullOrWhiteSpace($safe)) {
    return "unknown"
  }
  return $safe
}

$base = $BaseUrl.TrimEnd("/")
$repoRoot = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $repoRoot "reports"
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputDir = Join-Path $reportsDir ("live-transcript-realmeet-{0}" -f $stamp)
}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$health = Invoke-JsonGet -Url ("{0}/api/health" -f $base)
$authStatus = Invoke-JsonGet -Url ("{0}/api/voice/bridge-caption/auth-status" -f $base)
Write-JsonFile -Path (Join-Path $OutputDir "runtime-health.json") -Value $health
Write-JsonFile -Path (Join-Path $OutputDir "bridge-auth-status.json") -Value $authStatus

$scenarios = @(
  (Build-Scenario -Platform "Zoom" -SessionId $ZoomSessionId -LaneId $ZoomLaneId),
  (Build-Scenario -Platform "Google Meet" -SessionId $MeetSessionId -LaneId $MeetLaneId),
  (Build-Scenario -Platform "Microsoft Teams" -SessionId $TeamsSessionId -LaneId $TeamsLaneId)
)

$rows = @()
foreach ($scenario in $scenarios) {
  $platform = [string]$scenario.platform
  $sessionId = [string]$scenario.sessionId
  $laneId = [string]$scenario.laneId
  $slug = Get-SafeSlug -Value $platform
  if ([string]::IsNullOrWhiteSpace($sessionId)) {
    $rows += [pscustomobject]@{
      platform = $platform
      sessionId = ""
      laneId = $laneId
      collected = $false
      reason = "missing_session_id"
      pullEntries = 0
      bridgeChars = 0
      allChars = 0
      liveChars = 0
    }
    continue
  }

  $lanesQuery = New-QueryString @{
    sessionId = $sessionId
  }
  $lanesUrl = "{0}/api/voice/bridge-caption/lanes?{1}" -f $base, $lanesQuery
  $lanesPayload = Invoke-JsonGet -Url $lanesUrl
  Write-JsonFile -Path (Join-Path $OutputDir ("{0}-bridge-lanes.json" -f $slug)) -Value $lanesPayload

  $pullQuery = New-QueryString @{
    sessionId = $sessionId
    laneId = $laneId
    afterId = 0
    limit = 1000
  }
  $pullUrl = "{0}/api/voice/bridge-caption/pull?{1}" -f $base, $pullQuery
  $pullPayload = Invoke-JsonGet -Url $pullUrl
  Write-JsonFile -Path (Join-Path $OutputDir ("{0}-bridge-pull.json" -f $slug)) -Value $pullPayload

  $bridgeQuery = New-QueryString @{
    source = "bridge"
    includeBridgeCaptions = 1
    bridgeSessionId = $sessionId
    bridgeLaneId = $laneId
    bridgeMaxEntries = $BridgeMaxEntries
    text = 1
  }
  $bridgeText = Invoke-TextGet -Url ("{0}/api/voice/live/transcript?{1}" -f $base, $bridgeQuery)
  Write-TextFile -Path (Join-Path $OutputDir ("{0}-transcript-bridge.txt" -f $slug)) -Value $bridgeText

  $allQuery = New-QueryString @{
    source = "all"
    includeBridgeCaptions = 1
    bridgeSessionId = $sessionId
    bridgeLaneId = $laneId
    bridgeMaxEntries = $BridgeMaxEntries
    text = 1
  }
  $allText = Invoke-TextGet -Url ("{0}/api/voice/live/transcript?{1}" -f $base, $allQuery)
  Write-TextFile -Path (Join-Path $OutputDir ("{0}-transcript-all.txt" -f $slug)) -Value $allText

  $liveQuery = New-QueryString @{
    source = "live"
    bridgeSessionId = $sessionId
    bridgeLaneId = $laneId
    bridgeMaxEntries = $BridgeMaxEntries
    text = 1
  }
  $liveText = Invoke-TextGet -Url ("{0}/api/voice/live/transcript?{1}" -f $base, $liveQuery)
  Write-TextFile -Path (Join-Path $OutputDir ("{0}-transcript-live.txt" -f $slug)) -Value $liveText

  $rows += [pscustomobject]@{
    platform = $platform
    sessionId = $sessionId
    laneId = $laneId
    collected = $true
    reason = ""
    pullEntries = @($pullPayload.entries).Count
    bridgeChars = ([string]$bridgeText).Length
    allChars = ([string]$allText).Length
    liveChars = ([string]$liveText).Length
  }
}

$summaryPath = Join-Path $OutputDir "REALMEET_SUMMARY.md"
$lines = @(
  "# Real Meeting Evidence Summary",
  "",
  ("Generated: {0}" -f [DateTimeOffset]::UtcNow.ToString("o")),
  ("Base URL: {0}" -f $base),
  ("Output Dir: {0}" -f $OutputDir),
  "",
  "## Runtime",
  "",
  ("- health.ok: {0}" -f [bool]$health.ok),
  ("- uptimeSeconds: {0}" -f [int]$health.uptimeSeconds),
  ("- bridge auth mode: {0}" -f [string]$authStatus.auth.mode),
  ("- bridge auth required: {0}" -f [bool]$authStatus.auth.required),
  "",
  "## Collected Rows",
  "",
  "| Platform | SessionId | LaneId | Collected | Pull Entries | Bridge Chars | All Chars | Live Chars | Reason |",
  "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |"
)
foreach ($row in $rows) {
  $lines += (
    "| {0} | {1} | {2} | {3} | {4} | {5} | {6} | {7} | {8} |" -f
    [string]$row.platform,
    [string]$row.sessionId,
    [string]$row.laneId,
    ($(if ([bool]$row.collected) { "yes" } else { "no" })),
    [int]$row.pullEntries,
    [int]$row.bridgeChars,
    [int]$row.allChars,
    [int]$row.liveChars,
    [string]$row.reason
  )
}
$lines += ""
$lines += "## Manual Pass/Fail Matrix (fill after listening review)"
$lines += ""
$lines += "| Platform | Incoming Accuracy | Outgoing Accuracy | Mixed Stability | Source Switch | Copy Action | Auth Errors | Result | Notes |"
$lines += "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
$lines += "| Zoom |  |  |  |  |  |  |  |  |"
$lines += "| Google Meet |  |  |  |  |  |  |  |  |"
$lines += "| Microsoft Teams |  |  |  |  |  |  |  |  |"
$lines += ""
$lines += "## Files"
$lines += ""
$lines += "- runtime-health.json"
$lines += "- bridge-auth-status.json"
$lines += "- <platform>-bridge-lanes.json"
$lines += "- <platform>-bridge-pull.json"
$lines += "- <platform>-transcript-bridge.txt"
$lines += "- <platform>-transcript-all.txt"
$lines += "- <platform>-transcript-live.txt"

($lines -join "`r`n") | Set-Content -Path $summaryPath -Encoding UTF8
Write-JsonFile -Path (Join-Path $OutputDir "summary.json") -Value @{
  ok = $true
  baseUrl = $base
  outputDir = $OutputDir
  rows = $rows
  auth = $authStatus.auth
  generatedAt = [DateTimeOffset]::UtcNow.ToString("o")
}

[pscustomobject]@{
  ok = $true
  baseUrl = $base
  outputDir = $OutputDir
  summaryPath = $summaryPath
  collected = @($rows | Where-Object { $_.collected -eq $true }).Count
  skipped = @($rows | Where-Object { $_.collected -ne $true }).Count
  rows = $rows
  generatedAt = [DateTimeOffset]::UtcNow.ToString("o")
} | ConvertTo-Json -Depth 10
