[CmdletBinding()]
param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$Project = "winged-complex-390417",
  [string]$NotebookAccount = "plasmatoid@gmail.com",
  [string]$NotebookLocation = "global",
  [string]$SlackChannel = "#general",
  [int]$SlackLimit = 20,
  [switch]$RunSlackReview,
  [switch]$RunPhoneTunnelSmoke,
  [string]$OutDir = "",
  [switch]$UpdateLatest = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-JsonGet {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [hashtable]$Headers = @{},
    [int]$TimeoutSec = 20
  )
  return Invoke-RestMethod -Method Get -Uri $Url -Headers $Headers -TimeoutSec $TimeoutSec
}

function Invoke-JsonPost {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [object]$Body = @{},
    [int]$TimeoutSec = 20
  )
  $json = $Body | ConvertTo-Json -Depth 12
  return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $json -TimeoutSec $TimeoutSec
}

function Wait-JobResult {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$JobId,
    [int]$TimeoutSec = 80
  )
  $deadline = (Get-Date).AddSeconds([Math]::Max(10, $TimeoutSec))
  while ((Get-Date) -lt $deadline) {
    $jobEnvelope = Invoke-JsonGet -Url ("{0}/api/jobs/{1}" -f $Base, [uri]::EscapeDataString($JobId)) -TimeoutSec 15
    $job = $jobEnvelope.job
    $status = [string]$job.status
    if ($status -ne "queued" -and $status -ne "running") {
      return $job
    }
    Start-Sleep -Milliseconds 500
  }
  throw ("Timed out waiting for job " + $JobId)
}

function Probe-Head {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$TimeoutSec = 20
  )

  $statusLine = ""
  $location = ""
  $error = ""
  try {
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($curl) {
      $headers = & $curl.Source -s -I --max-time $TimeoutSec $Url
      foreach ($line in @($headers)) {
        $row = [string]$line
        if (-not $statusLine -and $row -match "^HTTP/") {
          $statusLine = $row.Trim()
          continue
        }
        if (-not $location -and $row -match "^(?i)Location:\s*(.+)$") {
          $location = [string]$matches[1].Trim()
        }
      }
      if ($statusLine) {
        return [pscustomobject]@{
          ok = $true
          statusLine = $statusLine
          location = $location
          error = ""
        }
      }
    }

    $resp = Invoke-WebRequest -Uri $Url -Method Head -MaximumRedirection 0 -TimeoutSec $TimeoutSec -ErrorAction Stop
    return [pscustomobject]@{
      ok = $true
      statusLine = ("HTTP/{0} {1}" -f [string]$resp.Version, [int]$resp.StatusCode)
      location = [string]$resp.Headers.Location
      error = ""
    }
  } catch {
    $error = $_.Exception.Message
    if ($_.Exception.Response) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $statusDescription = [string]$_.Exception.Response.StatusDescription
        $statusLine = ("HTTP " + [string]$statusCode + " " + $statusDescription).Trim()
      } catch {}
      try {
        $location = [string]$_.Exception.Response.Headers["Location"]
      } catch {}
    }
    return [pscustomobject]@{
      ok = [bool]$statusLine
      statusLine = $statusLine
      location = $location
      error = $error
    }
  }
}

function Get-LatestPath {
  param(
    [Parameter(Mandatory = $true)][string]$Pattern,
    [ValidateSet("File","Directory")][string]$Kind = "File"
  )
  try {
    if ($Kind -eq "Directory") {
      return Get-ChildItem -Path $Pattern -Directory -ErrorAction Stop |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 -ExpandProperty FullName
    }
    return Get-ChildItem -Path $Pattern -File -ErrorAction Stop |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1 -ExpandProperty FullName
  } catch {
    return ""
  }
}

function Get-PropValue {
  param(
    [object]$Object,
    [string]$Name,
    $Default = $null
  )
  if ($null -eq $Object) { return $Default }
  if ($Object -is [System.Collections.IDictionary]) {
    if ($Object.Contains($Name)) {
      return $Object[$Name]
    }
    return $Default
  }
  $prop = $Object.PSObject.Properties[$Name]
  if ($null -eq $prop) { return $Default }
  return $prop.Value
}

