[CmdletBinding()]
param(
  [string]$OutDir = "C:\Users\acer\Asolaria\reports",
  [int]$Port = 4781,
  [int]$ApiTimeoutSec = 12
)

Set-StrictMode -Version 1.0
$ErrorActionPreference = "Stop"

function Read-JsonFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Default
  )

  try {
    if (-not (Test-Path -LiteralPath $Path)) {
      return $Default
    }
    $raw = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
    if ([string]::IsNullOrWhiteSpace($raw)) {
      return $Default
    }
    return ($raw | ConvertFrom-Json -ErrorAction Stop)
  } catch {
    return $Default
  }
}

function Invoke-ApiJson {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$TimeoutSec = 10
  )

  try {
    $data = Invoke-RestMethod -Uri $Url -TimeoutSec $TimeoutSec -ErrorAction Stop
    return [pscustomobject]@{
      ok = $true
      url = $Url
      data = $data
      error = ""
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      url = $Url
      data = $null
      error = [string]$_.Exception.Message
    }
  }
}

function Test-LooksLikeCommandSeed {
  param([string]$Text)

  $value = [string]$Text
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $false
  }
  $trimmed = $value.Trim()

  if ($trimmed -match '(&&|\|\||\|[^|]|;\s*\S)') { return $true }
  if ($trimmed -match '^[a-z]:\\') { return $true }
  if ($trimmed -match '^(?:\.{1,2}[\\/]|~[\\/])') { return $true }
  if ($trimmed -match '\b[a-z0-9_.-]+\.(?:ps1|cmd|bat|exe|sh|zsh|py|js)\b') { return $true }
  if ($trimmed -match '^(?:powershell|pwsh|cmd|bash|zsh|node|npm|npx|python|py|git|curl|wget|Invoke-|Start-|Stop-|Get-|Set-)\b') { return $true }
  if ($trimmed -match '^-[a-z][\w-]*\s+') { return $true }

  return $false
}

function Test-IsTrivialSeed {
  param([string]$Text)

  $value = [string]$Text
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $true
  }
  $trimmed = $value.Trim()
  if (Test-LooksLikeCommandSeed -Text $trimmed) { return $true }
  if ($trimmed.Length -le 4) { return $true }
  if ($trimmed -match '^reply(?:\s+with)?\s+exactly\s*:') { return $true }
  if ($trimmed -match '^memory probe\b') { return $true }
  if ($trimmed -match '^(brain|identity)\s+check\s*:') { return $true }
  if ($trimmed -match '^(ok|okay|yes|yep|sure|hi|hello|continue|go|go ahead|proceed|test|yes do it)$') { return $true }
  return $false
}

function Get-LatestUserSeedCandidate {
  param($Turns)

  $items = @($Turns)
  for ($idx = $items.Count - 1; $idx -ge 0; $idx -= 1) {
    $turn = $items[$idx]
    $role = [string]$turn.role
    $text = [string]$turn.text
    if ($role -ne "user") {
      continue
    }
    if ([string]::IsNullOrWhiteSpace($text)) {
      continue
    }
    $trimmed = $text.Trim()
    if (Test-IsTrivialSeed -Text $trimmed) {
      continue
    }
    return [pscustomobject]@{
      at = [string]$turn.at
      text = $trimmed
      commandLike = (Test-LooksLikeCommandSeed -Text $trimmed)
    }
  }

  return [pscustomobject]@{
    at = ""
    text = ""
    commandLike = $false
  }
}

