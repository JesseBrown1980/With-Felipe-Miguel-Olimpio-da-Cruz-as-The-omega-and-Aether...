[CmdletBinding()]
param(
  [int]$Port = 4781,
  [double]$DurationHours = 4,
  [string]$PacketPath = "",
  [string]$RunLabel = "",
  [int]$PollDelaySeconds = 15
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportsRoot = Join-Path $repoRoot "reports"
New-Item -Path $reportsRoot -ItemType Directory -Force | Out-Null

if ([string]::IsNullOrWhiteSpace($PacketPath)) {
  $PacketPath = Join-Path $reportsRoot "model-readonly-research-packet-latest.md"
}

if (-not (Test-Path -LiteralPath $PacketPath)) {
  throw "Packet file not found: $PacketPath"
}

$packetText = [System.IO.File]::ReadAllText($PacketPath, [System.Text.Encoding]::UTF8).Trim()
if (-not $packetText) {
  throw "Packet file is empty: $PacketPath"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safeLabel = ([string]$RunLabel).Trim()
if (-not $safeLabel) {
  $safeLabel = "default"
}
$safeLabel = ($safeLabel -replace '[^A-Za-z0-9._-]+', '-').Trim('-')
if (-not $safeLabel) {
  $safeLabel = "default"
}

$runRoot = Join-Path $reportsRoot "model-readonly-research"
$runDir = Join-Path $runRoot "$timestamp-$safeLabel"
New-Item -Path $runDir -ItemType Directory -Force | Out-Null

$summaryPath = Join-Path $runDir "summary.md"
$runJsonPath = Join-Path $runDir "run.json"
$packetCopyPath = Join-Path $runDir "packet.md"

[System.IO.File]::WriteAllText($packetCopyPath, $packetText + [Environment]::NewLine, [System.Text.Encoding]::UTF8)

$base = "http://127.0.0.1:$Port"
$deadline = (Get-Date).AddHours([Math]::Max(0.25, $DurationHours))
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Invoke-JsonGet {
  param([string]$Url)
  return Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec 20 -ErrorAction Stop
}

function Invoke-JsonPost {
  param(
    [string]$Url,
    $Body
  )
  return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 20) -TimeoutSec 30 -ErrorAction Stop
}

function Write-Utf8File {
  param(
    [string]$Path,
    [string]$Text
  )
  [System.IO.File]::WriteAllText($Path, $Text, $utf8NoBom)
}

function Save-Json {
  param(
    [string]$Path,
    $Value
  )
  $json = $Value | ConvertTo-Json -Depth 20
  Write-Utf8File -Path $Path -Text $json
}

function Append-Line {
  param(
    [string]$Path,
    [string]$Text
  )
  [System.IO.File]::AppendAllText($Path, $Text + [Environment]::NewLine, $utf8NoBom)
}

function New-LanePrompt {
  param(
    [string]$LaneName,
    [switch]$PreferDeepMode
  )

  $deepLine = if ($PreferDeepMode) {
    "If Deep Research / Deep Think or a similar higher-depth mode is available in this surface, use it. If not, answer in standard mode."
  } else {
    "Use standard mode unless a deeper read-only analysis mode is available automatically."
  }

  $promptText = @"
You are part of a read-only engineering research sweep for Asolaria.

Surface: $LaneName

$deepLine

Important rules:
- Read-only analysis only.
- Do not modify files.
- Do not suggest destructive resets.
- Do not assume profile permissions are the root cause unless the evidence supports it.
- Return the requested sections exactly as named in the packet.

$packetText
"@
  return $promptText.Trim()
}

function New-BrowserChatPrompt {
  param(
    [string]$LaneName,
    [switch]$PreferDeepMode
  )

  $deepLine = if ($PreferDeepMode) {
    "If Deep Research / Deep Think or a similar higher-depth mode is available in this surface, use it. If not, answer in standard mode."
  } else {
    "Use standard mode unless a deeper read-only analysis mode is available automatically."
  }

  $promptText = @"
Asolaria read-only diagnosis.

Surface: $LaneName

$deepLine

Question:
Is this fixable, and are the main remaining problems profile permissions or transport/runtime behavior?

Verified facts:
- Helm now accepts dashboard prompts through live inbox delivery instead of restart-with-prompt.
- /api/health and /api/admin-terminals/cockpit respond again.
- Browser verification showed: Prompt queued for helm, Helm card ACTIVE, dashboard prompt visible in Helm transcript.
- runtime/admin-terminals/helm/status.json showed lastInputSource = "Asolaria Dashboard" and inboxLinesProcessed = 2.

Remaining symptoms:
- Dashboard can temporarily show "No admin terminals registered yet." until refresh.
- Frequent background polling and noisy console errors remain.
- gateway authority status and gateway audit status remain unstable/degraded.
- Server can still become slow under load.

Important:
- Read-only analysis only.
- Do not modify files.
- Do not suggest destructive resets.
- Do not assume profile permissions are the cause unless evidence supports it.

Return exactly these sections:
1. Executive summary
2. Ranked root causes
3. Why profile permissions are or are not central
4. Read-only validation plan
5. Minimal ranked fix plan
6. Risks and unknowns
7. Confidence
"@

  $text = $promptText.Trim()
  if ($text.Length -le 1900) {
    return $text
  }
  return $text.Substring(0, 1897).TrimEnd() + "..."
}

function New-LaneRecord {
  param(
    [string]$Id,
    [string]$Kind,
    [string]$Route,
    $Body,
    [string]$Prompt
  )

  return [ordered]@{
    id = $Id
    kind = $Kind
    route = $Route
    queued = $false
    skipped = $false
    skipReason = ""
    jobId = ""
    status = "pending"
    createdAt = ""
    finishedAt = ""
    prompt = $Prompt
    requestBody = $Body
    queueReply = ""
    error = ""
    resultPreview = ""
    resultPath = ""
    rawJobPath = ""
    rawResultPath = ""
  }
}

function Get-JobTerminalState {
  param([string]$JobId)
  if ([string]::IsNullOrWhiteSpace($JobId)) {
    return $null
  }
  try {
    $poll = Invoke-JsonGet -Url "$base/api/jobs/$JobId"
    if (-not $poll -or -not $poll.job) {
      return $null
    }
    return $poll.job
  } catch {
    return $null
  }
}

function Get-ResultPreview {
  param($Job)

  if ($null -eq $Job) {
    return ""
  }

  $result = $Job.result
  if ($result -is [string]) {
    return ([string]$result).Trim()
  }
  if ($result -and $result.reply) {
    return ([string]$result.reply).Trim()
  }
  if ($result -and $result.text) {
    return ([string]$result.text).Trim()
  }
  if ($result -and $result.extracts) {
    if ($result.extracts.chat_reply) {
      return ([string]$result.extracts.chat_reply).Trim()
    }
    $names = @($result.extracts.PSObject.Properties.Name)
    if ($names.Count -gt 0) {
      $first = $result.extracts.($names[0])
      if ($first -is [string]) {
        return ([string]$first).Trim()
      }
      return (($first | ConvertTo-Json -Depth 10) | Out-String).Trim()
    }
  }
  return (($result | ConvertTo-Json -Depth 10) | Out-String).Trim()
}

function Save-LaneArtifacts {
  param(
    [hashtable]$Lane,
    $Job
  )

  if ($null -eq $Job) {
    return
  }

  $laneDir = Join-Path $runDir $Lane.id
  New-Item -Path $laneDir -ItemType Directory -Force | Out-Null

  $rawJobPath = Join-Path $laneDir "job.json"
  $rawResultPath = Join-Path $laneDir "result.json"
  $previewPath = Join-Path $laneDir "preview.txt"

  Save-Json -Path $rawJobPath -Value $Job
  Save-Json -Path $rawResultPath -Value $Job.result
  Write-Utf8File -Path $previewPath -Text (Get-ResultPreview -Job $Job)

  $Lane.rawJobPath = $rawJobPath
  $Lane.rawResultPath = $rawResultPath
  $Lane.resultPath = $previewPath
}

function Write-RunSummary {
  param($RunState)

  $lines = @()
  $lines += "# Read-Only Research Sweep"
  $lines += ""
  $lines += "- Started: $($RunState.startedAt)"
  $lines += "- Deadline: $($RunState.deadline)"
  $lines += "- Packet: $packetCopyPath"
  $lines += "- Run JSON: $runJsonPath"
  $lines += ""
  $lines += "## Lanes"
  $lines += ""

  foreach ($lane in @($RunState.lanes)) {
    $lines += "### $($lane.id)"
    $lines += ""
    $lines += "- Kind: $($lane.kind)"
    $lines += "- Route: $($lane.route)"
    $lines += "- Status: $($lane.status)"
    $lines += "- Job ID: $($lane.jobId)"
    if ($lane.skipped) {
      $lines += "- Skipped: $($lane.skipReason)"
    }
    if ($lane.error) {
      $lines += "- Error: $($lane.error)"
    }
    if ($lane.resultPath) {
      $lines += "- Preview: $($lane.resultPath)"
    }
    if ($lane.rawResultPath) {
      $lines += "- Result JSON: $($lane.rawResultPath)"
    }
    $preview = ([string]$lane.resultPreview).Trim()
    if ($preview) {
      $lines += ""
      $lines += '```text'
      $lines += ($preview.Split("`n") | Select-Object -First 20)
      $lines += '```'
    }
    $lines += ""
  }

  Write-Utf8File -Path $summaryPath -Text ($lines -join [Environment]::NewLine)
}

$runState = [ordered]@{
  startedAt = (Get-Date).ToString("o")
  deadline = $deadline.ToString("o")
  port = $Port
  packetPath = $PacketPath
  packetCopyPath = $packetCopyPath
  runDir = $runDir
  lanes = @()
}

$openAiWebStatus = $null
$geminiWebStatus = $null
$externalStatus = $null
$healthStatus = $null

try { $healthStatus = Invoke-JsonGet -Url "$base/api/health" } catch {}
try { $openAiWebStatus = Invoke-JsonGet -Url "$base/api/integrations/openai_web_chat/status" } catch {}
try { $geminiWebStatus = Invoke-JsonGet -Url "$base/api/integrations/gemini_enterprise_web/status" } catch {}
try { $externalStatus = Invoke-JsonGet -Url "$base/api/providers/external/status" } catch {}

$openAiPrompt = New-BrowserChatPrompt -LaneName "OpenAI Web Chat" -PreferDeepMode
$geminiPrompt = New-BrowserChatPrompt -LaneName "Gemini Enterprise Web Chat" -PreferDeepMode
$apiPrompt = New-LanePrompt -LaneName "API/CLI model lane"

$lanes = [System.Collections.Generic.List[hashtable]]::new()

$openAiWebReady = $false
if ($openAiWebStatus -and $openAiWebStatus.status) {
  $s = $openAiWebStatus.status
  $openAiWebReady = [bool]$s.enabled -and [bool]$s.browserTasksEnabled -and [bool]$s.runtimeProfile.profileResolved
}
$lane = New-LaneRecord -Id "openai-web-chat" -Kind "browser-chat" -Route "/api/integrations/openai_web_chat/chat" -Body @{
  prompt = $openAiPrompt
  waitMs = 20000
  actionTimeoutMs = 20000
  maxChars = 28000
} -Prompt $openAiPrompt
if (-not $openAiWebReady) {
  $lane.skipped = $true
  $lane.status = "skipped"
  $lane.skipReason = "OpenAI web chat status is not ready."
}
$lanes.Add($lane) | Out-Null

$geminiWebReady = $false
if ($geminiWebStatus -and $geminiWebStatus.status) {
  $s = $geminiWebStatus.status
  $geminiWebReady = [bool]$s.enabled -and [bool]$s.browserTasksEnabled -and [bool]$s.runtimeProfile.profileResolved
}
$lane = New-LaneRecord -Id "gemini-enterprise-web" -Kind "browser-chat" -Route "/api/integrations/gemini_enterprise_web/chat" -Body @{
  prompt = $geminiPrompt
  waitMs = 20000
  actionTimeoutMs = 20000
  maxChars = 28000
} -Prompt $geminiPrompt
if (-not $geminiWebReady) {
  $lane.skipped = $true
  $lane.status = "skipped"
  $lane.skipReason = "Gemini Enterprise web chat status is not ready."
}
$lanes.Add($lane) | Out-Null

$providerRows = @()
$anthropicCliAvailable = $false
if ($externalStatus) {
  if ($externalStatus.providers) {
    $providerRows = @($externalStatus.providers)
  }
  $anthropicCliAvailable = [bool]$externalStatus.anthropicCli.available -and [bool]$externalStatus.anthropicCli.authenticated
}

function Get-ProviderReady {
  param([string]$ProviderId)
  foreach ($row in @($providerRows)) {
    if (([string]$row.id).Trim().ToLowerInvariant() -eq $ProviderId.ToLowerInvariant()) {
      return [bool]$row.enabled -and [bool]$row.configured
    }
  }
  return $false
}

$codexReady = $true
if ($healthStatus) {
  $codexReady = [bool]$healthStatus.providers.codex
  if (-not $codexReady -and $healthStatus.toolPaths) {
    $codexReady = -not [string]::IsNullOrWhiteSpace([string]$healthStatus.toolPaths.codexPath)
  }
}

$lane = New-LaneRecord -Id "codex-primary" -Kind "codex-configured" -Route "/api/providers/codex/run" -Body @{
  prompt = $apiPrompt
  timeoutMs = 600000
} -Prompt $apiPrompt
if (-not $codexReady) {
  $lane.skipped = $true
  $lane.status = "skipped"
  $lane.skipReason = "Codex provider is not available."
}
$lanes.Add($lane) | Out-Null

$lane = New-LaneRecord -Id "cursor" -Kind "external-provider" -Route "/api/providers/external/run" -Body @{
  provider = "cursor"
  prompt = $apiPrompt
  transport = "auto"
  timeoutMs = 600000
  maxTokens = 1800
  temperature = 0.1
  fallbackOnAnyError = $true
} -Prompt $apiPrompt
if (-not (Get-ProviderReady -ProviderId "cursor")) {
  $lane.skipped = $true
  $lane.status = "skipped"
  $lane.skipReason = "Cursor provider is not configured."
}
$lanes.Add($lane) | Out-Null

$lane = New-LaneRecord -Id "antigravity" -Kind "external-provider" -Route "/api/providers/external/run" -Body @{
  provider = "antigravity"
  prompt = $apiPrompt
  transport = "auto"
  timeoutMs = 600000
  maxTokens = 1800
  temperature = 0.1
  passIfUnavailable = $true
  fallbackOnAnyError = $true
} -Prompt $apiPrompt
if (-not (Get-ProviderReady -ProviderId "antigravity")) {
  $lane.skipped = $true
  $lane.status = "skipped"
  $lane.skipReason = "Antigravity provider is not configured."
}
$lanes.Add($lane) | Out-Null

$lane = New-LaneRecord -Id "anthropic-cli" -Kind "external-provider" -Route "/api/providers/external/run" -Body @{
  provider = "anthropic"
  prompt = $apiPrompt
  transport = "cli"
  model = "sonnet"
  timeoutMs = 600000
  maxTokens = 1800
  temperature = 0.1
} -Prompt $apiPrompt
if (-not $anthropicCliAvailable) {
  $lane.skipped = $true
  $lane.status = "skipped"
  $lane.skipReason = "Anthropic CLI is not available/authenticated."
}
$lanes.Add($lane) | Out-Null

$runState.lanes = @($lanes)
Save-Json -Path $runJsonPath -Value $runState
Write-RunSummary -RunState $runState

foreach ($lane in @($runState.lanes)) {
  if ($lane.skipped) {
    continue
  }
  try {
    $response = Invoke-JsonPost -Url ($base + $lane.route) -Body $lane.requestBody
    $lane.queued = $true
    $lane.status = "queued"
    $lane.createdAt = (Get-Date).ToString("o")
    if ($response.reply) {
      $lane.queueReply = [string]$response.reply
    }
    if ($response.job -and $response.job.id) {
      $lane.jobId = [string]$response.job.id
    } else {
      $lane.status = "failed"
      $lane.error = "missing_job_id"
    }
  } catch {
    $lane.status = "failed"
    try {
      $lane.error = ([string]$_.Exception.Message).Trim()
    } catch {
      $lane.error = "request_failed"
    }
  }
  Save-Json -Path $runJsonPath -Value $runState
  Write-RunSummary -RunState $runState
}

while ((Get-Date) -lt $deadline) {
  $active = @($runState.lanes | Where-Object { -not $_.skipped -and $_.jobId -and $_.status -notin @("completed", "failed", "cancelled") })
  if ($active.Count -lt 1) {
    break
  }

  foreach ($lane in $active) {
    $job = Get-JobTerminalState -JobId $lane.jobId
    if ($null -eq $job) {
      continue
    }
    $lane.status = [string]$job.status
    $lane.finishedAt = if ($job.finishedAt) { [string]$job.finishedAt } else { $lane.finishedAt }
    if ($job.error) {
      $lane.error = [string]$job.error
    }
    $lane.resultPreview = Get-ResultPreview -Job $job
    Save-LaneArtifacts -Lane $lane -Job $job
  }

  Save-Json -Path $runJsonPath -Value $runState
  Write-RunSummary -RunState $runState

  $remaining = @($runState.lanes | Where-Object { -not $_.skipped -and $_.jobId -and $_.status -notin @("completed", "failed", "cancelled") })
  if ($remaining.Count -lt 1) {
    break
  }

  Start-Sleep -Seconds ([Math]::Max(5, $PollDelaySeconds))
}

foreach ($lane in @($runState.lanes)) {
  if ($lane.skipped) {
    continue
  }
  if ($lane.jobId -and $lane.status -notin @("completed", "failed", "cancelled")) {
    $lane.status = "deadline_reached"
  }
}

Save-Json -Path $runJsonPath -Value $runState
Write-RunSummary -RunState $runState

[pscustomobject]@{
  ok = $true
  startedAt = $runState.startedAt
  deadline = $runState.deadline
  runDir = $runDir
  summaryPath = $summaryPath
  runJsonPath = $runJsonPath
  lanes = $runState.lanes
} | ConvertTo-Json -Depth 20
