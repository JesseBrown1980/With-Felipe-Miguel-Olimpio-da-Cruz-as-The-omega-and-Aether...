param(
  [int]$Port = 4781,
  [string[]]$Accounts = @(),
  [int]$MaxMinutes = 15,
  [int]$IntervalSeconds = 10,
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

function Test-GoogleAccountHealth {
  param(
    [string]$Account,
    [string]$ProbeUrlToUse
  )

  $row = [ordered]@{
    account = $Account
    ok = $false
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
    $row.jobId = $jobId
    if (-not $jobId) {
      $row.status = "unhealthy"
      $row.reason = "Missing job id from Google request queue reply."
      return [pscustomobject]$row
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
      $row.status = "inconclusive"
      $row.reason = "No terminal job result."
      return [pscustomobject]$row
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
      $row.ok = $true
      $row.status = "healthy"
      return [pscustomobject]$row
    }

    if ($errorText -match "invalid_rapt|invalid[_ ]?grant|token.*expired|reauth|refresh token missing|token request failed") {
      $row.status = "reauth-needed"
      $row.reason = $errorText
      return [pscustomobject]$row
    }

    $row.status = "unhealthy"
    $row.reason = if ($errorText) { $errorText } else { "Job failed without error text." }
    return [pscustomobject]$row
  } catch {
    $row.status = "unhealthy"
    $reasonText = ""
    try {
      $reasonText = ([string]$_.Exception.Message).Trim()
    } catch {}
    if (-not $reasonText) {
      $reasonText = "request_failed"
    }
    $row.reason = $reasonText
    return [pscustomobject]$row
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
$watchAccounts = if ($requested.Count -gt 0) { $requested } else { $allowlisted }
$watchAccounts = @($watchAccounts)
if ($watchAccounts.Count -lt 1) {
  throw "No accounts to watch. Provide -Accounts or ensure allowlisted accounts exist."
}

$startedAt = Get-Date
$deadline = $startedAt.AddMinutes([Math]::Max(1, $MaxMinutes))
$samples = [System.Collections.Generic.List[object]]::new()
$finalRows = @()
$done = $false

while ((Get-Date) -lt $deadline) {
  $rows = [System.Collections.Generic.List[object]]::new()
  foreach ($account in $watchAccounts) {
    $rows.Add((Test-GoogleAccountHealth -Account $account -ProbeUrlToUse $ProbeUrl)) | Out-Null
  }
  $snapshot = [pscustomobject]@{
    at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    rows = @($rows)
  }
  $samples.Add($snapshot) | Out-Null
  $finalRows = @($rows)

  $remaining = @($rows | Where-Object { -not $_.ok })
  if ($remaining.Count -eq 0) {
    $done = $true
    break
  }

  Start-Sleep -Seconds ([Math]::Max(1, $IntervalSeconds))
}

$finishedAt = Get-Date
$stamp = $finishedAt.ToString("yyyyMMdd-HHmmss")
$jsonPath = Join-Path $reportDir ("google-reauth-watch-" + $stamp + ".json")
$mdPath = Join-Path $reportDir ("google-reauth-watch-" + $stamp + ".md")
$latestJson = Join-Path $reportDir "google-reauth-watch-latest.json"
$latestMd = Join-Path $reportDir "google-reauth-watch-latest.md"

$report = [ordered]@{
  ok = $done
  startedAt = $startedAt.ToString("yyyy-MM-ddTHH:mm:sszzz")
  finishedAt = $finishedAt.ToString("yyyy-MM-ddTHH:mm:sszzz")
  durationSeconds = [int][Math]::Round(($finishedAt - $startedAt).TotalSeconds)
  baseUrl = $base
  accounts = $watchAccounts
  samples = @($samples)
  latestRows = $finalRows
  summary = [ordered]@{
    sampleCount = $samples.Count
    healthy = @($finalRows | Where-Object { $_.ok }).Count
    unhealthy = @($finalRows | Where-Object { -not $_.ok }).Count
    reauthNeeded = @($finalRows | Where-Object { $_.status -eq "reauth-needed" }).Count
  }
}

$report | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonPath -Encoding UTF8

$md = New-Object System.Collections.Generic.List[string]
$md.Add("# Google OAuth Reauth Watch") | Out-Null
$md.Add("") | Out-Null
$md.Add(("Started: " + $report.startedAt)) | Out-Null
$md.Add(("Finished: " + $report.finishedAt)) | Out-Null
$md.Add(("Duration (s): " + $report.durationSeconds)) | Out-Null
$md.Add(("Completed: " + $report.ok)) | Out-Null
$md.Add("") | Out-Null
$md.Add("## Latest Status") | Out-Null
foreach ($row in @($finalRows)) {
  $line = "- {0}: {1}" -f $row.account, $row.status
  if ($row.reason) {
    $line += (" | reason: " + $row.reason)
  }
  $md.Add($line) | Out-Null
}
$md.Add("") | Out-Null
$md.Add(("Samples captured: " + $report.summary.sampleCount)) | Out-Null

Set-Content -Path $mdPath -Value ($md -join "`r`n") -Encoding UTF8
Copy-Item -Path $jsonPath -Destination $latestJson -Force
Copy-Item -Path $mdPath -Destination $latestMd -Force

[pscustomobject]@{
  ok = $report.ok
  reportJson = $jsonPath
  reportMd = $mdPath
  latestJson = $latestJson
  latestMd = $latestMd
  summary = $report.summary
} | ConvertTo-Json -Depth 6
