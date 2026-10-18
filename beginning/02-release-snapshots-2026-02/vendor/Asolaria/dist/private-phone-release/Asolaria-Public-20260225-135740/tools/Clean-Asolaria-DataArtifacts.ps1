param(
  [switch]$Apply,
  [int]$KeepPrivateReleaseBuilds = 1,
  [int]$KeepPrivateDownloadZips = 2,
  [int]$KeepPhoneSmokeReports = 16,
  [int]$KeepPhoneRedeployReports = 10,
  [int]$KeepSnapshotReports = 8,
  [int]$KeepLogFilesPerPattern = 8,
  [int]$CaptureAutoKeep = 500,
  [int]$CaptureAutoMinAgeMinutes = 10,
  [int]$KeepTinyIngestFiles = 20,
  [bool]$CompactMemory = $false,
  [bool]$PruneCaptureAutoDesktop = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$DryRun = -not $Apply.IsPresent

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Get-PathSizeBytes([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return 0
  }
  $item = Get-Item -LiteralPath $Path -ErrorAction SilentlyContinue
  if ($null -eq $item) {
    return 0
  }
  if (-not $item.PSIsContainer) {
    return [long]$item.Length
  }
  $sum = 0
  Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $sum += [long]$_.Length
  }
  return [long]$sum
}

function Remove-OrPlan {
  param(
    [string]$Path,
    [string]$Reason,
    [bool]$Recurse = $false
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $sizeBytes = Get-PathSizeBytes -Path $Path
  $status = if ($DryRun) { "planned" } else { "removed" }
  $errorText = ""

  if (-not $DryRun) {
    try {
      if ($Recurse) {
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
      } else {
        Remove-Item -LiteralPath $Path -Force -ErrorAction Stop
      }
    } catch {
      $status = "error"
      $errorText = $_.Exception.Message
    }
  }

  $script:results.Add([pscustomobject]@{
      path = $Path
      reason = $Reason
      status = $status
      sizeBytes = [long]$sizeBytes
      error = $errorText
    })
}

function Prune-FilesByPattern {
  param(
    [string]$Directory,
    [string]$Pattern,
    [int]$Keep = 0,
    [string[]]$ExcludeNames = @(),
    [string]$ReasonPrefix
  )

  if (-not (Test-Path -LiteralPath $Directory)) {
    return
  }

  $rows = Get-ChildItem -LiteralPath $Directory -File -Filter $Pattern -ErrorAction SilentlyContinue |
    Where-Object { $ExcludeNames -notcontains $_.Name } |
    Sort-Object LastWriteTime, Name -Descending

  $toRemove = @($rows | Select-Object -Skip ([Math]::Max(0, $Keep)))
  foreach ($file in $toRemove) {
    Remove-OrPlan -Path $file.FullName -Reason "$ReasonPrefix (pattern=$Pattern keep=$Keep)"
  }
}

function Read-JsonArray([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return @()
  }
  try {
    $raw = Get-Content -LiteralPath $Path -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) {
      return @()
    }
    $parsed = $raw | ConvertFrom-Json
    if ($parsed -is [System.Array]) {
      return @($parsed)
    }
    if ($null -ne $parsed) {
      return @($parsed)
    }
    return @()
  } catch {
    return @()
  }
}