function Get-StatusPayload {
  param([object]$Envelope)
  if ($null -eq $Envelope) { return $null }
  $status = Get-PropValue -Object $Envelope -Name "status" -Default $null
  if ($null -ne $status) { return $status }
  return $Envelope
}

function Convert-ToStringArray {
  param([object]$Value)
  $rows = New-Object System.Collections.Generic.List[string]
  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [string]) {
    $text = [string]$Value
    if (-not [string]::IsNullOrWhiteSpace($text)) {
      $rows.Add($text)
    }
    return @($rows)
  }

  if ($Value -is [System.Collections.IEnumerable]) {
    foreach ($item in @($Value)) {
      $text = [string]$item
      if (-not [string]::IsNullOrWhiteSpace($text)) {
        $rows.Add($text)
      }
    }
    return @($rows)
  }

  $single = [string]$Value
  if (-not [string]::IsNullOrWhiteSpace($single)) {
    $rows.Add($single)
  }
  return @($rows)
}

function Mask-Email {
  param([string]$Email)
  $value = [string]$Email
  if ([string]::IsNullOrWhiteSpace($value)) { return "" }
  $parts = $value.Split("@")
  if ($parts.Count -ne 2) { return "***" }
  $local = [string]$parts[0]
  $domain = [string]$parts[1]
  if ($local.Length -le 1) {
    return ("*" + "@" + $domain)
  }
  return ($local.Substring(0, 1) + ("*" * [Math]::Max(1, $local.Length - 1)) + "@" + $domain)
}

