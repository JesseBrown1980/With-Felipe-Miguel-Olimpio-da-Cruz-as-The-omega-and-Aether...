param(
  [string]$RepoRoot = "",
  [string]$StageRoot = "",
  [string]$EvidenceRoot = "",
  [string]$ChecklistPath = "",
  [string]$ChecklistTemplatePath = "",
  [string]$ReportPath = "",
  [bool]$RequireZip = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-DefaultRepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return }
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Add-GateResult {
  param(
    [System.Collections.Generic.List[object]]$Results,
    [string]$Id,
    [bool]$Ok,
    [string]$Detail,
    [string]$Fix = ""
  )
  $Results.Add([ordered]@{
      id = $Id
      ok = $Ok
      detail = $Detail
      fix = $Fix
    }) | Out-Null
}

function Resolve-LatestStageRoot([string]$RepoRootPath) {
  $distRoot = Join-Path $RepoRootPath "dist"
  if (-not (Test-Path -LiteralPath $distRoot)) { return "" }

  $roots = @(Get-ChildItem -Path $distRoot -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like "public-release*" })
  if ($roots.Count -eq 0) { return "" }

  $stageDirs = New-Object System.Collections.Generic.List[object]
  foreach ($root in $roots) {
    $children = @(Get-ChildItem -Path $root.FullName -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "Asolaria-Public-*" })
    foreach ($child in $children) {
      $stageDirs.Add([ordered]@{
          path = $child.FullName
          lastWriteTime = $child.LastWriteTime
        }) | Out-Null
    }
  }

  if ($stageDirs.Count -eq 0) { return "" }
  return [string](($stageDirs | Sort-Object -Property lastWriteTime -Descending | Select-Object -First 1).path)
}

function Read-TrimmedText([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return "" }
  return [string]((Get-Content -Path $Path -Raw -ErrorAction Stop).Trim())
}

function Test-NoPlaceholderText([string]$Text) {
  if ([string]::IsNullOrWhiteSpace($Text)) { return $false }
  return ($Text -notmatch "(?i)\b(TBD|TODO|placeholder|<fill|<todo)\b")
}

function Get-ChecklistGates([string]$Path) {
  $items = New-Object System.Collections.Generic.List[object]
  if (-not (Test-Path -LiteralPath $Path)) { return $items }

  $lines = @(Get-Content -Path $Path -ErrorAction Stop)
  $lineNumber = 0
  foreach ($line in $lines) {
    $lineNumber += 1
    if ($line -match '^\s*-\s*\[(?<mark>[ xX])\]\s*GATE:\s*(?<text>.+)$') {
      $items.Add([ordered]@{
          line = $lineNumber
          checked = ([string]$Matches["mark"] -match "[xX]")
          text = [string]$Matches["text"]
        }) | Out-Null
    }
  }
  return $items
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = Resolve-DefaultRepoRoot
} else {
  $RepoRoot = (Resolve-Path $RepoRoot).Path
}

if ([string]::IsNullOrWhiteSpace($EvidenceRoot)) {
  $EvidenceRoot = Join-Path $RepoRoot "reports\release-demo"
}
Ensure-Dir $EvidenceRoot

if ([string]::IsNullOrWhiteSpace($ChecklistTemplatePath)) {
  $ChecklistTemplatePath = Join-Path $RepoRoot "docs\PUBLISH_DEMO_CHECKLIST.md"
}

if ([string]::IsNullOrWhiteSpace($ChecklistPath)) {
  $ChecklistPath = Join-Path $EvidenceRoot "PUBLISH_DEMO_CHECKLIST.md"
}

if ([string]::IsNullOrWhiteSpace($StageRoot)) {
  $StageRoot = Resolve-LatestStageRoot -RepoRootPath $RepoRoot
}

$results = New-Object System.Collections.Generic.List[object]

