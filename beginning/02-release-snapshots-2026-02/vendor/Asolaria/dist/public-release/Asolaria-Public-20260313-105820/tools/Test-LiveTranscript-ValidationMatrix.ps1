param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$SessionId = "",
  [string]$BridgePushToken = "",
  [switch]$KeepSession,
  [string]$ReportPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-QueryString {
  param([hashtable]$Params)
  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($key in ($Params.Keys | Sort-Object)) {
    $raw = $Params[$key]
    if ($null -eq $raw) {
      continue
    }
    $text = [string]$raw
    if ([string]::IsNullOrWhiteSpace($text)) {
      continue
    }
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

function Invoke-JsonPost {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][object]$Body
  )
  $json = $Body | ConvertTo-Json -Depth 12
  return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $json -TimeoutSec 20
}

function Build-BridgePushUrl {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$Session,
    [Parameter(Mandatory = $true)][string]$LaneId,
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Text,
    [string]$Token = ""
  )
  $query = New-QueryString @{
    text = $Text
    source = $Source
    direction = "incoming"
    sessionId = $Session
    laneId = $LaneId
    at = [DateTimeOffset]::UtcNow.ToString("o")
    token = $Token
  }
  return ("{0}/api/voice/bridge-caption/push?{1}" -f $Base, $query)
}

function Test-ContainsAllLines {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string[]]$Lines
  )
  foreach ($line in $Lines) {
    $needle = [string]$line
    if ([string]::IsNullOrWhiteSpace($needle)) {
      continue
    }
    if (-not $Text.Contains($needle)) {
      return $false
    }
  }
  return $true
}

function Format-YesNo {
  param([bool]$Value)
  if ($Value) {
    return "yes"
  }
  return "no"
}

function Format-PassFail {
  param([bool]$Value)
  if ($Value) {
    return "PASS"
  }
  return "FAIL"
}