function Sanitize-UrlForReport {
  param([string]$Url)
  $value = [string]$Url
  if ([string]::IsNullOrWhiteSpace($value)) { return "" }
  try {
    $uri = [System.Uri]$value
    $path = [string]$uri.AbsolutePath
    if ([string]::IsNullOrWhiteSpace($path)) { $path = "/" }
    return ($uri.Scheme + "://" + $uri.Host + $path)
  } catch {
    return $value
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportsDir = if ($OutDir) { $OutDir } else { Join-Path $repoRoot "reports" }
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$base = $BaseUrl.TrimEnd("/")

$runtimeSnapshotPath = Join-Path $reportsDir ("task-closeout-runtime-validation-{0}.json" -f $stamp)
$checkpointPath = Join-Path $reportsDir ("upgrade-blocker-checkpoint-{0}.md" -f $stamp)
$latestPath = Join-Path $reportsDir "upgrade-blocker-checkpoint-latest.md"

$health = $null
$healthError = ""
try {
  $health = Invoke-JsonGet -Url ("{0}/api/health" -f $base)
} catch {
  $healthError = $_.Exception.Message
}

$jobsEnvelope = $null
$jobsError = ""
try {
  $jobsEnvelope = Invoke-JsonGet -Url ("{0}/api/jobs" -f $base)
} catch {
  $jobsError = $_.Exception.Message
}

$slackStatus = $null
$slackStatusError = ""
try {
  $slackStatus = Invoke-JsonGet -Url ("{0}/api/integrations/slack/status" -f $base)
} catch {
  $slackStatusError = $_.Exception.Message
}
$slack = Get-StatusPayload -Envelope $slackStatus

$slackReviewJob = $null
$slackReviewError = ""
$slackConfigured = [bool](Get-PropValue -Object $slack -Name "configured" -Default $false)
if ($RunSlackReview -and $slack -and $slackConfigured) {
  try {
    $queued = Invoke-JsonPost -Url ("{0}/api/integrations/slack/review" -f $base) -Body @{
      channel = $SlackChannel
      limit = [Math]::Max(1, $SlackLimit)
      analyze = $false
      request = "upgrade-blocker preflight"
    }
    $jobId = [string]$queued.job.id
    if ($jobId) {
      $slackReviewJob = Wait-JobResult -Base $base -JobId $jobId -TimeoutSec 120
    }
  } catch {
    $slackReviewError = $_.Exception.Message
  }
}

$googleStatus = $null
$googleStatusError = ""
try {
  $googleStatus = Invoke-JsonGet -Url ("{0}/api/integrations/google/status" -f $base)
} catch {
  $googleStatusError = $_.Exception.Message
}
$google = Get-StatusPayload -Envelope $googleStatus

$consoleProbe = Probe-Head -Url ("https://console.cloud.google.com/auth/overview?project={0}" -f [uri]::EscapeDataString($Project))

$notebookJob = $null
$notebookResult = $null
$notebookError = ""
try {
  $encodedAccount = [uri]::EscapeDataString($NotebookAccount)
  $queued = Invoke-JsonGet -Url ("{0}/api/integrations/notebooklm/enterprise/status?account={1}&project={2}&location={3}" -f $base, $encodedAccount, [uri]::EscapeDataString($Project), [uri]::EscapeDataString($NotebookLocation))
  $jobId = [string]$queued.job.id
  if ($jobId) {
    $notebookJob = Wait-JobResult -Base $base -JobId $jobId -TimeoutSec 120
    $notebookResult = $notebookJob.result
  }
} catch {
  $notebookError = $_.Exception.Message
}

$mobileBootstrap = $null
$mobileBootstrapError = ""
try {
  $mobileBootstrap = Invoke-JsonGet -Url ("{0}/api/mobile/bootstrap" -f $base)
} catch {
  $mobileBootstrapError = $_.Exception.Message
}

$mobilePush = $null
$mobilePushError = ""
$mobilePushSubs = -1
$mobileToken = [string](Get-PropValue -Object $mobileBootstrap -Name "token" -Default "")
if ($mobileBootstrap -and $mobileToken) {
  try {
    $token = $mobileToken
    $headers = @{
      "x-asolaria-mobile-token" = $token
      "x-asolaria-token" = $token
    }
    $mobilePush = Invoke-JsonGet -Url ("{0}/api/mobile/push/status" -f $base) -Headers $headers
    $mobilePushSubscriptions = Get-PropValue -Object $mobilePush -Name "subscriptions" -Default @()
    if ($mobilePushSubscriptions -is [System.Collections.IEnumerable]) {
      $mobilePushSubs = @($mobilePushSubscriptions).Count
    }
  } catch {
    $mobilePushError = $_.Exception.Message
  }
}

if ($mobilePushSubs -lt 0) {
  $subsPath = Join-Path $repoRoot "data/mobile-push-subscriptions.json"
  try {
    if (Test-Path -LiteralPath $subsPath) {
      $subsJson = Get-Content -Raw -LiteralPath $subsPath | ConvertFrom-Json
      if ($subsJson.subscriptions -is [System.Collections.IEnumerable]) {
        $mobilePushSubs = @($subsJson.subscriptions).Count
      } else {
        $mobilePushSubs = 0
      }
    }
  } catch {}
}

$phoneTunnelSmoke = $null
$phoneTunnelSmokeSummary = $null
$phoneTunnelSmokeError = ""
if ($RunPhoneTunnelSmoke) {
  try {
    $phoneSmokeRaw = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot "tools/Test-Asolaria-PhoneTunnelPath.ps1") -BaseUrl $base
    $phoneTunnelSmoke = ($phoneSmokeRaw | Out-String) | ConvertFrom-Json -ErrorAction Stop
    $phoneTunnelSmokeSummary = [ordered]@{
      ok = [bool](Get-PropValue -Object $phoneTunnelSmoke -Name "ok" -Default $false)
      checkedAt = [string](Get-PropValue -Object $phoneTunnelSmoke -Name "checkedAt" -Default "")
      reportPath = [string](Get-PropValue -Object $phoneTunnelSmoke -Name "reportPath" -Default "")
      controlPlaneHealthy = [bool](
        Get-PropValue -Object (Get-PropValue -Object $phoneTunnelSmoke -Name "remote" -Default $null) -Name "controlPlaneHealthy" -Default $false
      )
      keeperRunning = [bool](
        Get-PropValue -Object (Get-PropValue -Object $phoneTunnelSmoke -Name "remote" -Default $null) -Name "keeperRunning" -Default $false
      )
      adbAuthorizedCount = [int](
        Get-PropValue -Object (Get-PropValue -Object $phoneTunnelSmoke -Name "adb" -Default $null) -Name "authorizedCount" -Default 0
      )
      notes = @(Convert-ToStringArray -Value (Get-PropValue -Object $phoneTunnelSmoke -Name "notes" -Default @()))
    }
  } catch {
    $phoneTunnelSmokeError = $_.Exception.Message
  }
}

$johnCutoverScriptPath = "/Users/john/dev/oli/scripts/phone_provider_cutover.sh"
$johnCutoverTasksPath = "/Users/john/dev/oli/ops/projects/oli-upgrade/subprojects/phone-provider-onboarding/tasks.json"

$ppoScriptExists = Test-Path -LiteralPath $johnCutoverScriptPath
$ppoTasksExists = Test-Path -LiteralPath $johnCutoverTasksPath

$latestRealMeetingSummary = Get-LatestPath -Pattern (Join-Path $reportsDir "live-transcript-realmeet-*\REALMEET_SUMMARY.md")
$latestRealMeetingDir = if ($latestRealMeetingSummary) { Split-Path -Parent $latestRealMeetingSummary } else { "" }
$latestRealMeetingChecklist = Get-LatestPath -Pattern (Join-Path $reportsDir "live-transcript-real-meeting-checklist-*.md")
$latestRealMeetingPacket = Get-LatestPath -Pattern (Join-Path $reportsDir "live-transcript-real-meeting-packet-*.md")

$blockers = New-Object System.Collections.Generic.List[string]

$healthOk = [bool](Get-PropValue -Object $health -Name "ok" -Default $false)
if (-not $healthOk) {
  $blockers.Add("Runtime health not confirmed at $base/api/health.")
}

if (-not $slack -or -not $slackConfigured) {
  $blockers.Add("Slack integration is unconfigured (token missing).")
}

$allowlistedMissing = @()
$googleAllowlistedMissing = Get-PropValue -Object $google -Name "allowlistedMissing" -Default @()
if ($google -and ($googleAllowlistedMissing -is [System.Collections.IEnumerable])) {
  foreach ($row in @($googleAllowlistedMissing)) {
    $text = [string]$row
    if ($text) {
      $allowlistedMissing += $text
    }
  }
}
if ($allowlistedMissing.Count -gt 0) {
  $blockers.Add("Google integration allowlist missing accounts: " + ($allowlistedMissing -join ", "))
}
if (-not [string]::IsNullOrWhiteSpace([string]$consoleProbe.statusLine) -and [string]$consoleProbe.statusLine -match "\s302\s") {
  $blockers.Add("Google Console auth overview still redirects to sign-in (owner login required).")
}

$notebookEnterpriseReady = [bool](Get-PropValue -Object $notebookResult -Name "enterpriseReady" -Default $false)
$requiredTier = [string](Get-PropValue -Object $notebookResult -Name "requiredSubscriptionTier" -Default "")
$notebookBlockers = @(Convert-ToStringArray -Value (Get-PropValue -Object $notebookResult -Name "blockers" -Default @()))
if (-not $notebookResult -or -not $notebookEnterpriseReady) {
  if ($requiredTier) {
    $blockers.Add("NotebookLM Enterprise not ready; required tier " + $requiredTier + ".")
  } else {
    $blockers.Add("NotebookLM Enterprise not ready.")
  }
}

if ($mobilePushSubs -lt 1) {
  $blockers.Add("Phone push subscription count is 0; manual tap-through still pending.")
}

if (-not $ppoScriptExists -or -not $ppoTasksExists) {
  $blockers.Add("PPO-005 John runtime dependencies are not present on this machine.")
}

$blockers.Add("Security follow-up pending: rotate previously exposed password from historical logs/chat context.")
$blockers.Add("Real meeting transcript matrix remains manual: Zoom/Meet/Teams live-call validation still needed.")

$consoleLocationSanitized = Sanitize-UrlForReport -Url ([string](Get-PropValue -Object $consoleProbe -Name "location" -Default ""))
$notebookAccountMasked = Mask-Email -Email $NotebookAccount

$snapshot = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  baseUrl = $base
  project = $Project
  notebook = [ordered]@{
    account = $notebookAccountMasked
    location = $NotebookLocation
    jobId = if ($notebookJob) { [string]$notebookJob.id } else { "" }
    status = if ($notebookJob) { [string]$notebookJob.status } else { "" }
    enterpriseReady = $notebookEnterpriseReady
    access = [string](Get-PropValue -Object $notebookResult -Name "access" -Default "")
    requiredSubscriptionTier = $requiredTier
    blockers = $notebookBlockers
    error = $notebookError
  }
  runtime = [ordered]@{
    healthOk = $healthOk
    healthError = $healthError
    queue = if ($jobsEnvelope) { (Get-PropValue -Object $jobsEnvelope -Name "queue" -Default $null) } else { $null }
    jobsListed = @((Get-PropValue -Object $jobsEnvelope -Name "jobs" -Default @())).Count
    jobsError = $jobsError
  }
  slack = [ordered]@{
    enabled = [bool](Get-PropValue -Object $slack -Name "enabled" -Default $false)
    configured = [bool](Get-PropValue -Object $slack -Name "configured" -Default $false)
    tokenSource = [string](Get-PropValue -Object $slack -Name "tokenSource" -Default "")
    connectionError = [string](Get-PropValue -Object (Get-PropValue -Object $slack -Name "connection" -Default $null) -Name "error" -Default "")
    policyAllowedWorkspaces = @(
      Get-PropValue -Object (Get-PropValue -Object $slack -Name "policy" -Default $null) -Name "allowedWorkspaces" -Default @()
    )
    statusError = $slackStatusError
    reviewJobId = if ($slackReviewJob) { [string]$slackReviewJob.id } else { "" }
    reviewStatus = if ($slackReviewJob) { [string]$slackReviewJob.status } else { "" }
    reviewError = if ($slackReviewJob) { [string]$slackReviewJob.error } else { $slackReviewError }
  }
  google = [ordered]@{
    enabled = [bool](Get-PropValue -Object $google -Name "enabled" -Default $false)
    configured = [bool](Get-PropValue -Object $google -Name "configured" -Default $false)
    allowlistedMissing = $allowlistedMissing
    connectedAccountsCount = @((Get-PropValue -Object $google -Name "connectedAccounts" -Default @())).Count
    statusError = $googleStatusError
    consoleGate = [ordered]@{
      statusLine = [string]$consoleProbe.statusLine
      location = $consoleLocationSanitized
      error = [string]$consoleProbe.error
    }
  }
  phone = [ordered]@{
    bootstrapOk = [bool]$mobileBootstrap
    bootstrapError = $mobileBootstrapError
    pushStatusOk = [bool]$mobilePush
    pushStatusError = $mobilePushError
    pushSubscriptions = [int]$mobilePushSubs
    phoneTunnelSmoke = $phoneTunnelSmokeSummary
    phoneTunnelSmokeError = $phoneTunnelSmokeError
  }
  ppo005 = [ordered]@{
    johnCutoverScriptPath = $johnCutoverScriptPath
    johnCutoverTasksPath = $johnCutoverTasksPath
    scriptExists = [bool]$ppoScriptExists
    tasksExists = [bool]$ppoTasksExists
  }
  liveTranscript = [ordered]@{
    latestRealMeetingSummary = [string]$latestRealMeetingSummary
    latestRealMeetingDir = [string]$latestRealMeetingDir
    latestChecklist = [string]$latestRealMeetingChecklist
    latestPacket = [string]$latestRealMeetingPacket
  }
  blockers = @($blockers)
}