if ([string]::IsNullOrWhiteSpace($StageRoot) -or -not (Test-Path -LiteralPath $StageRoot)) {
  Add-GateResult -Results $results -Id "release_stage_present" -Ok $false `
    -Detail "No release stage folder found." `
    -Fix "Run tools/Build-PublicRelease.ps1 -Zip and re-run this gate."
} else {
  Add-GateResult -Results $results -Id "release_stage_present" -Ok $true `
    -Detail ("Using stage root: " + $StageRoot)
}

if (-not (Test-Path -LiteralPath $ChecklistPath)) {
  if (Test-Path -LiteralPath $ChecklistTemplatePath) {
    Ensure-Dir (Split-Path -Parent $ChecklistPath)
    Copy-Item -Path $ChecklistTemplatePath -Destination $ChecklistPath -Force
    Add-GateResult -Results $results -Id "checklist_exists" -Ok $false `
      -Detail ("Checklist template copied to: " + $ChecklistPath) `
      -Fix "Review and check all GATE items in the copied checklist."
  } else {
    Add-GateResult -Results $results -Id "checklist_exists" -Ok $false `
      -Detail ("Checklist template missing: " + $ChecklistTemplatePath) `
      -Fix "Create docs/PUBLISH_DEMO_CHECKLIST.md and re-run."
  }
} else {
  Add-GateResult -Results $results -Id "checklist_exists" -Ok $true `
    -Detail ("Checklist found: " + $ChecklistPath)
}

if (-not [string]::IsNullOrWhiteSpace($StageRoot) -and (Test-Path -LiteralPath $StageRoot)) {
  $leakReportPath = Join-Path $StageRoot "LEAK_SCAN_REPORT.json"
  if (-not (Test-Path -LiteralPath $leakReportPath)) {
    Add-GateResult -Results $results -Id "leak_report_exists" -Ok $false `
      -Detail ("Missing leak report: " + $leakReportPath) `
      -Fix "Rebuild release stage using tools/Build-PublicRelease.ps1."
  } else {
    Add-GateResult -Results $results -Id "leak_report_exists" -Ok $true `
      -Detail ("Leak report found: " + $leakReportPath)

    try {
      $parsed = Get-Content -Path $leakReportPath -Raw -ErrorAction Stop | ConvertFrom-Json
      $findingCount = 0
      if ($null -eq $parsed) {
        $findingCount = 0
      } elseif ($parsed -is [System.Array]) {
        $findingCount = $parsed.Count
      } else {
        $findingCount = 1
      }

      if ($findingCount -eq 0) {
        Add-GateResult -Results $results -Id "leak_report_clean" -Ok $true `
          -Detail "Leak report has zero findings."
      } else {
        Add-GateResult -Results $results -Id "leak_report_clean" -Ok $false `
          -Detail ("Leak report has " + $findingCount + " finding(s).") `
          -Fix "Review LEAK_SCAN_REPORT.json and remove/redact findings before publish."
      }
    } catch {
      Add-GateResult -Results $results -Id "leak_report_clean" -Ok $false `
        -Detail ("Leak report is not valid JSON: " + $_.Exception.Message) `
        -Fix "Regenerate release bundle and leak report."
    }
  }

  $notesPath = Join-Path $StageRoot "PUBLIC_RELEASE_NOTES.md"
  if (Test-Path -LiteralPath $notesPath) {
    Add-GateResult -Results $results -Id "release_notes_present" -Ok $true `
      -Detail ("Release notes found: " + $notesPath)
  } else {
    Add-GateResult -Results $results -Id "release_notes_present" -Ok $false `
      -Detail ("Missing release notes: " + $notesPath) `
      -Fix "Rebuild with tools/Build-PublicRelease.ps1 so notes are generated."
  }

  if ($RequireZip) {
    $zipPath = $StageRoot + ".zip"
    if (Test-Path -LiteralPath $zipPath) {
      $zipHash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash
      Add-GateResult -Results $results -Id "release_zip_present" -Ok $true `
        -Detail ("Zip present: " + $zipPath + " (sha256=" + $zipHash + ")")
    } else {
      Add-GateResult -Results $results -Id "release_zip_present" -Ok $false `
        -Detail ("Missing release zip: " + $zipPath) `
        -Fix "Re-run tools/Build-PublicRelease.ps1 -Zip."
    }
  }
}

$demoUrlPath = Join-Path $EvidenceRoot "demo-video-url.txt"
$demoUrl = Read-TrimmedText -Path $demoUrlPath
if ($demoUrl -match '^https?://(www\.)?(youtube\.com|youtu\.be)/') {
  Add-GateResult -Results $results -Id "demo_video_url_present" -Ok $true `
    -Detail ("Demo URL recorded in " + $demoUrlPath)
} else {
  Add-GateResult -Results $results -Id "demo_video_url_present" -Ok $false `
    -Detail ("Missing or invalid YouTube URL in " + $demoUrlPath) `
    -Fix "Save unlisted demo URL to reports/release-demo/demo-video-url.txt."
}

$testEvidencePath = Join-Path $EvidenceRoot "test-evidence.md"
$testEvidence = Read-TrimmedText -Path $testEvidencePath
if ($testEvidence.Length -ge 80 -and (Test-NoPlaceholderText -Text $testEvidence)) {
  Add-GateResult -Results $results -Id "test_evidence_present" -Ok $true `
    -Detail ("Test evidence recorded in " + $testEvidencePath)
} else {
  Add-GateResult -Results $results -Id "test_evidence_present" -Ok $false `
    -Detail ("Test evidence missing/too short/placeholder in " + $testEvidencePath) `
    -Fix "Record startup/connect/reconnect evidence in reports/release-demo/test-evidence.md."
}