function Test-ProcessAlive([int]$ProcessId) {
  if ($ProcessId -le 0) {
    return $false
  }
  return $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

$repoRoot = Resolve-RepoRoot
$results = New-Object System.Collections.Generic.List[object]
$notes = New-Object System.Collections.Generic.List[string]

$distPrivate = Join-Path $repoRoot "dist\private-phone-release"
$privateDownloads = Join-Path $repoRoot "data\private-downloads"
$reportsDir = Join-Path $repoRoot "reports"
$logsDir = Join-Path $repoRoot "logs"
$capturesDesktop = Join-Path $repoRoot "captures\desktop"
$capturesIngest = Join-Path $repoRoot "captures\ingest"
$memoryPath = Join-Path $repoRoot "data\memory.json"

# 1) Keep only newest private release build tags.
if (Test-Path -LiteralPath $distPrivate) {
  $releaseItems = Get-ChildItem -LiteralPath $distPrivate -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^Asolaria-Public-(\d{8}-\d{6})(\.zip)?$' } |
    ForEach-Object {
      [pscustomobject]@{
        item = $_
        tag = [string]$matches[1]
      }
    }

  $keepTags = @($releaseItems | Select-Object -ExpandProperty tag -Unique | Sort-Object -Descending | Select-Object -First ([Math]::Max(1, $KeepPrivateReleaseBuilds)))
  foreach ($row in $releaseItems) {
    if ($keepTags -contains $row.tag) {
      continue
    }
    Remove-OrPlan -Path $row.item.FullName -Reason "old private phone release build (tag=$($row.tag))" -Recurse:$row.item.PSIsContainer
  }
}

# 2) Keep only newest private-download zips and repair index.json.
if (Test-Path -LiteralPath $privateDownloads) {
  $zipRows = Get-ChildItem -LiteralPath $privateDownloads -File -Filter "Asolaria-Public-*.zip" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime, Name -Descending
  $removeZipRows = @($zipRows | Select-Object -Skip ([Math]::Max(1, $KeepPrivateDownloadZips)))
  foreach ($zip in $removeZipRows) {
    Remove-OrPlan -Path $zip.FullName -Reason "old private-download zip (keep=$KeepPrivateDownloadZips)"
  }

  $indexPath = Join-Path $privateDownloads "index.json"
  $entries = @(Read-JsonArray -Path $indexPath)
  if ($entries.Count -gt 0) {
    $valid = @($entries | Where-Object {
        $privatePath = [string]$_.privatePath
        if ([string]::IsNullOrWhiteSpace($privatePath)) { return $false }
        return Test-Path -LiteralPath $privatePath
      })
    $trimmed = @($valid | Select-Object -First 20)
    if ($trimmed.Count -ne $entries.Count) {
      if ($DryRun) {
        $notes.Add("Would rewrite data/private-downloads/index.json: $($entries.Count) -> $($trimmed.Count) entries.")
      } else {
        $trimmed | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $indexPath -Encoding UTF8
        $notes.Add("Rewrote data/private-downloads/index.json: $($entries.Count) -> $($trimmed.Count) entries.")
      }
    }
  }
}

# 3) Prune report artifacts by retention rules.
if (Test-Path -LiteralPath $reportsDir) {
  $tmpReport = Join-Path $reportsDir "tmp-asolaria-write-test.txt"
  Remove-OrPlan -Path $tmpReport -Reason "temporary report artifact"
  $tmpSmokeOut = Join-Path $repoRoot "tmp-smoke-out.txt"
  Remove-OrPlan -Path $tmpSmokeOut -Reason "temporary smoke output artifact"

  Prune-FilesByPattern -Directory $reportsDir -Pattern "phone-tunnel-smoke-*.md" -Keep $KeepPhoneSmokeReports -ExcludeNames @("phone-tunnel-smoke-latest.md") -ReasonPrefix "old tunnel smoke report"
  Prune-FilesByPattern -Directory $reportsDir -Pattern "phone-private-redeploy-*.md" -Keep $KeepPhoneRedeployReports -ReasonPrefix "old phone redeploy report"
  Prune-FilesByPattern -Directory $reportsDir -Pattern "asolaria-snapshot-*.json" -Keep $KeepSnapshotReports -ExcludeNames @("asolaria-snapshot-latest.json") -ReasonPrefix "old snapshot json"
  Prune-FilesByPattern -Directory $reportsDir -Pattern "asolaria-snapshot-*.md" -Keep $KeepSnapshotReports -ExcludeNames @("asolaria-snapshot-latest.md") -ReasonPrefix "old snapshot markdown"
}

# 4) Prune rotated logs and stale PID files.
if (Test-Path -LiteralPath $logsDir) {
  $logPatterns = @(
    "adb-health-*.log",
    "phone-link-keeper-*.log",
    "phone-tunnel-smoke-monitor-*.log",
    "server.*.out.log",
    "server.*.err.log",
    "server-*.out.log",
    "server-*.err.log"
  )
  foreach ($pattern in $logPatterns) {
    Prune-FilesByPattern -Directory $logsDir -Pattern $pattern -Keep $KeepLogFilesPerPattern -ReasonPrefix "old rotated log"
  }

  $pidFiles = @("phone-link-keeper.pid", "phone-tunnel-smoke-monitor.pid", "cloudflared-asolaria.pid")
  foreach ($name in $pidFiles) {
    $pidPath = Join-Path $logsDir $name
    if (-not (Test-Path -LiteralPath $pidPath)) { continue }
    $pidText = ""
    try { $pidText = [string](Get-Content -LiteralPath $pidPath -Raw) } catch { $pidText = "" }
    $pidValue = 0
    [void][int]::TryParse($pidText.Trim(), [ref]$pidValue)
    if (-not (Test-ProcessAlive -ProcessId $pidValue)) {
      Remove-OrPlan -Path $pidPath -Reason "stale pid file ($name)"
    }
  }
}

# 5) Prune desktop auto captures and tiny ingest artifacts.
if ($PruneCaptureAutoDesktop -and (Test-Path -LiteralPath $capturesDesktop)) {
  $now = Get-Date
  $autoRows = Get-ChildItem -LiteralPath $capturesDesktop -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^desktop-\d{4}-\d{2}-\d{2}t.+\.(png|jpg|jpeg|webp)$' } |
    Sort-Object LastWriteTime, Name -Descending
  $toRemoveAuto = @($autoRows | Select-Object -Skip ([Math]::Max(0, $CaptureAutoKeep)))
  foreach ($file in $toRemoveAuto) {
    $ageMinutes = ($now - $file.LastWriteTime).TotalMinutes
    if ($ageMinutes -lt [Math]::Max(0, $CaptureAutoMinAgeMinutes)) {
      continue
    }
    Remove-OrPlan -Path $file.FullName -Reason "old desktop auto capture (keep=$CaptureAutoKeep minAgeMin=$CaptureAutoMinAgeMinutes)"
  }
}

if (Test-Path -LiteralPath $capturesIngest) {
  $tinyRows = Get-ChildItem -LiteralPath $capturesIngest -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '-tiny\.(png|jpg|jpeg|webp)$' } |
    Sort-Object LastWriteTime, Name -Descending
  $toRemoveTiny = @($tinyRows | Select-Object -Skip ([Math]::Max(0, $KeepTinyIngestFiles)))
  foreach ($file in $toRemoveTiny) {
    Remove-OrPlan -Path $file.FullName -Reason "old tiny ingest artifact (keep=$KeepTinyIngestFiles)"
  }
}