$base = $BaseUrl.TrimEnd("/")
if ([string]::IsNullOrWhiteSpace($SessionId)) {
  $SessionId = "matrix_{0}_{1}" -f (Get-Date -Format "yyyyMMdd_HHmmss"), ([guid]::NewGuid().ToString("N").Substring(0, 6))
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $repoRoot "reports"
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
if ([string]::IsNullOrWhiteSpace($ReportPath)) {
  $ReportPath = Join-Path $reportsDir ("live-transcript-validation-matrix-{0}.md" -f $stamp)
}

$scenarios = @(
  [pscustomobject]@{
    name = "Zoom"
    source = "zoom_caption"
    laneId = "zoom_lane"
    lines = @(
      "Zoom interviewer: Please walk me through your architecture.",
      "Zoom candidate: We split capture and transcript composition by lane."
    )
  },
  [pscustomobject]@{
    name = "Google Meet"
    source = "google_meet_caption"
    laneId = "meet_lane"
    lines = @(
      "Meet interviewer: How do you handle transcript drift?",
      "Meet candidate: We dedupe lines and keep source-aware snapshots."
    )
  },
  [pscustomobject]@{
    name = "Microsoft Teams"
    source = "teams_caption"
    laneId = "teams_lane"
    lines = @(
      "Teams interviewer: Show me your validation matrix.",
      "Teams candidate: We verify bridge, live, and merged transcript views."
    )
  }
)

$resetBody = @{
  sessionId = $SessionId
  source = "matrix_runner"
}
[void](Invoke-JsonPost -Url ("{0}/api/voice/bridge-caption/reset" -f $base) -Body $resetBody)

$results = @()
foreach ($scenario in $scenarios) {
  $pushResponses = @()
  foreach ($line in $scenario.lines) {
    $pushUrl = Build-BridgePushUrl -Base $base -Session $SessionId -LaneId $scenario.laneId -Source $scenario.source -Text $line -Token $BridgePushToken
    $pushResponses += Invoke-JsonGet -Url $pushUrl
    Start-Sleep -Milliseconds 120
  }

  Start-Sleep -Milliseconds 220

  $pullQuery = New-QueryString @{
    sessionId = $SessionId
    laneId = $scenario.laneId
    afterId = 0
    limit = 120
  }
  $pull = Invoke-JsonGet -Url ("{0}/api/voice/bridge-caption/pull?{1}" -f $base, $pullQuery)

  $bridgeQuery = New-QueryString @{
    source = "bridge"
    includeBridgeCaptions = 1
    bridgeSessionId = $SessionId
    bridgeLaneId = $scenario.laneId
    bridgeMaxEntries = 160
  }
  $bridgeTranscriptPayload = Invoke-JsonGet -Url ("{0}/api/voice/live/transcript?{1}" -f $base, $bridgeQuery)
  $bridgeTranscript = [string]$bridgeTranscriptPayload.transcript

  $allQuery = New-QueryString @{
    source = "all"
    includeBridgeCaptions = 1
    bridgeSessionId = $SessionId
    bridgeLaneId = $scenario.laneId
    bridgeMaxEntries = 160
  }
  $allTranscriptPayload = Invoke-JsonGet -Url ("{0}/api/voice/live/transcript?{1}" -f $base, $allQuery)
  $allTranscript = [string]$allTranscriptPayload.transcript

  $pullEntries = @($pull.entries)
  $pullText = [string]::Join("`n", @($pullEntries | ForEach-Object { [string]$_.text }))
  $bridgeHasAll = Test-ContainsAllLines -Text $bridgeTranscript -Lines @($scenario.lines)
  $allHasAll = Test-ContainsAllLines -Text $allTranscript -Lines @($scenario.lines)
  $pullHasAll = Test-ContainsAllLines -Text $pullText -Lines @($scenario.lines)
  $pushAccepted = @($pushResponses | Where-Object { $_.accepted -eq $true -or $_.deduped -eq $true }).Count
  $ok = ($pushAccepted -ge $scenario.lines.Count) -and $bridgeHasAll -and $allHasAll -and $pullHasAll

  $results += [pscustomobject]@{
    scenario = $scenario.name
    source = $scenario.source
    laneId = $scenario.laneId
    pushedLines = $scenario.lines.Count
    pushAcceptedOrDeduped = $pushAccepted
    pullEntries = $pullEntries.Count
    bridgeContainsAll = $bridgeHasAll
    allContainsAll = $allHasAll
    pullContainsAll = $pullHasAll
    ok = $ok
  }
}

$statusQuery = New-QueryString @{
  includeTranscript = 1
  includeSegments = 0
  source = "all"
  includeBridgeCaptions = 1
  bridgeSessionId = $SessionId
  bridgeMaxEntries = 240
}
$status = Invoke-JsonGet -Url ("{0}/api/voice/live/status?{1}" -f $base, $statusQuery)

$overallOk = @($results | Where-Object { $_.ok -ne $true }).Count -eq 0

$tokenSuppliedLabel = Format-YesNo (-not [string]::IsNullOrWhiteSpace($BridgePushToken))
$overallLabel = Format-PassFail $overallOk

$reportLines = @(
  "# Live Transcript Validation Matrix",
  "",
  ("Generated: {0}" -f [DateTimeOffset]::UtcNow.ToString("o")),
  ("Base URL: {0}" -f $base),
  ("Session ID: {0}" -f $SessionId),
  ("Bridge push token supplied: {0}" -f $tokenSuppliedLabel),
  "",
  ("Overall: {0}" -f $overallLabel),
  "",
  "| Scenario | Source | Lane | Push OK | Pull Entries | Bridge Contains All | All Contains All | Pull Contains All | Result |",
  "| --- | --- | --- | ---: | ---: | --- | --- | --- | --- |"
)

foreach ($row in $results) {
  $bridgeContainsAllLabel = Format-YesNo ([bool]$row.bridgeContainsAll)
  $allContainsAllLabel = Format-YesNo ([bool]$row.allContainsAll)
  $pullContainsAllLabel = Format-YesNo ([bool]$row.pullContainsAll)
  $resultLabel = Format-PassFail ([bool]$row.ok)
  $reportLines += (
    "| {0} | {1} | {2} | {3}/{4} | {5} | {6} | {7} | {8} | {9} |" -f
    $row.scenario,
    $row.source,
    $row.laneId,
    $row.pushAcceptedOrDeduped,
    $row.pushedLines,
    $row.pullEntries,
    $bridgeContainsAllLabel,
    $allContainsAllLabel,
    $pullContainsAllLabel,
    $resultLabel
  )
}

$reportLines += ""
$reportLines += "## Status Snapshot"
$reportLines += ""
$reportLines += ("- /api/voice/live/status ok: {0}" -f ([bool]$status.ok))
$reportLines += ("- compat source: {0}" -f [string]($status.compatTranscript.source))
$reportLines += ("- compat bridge session: {0}" -f [string]($status.compatTranscript.bridgeSessionId))
$reportLines += ("- compat transcript chars: {0}" -f ([string]($status.compatTranscript.transcript).Length))

$reportDir = Split-Path -Parent $ReportPath
if ($reportDir) {
  New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
}
$reportLines -join "`r`n" | Set-Content -Path $ReportPath -Encoding UTF8

if (-not $KeepSession.IsPresent) {
  [void](Invoke-JsonPost -Url ("{0}/api/voice/bridge-caption/reset" -f $base) -Body $resetBody)
}

[pscustomobject]@{
  ok = $overallOk
  baseUrl = $base
  sessionId = $SessionId
  reportPath = $ReportPath
  keepSession = [bool]$KeepSession.IsPresent
  bridgePushTokenSupplied = -not [string]::IsNullOrWhiteSpace($BridgePushToken)
  scenarios = $results
  status = [pscustomobject]@{
    ok = [bool]$status.ok
    compatSource = [string]$status.compatTranscript.source
    compatBridgeSessionId = [string]$status.compatTranscript.bridgeSessionId
    compatTranscriptLength = ([string]($status.compatTranscript.transcript)).Length
  }
  testedAt = [DateTimeOffset]::UtcNow.ToString("o")
} | ConvertTo-Json -Depth 8
