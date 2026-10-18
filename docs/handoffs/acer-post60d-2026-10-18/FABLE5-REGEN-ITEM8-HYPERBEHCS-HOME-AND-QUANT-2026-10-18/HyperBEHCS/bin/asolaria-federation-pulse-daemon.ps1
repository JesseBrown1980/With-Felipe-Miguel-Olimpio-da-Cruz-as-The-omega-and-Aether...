[CmdletBinding()]
param(
  [int]$IntervalSec = 60,
  [string]$DataDir = 'C:\HyperBEHCS\data\federation-pulse',
  [string]$DashboardUri = 'http://127.0.0.1:4949',
  [string]$VoteQuorumUri = 'http://127.0.0.1:4952'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$AnchorPid = 'ASOLARIA-FEDERATION-PULSE-DAEMON-PID-2026-05-23'
$LawAnchor = 'ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23'
$HbpPath = Join-Path $DataDir 'pulse-tick.hbp'
$ShaPath = Join-Path $DataDir 'pulse-tick.sha256'
$PidPath = Join-Path $DataDir 'pulse-daemon.pid'
$CosignPath = 'C:\asolaria-acer\COSIGN_CHAIN.ndjson'
$WhiteroomDir = 'C:\HyperBEHCS\store\whiteroom-mints'
$WhiteroomProcessedDir = 'C:\HyperBEHCS\store\whiteroom-mints-processed'
$DrainReceiptsDir = 'C:\HyperBEHCS\store\gnn-drain-receipts'
$DrainProcessedDir = 'C:\HyperBEHCS\store\gnn-drain-receipts-processed'
$CumulativeCountersPath = Join-Path $DataDir 'cumulative-counters.json'

if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }

function Sha16 {
  param([string]$Text)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $hash = $sha.ComputeHash($bytes); $sha.Dispose()
  ($hash | ForEach-Object { $_.ToString('x2') }) -join '' | ForEach-Object { $_.Substring(0,16) }
}

function Get-LastRowHash {
  if (-not (Test-Path $HbpPath)) { return '0000000000000000' }
  $tail = Get-Content $HbpPath -Tail 1 -ErrorAction SilentlyContinue
  if (-not $tail) { return '0000000000000000' }
  if ($tail -match 'row_hash=([a-f0-9]{16})') { return $Matches[1] }
  return '0000000000000000'
}

function Get-LastTick {
  if (-not (Test-Path $HbpPath)) { return 0 }
  $tail = Get-Content $HbpPath -Tail 1 -ErrorAction SilentlyContinue
  if ($tail -and ($tail -match 'tick=(\d+)')) { return [int]$Matches[1] }
  return 0
}

function Probe-VoteQueueDepth {
  try {
    $h = Invoke-RestMethod -Uri "$VoteQuorumUri/health" -TimeoutSec 3 -ErrorAction Stop
    return @{ ok = $h.ok; pending = $h.pending_count }
  } catch { return @{ ok = $false; pending = 0 } }
}

function Probe-DashboardHealth {
  try {
    $h = Invoke-RestMethod -Uri "$DashboardUri/health" -TimeoutSec 3 -ErrorAction Stop
    return @{ ok = $h.ok; uptime_s = $h.uptime_s }
  } catch { return @{ ok = $false; uptime_s = 0 } }
}

function Count-Files {
  param([string]$Dir, [int]$MaxAgeSec = 0)
  if (-not (Test-Path $Dir)) { return @{ total = 0; recent = 0 } }
  $files = Get-ChildItem -Path $Dir -File -Recurse -ErrorAction SilentlyContinue
  $total = ($files | Measure-Object).Count
  $recent = 0
  if ($MaxAgeSec -gt 0 -and $total -gt 0) {
    $threshold = (Get-Date).AddSeconds(-$MaxAgeSec)
    $recent = ($files | Where-Object { $_.LastWriteTime -gt $threshold } | Measure-Object).Count
  }
  return @{ total = $total; recent = $recent }
}

