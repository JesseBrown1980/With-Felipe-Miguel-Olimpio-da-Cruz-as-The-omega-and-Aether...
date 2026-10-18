param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$ReportPath = "",
  [string]$SessionTag = "",
  [switch]$RunApiMatrix
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-JsonGet {
  param([Parameter(Mandatory = $true)][string]$Url)
  return Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec 20
}

function New-SafeTag {
  param([string]$Value)
  $raw = [string]$Value
  if ([string]::IsNullOrWhiteSpace($raw)) {
    $raw = Get-Date -Format "yyyyMMdd-HHmmss"
  }
  $safe = ($raw -replace "[^a-zA-Z0-9_.-]", "_").Trim("_")
  if ([string]::IsNullOrWhiteSpace($safe)) {
    return "session"
  }
  return $safe
}

$base = $BaseUrl.TrimEnd("/")
$safeTag = New-SafeTag -Value $SessionTag

$repoRoot = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $repoRoot "reports"
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

if ([string]::IsNullOrWhiteSpace($ReportPath)) {
  $ReportPath = Join-Path $reportsDir ("live-transcript-real-meeting-packet-{0}.md" -f $safeTag)
}

$health = Invoke-JsonGet -Url ("{0}/api/health" -f $base)
$voiceStatus = Invoke-JsonGet -Url ("{0}/api/voice/live/status?includeTranscript=1&includeSegments=0&source=all&includeBridgeCaptions=1&bridgeMaxEntries=240" -f $base)

$matrixSummary = "not_run"
$matrixReport = ""
if ($RunApiMatrix.IsPresent) {
  $matrixScript = Join-Path $PSScriptRoot "Test-LiveTranscript-ValidationMatrix.ps1"
  if (Test-Path -LiteralPath $matrixScript) {
    $matrixRaw = & powershell -NoProfile -ExecutionPolicy Bypass -File $matrixScript -BaseUrl $base 2>$null
    if ($LASTEXITCODE -eq 0 -and $matrixRaw) {
      $matrixParsed = $matrixRaw | ConvertFrom-Json
      $matrixSummary = if ($matrixParsed.ok) { "pass" } else { "fail" }
      $matrixReport = [string]$matrixParsed.reportPath
    } else {
      $matrixSummary = "error"
    }
  } else {
    $matrixSummary = "missing_script"
  }
}
$matrixReportDisplay = if ($matrixReport) { $matrixReport } else { "(none)" }

$reportLines = @(
  "# Live Transcript Real Meeting Validation Packet",
  "",
  ("Generated: {0}" -f [DateTimeOffset]::UtcNow.ToString("o")),
  ("Base URL: {0}" -f $base),
  ("Session Tag: {0}" -f $safeTag),
  ("API Matrix (synthetic): {0}" -f $matrixSummary),
  ("API Matrix Report: {0}" -f $matrixReportDisplay),
  "",
  "## Runtime Snapshot",
  "",
  ("- health.ok: {0}" -f [bool]$health.ok),
  ("- uptimeSeconds: {0}" -f [int]$health.uptimeSeconds),
  ("- voice.live.running: {0}" -f [bool]($voiceStatus.live.running)),
  ("- voice.compat.source: {0}" -f [string]($voiceStatus.compatTranscript.source)),
  ("- voice.compat.bridgeSessionId: {0}" -f [string]($voiceStatus.compatTranscript.bridgeSessionId)),
  "",
  "## Pre-Flight",
  "",
  '- [ ] Confirm `/api/health` returns `ok=true`.',
  "- [ ] Confirm intended ingest auth mode (open vs token-protected).",
  '- [ ] If token-protected, set `Bridge Push Token` in quick UI before copying bridge script.',
  '- [ ] Confirm transcript source selector target (`live`, `bridge`, or `all`).',
  "",
  "## Real Meeting Matrix",
  "",
  "### Zoom",
  '- Meeting id/url: `...`',
  '- Capture source used: `...`',
  '- Transcript source used: `...`',
  "- [ ] Incoming lines appear within 2s median.",
  "- [ ] Copy transcript output is paste-ready.",
  "- [ ] No repeated noise/control lines.",
  '- Notes: `...`',
  "",
  "### Google Meet",
  '- Meeting id/url: `...`',
  '- Capture source used: `...`',
  '- Transcript source used: `...`',
  "- [ ] Incoming lines appear within 2s median.",
  "- [ ] Copy transcript output is paste-ready.",
  "- [ ] No repeated noise/control lines.",
  '- Notes: `...`',
  "",
  "### Microsoft Teams",
  '- Meeting id/url: `...`',
  '- Capture source used: `...`',
  '- Transcript source used: `...`',
  "- [ ] Incoming lines appear within 2s median.",
  "- [ ] Copy transcript output is paste-ready.",
  "- [ ] No repeated noise/control lines.",
  '- Notes: `...`',
  "",
  "## Exit Criteria",
  "",
  "- [ ] All 3 apps pass with at least one full interview segment each.",
  "- [ ] At least one run validated under token-protected ingest (if enabled in production).",
  '- [ ] `source=bridge` and `source=all` transcript modes both validated in live UI.',
  "",
  "## Operator Commands",
  "",
  '```powershell',
  "# Synthetic API matrix (optional)",
  "powershell -NoProfile -ExecutionPolicy Bypass -File .\\tools\\Test-LiveTranscript-ValidationMatrix.ps1",
  "",
  "# Generate another packet",
  ("powershell -NoProfile -ExecutionPolicy Bypass -File .\\tools\\New-LiveTranscript-RealMeetingPacket.ps1 -BaseUrl '{0}' -SessionTag '{1}'" -f $base, $safeTag),
  '```'
)

$reportDir = Split-Path -Parent $ReportPath
if ($reportDir) {
  New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
}
$reportLines -join "`r`n" | Set-Content -Path $ReportPath -Encoding UTF8

[pscustomobject]@{
  ok = $true
  baseUrl = $base
  reportPath = $ReportPath
  sessionTag = $safeTag
  matrixSummary = $matrixSummary
  matrixReport = $matrixReport
  testedAt = [DateTimeOffset]::UtcNow.ToString("o")
} | ConvertTo-Json -Depth 6
