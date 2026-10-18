param(
  [int]$Port = 4781,
  [string[]]$Accounts = @(),
  [switch]$AllAllowlisted,
  [string]$ProbeUrl = "https://gmail.googleapis.com/gmail/v1/users/me/profile",
  [int]$RequestTimeoutSec = 10,
  [int]$JobPollAttempts = 30,
  [int]$JobPollDelayMs = 450,
  [int]$EnterpriseLimit = 3
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$base = "http://127.0.0.1:$Port"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportDir = Join-Path $repoRoot "reports"
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
  param($GoogleStatus)
  $lookup = @{}
  $rows = @()
  if ($GoogleStatus -and $GoogleStatus.accounts) {
    $rows = @($GoogleStatus.accounts)
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

function Wait-JobTerminal {
  param(
    [string]$JobId,
    [int]$Attempts = 30,
    [int]$DelayMs = 450
  )

  $id = ([string]$JobId).Trim()
  if (-not $id) {
    return $null
  }

  for ($i = 0; $i -lt $Attempts; $i += 1) {
    Start-Sleep -Milliseconds $DelayMs
    $poll = Invoke-JsonGet -Url "$base/api/jobs/$id"
    if (-not $poll -or -not $poll.job) {
      continue
    }
    $job = $poll.job
    $statusText = ""
    if ($job.status) {
      $statusText = ([string]$job.status).Trim().ToLowerInvariant()
    }
    if ($statusText -eq "completed" -or $statusText -eq "failed") {
      return $job
    }
  }

  return $null
}

function Classify-OAuthError {
  param([string]$ErrorText)
  $text = ([string]$ErrorText).Trim().ToLowerInvariant()
  if (-not $text) {
    return "unknown"
  }
  if ($text -match "invalid_rapt|invalid[_ ]?grant|token.*expired|token has been expired or revoked|reauth|refresh token missing|token request failed|consent") {
    return "reauth-needed"
  }
  return "unhealthy"
}

function Classify-EnterpriseError {
  param([string]$ErrorText)
  $text = ([string]$ErrorText).Trim().ToLowerInvariant()
  if (-not $text) {
    return "unknown"
  }
  if ($text -match "permission .* denied|access denied|forbidden|not authorized|403|discoveryengine\.notebooks\.list") {
    return "iam-permission-denied"
  }
  if ($text -match "invalid_rapt|invalid[_ ]?grant|token.*expired|reauth|token request failed") {
    return "oauth-reauth-needed"
  }
  if ($text -match "does not exist|not found|may not exist") {
    return "project-or-api-misconfig"
  }
  return "enterprise-error"
}

function Test-GoogleProbe {
  param([string]$Account)

  $row = [ordered]@{
    status = "unknown"
    reason = ""
    jobId = ""
  }

  try {
    $queued = Invoke-JsonPost -Url "$base/api/integrations/google/request" -Body @{
      account = $Account
      method = "GET"
      url = $ProbeUrl
    }
    $jobId = ""
    if ($queued -and $queued.job -and $queued.job.id) {
      $jobId = ([string]$queued.job.id).Trim()
    }
    $row.jobId = $jobId
    if (-not $jobId) {
      $row.status = "unhealthy"
      $row.reason = "Missing job id from /api/integrations/google/request."
      return [pscustomobject]$row
    }

    $job = Wait-JobTerminal -JobId $jobId -Attempts $JobPollAttempts -DelayMs $JobPollDelayMs
    if (-not $job) {
      $row.status = "inconclusive"
      $row.reason = "No terminal job result."
      return [pscustomobject]$row
    }

    $jobStatus = ""
    if ($job.status) {
      $jobStatus = ([string]$job.status).Trim().ToLowerInvariant()
    }
    $errorText = ""
    if ($job.error) {
      $errorText = ([string]$job.error).Trim()
    }
    if (-not $errorText -and $jobStatus -eq "completed") {
      $row.status = "healthy"
      return [pscustomobject]$row
    }

    $kind = Classify-OAuthError -ErrorText $errorText
    if ($kind -eq "reauth-needed") {
      $row.status = "reauth-needed"
      $row.reason = $errorText
      return [pscustomobject]$row
    }

    $row.status = "unhealthy"
    $row.reason = if ($errorText) { $errorText } else { "Google request job failed." }
    return [pscustomobject]$row
  } catch {
    $row.status = "unhealthy"
    $message = ""
    try {
      $message = ([string]$_.Exception.Message).Trim()
    } catch {}
    if (-not $message) {
      $message = "google_probe_failed"
    }
    $row.reason = $message
    return [pscustomobject]$row
  }
}

function Test-NotebookLmEnterpriseProbe {
  param([string]$Account)

  $row = [ordered]@{
    status = "not-run"
    errorClass = ""
    reason = ""
    jobId = ""
    notebookCount = 0
    notebookTitles = @()
  }

  try {
    $encoded = [uri]::EscapeDataString($Account)
    $start = Invoke-JsonGet -Url "$base/api/integrations/notebooklm/enterprise/notebooks?limit=$EnterpriseLimit&account=$encoded"
    $jobId = ""
    if ($start -and $start.job -and $start.job.id) {
      $jobId = ([string]$start.job.id).Trim()
    }
    $row.jobId = $jobId
    if (-not $jobId) {
      $row.status = "failed"
      $row.errorClass = "enterprise-error"
      $row.reason = "Missing job id from enterprise notebooks endpoint."
      return [pscustomobject]$row
    }

    $job = Wait-JobTerminal -JobId $jobId -Attempts $JobPollAttempts -DelayMs $JobPollDelayMs
    if (-not $job) {
      $row.status = "failed"
      $row.errorClass = "enterprise-error"
      $row.reason = "No terminal enterprise job result."
      return [pscustomobject]$row
    }

    $jobStatus = ""
    if ($job.status) {
      $jobStatus = ([string]$job.status).Trim().ToLowerInvariant()
    }
    $errorText = ""
    if ($job.error) {
      $errorText = ([string]$job.error).Trim()
    }

    $titles = @()
    if ($job.result -and $job.result.notebooks) {
      $titles = @($job.result.notebooks | ForEach-Object { [string]$_.title } | Where-Object { $_ })
    }
    $row.notebookCount = $titles.Count
    $row.notebookTitles = $titles

    if ($jobStatus -eq "completed" -and -not $errorText) {
      $row.status = "completed"
      return [pscustomobject]$row
    }

    $row.status = "failed"
    $row.errorClass = Classify-EnterpriseError -ErrorText $errorText
    $row.reason = if ($errorText) { $errorText } else { "Enterprise list probe failed." }
    return [pscustomobject]$row
  } catch {
    $row.status = "failed"
    $row.errorClass = "enterprise-error"
    $message = ""
    try {
      $message = ([string]$_.Exception.Message).Trim()
    } catch {}
    if (-not $message) {
      $message = "enterprise_probe_failed"
    }
    $row.reason = $message
    return [pscustomobject]$row
  }
}

function Get-FreshOAuthLink {
  param([string]$Account)
  try {
    $oauth = Invoke-JsonPost -Url "$base/api/integrations/google/oauth/start" -Body @{ account = $Account }
    $authUrl = ""
    $state = ""
    if ($oauth -and $oauth.oauth) {
      if ($oauth.oauth.authUrl) { $authUrl = [string]$oauth.oauth.authUrl }
      if ($oauth.oauth.state) { $state = [string]$oauth.oauth.state }
    }
    return [pscustomobject]@{
      ok = [bool]$oauth.ok
      authUrl = $authUrl
      state = $state
      error = ""
    }
  } catch {
    $message = ""
    try {
      $message = ([string]$_.Exception.Message).Trim()
    } catch {}
    if (-not $message) {
      $message = "oauth_start_failed"
    }
    return [pscustomobject]@{
      ok = $false
      authUrl = ""
      state = ""
      error = $message
    }
  }
}

$statusRaw = Invoke-JsonGet -Url "$base/api/integrations/google/status"
$googleStatus = $null
if ($statusRaw -and $statusRaw.status) {
  $googleStatus = $statusRaw.status
}
if (-not $googleStatus) {
  throw "Unexpected Google status payload from $base/api/integrations/google/status"
}

$allowlisted = @(Normalize-AccountList -Values $googleStatus.allowedAccounts)
$requested = @(Normalize-AccountList -Values $Accounts)
$connectedLookup = Get-ConnectedLookup -GoogleStatus $googleStatus

$connectedAccounts = @($connectedLookup.Keys | Sort-Object)
$targets = @()
if ($requested.Count -gt 0) {
  $targets = $requested
} elseif ($AllAllowlisted.IsPresent) {
  $targets = $allowlisted
} elseif ($allowlisted.Count -gt 0) {
  $targets = $allowlisted
} else {
  $targets = $connectedAccounts
}
$targets = @($targets | Sort-Object -Unique)
if ($targets.Count -lt 1) {
  throw "No accounts to inspect."
}

$rows = [System.Collections.Generic.List[object]]::new()
foreach ($account in $targets) {
  $connected = $false
  $hasRefreshToken = $null
  $expiresInSec = $null
  $oauth = [pscustomobject]@{
    status = "unknown"
    reason = ""
    jobId = ""
  }
  $enterprise = [pscustomobject]@{
    status = "not-run"
    errorClass = ""
    reason = ""
    jobId = ""
    notebookCount = 0
    notebookTitles = @()
  }

  if ($connectedLookup.ContainsKey($account)) {
    $connected = $true
    $record = $connectedLookup[$account]
    if ($record.PSObject.Properties.Match("hasRefreshToken").Count -gt 0) {
      $hasRefreshToken = [bool]$record.hasRefreshToken
    }
    if ($record.PSObject.Properties.Match("expiresInSec").Count -gt 0) {
      $expiresInSec = $record.expiresInSec
    }
  }

  if (-not $connected) {
    $oauth = [pscustomobject]@{
      status = "reauth-needed"
      reason = "Account not present in connected accounts list."
      jobId = ""
    }
  } elseif ($hasRefreshToken -eq $false) {
    $oauth = [pscustomobject]@{
      status = "reauth-needed"
      reason = "Connected account has no refresh token."
      jobId = ""
    }
  } else {
    $oauth = Test-GoogleProbe -Account $account
  }

  if ($oauth.status -eq "healthy") {
    $enterprise = Test-NotebookLmEnterpriseProbe -Account $account
  }

  $finalState = "unknown"
  if ($oauth.status -ne "healthy") {
    $finalState = "oauth-blocked"
  } elseif ($enterprise.status -eq "completed") {
    $finalState = "ready"
  } elseif ($enterprise.errorClass -eq "iam-permission-denied") {
    $finalState = "iam-blocked"
  } elseif ($enterprise.errorClass -eq "project-or-api-misconfig") {
    $finalState = "infra-blocked"
  } elseif ($enterprise.errorClass -eq "oauth-reauth-needed") {
    $finalState = "oauth-blocked"
  } else {
    $finalState = "enterprise-degraded"
  }

  $nextAction = ""
  switch ($finalState) {
    "ready" { $nextAction = "No action needed." }
    "oauth-blocked" { $nextAction = "Complete Google OAuth reauth with a fresh link, then rerun this script." }
    "iam-blocked" { $nextAction = "Grant NotebookLM Enterprise permission for this account in project winged-complex-390417." }
    "infra-blocked" { $nextAction = "Validate NotebookLM Enterprise project/location/API configuration for this account." }
    default { $nextAction = "Inspect enterprise error details and rerun this script." }
  }

  $reauthLink = ""
  $reauthState = ""
  $reauthError = ""
  if ($finalState -eq "oauth-blocked") {
    $fresh = Get-FreshOAuthLink -Account $account
    if ($fresh.ok -and $fresh.authUrl) {
      $reauthLink = [string]$fresh.authUrl
      $reauthState = [string]$fresh.state
    } else {
      $reauthError = [string]$fresh.error
    }
  }

  $rows.Add([pscustomobject]@{
    account = $account
    connected = $connected
    hasRefreshToken = $hasRefreshToken
    expiresInSec = $expiresInSec
    oauthStatus = [string]$oauth.status
    oauthReason = [string]$oauth.reason
    oauthJobId = [string]$oauth.jobId
    enterpriseStatus = [string]$enterprise.status
    enterpriseErrorClass = [string]$enterprise.errorClass
    enterpriseReason = [string]$enterprise.reason
    enterpriseJobId = [string]$enterprise.jobId
    enterpriseNotebookCount = [int]$enterprise.notebookCount
    enterpriseNotebookTitles = @($enterprise.notebookTitles)
    finalState = $finalState
    nextAction = $nextAction
    reauthLink = $reauthLink
    reauthState = $reauthState
    reauthError = $reauthError
  }) | Out-Null
}

$rowsArray = @($rows)
$summary = [ordered]@{
  totalAccounts = $rowsArray.Count
  ready = @($rowsArray | Where-Object { $_.finalState -eq "ready" }).Count
  oauthBlocked = @($rowsArray | Where-Object { $_.finalState -eq "oauth-blocked" }).Count
  iamBlocked = @($rowsArray | Where-Object { $_.finalState -eq "iam-blocked" }).Count
  infraBlocked = @($rowsArray | Where-Object { $_.finalState -eq "infra-blocked" }).Count
  enterpriseDegraded = @($rowsArray | Where-Object { $_.finalState -eq "enterprise-degraded" }).Count
}

$report = [ordered]@{
  ok = $true
  generatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
  baseUrl = $base
  accounts = $rowsArray
  summary = $summary
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $reportDir ("google-notebooklm-recovery-plan-" + $stamp + ".json")
$mdPath = Join-Path $reportDir ("google-notebooklm-recovery-plan-" + $stamp + ".md")
$latestJson = Join-Path $reportDir "google-notebooklm-recovery-plan-latest.json"
$latestMd = Join-Path $reportDir "google-notebooklm-recovery-plan-latest.md"

$report | ConvertTo-Json -Depth 12 | Set-Content -Path $jsonPath -Encoding UTF8

$md = New-Object System.Collections.Generic.List[string]
$md.Add("# Google + NotebookLM Recovery Plan") | Out-Null
$md.Add("") | Out-Null
$md.Add(("Generated: " + $report.generatedAt)) | Out-Null
$md.Add(("Base: " + $base)) | Out-Null
$md.Add("") | Out-Null
$md.Add("## Summary") | Out-Null
$md.Add(("- Accounts: " + $summary.totalAccounts)) | Out-Null
$md.Add(("- Ready: " + $summary.ready)) | Out-Null
$md.Add(("- OAuth blocked: " + $summary.oauthBlocked)) | Out-Null
$md.Add(("- IAM blocked: " + $summary.iamBlocked)) | Out-Null
$md.Add(("- Infra blocked: " + $summary.infraBlocked)) | Out-Null
$md.Add(("- Enterprise degraded: " + $summary.enterpriseDegraded)) | Out-Null
$md.Add("") | Out-Null
$md.Add("## Account Matrix") | Out-Null
$md.Add("") | Out-Null
foreach ($row in $rowsArray) {
  $md.Add(("### " + $row.account)) | Out-Null
  $md.Add(("- Final state: " + $row.finalState)) | Out-Null
  $md.Add(("- Next action: " + $row.nextAction)) | Out-Null
  $md.Add(("- OAuth: " + $row.oauthStatus)) | Out-Null
  if ($row.oauthReason) {
    $md.Add(("- OAuth reason: " + $row.oauthReason)) | Out-Null
  }
  $md.Add(("- Enterprise: " + $row.enterpriseStatus)) | Out-Null
  if ($row.enterpriseErrorClass) {
    $md.Add(("- Enterprise error class: " + $row.enterpriseErrorClass)) | Out-Null
  }
  if ($row.enterpriseReason) {
    $md.Add(("- Enterprise reason: " + $row.enterpriseReason)) | Out-Null
  }
  if ($row.enterpriseNotebookCount -gt 0) {
    $md.Add(("- Enterprise notebooks: " + ($row.enterpriseNotebookTitles -join ", "))) | Out-Null
  }
  if ($row.reauthLink) {
    $md.Add(("- Fresh OAuth link: " + $row.reauthLink)) | Out-Null
    if ($row.reauthState) {
      $md.Add(("- OAuth state: " + $row.reauthState)) | Out-Null
    }
  } elseif ($row.reauthError) {
    $md.Add(("- OAuth link error: " + $row.reauthError)) | Out-Null
  }
  $md.Add("") | Out-Null
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
  summary = $summary
} | ConvertTo-Json -Depth 8