function Probe-CosignHead {
  if (-not (Test-Path $CosignPath)) { return @{ ok = $false; seq = 0 } }
  $tail = Get-Content $CosignPath -Tail 1 -ErrorAction SilentlyContinue
  if (-not $tail) { return @{ ok = $false; seq = 0 } }
  try {
    $row = $tail | ConvertFrom-Json
    return @{ ok = $true; seq = $row.seq; anchor = $row.anchor_pid }
  } catch { return @{ ok = $false; seq = 0 } }
}

# Added 2026-05-23 per V42-B1 finding (Wave-306 spec #6, orch-B):
# `*_in_dir_now` is 60s-rolling; this function returns CUMULATIVE-SINCE-BOOT-OF-DAEMON
# by summing in-dir + processed-dir counts. The processed dirs are append-only by their
# respective drains, so total = pending + completed is a stable monotonic counter.
function Count-Cumulative {
  param([string]$LiveDir, [string]$ProcessedDir)
  $live = 0; $done = 0
  if (Test-Path $LiveDir) {
    $live = (Get-ChildItem -Path $LiveDir -File -ErrorAction SilentlyContinue | Measure-Object).Count
  }
  if (Test-Path $ProcessedDir) {
    $done = (Get-ChildItem -Path $ProcessedDir -File -ErrorAction SilentlyContinue | Measure-Object).Count
  }
  return ($live + $done)
}

# Cosign vote-outcomes cumulative — counts cosign chain rows whose class indicates a vote
# resolution (vote/ratify/quorum/cosign). The chain is append-only NDJSON so total rows up
# to and including such-classes are a strictly monotonic outcome counter.
function Count-VoteOutcomesCumulative {
  if (-not (Test-Path $CosignPath)) { return 0 }
  try {
    $rows = Get-Content $CosignPath -ErrorAction SilentlyContinue
    $count = 0
    foreach ($r in $rows) {
      if ($r -match '"class"\s*:\s*"([^"]+)"') {
        $cls = $Matches[1].ToLower()
        if ($cls -match '(vote|ratif|quorum|cosign|memory_write|apex)') { $count++ }
      }
    }
    return $count
  } catch { return 0 }
}

function Write-CumulativeCounters {
  param([hashtable]$Counters)
  try {
    $obj = [pscustomobject]@{
      schema_version = 'v1'
      anchor_pid = $AnchorPid
      law_anchor = $LawAnchor
      generated_ts = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
      tick = $Counters['tick']
      whiteroom_cumulative = $Counters['whiteroom_cumulative']
      drain_cumulative = $Counters['drain_cumulative']
      vote_outcomes_cumulative = $Counters['vote_outcomes_cumulative']
      source_paths = @{
        whiteroom_live = $WhiteroomDir
        whiteroom_processed = $WhiteroomProcessedDir
        drain_live = $DrainReceiptsDir
        drain_processed = $DrainProcessedDir
        cosign_chain = $CosignPath
      }
      origin_finding = 'V42-B1 cumulative-vs-rolling honesty fix'
      orch_pid = 'AGT-helm-claude-orch-B-H02E1-V43-WAVE306-P00-NORCHB001'
    }
    $json = $obj | ConvertTo-Json -Depth 5
    # atomic write to avoid readers seeing partial JSON
    $tmpPath = "$CumulativeCountersPath.tmp"
    Set-Content -Path $tmpPath -Value $json -Encoding UTF8 -Force
    Move-Item -Path $tmpPath -Destination $CumulativeCountersPath -Force
  } catch {
    Write-Host "[pulse-daemon] Write-CumulativeCounters failed: $($_.Exception.Message)"
  }
}

