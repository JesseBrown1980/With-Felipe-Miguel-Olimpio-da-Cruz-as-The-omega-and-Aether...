[CmdletBinding()]
param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$OutDir = "C:\Users\acer\Asolaria\reports",
  [int]$TimeoutSec = 20
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Json {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [hashtable]$Headers = @{},
    [int]$Timeout = 20
  )
  return Invoke-RestMethod -Uri $Url -Headers $Headers -TimeoutSec $Timeout -ErrorAction Stop
}

function Is-OpenTask {
  param($Task)
  $status = [string]$Task.status
  $status = $status.ToLowerInvariant()
  return ($status -ne "done" -and $status -ne "canceled" -and $status -ne "archived")
}

function Wait-JobResult {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$JobId,
    [int]$Timeout = 20
  )
  $tries = 0
  while ($tries -lt 30) {
    Start-Sleep -Milliseconds 300
    $jobResp = Invoke-Json -Url ("$Base/api/jobs/$JobId") -Timeout $Timeout
    $job = $jobResp.job
    if ($job.status -eq "completed" -or $job.status -eq "failed") {
      return $job
    }
    $tries += 1
  }
  return (Invoke-Json -Url ("$Base/api/jobs/$JobId") -Timeout $Timeout).job
}

if (-not (Test-Path -LiteralPath $OutDir)) {
  New-Item -Path $OutDir -ItemType Directory -Force | Out-Null
}

$base = $BaseUrl.TrimEnd("/")
$health = Invoke-Json -Url "$base/api/health" -Timeout $TimeoutSec

$localConsoleUrl = [string]$health.uiControl.paths.local_console
$tokenMatch = [Regex]::Match($localConsoleUrl, "[?&]token=([^&]+)")
if (-not $tokenMatch.Success) {
  throw "Mobile token could not be resolved from /api/health uiControl.local_console."
}
$mobileToken = [System.Uri]::UnescapeDataString($tokenMatch.Groups[1].Value)
$mobileHeaders = @{
  "x-asolaria-viewer" = "falcon"
}

$tasksAll = Invoke-Json -Url "$base/api/task-ledger/tasks?status=all&includeArchived=true&limit=1000" -Timeout $TimeoutSec
$tasksActive = Invoke-Json -Url "$base/api/task-ledger/tasks?status=all&includeArchived=false&limit=1000" -Timeout $TimeoutSec
$tasksTop240 = Invoke-Json -Url "$base/api/task-ledger/tasks?status=all&includeArchived=false&limit=240" -Timeout $TimeoutSec

$allRows = @($tasksAll.tasks)
$activeRows = @($tasksActive.tasks)
$openRows = @($activeRows | Where-Object { Is-OpenTask $_ })
$openTop240 = @($tasksTop240.tasks | Where-Object { Is-OpenTask $_ })

$openTop240Set = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($row in $openTop240) {
  [void]$openTop240Set.Add([string]$row.id)
}
$openOmittedBy240 = @($openRows | Where-Object { -not $openTop240Set.Contains([string]$_.id) })

$statusCounts = @{}
foreach ($row in $allRows) {
  $key = [string]$row.status
  if (-not $statusCounts.ContainsKey($key)) {
    $statusCounts[$key] = 0
  }
  $statusCounts[$key] += 1
}

$inboxDefault = Invoke-Json -Url "$base/api/mobile/inbox?token=$mobileToken" -Headers $mobileHeaders -Timeout $TimeoutSec
$inboxMax = Invoke-Json -Url "$base/api/mobile/inbox?token=$mobileToken&approvalLimit=20&taskLimit=20&noteLimit=12" -Headers $mobileHeaders -Timeout $TimeoutSec
$mobileSettings = Invoke-Json -Url "$base/api/mobile/settings?token=$mobileToken" -Headers $mobileHeaders -Timeout $TimeoutSec

$notebookNotes = Invoke-Json -Url "$base/api/notebook/notes?limit=1" -Timeout $TimeoutSec
$notebookMirror = Invoke-Json -Url "$base/api/notebook/google/mirror/status?limit=60" -Timeout $TimeoutSec

