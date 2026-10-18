param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$Account = "plasmatoid@gmail.com",
  [string]$Project = "winged-complex-390417",
  [string]$Location = "global",
  [string]$NotebookTitle = "Asolaria Enterprise Memory",
  [int]$IntervalSec = 60,
  [int]$MaxHours = 8
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Json {
  param(
    [Parameter(Mandatory = $true)][ValidateSet("GET","POST")] [string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [object]$Body = $null
  )
  if ($Method -eq "GET") {
    return Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec 25
  }
  $json = if ($null -eq $Body) { "{}" } else { $Body | ConvertTo-Json -Depth 12 }
  return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $json -TimeoutSec 25
}

function Wait-JobResult {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$JobId,
    [int]$TimeoutSec = 60
  )
  $deadline = (Get-Date).AddSeconds([Math]::Max(10, $TimeoutSec))
  while ((Get-Date) -lt $deadline) {
    $row = Invoke-Json -Method GET -Url "$Base/api/jobs/$JobId"
    $status = [string]$row.job.status
    if ($status -ne "queued" -and $status -ne "running") {
      return $row.job
    }
    Start-Sleep -Milliseconds 500
  }
  throw "Timed out waiting for job $JobId"
}

function New-CheckpointNote {
  param(
    [string]$Base,
    [string]$Title,
    [string]$Text,
    [string[]]$Tags
  )
  $payload = @{
    title = $Title
    text = $Text
    tags = $Tags
    pinned = $true
    sensitive = $true
  }
  try {
    return Invoke-Json -Method POST -Url "$Base/api/notebook/notes" -Body $payload
  } catch {
    return $null
  }
}

function Sync-NotebookMirror {
  param(
    [string]$Base,
    [string]$Email
  )
  try {
    $queued = Invoke-Json -Method POST -Url "$Base/api/notebook/google/mirror/sync" -Body @{
      account = $Email
      includeSensitive = $true
      limit = 200
    }
    return Wait-JobResult -Base $Base -JobId ([string]$queued.job.id) -TimeoutSec 120
  } catch {
    return $null
  }
}

$base = $BaseUrl.TrimEnd("/")
$encodedAccount = [uri]::EscapeDataString($Account)
$interval = [Math]::Max(20, $IntervalSec)
$deadline = (Get-Date).AddHours([Math]::Max(1, $MaxHours))

Write-Output ("NotebookLM upgrade loop started at {0}" -f (Get-Date).ToString("o"))
Write-Output ("Target account={0} project={1} location={2}" -f $Account, $Project, $Location)

while ((Get-Date) -lt $deadline) {
  try {
    $statusQueued = Invoke-Json -Method GET -Url "$base/api/integrations/notebooklm/enterprise/status?account=$encodedAccount&project=$Project&location=$Location"
    $statusJob = Wait-JobResult -Base $base -JobId ([string]$statusQueued.job.id)
    $status = $statusJob.result
    $ready = [bool]$status.enterpriseReady
    $access = [bool]$status.access
    $apiEnabled = [bool]$status.apiEnabled
    $tier = [string]$status.requiredSubscriptionTier
    $blockers = @()
    if ($status.blockers -is [System.Collections.IEnumerable]) {
      foreach ($row in $status.blockers) {
        $text = [string]$row
        if ($text) { $blockers += $text }
      }
    }

    [pscustomobject]@{
      timestamp = (Get-Date).ToString("o")
      enterpriseReady = $ready
      access = $access
      apiEnabled = $apiEnabled
      requiredSubscriptionTier = $tier
      blockers = $blockers
    } | ConvertTo-Json -Depth 6 | Write-Output

    if (-not $ready) {
      Start-Sleep -Seconds $interval
      continue
    }

    $listQueued = Invoke-Json -Method GET -Url "$base/api/integrations/notebooklm/enterprise/notebooks?account=$encodedAccount&project=$Project&location=$Location&limit=20"
    $listJob = Wait-JobResult -Base $base -JobId ([string]$listQueued.job.id)
    if ([string]$listJob.status -ne "completed") {
      throw ("Notebook list probe failed: " + [string]$listJob.error)
    }
    $listResult = $listJob.result
    $notebooks = @()
    if ($listResult.notebooks -is [System.Collections.IEnumerable]) {
      foreach ($nb in $listResult.notebooks) { $notebooks += $nb }
    }

    $createdNotebook = $null
    if ($notebooks.Count -lt 1) {
      $createQueued = Invoke-Json -Method POST -Url "$base/api/integrations/notebooklm/enterprise/notebooks" -Body @{
        account = $Account
        project = $Project
        location = $Location
        title = $NotebookTitle
      }
      $createJob = Wait-JobResult -Base $base -JobId ([string]$createQueued.job.id)
      if ([string]$createJob.status -eq "completed") {
        $createdNotebook = $createJob.result.notebook
      } else {
        throw ("Notebook create failed: " + [string]$createJob.error)
      }
    }

    $createdNotebookName = "none"
    if ($createdNotebook) {
      $createdNotebookName = [string]$createdNotebook.name
    }

    $summaryText = @(
      ("Date (UTC): {0}" -f ([DateTime]::UtcNow.ToString("yyyy-MM-dd HH:mm:ss 'UTC'")))
      "NotebookLM Enterprise upgrade loop reached ready state."
      ("Account: {0}" -f $Account)
      ("Project: {0}" -f $Project)
      ("Location: {0}" -f $Location)
      ("Existing notebooks: {0}" -f $notebooks.Count)
      ("Created notebook: {0}" -f $createdNotebookName)
    ) -join [Environment]::NewLine

    $note = New-CheckpointNote -Base $base -Title "NotebookLM Enterprise Upgrade Loop Completed" -Text $summaryText -Tags @("notebooklm","enterprise","upgrade","automation")
    $mirrorJob = Sync-NotebookMirror -Base $base -Email $Account

    $noteId = ""
    if ($note -and $note.note) {
      $noteId = [string]$note.note.id
    }
    $mirrorSyncStatus = "not_run"
    $mirrorSyncError = ""
    if ($mirrorJob) {
      $mirrorSyncStatus = [string]$mirrorJob.status
      $mirrorSyncError = [string]$mirrorJob.error
    }

    [pscustomobject]@{
      completed = $true
      timestamp = (Get-Date).ToString("o")
      account = $Account
      project = $Project
      location = $Location
      existingNotebookCount = $notebooks.Count
      createdNotebook = $createdNotebook
      noteId = $noteId
      mirrorSyncStatus = $mirrorSyncStatus
      mirrorSyncError = $mirrorSyncError
    } | ConvertTo-Json -Depth 10 | Write-Output
    exit 0
  } catch {
    [pscustomobject]@{
      timestamp = (Get-Date).ToString("o")
      error = $_.Exception.Message
    } | ConvertTo-Json -Compress | Write-Output
    Start-Sleep -Seconds $interval
  }
}

Write-Output "NotebookLM upgrade loop timed out before completion."
exit 2