function Emit-Row {
  param([hashtable]$Fields, [string]$Antecedent)
  $ts = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
  $orderedFields = @()
  foreach ($k in $Fields.Keys) { $orderedFields += "$k=$($Fields[$k])" }
  $orderedFields += "anchor_pid=$AnchorPid"
  $orderedFields += "law_anchor=$LawAnchor"
  $orderedFields += "antecedents=$Antecedent"
  $orderedFields += "ts=$ts"
  $orderedFields += "json=0"
  $orderedFields += "runtime=1"
  $orderedFields += "promote=0"
  $rowPrefix = 'HBPv1|' + ($orderedFields -join '|')
  $rowHash = Sha16 -Text $rowPrefix
  $fullRow = "$rowPrefix|row_hash=$rowHash"
  Add-Content -Path $HbpPath -Value $fullRow -Encoding UTF8
  return $rowHash
}

# Record PID
$PID | Out-File -FilePath $PidPath -Encoding ASCII -Force

$prevHash = Get-LastRowHash
$tick = (Get-LastTick) + 1

Write-Host "[asolaria-federation-pulse-daemon] starting at tick=$tick prev_hash=$prevHash anchor=$AnchorPid"

while ($true) {
  $tickStartTs = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')

  $voteQ = Probe-VoteQueueDepth
  $health = Probe-DashboardHealth
  $whiteroom = Count-Files -Dir $WhiteroomDir -MaxAgeSec 60
  $drain = Count-Files -Dir $DrainReceiptsDir -MaxAgeSec 60
  $cosign = Probe-CosignHead

  # Added 2026-05-23 per V42-B1 (Wave-306 spec #6, orch-B): cumulative counters
  $whiteroomCumulative = Count-Cumulative -LiveDir $WhiteroomDir -ProcessedDir $WhiteroomProcessedDir
  $drainCumulative = Count-Cumulative -LiveDir $DrainReceiptsDir -ProcessedDir $DrainProcessedDir
  $voteOutcomesCumulative = Count-VoteOutcomesCumulative

  # Single composite pulse row per tick
  # PATCHED 2026-05-23 per V42-B1 finding: original fields `*_total` were misnamed —
  # they returned files-currently-in-dir which fluctuates as processing moves them to
  # *-processed/, NOT cumulative-since-boot. Renamed to *_in_dir_now for honesty.
  # Authorized under VOTE-296ea0df51b579ba (MEMORY_WRITE batch, OP-JESSE apex approve).
  # FURTHER PATCH 2026-05-23 (Wave-306 orch-B): real cumulative fields added alongside
  # the rolling fields. Also written to cumulative-counters.json for at-a-glance reads.
  $prevHash = Emit-Row -Fields ([ordered]@{
    'layer' = 'federation-pulse-composite'
    'tick' = $tick
    'interval_sec' = $IntervalSec
    'vote_pending' = $voteQ.pending
    'vote_daemon_ok' = $voteQ.ok
    'dashboard_ok' = $health.ok
    'dashboard_uptime_s' = $health.uptime_s
    'whiteroom_in_dir_now' = $whiteroom.total
    'whiteroom_newly_arrived_60s' = $whiteroom.recent
    'whiteroom_cumulative' = $whiteroomCumulative
    'drain_in_dir_now' = $drain.total
    'drain_newly_arrived_60s' = $drain.recent
    'drain_cumulative' = $drainCumulative
    'vote_outcomes_cumulative' = $voteOutcomesCumulative
    'cosign_seq' = $cosign.seq
    'tick_start' = $tickStartTs
  }) -Antecedent $prevHash

  # Atomic-write the cumulative-counters.json snapshot for fast reader access
  Write-CumulativeCounters -Counters @{
    tick = $tick
    whiteroom_cumulative = $whiteroomCumulative
    drain_cumulative = $drainCumulative
    vote_outcomes_cumulative = $voteOutcomesCumulative
  }

  # Update sha256 sidecar
  try {
    $fileHash = (Get-FileHash -Path $HbpPath -Algorithm SHA256).Hash.ToLower()
    "$fileHash  pulse-tick.hbp" | Out-File -FilePath $ShaPath -Encoding ASCII -Force
  } catch {}

  $tick++
  Start-Sleep -Seconds $IntervalSec
}