$googleStatusResp = Invoke-Json -Url "$base/api/integrations/google/status" -Timeout $TimeoutSec
$googleStatus = $googleStatusResp.status
$accounts = @($googleStatus.connectedAccounts | ForEach-Object { [string]$_.email } | Where-Object { $_ })

$enterpriseStatusQueued = Invoke-Json -Url "$base/api/integrations/notebooklm/enterprise/status" -Timeout $TimeoutSec
$enterpriseStatusJob = Wait-JobResult -Base $base -JobId ([string]$enterpriseStatusQueued.job.id) -Timeout $TimeoutSec

$enterpriseDefaultQueued = Invoke-Json -Url "$base/api/integrations/notebooklm/enterprise/notebooks?limit=50" -Timeout $TimeoutSec
$enterpriseDefaultJob = Wait-JobResult -Base $base -JobId ([string]$enterpriseDefaultQueued.job.id) -Timeout $TimeoutSec

$enterpriseByAccount = @()
foreach ($account in $accounts) {
  $queued = Invoke-Json -Url ("$base/api/integrations/notebooklm/enterprise/notebooks?limit=20&account=" + [uri]::EscapeDataString($account)) -Timeout $TimeoutSec
  $job = Wait-JobResult -Base $base -JobId ([string]$queued.job.id) -Timeout $TimeoutSec
  $titles = @()
  if ($job.result -and $job.result.notebooks) {
    $titles = @($job.result.notebooks | ForEach-Object { [string]$_.title })
  }
  $enterpriseByAccount += [pscustomobject]@{
    account = $account
    status = [string]$job.status
    error = [string]$job.error
    notebookCount = $titles.Count
    notebookTitles = $titles
  }
}

$summary = [pscustomobject]@{
  runtime = [pscustomobject]@{
    selectedChannel = [string]$health.connectionRouting.selected.channel
    selectedReason = [string]$health.connectionRouting.selected.reason
    remoteBaseUrl = [string]$health.connectionRouting.remoteBaseUrl
  }
  tasks = [pscustomobject]@{
    total = [int]$tasksAll.count
    activeExcludingArchived = [int]$tasksActive.count
    openByInboxRules = $openRows.Count
    openInTop240Window = $openTop240.Count
    openOmittedBy240Window = $openOmittedBy240.Count
    statusCounts = $statusCounts
  }
  mobileInbox = [pscustomobject]@{
    defaultSummary = $inboxDefault.inbox.summary
    maxSummary = $inboxMax.inbox.summary
  }
  notebook = [pscustomobject]@{
    totalNotes = [int]$notebookNotes.notebook.totalNotes
    mirrorAccounts = @($notebookMirror.mirror.docsByAccount.PSObject.Properties | ForEach-Object { $_.Name })
  }
  notebooklmEnterprise = [pscustomobject]@{
    statusReady = [bool]$enterpriseStatusJob.result.enterpriseReady
    statusProject = [string]$enterpriseStatusJob.result.project
    statusLocation = [string]$enterpriseStatusJob.result.location
    defaultNotebooks = @($enterpriseDefaultJob.result.notebooks | ForEach-Object { [string]$_.title })
    byAccount = $enterpriseByAccount
  }
}

$omittedOpenDetail = @($openOmittedBy240 | Sort-Object updatedAt -Descending | Select-Object id, status, priority, source, projectScope, updatedAt, title)

