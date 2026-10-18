param(
  [int]$Port = 4781,
  [string[]]$Accounts = @(),
  [switch]$AllAllowlisted,
  [string]$ProbeUrl = "https://gmail.googleapis.com/gmail/v1/users/me/profile",
  [int]$RequestTimeoutSec = 10,
  [int]$PollAttempts = 16,
  [int]$PollDelayMs = 450
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$base = "http://127.0.0.1:$Port"
$reportDir = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "reports"
New-Item -Path $reportDir -ItemType Directory -Force | Out-Null

function Invoke-JsonGet {
  param([string]$Url)
  return Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec $RequestTimeoutSec -ErrorAction Stop
}

function Invoke-JsonPost {
  param(
    [string]$Url,
    $Body
  )
  return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 10) -TimeoutSec $RequestTimeoutSec -ErrorAction Stop
}

function Normalize-AccountList {
  param($Values)
  $items = [System.Collections.Generic.List[string]]::new()
  foreach ($value in @($Values)) {
    $raw = ([string]$value).Trim()
    if (-not $raw) { continue }
    foreach ($part in ($raw -split "[,;]")) {
      $email = ([string]$part).Trim().ToLowerInvariant()
      if (-not $email) { continue }
      $items.Add($email) | Out-Null
    }
  }
  return @($items | Sort-Object -Unique)
}

function Get-ConnectedLookup {
  param($StatusPayload)
  $lookup = @{}
  $rows = @()
  if ($StatusPayload -and $StatusPayload.accounts) {
    $rows = @($StatusPayload.accounts)
  }
  foreach ($row in $rows) {
    $email = ""
    if ($row -and $row.email) {
      $email = [string]$row.email
    }
    $email = $email.Trim().ToLowerInvariant()
    if (-not $email) { continue }
    $lookup[$email] = $row
  }
  return $lookup
}

function Test-GoogleAccountHealth {
  param(
    [string]$Account,
    [string]$ProbeUrlToUse
  )

  $result = [ordered]@{
    account = $Account
    status = "unknown"
    reason = ""
    jobId = ""
  }

  try {
    $queued = Invoke-JsonPost -Url "$base/api/integrations/google/request" -Body @{
      account = $Account
      method = "GET"
      url = $ProbeUrlToUse
    }
    $jobId = ""
    if ($queued -and $queued.job -and $queued.job.id) {
      $jobId = ([string]$queued.job.id).Trim()
    }
    $result.jobId = $jobId
    if (-not $jobId) {
      $result.status = "unhealthy"
      $result.reason = "Missing job id from /api/integrations/google/request."
      return [pscustomobject]$result
    }

    $job = $null
    for ($i = 0; $i -lt $PollAttempts; $i += 1) {
      Start-Sleep -Milliseconds $PollDelayMs
      $poll = Invoke-JsonGet -Url "$base/api/jobs/$jobId"
      $job = $null
      if ($poll -and $poll.job) {
        $job = $poll.job
      }
      if ($job -and ($job.status -in @("completed", "failed"))) {
        break
      }
    }

    if (-not $job) {
      $result.status = "inconclusive"
      $result.reason = "Job polling returned no result."
      return [pscustomobject]$result
    }

    $errorText = ""
    if ($job -and $job.error) {
      $errorText = ([string]$job.error).Trim()
    }
    $jobStatus = ""
    if ($job -and $job.status) {
      $jobStatus = ([string]$job.status).Trim().ToLowerInvariant()
    }
    if (-not $errorText -and $jobStatus -eq "completed") {
      $result.status = "healthy"
      return [pscustomobject]$result
    }

    if ($errorText -match "invalid_rapt|invalid[_ ]?grant|token.*expired|reauth|refresh token missing|token request failed") {
      $result.status = "reauth-needed"
      $result.reason = $errorText
      return [pscustomobject]$result
    }

    $result.status = "unhealthy"
    $result.reason = if ($errorText) { $errorText } else { "Google request job did not complete successfully." }
    return [pscustomobject]$result
  } catch {
    $result.status = "unhealthy"
    $reasonText = ""
    try {
      $reasonText = ([string]$_.Exception.Message).Trim()
    } catch {}
    if (-not $reasonText) {
      $reasonText = "request_failed"
    }
    $result.reason = $reasonText
    return [pscustomobject]$result
  }
}

$statusRaw = Invoke-JsonGet -Url "$base/api/integrations/google/status"
$status = $null
if ($statusRaw -and $statusRaw.status) {
  $status = $statusRaw.status
}
if (-not $status) {
  throw "Unexpected Google status payload from $base/api/integrations/google/status"
}

$allowlisted = Normalize-AccountList -Values $status.allowedAccounts
$requested = Normalize-AccountList -Values $Accounts
$candidateAccounts = if ($requested.Count -gt 0) { $requested } else { $allowlisted }
$candidateAccounts = @($candidateAccounts)
if ($candidateAccounts.Count -lt 1) {
  throw "No accounts were provided and no allowlisted accounts were found."
}

$connectedLookup = Get-ConnectedLookup -StatusPayload $status
$healthRows = [System.Collections.Generic.List[object]]::new()

foreach ($account in $candidateAccounts) {
  if (-not $connectedLookup.ContainsKey($account)) {
    $healthRows.Add([pscustomobject]@{
      account = $account
      status = "reauth-needed"
      reason = "Account not present in connected accounts list."
      jobId = ""
    }) | Out-Null
    continue
  }
  $healthRows.Add((Test-GoogleAccountHealth -Account $account -ProbeUrlToUse $ProbeUrl)) | Out-Null
}

