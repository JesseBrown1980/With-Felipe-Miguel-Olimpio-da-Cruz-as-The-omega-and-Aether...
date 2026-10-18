[CmdletBinding()]
param(
  [int]$IntervalSec = 60,
  [string]$DataDir = 'C:\HyperBEHCS\data\self-reflect',
  [string]$DashboardUri = 'http://127.0.0.1:4949'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$AnchorPid = 'ASOLARIA-SELF-REFLECT-SUPERVISOR-PID-2026-05-22'
$HbpPath = Join-Path $DataDir 'reflect-tick.hbp'
$HbiPath = Join-Path $DataDir 'reflect-tick.hbi'
$ShaPath = Join-Path $DataDir 'reflect-tick.sha256'
$PidPath = Join-Path $DataDir 'reflect-tick.daemon.pid'

if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }

# Continue the sha-chain — read last row_hash from existing .hbp
function Get-LastRowHash {
  if (-not (Test-Path $HbpPath)) { return '0000000000000000' }
  $lastLine = Get-Content $HbpPath -Tail 1 -ErrorAction SilentlyContinue
  if (-not $lastLine) { return '0000000000000000' }
  if ($lastLine -match 'row_hash=([a-f0-9]{16})') { return $Matches[1] }
  return '0000000000000000'
}

function Get-LastTick {
  if (-not (Test-Path $HbpPath)) { return 0 }
  $tail = Get-Content $HbpPath -Tail 4 -ErrorAction SilentlyContinue
  $maxTick = 0
  foreach ($line in $tail) {
    if ($line -match 'tick=(\d+)') { if ([int]$Matches[1] -gt $maxTick) { $maxTick = [int]$Matches[1] } }
  }
  return $maxTick
}

function Sha16 {
  param([string]$Text)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $hash = $sha.ComputeHash($bytes)
  $sha.Dispose()
  ($hash | ForEach-Object { $_.ToString('x2') }) -join '' | ForEach-Object { $_.Substring(0,16) }
}

function Emit-Row {
  param([hashtable]$Fields, [string]$Antecedent)
  $ts = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
  $orderedFields = @()
  foreach ($k in $Fields.Keys) { $orderedFields += "$k=$($Fields[$k])" }
  $orderedFields += "anchor_pid=$AnchorPid"
  $orderedFields += "antecedents=$Antecedent"
  $orderedFields += "ts=$ts"
  $orderedFields += "json=0"
  $orderedFields += "runtime=0"
  $orderedFields += "promote=0"
  $rowPrefix = 'HBPv1|' + ($orderedFields -join '|')
  $rowHash = Sha16 -Text $rowPrefix
  $fullRow = "$rowPrefix|row_hash=$rowHash"
  Add-Content -Path $HbpPath -Value $fullRow -Encoding UTF8
  Add-Content -Path $HbiPath -Value $fullRow -Encoding UTF8
  return $rowHash
}

function Probe-Gpu {
  try {
    $devices = Get-PnpDevice -Class Display -Status OK -ErrorAction SilentlyContinue
    $names = ($devices | ForEach-Object { $_.FriendlyName }) -join ','
    return @{ count = $devices.Count; names = $names }
  } catch {
    return @{ count = 0; names = "probe-error:$($_.Exception.Message.Substring(0,[Math]::Min(60,$_.Exception.Message.Length)))" }
  }
}

function Probe-DashboardHealth {
  try {
    $h = Invoke-RestMethod -Uri "$DashboardUri/health" -TimeoutSec 5 -ErrorAction Stop
    return @{ ok = $h.ok; uptime_s = $h.uptime_s; apex = $h.apex }
  } catch {
    return @{ ok = $false; uptime_s = 0; apex = 'unreachable' }
  }
}

function Probe-Daemons {
  try {
    $d = Invoke-RestMethod -Uri "$DashboardUri/api/daemons" -TimeoutSec 5 -ErrorAction Stop
    $total = 0; $running = 0; $ready = 0; $disabled = 0
    if ($d.daemons) {
      $total = $d.daemons.Count
      foreach ($entry in $d.daemons) {
        $state = ''
        try { $state = "$($entry.state)".ToLower() } catch {}
        if ($state -match 'running|live|up') { $running++ }
        elseif ($state -match 'disabled|off') { $disabled++ }
        else { $ready++ }
      }
    }
    return @{ total = $total; running = $running; ready = $ready; disabled = $disabled }
  } catch {
    return @{ total = 0; running = 0; ready = 0; disabled = 0 }
  }
}

# Record daemon PID for stop/status
$PID | Out-File -FilePath $PidPath -Encoding ASCII -Force

$prevHash = Get-LastRowHash
$tick = (Get-LastTick) + 1

Write-Host "[asolaria-self-reflect-daemon] starting at tick=$tick, prev_hash=$prevHash, anchor_pid=$AnchorPid"

while ($true) {
  $tickStartTs = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')

  # Probe 1: GPU ground truth
  $gpu = Probe-Gpu
  $prevHash = Emit-Row -Fields ([ordered]@{
    'probe' = 'Get-PnpDevice-Class-Display'
    'gpu_count' = $gpu.count
    'canon_v2_says' = '2-NVIDIA-11.9-and-Intel-7.9-combined-19.8'
    'gpu_names' = $gpu.names
    'tick' = $tick
    'match' = if ($gpu.count -eq 2) { 'truth-aligns-with-v2-canon' } else { 'truth-divergent' }
    'layer' = 'lie-check-gpu-ground-truth'
  }) -Antecedent $prevHash

  # Probe 2: Dashboard health
  $health = Probe-DashboardHealth
  $prevHash = Emit-Row -Fields ([ordered]@{
    'probe' = 'GET-127.0.0.1-4949-health'
    'uptime_s' = $health.uptime_s
    'ok' = $health.ok
    'tick' = $tick
    'apex' = $health.apex
    'layer' = 'lie-check-dashboard-health'
  }) -Antecedent $prevHash

  # Probe 3: Daemon/supervisor state
  $d = Probe-Daemons
  $prevHash = Emit-Row -Fields ([ordered]@{
    'total_asolaria_tasks' = $d.total
    'running' = $d.running
    'tick' = $tick
    'ready' = $d.ready
    'disabled' = $d.disabled
    'layer' = 'lie-check-supervisor-state'
    'self_reflect_running' = 'true-this-is-me'
  }) -Antecedent $prevHash

  # Probe 4: tick summary
  $prevHash = Emit-Row -Fields ([ordered]@{
    'layer' = 'tick-summary'
    'interval_sec' = $IntervalSec
    'tick' = $tick
    'ts' = $tickStartTs
  }) -Antecedent $prevHash

  # Update sha256 sidecar to current .hbp file hash
  try {
    $fileHash = (Get-FileHash -Path $HbpPath -Algorithm SHA256).Hash.ToLower()
    "$fileHash  reflect-tick.hbp" | Out-File -FilePath $ShaPath -Encoding ASCII -Force
  } catch {}

  $tick++
  Start-Sleep -Seconds $IntervalSec
}
