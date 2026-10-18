param(
  [int]$AppPort = 4781
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Probe-Json([string]$Url) {
  try {
    $result = Invoke-RestMethod -Uri $Url -TimeoutSec 3
    return [ordered]@{
      url = $Url
      ok = $true
      data = $result
    }
  } catch {
    return [ordered]@{
      url = $Url
      ok = $false
      error = $_.Exception.Message
    }
  }
}

function Select-AppSummary($data) {
  if (-not $data) { return $null }
  $uptime = 0
  if ($null -ne $data.uptimeSeconds) {
    try { $uptime = [int][double]$data.uptimeSeconds } catch { $uptime = 0 }
  }
  return [ordered]@{
    ok = [bool]$data.ok
    app = [string]$data.app
    uptimeSeconds = $uptime
    queue = [ordered]@{
      queued = [int]$data.queue.queued
      running = [int]$data.queue.running
      total = [int]$data.queue.total
    }
    taskLedger = [ordered]@{
      totalTasks = [int]$data.taskLedger.totalTasks
      openTasks = [int]$data.taskLedger.openTasks
      activeTasks = [int]$data.taskLedger.activeTasks
    }
    nodeVersion = [string]$data.nodeVersion
  }
}

function Select-ServiceSummary($data) {
  if (-not $data) { return $null }
  $summary = [ordered]@{
    ok = [bool]$data.ok
    service = [string]$data.service
  }
  if ($null -ne $data.port) { $summary.port = [int]$data.port }
  if ($null -ne $data.noNetworkDefault) { $summary.noNetworkDefault = [bool]$data.noNetworkDefault }
  if ($null -ne $data.heartbeat) { $summary.heartbeat = $data.heartbeat }
  if ($null -ne $data.authority -and $null -ne $data.authority.approvals) {
    $summary.authority = [ordered]@{
      mode = [string]$data.authority.mode
      modeUpdatedAt = [string]$data.authority.modeUpdatedAt
      modeUpdatedBy = [string]$data.authority.modeUpdatedBy
      pendingTransitions = [int]$data.authority.pendingTransitions
      approvalTotal = [int]$data.authority.approvals.total
      pending = [int]$data.authority.approvals.counts.pending
      approved = [int]$data.authority.approvals.counts.approved
      denied = [int]$data.authority.approvals.counts.denied
      expired = [int]$data.authority.approvals.counts.expired
      used = [int]$data.authority.approvals.counts.used
    }
  }
  return $summary
}

function Get-FieldString($obj, [string]$name) {
  if ($null -eq $obj) { return "" }
  if ($obj -is [System.Collections.IDictionary]) {
    if ($obj.Contains($name)) {
      return [string]$obj[$name]
    }
    return ""
  }
  if ($obj.PSObject.Properties.Name -contains $name) {
    return [string]$obj.$name
  }
  return ""
}

function Get-FieldValue($obj, [string]$name) {
  if ($null -eq $obj) { return $null }
  if ($obj -is [System.Collections.IDictionary]) {
    if ($obj.Contains($name)) {
      return $obj[$name]
    }
    return $null
  }
  if ($obj.PSObject.Properties.Name -contains $name) {
    return $obj.$name
  }
  return $null
}

$app = Probe-Json -Url ("http://127.0.0.1:{0}/api/health" -f $AppPort)
$gateway = Probe-Json -Url "http://127.0.0.1:4791/health"
$sandbox = Probe-Json -Url "http://127.0.0.1:5443/health"

[ordered]@{
  timestamp = (Get-Date).ToString("o")
  app = [ordered]@{
    url = $app.url
    ok = [bool]$app.ok
    error = Get-FieldString -obj $app -name "error"
    summary = Select-AppSummary -data (Get-FieldValue -obj $app -name "data")
  }
  gateway = [ordered]@{
    url = $gateway.url
    ok = [bool]$gateway.ok
    error = Get-FieldString -obj $gateway -name "error"
    summary = Select-ServiceSummary -data (Get-FieldValue -obj $gateway -name "data")
  }
  sandbox = [ordered]@{
    url = $sandbox.url
    ok = [bool]$sandbox.ok
    error = Get-FieldString -obj $sandbox -name "error"
    summary = Select-ServiceSummary -data (Get-FieldValue -obj $sandbox -name "data")
  }
} | ConvertTo-Json -Depth 10