$targetRows = if ($AllAllowlisted.IsPresent) {
  @($healthRows)
} else {
  @($healthRows | Where-Object { $_.status -ne "healthy" })
}

$linkRows = [System.Collections.Generic.List[object]]::new()
foreach ($row in $targetRows) {
  $account = ""
  if ($row -and $row.account) {
    $account = [string]$row.account
  }
  $account = $account.Trim().ToLowerInvariant()
  if (-not $account) { continue }
  try {
    $oauth = Invoke-JsonPost -Url "$base/api/integrations/google/oauth/start" -Body @{ account = $account }
    $healthBefore = ""
    if ($row -and $row.status) {
      $healthBefore = [string]$row.status
    }
    $reasonBefore = ""
    if ($row -and $row.reason) {
      $reasonBefore = [string]$row.reason
    }
    $authUrl = ""
    $state = ""
    $note = ""
    if ($oauth -and $oauth.oauth) {
      if ($oauth.oauth.authUrl) { $authUrl = [string]$oauth.oauth.authUrl }
      if ($oauth.oauth.state) { $state = [string]$oauth.oauth.state }
    }
    if ($oauth -and $oauth.note) {
      $note = [string]$oauth.note
    }
    $linkRows.Add([pscustomobject]@{
      account = $account
      healthBefore = $healthBefore
      reasonBefore = $reasonBefore
      ok = [bool]$oauth.ok
      authUrl = $authUrl
      state = $state
      note = $note
      error = ""
    }) | Out-Null
  } catch {
    $healthBefore = ""
    if ($row -and $row.status) {
      $healthBefore = [string]$row.status
    }
    $reasonBefore = ""
    if ($row -and $row.reason) {
      $reasonBefore = [string]$row.reason
    }
    $errorText = ""
    try {
      $errorText = ([string]$_.Exception.Message).Trim()
    } catch {}
    if (-not $errorText) {
      $errorText = "oauth_start_failed"
    }
    $linkRows.Add([pscustomobject]@{
      account = $account
      healthBefore = $healthBefore
      reasonBefore = $reasonBefore
      ok = $false
      authUrl = ""
      state = ""
      note = ""
      error = $errorText
    }) | Out-Null
  }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $reportDir ("google-reauth-links-" + $stamp + ".json")
$mdPath = Join-Path $reportDir ("google-reauth-links-" + $stamp + ".md")
$latestJson = Join-Path $reportDir "google-reauth-links-latest.json"
$latestMd = Join-Path $reportDir "google-reauth-links-latest.md"

$report = [ordered]@{
  ok = $true
  generatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
  baseUrl = $base
  accountsConsidered = $candidateAccounts
  allAllowlisted = [bool]$AllAllowlisted
  preflightHealth = @($healthRows)
  links = @($linkRows)
  summary = [ordered]@{
    considered = $candidateAccounts.Count
    unhealthyBefore = @($healthRows | Where-Object { $_.status -ne "healthy" }).Count
    linksGenerated = @($linkRows | Where-Object { $_.ok }).Count
    linksFailed = @($linkRows | Where-Object { -not $_.ok }).Count
  }
}

$report | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonPath -Encoding UTF8

$md = New-Object System.Collections.Generic.List[string]
$md.Add("# Google OAuth Reauth Links") | Out-Null
$md.Add("") | Out-Null
$md.Add(("Generated: " + $report.generatedAt)) | Out-Null
$md.Add(("Base: " + $base)) | Out-Null
$md.Add("") | Out-Null
$md.Add("Notes:") | Out-Null
$md.Add("- OAuth links are one-time and short-lived. Generate fresh links right before use.") | Out-Null
$md.Add("- Complete sign-in on the same PC and wait for the `Google account connected` callback page.") | Out-Null
$md.Add("") | Out-Null
$md.Add("## Preflight Health") | Out-Null
foreach ($row in @($healthRows)) {
  $line = "- {0}: {1}" -f $row.account, $row.status
  if ($row.reason) {
    $line += (" | reason: " + $row.reason)
  }
  $md.Add($line) | Out-Null
}
$md.Add("") | Out-Null
$md.Add("## Fresh Links") | Out-Null
if ($linkRows.Count -lt 1) {
  $md.Add("- No links generated (all target accounts were healthy).") | Out-Null
} else {
  foreach ($row in @($linkRows)) {
    $md.Add(("### " + $row.account)) | Out-Null
    $md.Add(("- Health before: " + $row.healthBefore)) | Out-Null
    if ($row.reasonBefore) {
      $md.Add(("- Reason: " + $row.reasonBefore)) | Out-Null
    }
    if ($row.ok -and $row.authUrl) {
      $md.Add(("- Link: " + $row.authUrl)) | Out-Null
      if ($row.state) {
        $md.Add(("- State: " + $row.state)) | Out-Null
      }
    } else {
      $md.Add(("- ERROR: " + $row.error)) | Out-Null
    }
    $md.Add("") | Out-Null
  }
}

Set-Content -Path $mdPath -Value ($md -join "`r`n") -Encoding UTF8
Copy-Item -Path $jsonPath -Destination $latestJson -Force
Copy-Item -Path $mdPath -Destination $latestMd -Force

[pscustomobject]@{
  ok = $true
  reportJson = $jsonPath
  reportMd = $mdPath
  latestJson = $latestJson
  latestMd = $latestMd
  summary = $report.summary
} | ConvertTo-Json -Depth 6