$report = [pscustomobject]@{
  ok = $true
  generatedAt = (Get-Date).ToString("o")
  summary = $summary
  details = [pscustomobject]@{
    mobileSettings = $mobileSettings.settings
    openOmittedBy240Window = $omittedOpenDetail
    mobileInboxDefaultIds = [pscustomobject]@{
      tasks = @($inboxDefault.inbox.tasks | ForEach-Object { $_.id })
      approvals = @($inboxDefault.inbox.approvals | ForEach-Object { $_.id })
      notes = @($inboxDefault.inbox.notes | ForEach-Object { $_.id })
    }
    mobileInboxMaxIds = [pscustomobject]@{
      tasks = @($inboxMax.inbox.tasks | ForEach-Object { $_.id })
      approvals = @($inboxMax.inbox.approvals | ForEach-Object { $_.id })
      notes = @($inboxMax.inbox.notes | ForEach-Object { $_.id })
    }
  }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $OutDir ("cross-surface-audit-{0}.json" -f $stamp)
$mdPath = Join-Path $OutDir ("cross-surface-audit-{0}.md" -f $stamp)
$jsonLatest = Join-Path $OutDir "cross-surface-audit-latest.json"
$mdLatest = Join-Path $OutDir "cross-surface-audit-latest.md"

$report | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
Copy-Item -LiteralPath $jsonPath -Destination $jsonLatest -Force

$md = @()
$md += "# Asolaria Cross-Surface Audit"
$md += ""
$md += "- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
$md += "- Base URL: $base"
$md += ""
$md += "## Runtime"
$md += ""
$md += "- Selected channel: $($summary.runtime.selectedChannel)"
$md += "- Selected reason: $($summary.runtime.selectedReason)"
$md += "- Remote base URL: $($summary.runtime.remoteBaseUrl)"
$md += ""
$md += "## Tasks"
$md += ""
$md += "- Total tasks: $($summary.tasks.total)"
$md += "- Active (not archived): $($summary.tasks.activeExcludingArchived)"
$md += "- Open by inbox rules: $($summary.tasks.openByInboxRules)"
$md += "- Open within top-240 window: $($summary.tasks.openInTop240Window)"
$md += "- Open omitted by top-240 window: $($summary.tasks.openOmittedBy240Window)"
$md += ""
$md += "## Mobile Inbox"
$md += ""
$md += "- Default: activeTasks=$($summary.mobileInbox.defaultSummary.activeTasks), visibleTasks=$($summary.mobileInbox.defaultSummary.visibleTasks), hiddenTaskDuplicates=$($summary.mobileInbox.defaultSummary.hiddenTaskDuplicates)"
$md += "- Max: activeTasks=$($summary.mobileInbox.maxSummary.activeTasks), visibleTasks=$($summary.mobileInbox.maxSummary.visibleTasks), hiddenTaskDuplicates=$($summary.mobileInbox.maxSummary.hiddenTaskDuplicates)"
$md += ""
$md += "## Notebook + Mirror"
$md += ""
$md += "- Notebook notes total: $($summary.notebook.totalNotes)"
$md += "- Mirror accounts: $((@($summary.notebook.mirrorAccounts) -join ', '))"
$md += ""
$md += "## NotebookLM Enterprise"
$md += ""
$md += "- Ready: $($summary.notebooklmEnterprise.statusReady)"
$md += "- Project/location: $($summary.notebooklmEnterprise.statusProject) / $($summary.notebooklmEnterprise.statusLocation)"
$md += "- Default (no account) notebooks: $((@($summary.notebooklmEnterprise.defaultNotebooks) -join ', '))"
$md += ""
$md += "Per-account enterprise list:"
foreach ($row in @($summary.notebooklmEnterprise.byAccount)) {
  $titles = @($row.notebookTitles) -join ", "
  $rowError = [string]$row.error
  $errorText = if ($rowError) { " | error=$rowError" } else { "" }
  $md += "- $($row.account): status=$($row.status), notebookCount=$($row.notebookCount), notebooks=$titles$errorText"
}

($md -join [Environment]::NewLine) | Set-Content -LiteralPath $mdPath -Encoding UTF8
Copy-Item -LiteralPath $mdPath -Destination $mdLatest -Force

[pscustomobject]@{
  ok = $true
  jsonPath = $jsonPath
  mdPath = $mdPath
  jsonLatest = $jsonLatest
  mdLatest = $mdLatest
  summary = $summary
} | ConvertTo-Json -Depth 12
