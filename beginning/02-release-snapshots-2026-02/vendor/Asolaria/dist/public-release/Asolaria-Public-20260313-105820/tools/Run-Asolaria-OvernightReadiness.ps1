param(
  [datetime]$EndAt,
  [int]$PollSeconds = 20,
  [int]$JobTimeoutMinutes = 25,
  [string]$ChatId = "overnight-readiness-loop",
  [string]$ThreadId = "overnight-readiness-20260310",
  [int]$MaxCycles = 40,
  [switch]$EnableSwarm = $true,
  [switch]$SendBridgeKickoff = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Write-Log {
  param(
    [string]$Path,
    [string]$Message
  )
  $line = "[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $Path -Value $line -Encoding UTF8
}

function Invoke-AsolariaApi {
  param(
    [ValidateSet("GET", "POST")]
    [string]$Method,
    [string]$Path,
    [object]$Body = $null
  )

  $uri = "http://127.0.0.1:4781$Path"
  if ($Method -eq "GET") {
    return Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 60
  }

  $json = if ($null -eq $Body) { "{}" } else { $Body | ConvertTo-Json -Depth 10 }
  return Invoke-RestMethod -Uri $uri -Method Post -TimeoutSec 60 -ContentType "application/json" -Body $json
}

function Get-ObjectStringProperty {
  param(
    $Object,
    [string]$Name
  )

  if ($null -eq $Object -or [string]::IsNullOrWhiteSpace($Name)) {
    return ""
  }

  $prop = $Object.PSObject.Properties[$Name]
  if ($null -eq $prop) {
    return ""
  }

  return [string]$prop.Value
}

function Get-ObjectPropertyValue {
  param(
    $Object,
    [string]$Name
  )

  if ($null -eq $Object -or [string]::IsNullOrWhiteSpace($Name)) {
    return $null
  }

  if ($Object -is [System.Collections.IDictionary]) {
    if ($Object.Contains($Name)) {
      return $Object[$Name]
    }
    return $null
  }

  $prop = $Object.PSObject.Properties[$Name]
  if ($null -eq $prop) {
    return $null
  }

  return $prop.Value
}

function Get-NestedObjectValue {
  param(
    $Object,
    [string[]]$Path
  )

  $current = $Object
  foreach ($segment in $Path) {
    $current = Get-ObjectPropertyValue -Object $current -Name $segment
    if ($null -eq $current) {
      return $null
    }
  }

  return $current
}

function Get-NestedObjectStringProperty {
  param(
    $Object,
    [string[]]$Path
  )

  $value = Get-NestedObjectValue -Object $Object -Path $Path
  if ($null -eq $value) {
    return ""
  }

  return [string]$value
}

function Get-FirstNonEmptyString {
  param(
    [object[]]$Values
  )

  foreach ($value in $Values) {
    if ($null -eq $value) {
      continue
    }
    $text = [string]$value
    if (-not [string]::IsNullOrWhiteSpace($text)) {
      return $text
    }
  }

  return ""
}

function Wait-JobCompletion {
  param(
    [string]$JobId,
    [int]$TimeoutMinutes
  )

  $deadline = (Get-Date).AddMinutes([Math]::Max(1, $TimeoutMinutes))
  $lastProbeError = ""
  do {
    try {
      $jobResp = Invoke-AsolariaApi -Method GET -Path ("/api/jobs/" + $JobId)
      $jobStatus = Get-ObjectStringProperty -Object $jobResp.job -Name "status"
      if ($jobStatus -in @("completed", "failed")) {
        return $jobResp.job
      }
      $lastProbeError = ""
    } catch {
      $lastProbeError = $_.Exception.Message
    }
    Start-Sleep -Seconds ([Math]::Max(5, $PollSeconds))
  } while ((Get-Date) -lt $deadline)

  if (-not [string]::IsNullOrWhiteSpace($lastProbeError)) {
    throw "Timed out waiting for job $JobId after $TimeoutMinutes minutes. Last probe error: $lastProbeError"
  }
  throw "Timed out waiting for job $JobId after $TimeoutMinutes minutes."
}

function New-TaskState {
  return [ordered]@{
    system_readiness = [ordered]@{ status = "pending"; attempts = 0; summary = ""; lastRunAt = "" }
    media_defaults = [ordered]@{ status = "pending"; attempts = 0; summary = ""; lastRunAt = "" }
    notebooklm_memory = [ordered]@{ status = "pending"; attempts = 0; summary = ""; lastRunAt = "" }
    swarm_readiness = [ordered]@{ status = "pending"; attempts = 0; summary = ""; lastRunAt = "" }
    ebacmap_prep = [ordered]@{ status = "pending"; attempts = 0; summary = ""; lastRunAt = "" }
  }
}

function Get-NextTaskId {
  param([hashtable]$Tasks)

  foreach ($id in @("system_readiness", "media_defaults", "notebooklm_memory", "swarm_readiness", "ebacmap_prep")) {
    if (($Tasks[$id].status -as [string]) -in @("pending", "continue")) {
      return $id
    }
  }

  foreach ($id in @("system_readiness", "media_defaults", "notebooklm_memory", "swarm_readiness", "ebacmap_prep")) {
    if (($Tasks[$id].status -as [string]) -eq "blocked" -and [int]$Tasks[$id].attempts -lt 3) {
      return $id
    }
  }

  return "DONE"
}

function Parse-ReplyFields {
  param([string]$Reply)

  $text = [string]$Reply
  $status = ""
  $next = ""
  $summary = ""

  foreach ($line in ($text -split "`r?`n")) {
    if (-not $status -and $line -match '^\s*STATUS:\s*(.+?)\s*$') {
      $status = $Matches[1].Trim().ToLowerInvariant()
      continue
    }
    if (-not $next -and $line -match '^\s*NEXT:\s*(.+?)\s*$') {
      $next = $Matches[1].Trim().ToLowerInvariant()
      continue
    }
    if (-not $summary -and $line -match '^\s*SUMMARY:\s*(.+?)\s*$') {
      $summary = $Matches[1].Trim()
      continue
    }
  }

  return [ordered]@{
    status = if ($status) { $status } else { "continue" }
    next = if ($next) { $next } else { "" }
    summary = if ($summary) { $summary } else { ($text -split "`r?`n" | Select-Object -First 1) }
  }
}

function Build-Prompt {
  param(
    [string]$CurrentTaskId,
    [hashtable]$Tasks,
    [string]$PreviousSummary,
    [datetime]$Deadline
  )

  $taskDescriptions = [ordered]@{
    system_readiness = "Re-verify system readiness: startup, search, media, GPU, and any remaining blockers. Make only bounded, reversible fixes."
    media_defaults = "Investigate the Windows-guarded media/default-app state. If a safe supported fix exists, apply it. If not, document the exact remaining guard and produce an owner-safe morning handoff."
    notebooklm_memory = "Verify NotebookLM Enterprise plus external NotebookLM alignment, summarize current memory posture, and remove low-risk blockers if possible."
    swarm_readiness = "Prepare Asolaria for morning swarm work using only the existing named colony identities. Validate current swarm status and improve readiness without inventing new agents."
    ebacmap_prep = "Prepare the machine for eBacMap start-of-day work by locating local pack artifacts, checking project readiness, and producing a concise launch checklist."
  }

  $stateLines = foreach ($id in @("system_readiness", "media_defaults", "notebooklm_memory", "swarm_readiness", "ebacmap_prep")) {
    if (-not $Tasks.Contains($id)) {
      continue
    }
    $item = $Tasks[$id]
    $summary = [string]$item.summary
    if ($summary.Length -gt 140) {
      $summary = $summary.Substring(0, 140) + "..."
    }
    "- {0}: status={1}; attempts={2}; summary={3}" -f $id, $item.status, $item.attempts, $(if ([string]::IsNullOrWhiteSpace($summary)) { "none" } else { $summary })
  }
  $deadlineText = $Deadline.ToString("yyyy-MM-dd HH:mm:ss zzz")
  $nowText = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
  $previous = if ([string]::IsNullOrWhiteSpace($PreviousSummary)) { "none" } else { $PreviousSummary.Trim() }

  return @"
Execution mode: overnight readiness loop.
Current local time: $nowText
Deadline: $deadlineText

Owner intent:
- Keep working overnight while the lid is closed.
- Keep the machine safe and usable by morning.
- Aim to have Asolaria and the colony as ready as possible for eBacMap start-of-day work.

Constraints:
- Use only existing named colony identities: Asolaria, Vector, Rook, Forge, Falcon, Watchdog, Oli.
- Do not create new long-lived agent identities.
- Prefer bounded, reversible fixes with backups when mutating system state.
- Stay internal and local unless a built-in Asolaria route is clearly required.
- If a task is blocked, document the blocker and immediately move to the next highest-value task.

Current checklist state:
$($stateLines -join "`n")

Previous cycle summary:
$previous

Current task:
- id: $CurrentTaskId
- objective: $($taskDescriptions[$CurrentTaskId])

Required response footer exactly once:
STATUS: <done|continue|blocked>
NEXT: <system_readiness|media_defaults|notebooklm_memory|swarm_readiness|ebacmap_prep|DONE>
SUMMARY: <one line>
DETAILS:
- <bullet 1>
- <bullet 2>
"@
}

function Send-BridgeKickoff {
  param(
    [string]$BridgeRoot,
    [string]$ThreadId,
    [string]$Message,
    [string]$LogPath
  )

  $tokenPath = Join-Path $BridgeRoot "bridge-token2.txt"
  if (-not (Test-Path $tokenPath)) {
    $tokenPath = Join-Path $BridgeRoot "bridge-token.txt"
  }
  if (-not (Test-Path $tokenPath)) {
    Write-Log -Path $LogPath -Message "bridge_kickoff skipped reason=missing_bridge_token"
    return
  }

  $policyPath = Join-Path $BridgeRoot "airlock-policy.json"
  if (-not (Test-Path $policyPath)) {
    Write-Log -Path $LogPath -Message "bridge_kickoff skipped reason=missing_policy_file"
    return
  }

  $policy = Get-Content -Raw -Path $policyPath | ConvertFrom-Json
  $senderToken = [string]$policy.senderTokens.watchdog
  if ([string]::IsNullOrWhiteSpace($senderToken)) {
    Write-Log -Path $LogPath -Message "bridge_kickoff skipped reason=missing_watchdog_sender_token"
    return
  }

  $msgPath = Join-Path $env:TEMP ("bridge-kickoff-" + [guid]::NewGuid().ToString("N") + ".txt")
  @(
    "@vector @asolaria @rook @forge @falcon @watchdog #thread:$ThreadId NOTE: $Message"
  ) | Set-Content -Path $msgPath -Encoding ASCII

  try {
    $token = (Get-Content -Raw -Path $tokenPath).Trim()
    $node = (Get-Command node -ErrorAction Stop).Source
    $bridgeJs = Join-Path $BridgeRoot "bridge.js"
    & $node $bridgeJs send --url http://127.0.0.1:8788 --token $token --room asolaria_bridge --from watchdog --senderToken $senderToken --textFile $msgPath | Out-Null
    Write-Log -Path $LogPath -Message "bridge_kickoff sent thread=$ThreadId"
  } catch {
    Write-Log -Path $LogPath -Message ("bridge_kickoff failed error=" + $_.Exception.Message)
  } finally {
    Remove-Item $msgPath -Force -ErrorAction SilentlyContinue
  }
}

if (-not $PSBoundParameters.ContainsKey("EndAt")) {
  $EndAt = (Get-Date).Date.AddDays(1).AddHours(8)
}

$root = Get-AsolariaRoot
$logsDir = Join-Path $root "logs"
$reportsDir = Join-Path $root "reports"
$bridgeRoot = "C:\Users\acer\codex-bridge"
Ensure-Dir -Path $logsDir
Ensure-Dir -Path $reportsDir

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $logsDir ("overnight-readiness-" + $stamp + ".log")
$statePath = Join-Path $reportsDir ("overnight-readiness-state-" + $stamp + ".json")
$summaryPath = Join-Path $reportsDir ("overnight-readiness-summary-" + $stamp + ".md")

$tasks = New-TaskState
$state = [ordered]@{
  startedAt = (Get-Date).ToString("o")
  deadline = $EndAt.ToString("o")
  chatId = $ChatId
  threadId = $ThreadId
  cycles = 0
  lastJobId = ""
  lastSummary = ""
  stopRequested = $false
  tasks = $tasks
}

Write-Log -Path $logPath -Message ("overnight_readiness_start deadline={0} chatId={1} thread={2}" -f $state.deadline, $ChatId, $ThreadId)

if ($EnableSwarm) {
  try {
    $settingsResp = Invoke-AsolariaApi -Method POST -Path "/api/settings" -Body @{
      agentColonyWatchdogEnabled = $true
      swarmModeEnabled = $true
      swarmModeAutoDispatch = $true
    }
    Write-Log -Path $logPath -Message ("settings_updated swarm_enabled={0} autoDispatch={1}" -f $settingsResp.settings.swarmModeEnabled, $settingsResp.settings.swarmModeAutoDispatch)
  } catch {
    Write-Log -Path $logPath -Message ("settings_update_failed error=" + $_.Exception.Message)
  }

  try {
    $swarmResp = Invoke-AsolariaApi -Method POST -Path "/api/swarm/mode" -Body @{
      enabled = $true
      autoDispatch = $true
    }
    Write-Log -Path $logPath -Message ("swarm_mode_applied enabled={0} autoDispatch={1}" -f $swarmResp.swarm.enabled, $swarmResp.swarm.autoDispatch)
  } catch {
    Write-Log -Path $logPath -Message ("swarm_mode_failed error=" + $_.Exception.Message)
  }
}

if ($SendBridgeKickoff) {
  Send-BridgeKickoff -BridgeRoot $bridgeRoot -ThreadId $ThreadId -Message "Owner requested overnight readiness work. Focus on system readiness, guarded media/defaults, NotebookLM memory posture, swarm readiness, and eBacMap morning prep. Keep changes bounded and reversible." -LogPath $logPath
}

while ((Get-Date) -lt $EndAt -and $state.cycles -lt $MaxCycles) {
  $nextTaskId = Get-NextTaskId -Tasks $tasks
  if ($nextTaskId -eq "DONE") {
    Write-Log -Path $logPath -Message "all_tasks_marked_done exiting"
    break
  }

  $state.cycles = [int]$state.cycles + 1
  $tasks[$nextTaskId].attempts = [int]$tasks[$nextTaskId].attempts + 1
  $tasks[$nextTaskId].lastRunAt = (Get-Date).ToString("o")
  $prompt = Build-Prompt -CurrentTaskId $nextTaskId -Tasks $tasks -PreviousSummary $state.lastSummary -Deadline $EndAt
  Write-Log -Path $logPath -Message ("cycle={0} task={1} action=queue_chat" -f $state.cycles, $nextTaskId)

  try {
    $taskChatId = "{0}-{1}" -f $ChatId, $nextTaskId
    $chatResp = Invoke-AsolariaApi -Method POST -Path "/api/chat" -Body @{
      message = $prompt
      chatId = $taskChatId
      routeMode = "direct"
    }
    $jobId = Get-NestedObjectStringProperty -Object $chatResp -Path @("job", "id")
    if ([string]::IsNullOrWhiteSpace($jobId)) {
      throw "Chat request completed without a job id."
    }
    $state.lastJobId = $jobId
    Write-Log -Path $logPath -Message ("cycle={0} task={1} chat={2} queued_job={3}" -f $state.cycles, $nextTaskId, $taskChatId, $jobId)

    $job = Wait-JobCompletion -JobId $jobId -TimeoutMinutes $JobTimeoutMinutes
    $jobStatus = Get-ObjectStringProperty -Object $job -Name "status"
    if ($jobStatus -eq "failed") {
      $jobError = Get-FirstNonEmptyString -Values @(
        (Get-ObjectStringProperty -Object $job -Name "error"),
        (Get-NestedObjectStringProperty -Object $job -Path @("result", "error")),
        (Get-NestedObjectStringProperty -Object $job -Path @("result", "reply")),
        (Get-NestedObjectStringProperty -Object $job -Path @("result", "text")),
        (Get-ObjectStringProperty -Object $chatResp -Name "reply")
      )
      if ([string]::IsNullOrWhiteSpace($jobError)) {
        $jobError = "Brain job failed with no error text."
      }
      throw $jobError
    }

    $reply = Get-FirstNonEmptyString -Values @(
      (Get-NestedObjectStringProperty -Object $job -Path @("result", "reply")),
      (Get-NestedObjectStringProperty -Object $job -Path @("result", "text")),
      (Get-ObjectStringProperty -Object $job -Name "reply"),
      (Get-ObjectStringProperty -Object $chatResp -Name "reply")
    )
    if ([string]::IsNullOrWhiteSpace($reply)) {
      throw "Brain job completed without reply text."
    }
    $parsed = Parse-ReplyFields -Reply $reply

    $tasks[$nextTaskId].status = $parsed.status
    $tasks[$nextTaskId].summary = $parsed.summary
    $state.lastSummary = "{0}: {1}" -f $nextTaskId, $parsed.summary

    Write-Log -Path $logPath -Message ("cycle={0} task={1} status={2} next={3} summary={4}" -f $state.cycles, $nextTaskId, $parsed.status, $parsed.next, $parsed.summary)

    if ($parsed.status -eq "done" -and $parsed.next -and $parsed.next -ne "done" -and $tasks.Contains($parsed.next)) {
      if ($tasks[$parsed.next].status -eq "pending") {
        $tasks[$parsed.next].status = "continue"
      }
    }

    if ($parsed.next -eq "done") {
      $state.stopRequested = $true
    }
  } catch {
    $tasks[$nextTaskId].status = "blocked"
    $tasks[$nextTaskId].summary = $_.Exception.Message
    $state.lastSummary = "{0}: blocked - {1}" -f $nextTaskId, $_.Exception.Message
    Write-Log -Path $logPath -Message ("cycle={0} task={1} error={2}" -f $state.cycles, $nextTaskId, $_.Exception.Message)
  }

  $state.tasks = $tasks
  $state | ConvertTo-Json -Depth 10 | Set-Content -Path $statePath -Encoding UTF8

  $summaryLines = @(
    "# Overnight Readiness Summary",
    "",
    ("Updated: " + (Get-Date).ToString("o")),
    ("Deadline: " + $state.deadline),
    ("Cycles: " + $state.cycles),
    "",
    "## Task State"
  )
  foreach ($id in $tasks.Keys) {
    $item = $tasks[$id]
    $summaryLines += ("- {0}: {1} (attempts={2}) - {3}" -f $id, $item.status, $item.attempts, $item.summary)
  }
  $summaryLines += @(
    "",
    "## Last Summary",
    $state.lastSummary,
    "",
    "## Last Job",
    $(if ([string]::IsNullOrWhiteSpace([string]$state.lastJobId)) { "none" } else { [string]$state.lastJobId }),
    "",
    "## Log",
    $logPath
  )
  $summaryLines | Set-Content -Path $summaryPath -Encoding UTF8

  if ($state.stopRequested) {
    Write-Log -Path $logPath -Message "stop_requested_by_reply"
    break
  }

  Start-Sleep -Seconds ([Math]::Max(10, $PollSeconds))
}

$state.tasks = $tasks
$state.completedAt = (Get-Date).ToString("o")
$state | ConvertTo-Json -Depth 10 | Set-Content -Path $statePath -Encoding UTF8
Write-Log -Path $logPath -Message ("overnight_readiness_stop cycles={0}" -f $state.cycles)