# 6) Compact exact duplicate memory turns.
$memoryCompaction = [ordered]@{
  enabled = [bool]$CompactMemory
  totalTurns = 0
  keptTurns = 0
  removedTurns = 0
  status = "skipped"
}

if ($CompactMemory -and (Test-Path -LiteralPath $memoryPath)) {
  try {
    $memory = Get-Content -LiteralPath $memoryPath -Raw | ConvertFrom-Json
    $turns = @($memory.turns)
    $memoryCompaction.totalTurns = $turns.Count

    $seen = New-Object 'System.Collections.Generic.HashSet[string]'
    $keptReverse = New-Object System.Collections.Generic.List[object]

    for ($i = $turns.Count - 1; $i -ge 0; $i--) {
      $turn = $turns[$i]
      $role = [string]$turn.role
      $text = ([string]$turn.text).Trim()
      $source = [string]$turn.meta.source
      $key = "{0}|{1}|{2}" -f $role, $source, $text
      if ($seen.Add($key)) {
        $keptReverse.Add($turn)
      } else {
        $memoryCompaction.removedTurns++
      }
    }

    $kept = @($keptReverse.ToArray())
    [array]::Reverse($kept)
    $memoryCompaction.keptTurns = $kept.Count

    if ($memoryCompaction.removedTurns -gt 0) {
      $memory.turns = $kept
      $memory.updatedAt = (Get-Date).ToString("o")
      if ($DryRun) {
        $memoryCompaction.status = "planned"
        $notes.Add("Would compact memory turns: $($memoryCompaction.totalTurns) -> $($memoryCompaction.keptTurns).")
      } else {
        $memory | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $memoryPath -Encoding UTF8
        $memoryCompaction.status = "compacted"
        $notes.Add("Compacted memory turns: $($memoryCompaction.totalTurns) -> $($memoryCompaction.keptTurns).")
      }
    } else {
      $memoryCompaction.status = "no_duplicates"
    }
  } catch {
    $memoryCompaction.status = "error"
    $notes.Add("Memory compaction failed: $($_.Exception.Message)")
  }
}