$playTrackPath = Join-Path $EvidenceRoot "play-track-proof.txt"
$playTrack = Read-TrimmedText -Path $playTrackPath
if ($playTrack.Length -ge 20 -and (Test-NoPlaceholderText -Text $playTrack)) {
  Add-GateResult -Results $results -Id "play_track_proof_present" -Ok $true `
    -Detail ("Play testing track proof recorded in " + $playTrackPath)
} else {
  Add-GateResult -Results $results -Id "play_track_proof_present" -Ok $false `
    -Detail ("Play track proof missing/too short/placeholder in " + $playTrackPath) `
    -Fix "Save Play Console testing track proof details in reports/release-demo/play-track-proof.txt."
}

$submissionPacketPath = Join-Path $EvidenceRoot "submission-packet.md"
$submissionPacket = Read-TrimmedText -Path $submissionPacketPath
if ($submissionPacket.Length -ge 120 -and (Test-NoPlaceholderText -Text $submissionPacket)) {
  Add-GateResult -Results $results -Id "submission_packet_present" -Ok $true `
    -Detail ("Submission packet notes recorded in " + $submissionPacketPath)
} else {
  Add-GateResult -Results $results -Id "submission_packet_present" -Ok $false `
    -Detail ("Submission packet notes missing/too short/placeholder in " + $submissionPacketPath) `
    -Fix "Create reports/release-demo/submission-packet.md with final submission details."
}

$checklistGates = @(Get-ChecklistGates -Path $ChecklistPath)
if ($checklistGates.Count -eq 0) {
  Add-GateResult -Results $results -Id "checklist_gates_parsed" -Ok $false `
    -Detail ("No 'GATE:' checkboxes parsed from " + $ChecklistPath) `
    -Fix "Use docs/PUBLISH_DEMO_CHECKLIST.md template format."
} else {
  Add-GateResult -Results $results -Id "checklist_gates_parsed" -Ok $true `
    -Detail ("Parsed " + $checklistGates.Count + " checklist gate(s).")

  $unchecked = @($checklistGates | Where-Object { -not $_.checked })
  if ($unchecked.Count -eq 0) {
    Add-GateResult -Results $results -Id "checklist_all_checked" -Ok $true `
      -Detail "All checklist GATE items are checked."
  } else {
    $lines = $unchecked | ForEach-Object { [string]$_.line } | Sort-Object
    Add-GateResult -Results $results -Id "checklist_all_checked" -Ok $false `
      -Detail ("Unchecked checklist GATE items at line(s): " + ($lines -join ", ")) `
      -Fix "Check all required GATE items in reports/release-demo/PUBLISH_DEMO_CHECKLIST.md."
  }
}

if ([string]::IsNullOrWhiteSpace($ReportPath)) {
  $ReportPath = Join-Path $EvidenceRoot "publish-demo-gate-report.json"
}
Ensure-Dir (Split-Path -Parent $ReportPath)

$failed = @($results | Where-Object { -not [bool]$_.ok })
$report = [ordered]@{
  checkedAt = (Get-Date).ToString("o")
  repoRoot = $RepoRoot
  stageRoot = $StageRoot
  evidenceRoot = $EvidenceRoot
  checklistPath = $ChecklistPath
  pass = ($failed.Count -eq 0)
  failedCount = $failed.Count
  gates = $results
}

$report | ConvertTo-Json -Depth 8 | Out-File -FilePath $ReportPath -Encoding UTF8

Write-Host ("Gate report: " + $ReportPath)
foreach ($row in $results) {
  $state = if ([bool]$row.ok) { "PASS" } else { "FAIL" }
  Write-Host ("[{0}] {1} :: {2}" -f $state, [string]$row.id, [string]$row.detail)
}

if ($failed.Count -gt 0) {
  throw ("Publish/demo gates failed: " + $failed.Count + ".")
}

Write-Host "Publish/demo gates passed."