($snapshot | ConvertTo-Json -Depth 20) | Set-Content -LiteralPath $runtimeSnapshotPath -Encoding UTF8

$jobsQueued = -1
$jobsRunning = -1
$jobsTotal = -1
$jobsConcurrency = -1
$jobsSummary = Get-PropValue -Object $jobsEnvelope -Name "queue" -Default $null
if ($jobsSummary) {
  try { $jobsQueued = [int](Get-PropValue -Object $jobsSummary -Name "queued" -Default -1) } catch {}
  try { $jobsRunning = [int](Get-PropValue -Object $jobsSummary -Name "running" -Default -1) } catch {}
  try { $jobsTotal = [int](Get-PropValue -Object $jobsSummary -Name "total" -Default -1) } catch {}
  try { $jobsConcurrency = [int](Get-PropValue -Object $jobsSummary -Name "concurrency" -Default -1) } catch {}
}

$md = New-Object System.Collections.Generic.List[string]
$md.Add("# Upgrade Blocker Checkpoint")
$md.Add("")
$md.Add("- Generated: " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz"))
$md.Add("- Run mode: upgrade blocker preflight")
$md.Add("- Runtime: " + $base)
$md.Add("- Runtime health: " + [string]$healthOk)
$md.Add("- Runtime queue: queued=" + [string]$jobsQueued + ", running=" + [string]$jobsRunning + ", total=" + [string]$jobsTotal + ", concurrency=" + [string]$jobsConcurrency)
$md.Add("")
$md.Add("## Slack")
$md.Add("- enabled/configured: " + [string][bool](Get-PropValue -Object $slack -Name "enabled" -Default $false) + "/" + [string][bool](Get-PropValue -Object $slack -Name "configured" -Default $false))
$md.Add("- tokenSource: " + [string](Get-PropValue -Object $slack -Name "tokenSource" -Default ""))
$md.Add("- connection.error: " + [string](Get-PropValue -Object (Get-PropValue -Object $slack -Name "connection" -Default $null) -Name "error" -Default ""))
if ($RunSlackReview) {
  $md.Add("- review run: " + ($(if ($slackReviewJob) { "job " + [string]$slackReviewJob.id + " status " + [string]$slackReviewJob.status + " error " + [string]$slackReviewJob.error } else { "not executed (" + [string]$slackReviewError + ")" })))
}
$md.Add("")
$md.Add("## Google OAuth")
$md.Add("- local integration enabled/configured: " + [string][bool](Get-PropValue -Object $google -Name "enabled" -Default $false) + "/" + [string][bool](Get-PropValue -Object $google -Name "configured" -Default $false))
$md.Add("- allowlistedMissing count: " + [string]$allowlistedMissing.Count)
$md.Add("- console gate status: " + [string]$consoleProbe.statusLine)
$md.Add("- console gate location: " + $consoleLocationSanitized)
$md.Add("")
$md.Add("## NotebookLM Enterprise")
$md.Add("- account: " + $notebookAccountMasked)
$md.Add("- enterpriseReady: " + [string]$notebookEnterpriseReady)
$md.Add("- access: " + [string](Get-PropValue -Object $notebookResult -Name "access" -Default ""))
$md.Add("- required tier: " + $requiredTier)
$md.Add("")
$md.Add("## Phone Activation")
$md.Add("- push subscriptions: " + [string]$mobilePushSubs)
$phoneSmokeReportPath = [string](Get-PropValue -Object $phoneTunnelSmokeSummary -Name "reportPath" -Default "")
if ($phoneSmokeReportPath) {
  $md.Add("- phone tunnel smoke: " + $phoneSmokeReportPath)
}
$md.Add("")
$md.Add("## PPO-005 (John Route)")
$md.Add("- script exists (" + $johnCutoverScriptPath + "): " + [string][bool]$ppoScriptExists)
$md.Add("- tasks exists (" + $johnCutoverTasksPath + "): " + [string][bool]$ppoTasksExists)
$md.Add("")
$md.Add("## Live Transcript Real Meetings")
$md.Add("- latest checklist: " + [string]$latestRealMeetingChecklist)
$md.Add("- latest packet: " + [string]$latestRealMeetingPacket)
$md.Add("- latest summary: " + [string]$latestRealMeetingSummary)
$md.Add("")
$md.Add("## Blockers")
foreach ($row in @($blockers)) {
  $md.Add("- " + [string]$row)
}
$md.Add("")
$md.Add("## Evidence")
$md.Add("- " + $runtimeSnapshotPath)
$md.Add("- " + $checkpointPath)
if ($UpdateLatest) {
  $md.Add("- " + $latestPath)
}

Set-Content -LiteralPath $checkpointPath -Encoding UTF8 -Value ($md -join "`r`n")
if ($UpdateLatest) {
  Set-Content -LiteralPath $latestPath -Encoding UTF8 -Value ($md -join "`r`n")
}

[pscustomobject]@{
  ok = [bool]$healthOk
  allClear = [bool](@($blockers).Count -eq 0)
  generatedAt = (Get-Date).ToString("o")
  checkpointPath = $checkpointPath
  latestPath = if ($UpdateLatest) { $latestPath } else { "" }
  runtimeSnapshotPath = $runtimeSnapshotPath
  blockers = @($blockers)
  blockerCount = @($blockers).Count
} | ConvertTo-Json -Depth 8
