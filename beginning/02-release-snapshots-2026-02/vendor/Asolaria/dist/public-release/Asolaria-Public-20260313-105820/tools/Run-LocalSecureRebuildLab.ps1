[CmdletBinding()]
param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$AppName = "External AI workflow",
  [string]$Objective = "Study behavior safely and rebuild local-first equivalents with explicit security gates.",
  [string[]]$EvidencePaths = @(),
  [string]$ReportTag = "secure-rebuild",
  [switch]$NoDefaultEvidence,
  [switch]$NoPersistReport,
  [int]$TimeoutSec = 240
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-JsonPost {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][object]$Body,
    [int]$TimeoutSec = 30
  )
  $json = $Body | ConvertTo-Json -Depth 14
  return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $json -TimeoutSec $TimeoutSec
}

function Invoke-JsonGet {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$TimeoutSec = 30
  )
  return Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec $TimeoutSec
}

function Wait-JobResult {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$JobId,
    [int]$TimeoutSec = 240
  )
  $deadline = (Get-Date).AddSeconds([Math]::Max(20, $TimeoutSec))
  while ((Get-Date) -lt $deadline) {
    $resp = Invoke-JsonGet -Url ("{0}/api/jobs/{1}" -f $Base, [uri]::EscapeDataString($JobId)) -TimeoutSec 20
    $job = $resp.job
    $status = [string]$job.status
    if ($status -ne "queued" -and $status -ne "running") {
      return $job
    }
    Start-Sleep -Milliseconds 650
  }
  throw ("Timed out waiting for job " + $JobId)
}

function Get-PropValue {
  param(
    [object]$Object,
    [string]$Name,
    $Default = $null
  )
  if ($null -eq $Object) { return $Default }
  if ($Object -is [System.Collections.IDictionary]) {
    if ($Object.Contains($Name)) { return $Object[$Name] }
    return $Default
  }
  $prop = $Object.PSObject.Properties[$Name]
  if ($null -eq $prop) { return $Default }
  return $prop.Value
}

$base = $BaseUrl.TrimEnd("/")

$null = Invoke-JsonPost -Url ("{0}/api/skills/reload" -f $base) -Body @{} -TimeoutSec 40

$inputPayload = [ordered]@{
  appName = $AppName
  objective = $Objective
  includeDefaultEvidence = (-not $NoDefaultEvidence)
  persistReport = (-not $NoPersistReport)
  reportTag = $ReportTag
}

if ($EvidencePaths -and @($EvidencePaths).Count -gt 0) {
  $inputPayload.evidencePaths = @($EvidencePaths)
}

$queued = Invoke-JsonPost -Url ("{0}/api/skills/run" -f $base) -Body @{
  id = "local.secure_rebuild.lab"
  input = $inputPayload
} -TimeoutSec 40

$jobId = [string]$queued.job.id
if (-not $jobId) {
  throw "skills/run did not return a job id."
}

$job = Wait-JobResult -Base $base -JobId $jobId -TimeoutSec $TimeoutSec
$result = Get-PropValue -Object $job -Name "result" -Default $null
$stepsRaw = Get-PropValue -Object $result -Name "steps" -Default @()
$steps = if ($stepsRaw -is [System.Collections.IEnumerable]) { @($stepsRaw) } else { @() }
$planStep = $steps | Where-Object { [string]$_.action -eq "local_rebuild_plan" } | Select-Object -First 1
$plan = Get-PropValue -Object $planStep -Name "output" -Default $null

$capabilities = @()
if ($plan -and $plan.capabilities -is [System.Collections.IEnumerable]) {
  $capabilities = @($plan.capabilities)
}

$summary = [ordered]@{
  ok = ([string]$job.status -eq "completed")
  baseUrl = $base
  jobId = $jobId
  status = [string]$job.status
  error = [string]$job.error
  restartRequired = ([string]$job.error -like "*Unsupported skill step action*")
  hint = if ([string]$job.error -like "*Unsupported skill step action*") {
    "Restart Asolaria runtime to load updated action handlers, then rerun this script."
  } else {
    ""
  }
  generatedAt = if ($plan) { [string]$plan.generatedAt } else { "" }
  appName = if ($plan) { [string]$plan.appName } else { $AppName }
  objective = if ($plan) { [string]$plan.objective } else { $Objective }
  evidenceLoaded = if ($plan) { [int]$plan.evidence.loadedCount } else { 0 }
  evidenceSkipped = if ($plan) { [int]$plan.evidence.skippedCount } else { 0 }
  capabilityCount = $capabilities.Count
  capabilities = @($capabilities | ForEach-Object {
    [ordered]@{
      id = [string]$_.id
      confidence = [double]$_.confidence
      matchCount = [int]$_.matchCount
    }
  })
  reportJsonPath = if ($plan -and $plan.report) { [string]$plan.report.jsonPath } else { "" }
  reportMarkdownPath = if ($plan -and $plan.report) { [string]$plan.report.markdownPath } else { "" }
}

$summary | ConvertTo-Json -Depth 12
