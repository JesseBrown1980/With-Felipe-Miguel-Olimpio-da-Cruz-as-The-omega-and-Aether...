param(
    [int]$Port = 4781,
    [string[]]$Accounts = @(),
    [string]$ProbeUrl = "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    [int]$RequestTimeoutSec = 8,
    [int]$PollAttempts = 12,
    [int]$PollDelayMs = 500
)

$base = "http://127.0.0.1:$Port";
$statusEndpoint = "$base/api/integrations/google/status";

function Test-Api {
  param([string]$Uri, [string]$Method = "GET", $Body = $null)
  try {
    if ($null -eq $Body) {
      return @{ ok = $true; payload = Invoke-RestMethod -Method $Method -Uri $Uri -TimeoutSec $RequestTimeoutSec -ErrorAction Stop }
    }
    return @{ ok = $true; payload = Invoke-RestMethod -Method $Method -Uri $Uri -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 8) -TimeoutSec $RequestTimeoutSec -ErrorAction Stop }
  } catch {
    return @{ ok = $false; error = $_.Exception.Message; status = "error" }
  }
}

Write-Host "Google OAuth health check (local API): $statusEndpoint"

$statusResult = Test-Api -Uri $statusEndpoint
if (-not $statusResult.ok) {
  throw "Failed to read Google integration status: $($statusResult.error)"
}

$status = $statusResult.payload.status
if (-not $status) {
  throw "Unexpected status payload: $($statusResult.payload | ConvertTo-Json -Depth 8)"
}

$accounts = if ($Accounts.Count -gt 0) { $Accounts } else { @() }
if ($accounts.Count -eq 0 -and $status.accounts) {
  $accounts = @($status.accounts | ForEach-Object { $_.email })
}
$accounts = @($accounts | Where-Object { $_ } | ForEach-Object { $_.Trim().ToLowerInvariant() })

Write-Host "Integration enabled: $($status.enabled)"
Write-Host ("Configured: " + [string]$status.configured)
Write-Host ("Allowed accounts: " + (($status.allowedAccounts -join ", ") -as [string]))
Write-Host ("Connected accounts discovered: " + $accounts.Count)

$rows = [System.Collections.Generic.List[PSObject]]::new()

foreach ($account in $accounts) {
  $acct = [pscustomobject]@{
    account = $account
    hasRefreshToken = $null
    expiresInSec = $null
    status = "unknown"
    reason = ""
    job = ""
    invalidRapt = $false
  }

  $known = $status.accounts | Where-Object { $_.email -ieq $account }
  if ($known) {
    $acct.hasRefreshToken = [bool]$known.hasRefreshToken
    $acct.expiresInSec = $known.expiresInSec
    if (-not $known.hasRefreshToken) {
      $acct.status = "reauth-needed"
      $acct.reason = "No refresh token in connected account record."
      $rows.Add($acct)
      continue
    }
  } else {
    $acct.status = "reauth-needed"
    $acct.reason = "Account not present in connected accounts list."
    $rows.Add($acct)
    continue
  }

  $req = Test-Api -Method "POST" -Uri "$base/api/integrations/google/request" -Body @{
    account = $account
    method = "GET"
    url = $ProbeUrl
  }
  if (-not $req.ok) {
    $acct.status = "reauth-needed"
    $acct.reason = "Request submit failed: $($req.error)"
    $rows.Add($acct)
    continue
  }

  $jobId = [string]$req.payload.job.id
  $acct.job = $jobId
  $statusUrl = "$base/api/jobs/$jobId"

  $result = $null
  $done = $false
  for ($i = 0; $i -lt $PollAttempts; $i++) {
    Start-Sleep -Milliseconds $PollDelayMs
    $poll = Test-Api -Uri $statusUrl
    if (-not $poll.ok) {
      continue
    }
    $job = $poll.payload.job
    if (-not $job) {
      continue
    }
    if ($job.status -in @("completed", "failed")) {
      $done = $true
      $result = $job
      break
    }
  }

  if (-not $done) {
    $acct.status = "inconclusive"
    $acct.reason = "Request timed out polling job state."
    $rows.Add($acct)
    continue
  }

  if ($result.error) {
    $message = [string]$result.error
    if ($message -match "invalid_rapt|invalid[_ ]?grant|token.*expired|Re-auth|reauth|token.*missing|refresh token missing|consent") {
      $acct.status = "reauth-needed"
    } else {
      $acct.status = "unhealthy"
    }
    $acct.reason = $message
    if ($message -match "invalid_rapt") {
      $acct.invalidRapt = $true
    }
  } else {
    $acct.status = "healthy"
    $acct.reason = ""
  }

  $rows.Add($acct)
}

Write-Host ""
Write-Host "Per-account OAuth health:"
foreach ($row in $rows) {
  $health = $row.status.ToUpper()
  $extra = if ($row.expiresInSec -ne $null) { "expiresInSec=$($row.expiresInSec); " } else { "" }
  if ($row.job) {
    $extra += "job=$($row.job)"
  }
  if ($row.invalidRapt) {
    $extra += "; invalid_rapt=1"
  }
  if (-not [string]::IsNullOrWhiteSpace($row.reason)) {
    $extra += "; reason=$($row.reason)"
  }
  if ([string]::IsNullOrWhiteSpace($extra)) {
    Write-Host ("- {0}: {1}" -f $row.account, $health)
  } else {
    Write-Host ("- {0}: {1} ({2})" -f $row.account, $health, $extra)
  }
}

$healthy = @($rows | Where-Object { $_.status -eq "healthy" } | ForEach-Object { $_.account })
$reauth = @($rows | Where-Object { $_.status -eq "reauth-needed" } | ForEach-Object { $_.account })
$unhealthy = @($rows | Where-Object { $_.status -notin @("healthy", "reauth-needed") } | ForEach-Object { $_.account })

Write-Host ""
Write-Host ("Healthy: " + ($healthy.Count))
Write-Host ("Reauth-needed: " + ($reauth.Count))
Write-Host ("Other failures: " + ($unhealthy.Count))
if ($reauth.Count -gt 0) {
  Write-Host ("Need reauth: {0}" -f ($reauth -join ", "))
}
if ($unhealthy.Count -gt 0) {
  Write-Host ("Other unhealthy: {0}" -f ($unhealthy -join ", "))
}
