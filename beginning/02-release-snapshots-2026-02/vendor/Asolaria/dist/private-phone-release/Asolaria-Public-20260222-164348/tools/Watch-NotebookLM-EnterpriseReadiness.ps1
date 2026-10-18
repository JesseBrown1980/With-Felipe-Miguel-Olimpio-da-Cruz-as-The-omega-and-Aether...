param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$Account = "plasmatoid@gmail.com",
  [string]$Project = "winged-complex-390417",
  [int]$IntervalSec = 12,
  [int]$MaxMinutes = 20,
  [switch]$OpenManualPages
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Wait-JobResult {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$JobId,
    [int]$TimeoutSec = 45
  )
  $deadline = (Get-Date).AddSeconds([Math]::Max(5, $TimeoutSec))
  while ((Get-Date) -lt $deadline) {
    $jobResponse = Invoke-RestMethod -Uri "$Base/api/jobs/$JobId" -TimeoutSec 12
    $status = [string]$jobResponse.job.status
    if ($status -ne "queued" -and $status -ne "running") {
      return $jobResponse.job
    }
    Start-Sleep -Milliseconds 500
  }
  throw "Timed out waiting for job $JobId."
}

function Get-EnterpriseStatus {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$Email
  )
  $encoded = [uri]::EscapeDataString($Email)
  $start = Invoke-RestMethod -Uri "$Base/api/integrations/notebooklm/enterprise/status?account=$encoded" -TimeoutSec 12
  return Wait-JobResult -Base $Base -JobId ([string]$start.job.id)
}

function Get-EnterpriseListProbe {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$Email
  )
  $encoded = [uri]::EscapeDataString($Email)
  $start = Invoke-RestMethod -Uri "$Base/api/integrations/notebooklm/enterprise/notebooks?account=$encoded&limit=1" -TimeoutSec 12
  return Wait-JobResult -Base $Base -JobId ([string]$start.job.id)
}

function Open-ManualPages {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$CloudProject
  )
  $urls = @(
    "https://docs.cloud.google.com/gemini/enterprise/docs/notebooklm-enterprise/set-up-notebooklm-enterprise",
    "https://admin.google.com/ac/billing/subscriptions",
    "https://admin.google.com/ac/billing/catalog",
    "https://console.cloud.google.com/welcome?project=$CloudProject"
  )
  foreach ($url in $urls) {
    try {
      $payload = @{ url = $url } | ConvertTo-Json
      $resp = Invoke-RestMethod -Method Post -Uri "$Base/api/chrome/open" -ContentType "application/json" -Body $payload -TimeoutSec 15
      [pscustomobject]@{
        mode = "asolaria_api"
        opened = [string]$resp.opened
        warning = [string]$resp.policyWarning
      } | ConvertTo-Json -Compress | Write-Output
    } catch {
      $apiError = $_.Exception.Message
      try {
        Start-Process -FilePath $url | Out-Null
        [pscustomobject]@{
          mode = "windows_fallback"
          opened = $url
          error = $apiError
        } | ConvertTo-Json -Compress | Write-Output
      } catch {
        [pscustomobject]@{
          mode = "failed"
          opened = $url
          error = "$apiError | fallback: $($_.Exception.Message)"
        } | ConvertTo-Json -Compress | Write-Output
      }
    }
    Start-Sleep -Milliseconds 250
  }
}

if ($OpenManualPages) {
  Open-ManualPages -Base $BaseUrl -CloudProject $Project
}

$interval = [Math]::Max(5, $IntervalSec)
$deadline = (Get-Date).AddMinutes([Math]::Max(1, $MaxMinutes))

Write-Output ("Watching NotebookLM Enterprise readiness for {0} until {1}..." -f $Account, $deadline.ToString("o"))

while ((Get-Date) -lt $deadline) {
  try {
    $statusJob = Get-EnterpriseStatus -Base $BaseUrl -Email $Account
    $result = $statusJob.result
    $enterpriseReady = [bool]$result.enterpriseReady
    $apiEnabled = [string]$result.apiEnabled
    $access = [string]$result.access
    $tier = [string]$result.requiredSubscriptionTier
    $blockers = @()
    if ($result.blockers -is [System.Collections.IEnumerable]) {
      foreach ($item in $result.blockers) {
        $text = [string]$item
        if ($text) { $blockers += $text }
      }
    }

    [pscustomobject]@{
      timestamp = (Get-Date).ToString("o")
      enterpriseReady = $enterpriseReady
      apiEnabled = $apiEnabled
      access = $access
      requiredSubscriptionTier = $tier
      blockers = $blockers
    } | ConvertTo-Json -Depth 6

    if ($enterpriseReady) {
      $listJob = Get-EnterpriseListProbe -Base $BaseUrl -Email $Account
      [pscustomobject]@{
        timestamp = (Get-Date).ToString("o")
        listProbeStatus = [string]$listJob.status
        listProbeError = [string]$listJob.error
        listProbeResult = $listJob.result
      } | ConvertTo-Json -Depth 8
      exit 0
    }
  } catch {
    [pscustomobject]@{
      timestamp = (Get-Date).ToString("o")
      error = $_.Exception.Message
    } | ConvertTo-Json -Compress | Write-Output
  }
  Start-Sleep -Seconds $interval
}

Write-Output "License watcher timed out before enterpriseReady became true."
exit 2