$removedRows = @($results | Where-Object { $_.status -eq "removed" })
$plannedRows = @($results | Where-Object { $_.status -eq "planned" })
$errorRows = @($results | Where-Object { $_.status -eq "error" })
$affectedRows = @($(if ($DryRun) { $plannedRows } else { $removedRows }))
$affectedBytes = 0
foreach ($row in $affectedRows) {
  $affectedBytes += [long]$row.sizeBytes
}
$affectedBytes = [long]$affectedBytes

$reportStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $reportsDir ("data-cleanup-" + $reportStamp + ".md")
Ensure-Dir -Path $reportsDir

$modeLabel = if ($DryRun) { "dry-run" } else { "apply" }
$actionLabel = if ($DryRun) { "planned" } else { "completed" }
$bytesLabel = if ($DryRun) { "planned" } else { "removed" }

$report = @(
  "# Asolaria Data Cleanup Report",
  "",
  ("Generated: " + (Get-Date).ToString("o")),
  ("Mode: " + $modeLabel),
  "",
  "## Summary",
  "",
  ("- Actions " + $actionLabel + ": " + $affectedRows.Count),
  ("- Bytes " + $bytesLabel + ": " + $affectedBytes),
  ("- Errors: " + $errorRows.Count),
  ("- Memory compaction: " + $memoryCompaction.status + " (removed=" + $memoryCompaction.removedTurns + ")"),
  ""
)

if ($affectedRows.Count -gt 0) {
  $report += "## Actions"
  $report += ""
  foreach ($row in $affectedRows) {
    $report += ("- " + $row.reason + " | " + $row.path + " | bytes=" + $row.sizeBytes)
  }
  $report += ""
}

if ($notes.Count -gt 0) {
  $report += "## Notes"
  $report += ""
  foreach ($note in $notes) {
    $report += ("- " + $note)
  }
  $report += ""
}

if ($errorRows.Count -gt 0) {
  $report += "## Errors"
  $report += ""
  foreach ($row in $errorRows) {
    $report += ("- " + $row.path + ": " + $row.error)
  }
  $report += ""
}

$report | Set-Content -LiteralPath $reportPath -Encoding UTF8

$summary = [ordered]@{
  ok = ($errorRows.Count -eq 0)
  dryRun = $DryRun
  reportPath = $reportPath
  plannedCount = $plannedRows.Count
  removedCount = $removedRows.Count
  affectedBytes = $affectedBytes
  errors = @($errorRows)
  notes = @($notes)
  memoryCompaction = $memoryCompaction
}

$summary | ConvertTo-Json -Depth 10
