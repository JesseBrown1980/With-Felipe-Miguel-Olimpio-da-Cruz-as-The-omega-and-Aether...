param(
  [string]$SessionTag = "",
  [string]$OutputPath = "",
  [string]$BaseUrl = "http://127.0.0.1:4781"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($SessionTag)) {
  $SessionTag = "real-meeting-" + (Get-Date -Format "yyyyMMdd-HHmmss")
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $repoRoot "reports"
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $reportsDir ("live-transcript-real-meeting-checklist-{0}.md" -f $SessionTag)
}

$utcNow = [DateTimeOffset]::UtcNow.ToString("o")
$lines = @(
  "# Live Transcript Real-Meeting Checklist",
  "",
  ("Generated: {0}" -f $utcNow),
  ("Session tag: {0}" -f $SessionTag),
  ("Base URL: {0}" -f $BaseUrl.TrimEnd('/')),
  "",
  "## Preconditions",
  "",
  '- [ ] Asolaria runtime healthy (`GET /api/health` => `ok=true`).',
  "- [ ] Quick Realtime UI opened and source selector visible.",
  "- [ ] If bridge auth is required, Bridge Push Token is configured in quick UI.",
  "- [ ] Meeting captions are enabled in target app.",
  "",
  "## API Baseline",
  "",
  "1. Run scripted matrix (synthetic lanes):",
  "",
  '```powershell',
  "powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-LiveTranscript-ValidationMatrix.ps1",
  '```',
  "",
  "2. Run bridge auth smoke:",
  "",
  '```powershell',
  "powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Test-VoiceBridgeCaptionPushAuth.ps1",
  '```',
  "",
  "## Real Call Validation - Zoom",
  "",
  "- [ ] Join a Zoom call with live captions.",
  '- [ ] Capture source chosen in Asolaria (`google_meet_caption` or `custom_caption` bridge path as appropriate).',
  '- [ ] Transcript source tested: `live`.',
  '- [ ] Transcript source tested: `bridge`.',
  '- [ ] Transcript source tested: `all`.',
  "- [ ] Copy output is human-usable and copy/paste clean.",
  "- [ ] No unexpected noise/system lines.",
  "",
  "Notes:",
  "- audio device path used:",
  "- observed lag (ms approx):",
  "- anomalies:",
  "",
  "## Real Call Validation - Google Meet",
  "",
  "- [ ] Join a Meet call with live captions.",
  "- [ ] Run copied Meet bridge script in DevTools.",
  '- [ ] Transcript source tested: `live`.',
  '- [ ] Transcript source tested: `bridge`.',
  '- [ ] Transcript source tested: `all`.',
  "- [ ] Lane routing metadata appears stable.",
  "- [ ] Copy output is clean.",
  "",
  "Notes:",
  "- observed lag (ms approx):",
  "- anomalies:",
  "",
  "## Real Call Validation - Microsoft Teams",
  "",
  "- [ ] Join a Teams call with captions/subtitles enabled.",
  "- [ ] Use custom bridge script path where needed.",
  '- [ ] Transcript source tested: `live`.',
  '- [ ] Transcript source tested: `bridge`.',
  '- [ ] Transcript source tested: `all`.',
  "- [ ] Copy output is clean.",
  "",
  "Notes:",
  "- observed lag (ms approx):",
  "- anomalies:",
  "",
  "## Exit Criteria",
  "",
  "- [ ] All three apps pass with no blocker severity findings.",
  '- [ ] Any medium/high issue logged to `TASKS.md` with timestamp and reproduction.',
  '- [ ] Final report saved in `reports/` and referenced in task ledger.'
)

$outputDir = Split-Path -Parent $OutputPath
if ($outputDir) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}
($lines -join "`r`n") | Set-Content -Path $OutputPath -Encoding UTF8

[pscustomobject]@{
  ok = $true
  sessionTag = $SessionTag
  outputPath = $OutputPath
  generatedAt = $utcNow
} | ConvertTo-Json -Depth 5
