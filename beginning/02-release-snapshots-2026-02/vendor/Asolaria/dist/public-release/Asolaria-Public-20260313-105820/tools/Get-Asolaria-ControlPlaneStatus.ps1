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

function Read-GatewayConfig([string]$RepoRootPath) {
  $configPath = Join-Path $RepoRootPath "config\asolaria.gateway.json"
  if (-not (Test-Path -LiteralPath $configPath)) {
    return $null
  }
  try {
    return (Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Normalize-BaseUrl([string]$Value) {
  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return ""
  }
  return $text.Trim().TrimEnd("/")
}

function Select-AppSummary($data) {
  if (-not $data) { return $null }
  $uptime = 0
  $rawUptime = Get-FieldValue -obj $data -name "uptimeSeconds"
  if ($null -ne $rawUptime) {
    try { $uptime = [int][double]$rawUptime } catch { $uptime = 0 }
  }
  $queue = Get-FieldValue -obj $data -name "queue"
  $taskLedger = Get-FieldValue -obj $data -name "taskLedger"
  return [ordered]@{
    ok = [bool](Get-FieldValue -obj $data -name "ok")
    app = [string](Get-FieldValue -obj $data -name "app")
    uptimeSeconds = $uptime
    queue = [ordered]@{
      queued = [int](Get-FieldValue -obj $queue -name "queued")
      running = [int](Get-FieldValue -obj $queue -name "running")
      total = [int](Get-FieldValue -obj $queue -name "total")
    }
    taskLedger = [ordered]@{
      totalTasks = [int](Get-FieldValue -obj $taskLedger -name "totalTasks")
      openTasks = [int](Get-FieldValue -obj $taskLedger -name "openTasks")
      activeTasks = [int](Get-FieldValue -obj $taskLedger -name "activeTasks")
    }
    nodeVersion = [string](Get-FieldValue -obj $data -name "nodeVersion")
  }
}

function Select-ServiceSummary($data) {
  if (-not $data) { return $null }
  $authority = Get-FieldValue -obj $data -name "authority"
  $approvals = Get-FieldValue -obj $authority -name "approvals"
  $counts = Get-FieldValue -obj $approvals -name "counts"
  $readiness = Get-FieldValue -obj $authority -name "readiness"
  $audit = Get-FieldValue -obj $data -name "audit"
  $integrity = Get-FieldValue -obj $audit -name "integrity"
  $summary = [ordered]@{
    ok = [bool](Get-FieldValue -obj $data -name "ok")
    service = [string](Get-FieldValue -obj $data -name "service")
  }
  $port = Get-FieldValue -obj $data -name "port"
  $noNetworkDefault = Get-FieldValue -obj $data -name "noNetworkDefault"
  $heartbeat = Get-FieldValue -obj $data -name "heartbeat"
  if ($null -ne $port) { $summary.port = [int]$port }
  if ($null -ne $noNetworkDefault) { $summary.noNetworkDefault = [bool]$noNetworkDefault }
  if ($null -ne $heartbeat) { $summary.heartbeat = $heartbeat }
  if ($null -ne $authority -and $null -ne $approvals) {
    $summary.authority = [ordered]@{
      mode = [string](Get-FieldValue -obj $authority -name "mode")
      modeUpdatedAt = [string](Get-FieldValue -obj $authority -name "modeUpdatedAt")
      modeUpdatedBy = [string](Get-FieldValue -obj $authority -name "modeUpdatedBy")
      pendingTransitions = [int](Get-FieldValue -obj $authority -name "pendingTransitions")
      approvalTotal = [int](Get-FieldValue -obj $approvals -name "total")
      pending = [int](Get-FieldValue -obj $counts -name "pending")
      approved = [int](Get-FieldValue -obj $counts -name "approved")
      denied = [int](Get-FieldValue -obj $counts -name "denied")
      expired = [int](Get-FieldValue -obj $counts -name "expired")
      used = [int](Get-FieldValue -obj $counts -name "used")
      readinessOk = [bool](Get-FieldValue -obj $readiness -name "ok")
      readinessTargetMode = [string](Get-FieldValue -obj $readiness -name "targetMode")
      readinessBlockingReasons = (Get-FieldValue -obj $readiness -name "blockingReasons")
    }
  }
  if ($null -ne $audit) {
    $summary.audit = [ordered]@{
      enabled = [bool](Get-FieldValue -obj $audit -name "enabled")
      totalEvents = [int](Get-FieldValue -obj $audit -name "totalEvents")
      lastHash = [string](Get-FieldValue -obj $audit -name "lastHash")
      lastEventAt = [string](Get-FieldValue -obj $audit -name "lastEventAt")
      gateLocked = [bool](Get-FieldValue -obj $audit -name "gateLocked")
      gateReason = [string](Get-FieldValue -obj $audit -name "gateReason")
      integrityOk = [bool](Get-FieldValue -obj $integrity -name "ok")
      integrityCheckedAt = [string](Get-FieldValue -obj $integrity -name "checkedAt")
      integrityErrors = [int](Get-FieldValue -obj $integrity -name "errorCount")
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

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$gatewayConfig = Read-GatewayConfig -RepoRootPath $repoRoot
$sandboxConfig = Get-FieldValue -obj $gatewayConfig -name "sandbox"
$memoryConfig = Get-FieldValue -obj $gatewayConfig -name "memory"
$sandboxBaseUrl = Normalize-BaseUrl -Value ([string](Get-FieldValue -obj $sandboxConfig -name "baseUrl"))
$memoryBaseUrl = Normalize-BaseUrl -Value ([string](Get-FieldValue -obj $memoryConfig -name "indexerUrl"))

$app = Probe-Json -Url ("http://127.0.0.1:{0}/api/health" -f $AppPort)
$gateway = Probe-Json -Url "http://127.0.0.1:4791/health"
$sandbox = if ($sandboxBaseUrl) {
  Probe-Json -Url ($sandboxBaseUrl + "/health")
} else {
  [ordered]@{
    url = ""
    ok = $true
    skipped = $true
    error = "sandbox_baseUrl_not_configured"
  }
}
$memory = if ($memoryBaseUrl) {
  Probe-Json -Url ($memoryBaseUrl + "/health")
} else {
  [ordered]@{
    url = ""
    ok = $true
    skipped = $true
    error = "memory_indexerUrl_not_configured"
  }
}

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
    skipped = [bool](Get-FieldValue -obj $sandbox -name "skipped")
    error = Get-FieldString -obj $sandbox -name "error"
    summary = Select-ServiceSummary -data (Get-FieldValue -obj $sandbox -name "data")
  }
  memory = [ordered]@{
    url = $memory.url
    ok = [bool]$memory.ok
    skipped = [bool](Get-FieldValue -obj $memory -name "skipped")
    error = Get-FieldString -obj $memory -name "error"
    summary = Select-ServiceSummary -data (Get-FieldValue -obj $memory -name "data")
  }
} | ConvertTo-Json -Depth 10