function New-Check {
  param(
    [string]$Id,
    [string]$Status,
    [string]$Summary,
    [string]$Detail = ""
  )

  return [pscustomobject]@{
    id = $Id
    status = $Status
    summary = $Summary
    detail = $Detail
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dataDir = Join-Path $repoRoot "data"
$reportsDir = if ([string]::IsNullOrWhiteSpace($OutDir)) { Join-Path $repoRoot "reports" } else { $OutDir }
$null = New-Item -ItemType Directory -Path $reportsDir -Force

$runtimeSettingsPath = Join-Path $dataDir "runtime-settings.json"
$memoryPath = Join-Path $dataDir "memory.json"
$taskLedgerPath = Join-Path $dataDir "task-ledger.json"
$startupHistoryPath = Join-Path $dataDir "startup-automation-history.json"

$runtimeSettings = Read-JsonFile -Path $runtimeSettingsPath -Default ([pscustomobject]@{})
$memory = Read-JsonFile -Path $memoryPath -Default ([pscustomobject]@{ turns = @() })
$taskLedger = Read-JsonFile -Path $taskLedgerPath -Default ([pscustomobject]@{ tasks = @(); events = @() })
$startupHistory = Read-JsonFile -Path $startupHistoryPath -Default ([pscustomobject]@{})

$healthFast = Invoke-ApiJson -Url ("http://127.0.0.1:{0}/api/health/fast" -f $Port) -TimeoutSec $ApiTimeoutSec
$health = Invoke-ApiJson -Url ("http://127.0.0.1:{0}/api/health" -f $Port) -TimeoutSec $ApiTimeoutSec
$localOps = Invoke-ApiJson -Url ("http://127.0.0.1:{0}/api/local/ops/status" -f $Port) -TimeoutSec $ApiTimeoutSec
$workerRouter = Invoke-ApiJson -Url ("http://127.0.0.1:{0}/api/worker-router/status" -f $Port) -TimeoutSec $ApiTimeoutSec
$symphony = Invoke-ApiJson -Url ("http://127.0.0.1:{0}/api/integrations/symphony/status" -f $Port) -TimeoutSec $ApiTimeoutSec
$abacus = Invoke-ApiJson -Url ("http://127.0.0.1:{0}/api/integrations/abacus/status" -f $Port) -TimeoutSec $ApiTimeoutSec

$latestCandidate = Get-LatestUserSeedCandidate -Turns $memory.turns

$startupSeed = ""
if ($health.ok -and $health.data -and $health.data.startupAutomation) {
  $startupSeed = [string]$health.data.startupAutomation.seed
}
$startupSeedCommandLike = Test-LooksLikeCommandSeed -Text $startupSeed

$taskCount = @($taskLedger.tasks).Count
$eventCount = @($taskLedger.events).Count
$taskNoAttributionCount = @(
  $taskLedger.tasks | Where-Object {
    $owner = ""
    $source = ""
    if ($_.PSObject.Properties.Match("owner").Count -gt 0) {
      $owner = [string]$_.owner
    }
    if ($_.PSObject.Properties.Match("source").Count -gt 0) {
      $source = [string]$_.source
    }
    [string]::IsNullOrWhiteSpace($owner) -and [string]::IsNullOrWhiteSpace($source)
  }
).Count
$taskNoAttributionPct = if ($taskCount -gt 0) { [math]::Round(($taskNoAttributionCount * 100.0) / $taskCount, 1) } else { 0 }

$blankEventActorCount = @(
  $taskLedger.events | Where-Object {
    $actor = ""
    if ($_.PSObject.Properties.Match("actor").Count -gt 0) {
      $actor = [string]$_.actor
    }
    [string]::IsNullOrWhiteSpace($actor)
  }
).Count
$blankEventActorPct = if ($eventCount -gt 0) { [math]::Round(($blankEventActorCount * 100.0) / $eventCount, 1) } else { 0 }

$checks = [System.Collections.Generic.List[object]]::new()

if ($startupSeedCommandLike) {
  $checks.Add((New-Check -Id "startup_seed_quality" -Status "warn" -Summary "Startup seed currently looks command-like." -Detail ("seed=`"{0}`"" -f $startupSeed)))
} else {
  $checks.Add((New-Check -Id "startup_seed_quality" -Status "pass" -Summary "Startup seed is not command-like." -Detail ""))
}

if ($latestCandidate.commandLike) {
  $checks.Add((New-Check -Id "memory_seed_candidate" -Status "warn" -Summary "Latest non-trivial memory candidate looks command-like." -Detail ("text=`"{0}`"" -f $latestCandidate.text)))
} elseif ([string]::IsNullOrWhiteSpace([string]$latestCandidate.text)) {
  $checks.Add((New-Check -Id "memory_seed_candidate" -Status "warn" -Summary "No usable non-trivial user seed candidate found in memory." -Detail ""))
} else {
  $checks.Add((New-Check -Id "memory_seed_candidate" -Status "pass" -Summary "Memory has a usable non-trivial user seed candidate." -Detail ("text=`"{0}`"" -f $latestCandidate.text)))
}

$symphonyConfigured = $false
$symphonyRunning = $false
if ($symphony.ok -and $symphony.data) {
  $symphonyConfigured = [bool]$symphony.data.status.configured
  $symphonyRunning = [bool]$symphony.data.status.process.running
}
if ($symphonyConfigured -and -not $symphonyRunning) {
  $checks.Add((New-Check -Id "symphony_runtime" -Status "warn" -Summary "Symphony is configured but not running." -Detail "Dispatch to Symphony may queue but not execute."))
} else {
  $checks.Add((New-Check -Id "symphony_runtime" -Status "pass" -Summary "Symphony runtime state is coherent with configuration." -Detail ""))
}

$workerSummary = if ($workerRouter.ok -and $workerRouter.data -and $workerRouter.data.status) { $workerRouter.data.status.integrationSummary } else { $null }
if ($workerSummary -and [bool]$workerSummary.symphonyConfigured -and -not [bool]$workerSummary.symphonyRunning) {
  $checks.Add((New-Check -Id "worker_router_symphony_alignment" -Status "warn" -Summary "Worker router sees Symphony configured but not running." -Detail "Long-running tasks should prefer local_codex until Symphony is up."))
} else {
  $checks.Add((New-Check -Id "worker_router_symphony_alignment" -Status "pass" -Summary "Worker router Symphony status is aligned." -Detail ""))
}

$phoneKeeperRunning = $false
$phoneMonitorRunning = $false
$phoneStatusSource = ""
if ($health.ok -and $health.data -and $health.data.networkPolicy) {
  $phoneKeeperRunning = [bool]$health.data.networkPolicy.phoneBridgeKeeper.running
  $phoneMonitorRunning = [bool]$health.data.networkPolicy.phoneTunnelMonitor.running
  $phoneStatusSource = "health"
} elseif ($healthFast.ok -and $healthFast.data -and $healthFast.data.networkPolicy) {
  $phoneKeeperRunning = [bool]$healthFast.data.networkPolicy.phoneBridgeKeeper.running
  $phoneMonitorRunning = [bool]$healthFast.data.networkPolicy.phoneTunnelMonitor.running
  $phoneStatusSource = "health_fast"
} else {
  $phoneStatusSource = "unknown"
}
if (-not $phoneKeeperRunning -or -not $phoneMonitorRunning) {
  $checks.Add((New-Check -Id "phone_background_services" -Status "warn" -Summary "One or more phone background services are not running." -Detail ("phoneBridgeKeeper={0}; phoneTunnelMonitor={1}; source={2}" -f $phoneKeeperRunning, $phoneMonitorRunning, $phoneStatusSource)))
} else {
  $checks.Add((New-Check -Id "phone_background_services" -Status "pass" -Summary "Phone background services are running." -Detail ("source={0}" -f $phoneStatusSource)))
}

if (
  ($taskNoAttributionPct -ge 50 -and $taskCount -gt 50) -or
  ($blankEventActorPct -ge 10 -and $eventCount -gt 50)
) {
  $checks.Add((New-Check -Id "task_ledger_attribution_coverage" -Status "warn" -Summary "Task ledger attribution coverage is degraded." -Detail ("tasksWithoutOwnerOrSource={0}/{1} ({2}%); eventsWithoutActor={3}/{4} ({5}%)" -f $taskNoAttributionCount, $taskCount, $taskNoAttributionPct, $blankEventActorCount, $eventCount, $blankEventActorPct)))
} else {
  $checks.Add((New-Check -Id "task_ledger_attribution_coverage" -Status "pass" -Summary "Task ledger attribution coverage is within expected range." -Detail ("tasksWithoutOwnerOrSource={0}/{1} ({2}%); eventsWithoutActor={3}/{4} ({5}%)" -f $taskNoAttributionCount, $taskCount, $taskNoAttributionPct, $blankEventActorCount, $eventCount, $blankEventActorPct)))
}

$agentSummary = $null
if ($health.ok -and $health.data) {
  $agentSummary = $health.data.agentColony
}
if ($agentSummary -and $agentSummary.counts) {
  $online = [int]($agentSummary.counts.online)
  $total = [int]($agentSummary.counts.total)
  if ($total -gt 1 -and $online -le 1) {
    $checks.Add((New-Check -Id "agent_colony_presence" -Status "warn" -Summary "Agent colony lanes are mostly offline." -Detail ("online={0}/{1}" -f $online, $total)))
  } else {
    $checks.Add((New-Check -Id "agent_colony_presence" -Status "pass" -Summary "Agent colony online count is acceptable." -Detail ("online={0}/{1}" -f $online, $total)))
  }
}

$warnCount = @($checks | Where-Object { $_.status -eq "warn" }).Count
$failCount = @($checks | Where-Object { $_.status -eq "fail" }).Count
$passCount = @($checks | Where-Object { $_.status -eq "pass" }).Count

$generatedAt = (Get-Date).ToString("o")
$stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$jsonPath = Join-Path $reportsDir ("naming-workflow-integrity-{0}.json" -f $stamp)
$mdPath = Join-Path $reportsDir ("naming-workflow-integrity-{0}.md" -f $stamp)
$jsonLatest = Join-Path $reportsDir "naming-workflow-integrity-latest.json"
$mdLatest = Join-Path $reportsDir "naming-workflow-integrity-latest.md"

$report = [pscustomobject]@{
  generatedAt = $generatedAt
  summary = [pscustomobject]@{
    pass = $passCount
    warn = $warnCount
    fail = $failCount
  }
  runtime = [pscustomobject]@{
    port = $Port
    healthFastOk = [bool]$healthFast.ok
    healthOk = [bool]$health.ok
    localOpsOk = [bool]$localOps.ok
    workerRouterOk = [bool]$workerRouter.ok
    symphonyOk = [bool]$symphony.ok
    abacusOk = [bool]$abacus.ok
  }
  startup = [pscustomobject]@{
    startupAutomationSeed = $startupSeed
    startupSeedCommandLike = $startupSeedCommandLike
    latestCandidateAt = [string]$latestCandidate.at
    latestCandidateText = [string]$latestCandidate.text
    latestCandidateCommandLike = [bool]$latestCandidate.commandLike
    startupHistory = $startupHistory
  }
  taskLedger = [pscustomobject]@{
    taskCount = $taskCount
    eventCount = $eventCount
    tasksWithoutOwnerOrSourceCount = $taskNoAttributionCount
    tasksWithoutOwnerOrSourcePct = $taskNoAttributionPct
    eventsWithoutActorCount = $blankEventActorCount
    eventsWithoutActorPct = $blankEventActorPct
  }
  integrations = [pscustomobject]@{
    symphony = [pscustomobject]@{
      configured = $symphonyConfigured
      running = $symphonyRunning
    }
    abacus = [pscustomobject]@{
      configured = if ($abacus.ok -and $abacus.data) { [bool]$abacus.data.status.configured } else { $false }
      workerTier = if ($abacus.ok -and $abacus.data) { [string]$abacus.data.status.capabilities.workerLane.tier } else { "" }
      workerConfigured = if ($abacus.ok -and $abacus.data) { [bool]$abacus.data.status.capabilities.workerLane.configured } else { $false }
    }
  }
  checks = @($checks)
}

$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
Copy-Item -LiteralPath $jsonPath -Destination $jsonLatest -Force

$mdLines = [System.Collections.Generic.List[string]]::new()
$mdLines.Add("# Naming and Workflow Integrity Report")
$mdLines.Add("")
$mdLines.Add(("Generated at: {0}" -f $generatedAt))
$mdLines.Add(("Summary: pass={0} warn={1} fail={2}" -f $passCount, $warnCount, $failCount))
$mdLines.Add("")
$mdLines.Add("## Runtime")
$mdLines.Add(("- Health fast: {0}" -f [bool]$healthFast.ok))
$mdLines.Add(("- Health full: {0}" -f [bool]$health.ok))
$mdLines.Add(("- Worker router: {0}" -f [bool]$workerRouter.ok))
$mdLines.Add(("- Symphony status: {0} (configured={1}, running={2})" -f [bool]$symphony.ok, $symphonyConfigured, $symphonyRunning))
$mdLines.Add(("- Abacus status: {0}" -f [bool]$abacus.ok))
$mdLines.Add("")
$mdLines.Add("## Startup Seed")
$mdLines.Add(("- Active startup seed: {0}" -f ($startupSeed -replace "`r|`n", " ")))
$mdLines.Add(("- Active seed command-like: {0}" -f $startupSeedCommandLike))
$mdLines.Add(("- Latest memory candidate at: {0}" -f [string]$latestCandidate.at))
$mdLines.Add(("- Latest memory candidate: {0}" -f (([string]$latestCandidate.text) -replace "`r|`n", " ")))
$mdLines.Add(("- Latest memory candidate command-like: {0}" -f [bool]$latestCandidate.commandLike))
$mdLines.Add("")
$mdLines.Add("## Checks")
foreach ($check in @($checks)) {
  $detail = if ([string]::IsNullOrWhiteSpace([string]$check.detail)) { "" } else { " - " + [string]$check.detail }
  $mdLines.Add(("- [{0}] {1}: {2}{3}" -f [string]$check.status, [string]$check.id, [string]$check.summary, $detail))
}

$mdLines -join "`n" | Set-Content -LiteralPath $mdPath -Encoding UTF8
Copy-Item -LiteralPath $mdPath -Destination $mdLatest -Force

[pscustomobject]@{
  ok = $true
  generatedAt = $generatedAt
  summary = $report.summary
  jsonPath = $jsonPath
  mdPath = $mdPath
  jsonLatest = $jsonLatest
  mdLatest = $mdLatest
} | ConvertTo-Json -Depth 8
