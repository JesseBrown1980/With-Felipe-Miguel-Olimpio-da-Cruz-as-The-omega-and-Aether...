param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$QddRoot = "D:\projects\QDD\ebacmap",
  [switch]$CopyToClipboard
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Invoke-JsonOrNull {
  param(
    [string]$Url,
    [int]$TimeoutSec = 8
  )
  try {
    return Invoke-RestMethod -Uri $Url -TimeoutSec $TimeoutSec
  } catch {
    return $null
  }
}

function Get-TextFileOrNull {
  param([string]$Path)
  try {
    if (-not (Test-Path -LiteralPath $Path)) {
      return $null
    }
    return Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
  } catch {
    return $null
  }
}

function Get-NotebookRecoverySummary {
  param([string]$ReportPath)
  $raw = Get-TextFileOrNull -Path $ReportPath
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return [pscustomobject]@{
      Available = $false
      SummaryLines = @("Recovery report not found.")
    }
  }

  $ready = [regex]::Match($raw, 'Ready:\s+(\d+)')
  $oauthBlocked = [regex]::Match($raw, 'OAuth blocked:\s+(\d+)')
  $enterpriseDegraded = [regex]::Match($raw, 'Enterprise degraded:\s+(\d+)')
  $readyAccount = [regex]::Match($raw, '###\s+plasmatoid@gmail\.com[\s\S]*?Final state:\s+ready')

  $lines = @()
  if ($ready.Success -or $oauthBlocked.Success -or $enterpriseDegraded.Success) {
    $readyCount = if ($ready.Success) { $ready.Groups[1].Value } else { "?" }
    $oauthBlockedCount = if ($oauthBlocked.Success) { $oauthBlocked.Groups[1].Value } else { "?" }
    $enterpriseDegradedCount = if ($enterpriseDegraded.Success) { $enterpriseDegraded.Groups[1].Value } else { "?" }
    $lines += ("Counts: ready={0}, oauth-blocked={1}, enterprise-degraded={2}" -f $readyCount, $oauthBlockedCount, $enterpriseDegradedCount)
  }
  if ($readyAccount.Success) {
    $lines += "Ready account: plasmatoid@gmail.com (Asolaria Enterprise Memory available)."
  }
  $lines += "Full report: $ReportPath"

  return [pscustomobject]@{
    Available = $true
    SummaryLines = $lines
  }
}

function Get-QddRepoSummary {
  param([string]$RepoPath)
  if (-not (Test-Path -LiteralPath $RepoPath)) {
    return [pscustomobject]@{
      Exists = $false
      SummaryLines = @("QDD repo not found at $RepoPath")
    }
  }

  $branch = ""
  $head = ""
  $statusBranch = ""
  $modifiedCount = 0
  $untrackedCount = 0
  $statusLines = @()

  try {
    $branch = (& git -C $RepoPath rev-parse --abbrev-ref HEAD 2>$null | Select-Object -First 1)
  } catch {
    $branch = ""
  }
  try {
    $head = (& git -C $RepoPath rev-parse --short HEAD 2>$null | Select-Object -First 1)
  } catch {
    $head = ""
  }
  try {
    $statusLines = @(& git -C $RepoPath status --short --branch 2>$null)
  } catch {
    $statusLines = @()
  }

  if ($statusLines.Count -gt 0) {
    $statusBranch = [string]$statusLines[0]
    foreach ($line in $statusLines | Select-Object -Skip 1) {
      $rawLine = [string]$line
      if ($rawLine.StartsWith("??")) {
        $untrackedCount += 1
      } elseif (-not [string]::IsNullOrWhiteSpace($rawLine)) {
        $modifiedCount += 1
      }
    }
  }

  $summary = @(
    "Repo path: $RepoPath",
    ("Branch: {0}" -f $(if ($branch) { $branch } else { "unknown" })),
    ("HEAD: {0}" -f $(if ($head) { $head } else { "unknown" })),
    ("Status: {0}" -f $(if ($statusBranch) { $statusBranch } else { "unknown" })),
    ("Dirty files: modified={0}, untracked={1}" -f $modifiedCount, $untrackedCount)
  )

  return [pscustomobject]@{
    Exists = $true
    SummaryLines = $summary
  }
}

function Add-Bullets {
  param(
    [System.Collections.Generic.List[string]]$Buffer,
    [string[]]$Lines
  )
  foreach ($line in ($Lines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })) {
    [void]$Buffer.Add("- $line")
  }
}

$root = Get-AsolariaRoot
$reportsDir = Join-Path $root "reports"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"
$outputPath = Join-Path $reportsDir ("qdd-external-admin-handoff-" + $stamp + ".md")
$latestPath = Join-Path $reportsDir "qdd-external-admin-handoff-latest.md"
$notebookReportPath = Join-Path $reportsDir "google-notebooklm-recovery-plan-latest.md"

$healthFast = Invoke-JsonOrNull -Url ($BaseUrl.TrimEnd("/") + "/api/health/fast") -TimeoutSec 8
$health = Invoke-JsonOrNull -Url ($BaseUrl.TrimEnd("/") + "/api/health") -TimeoutSec 12
$repo = Get-QddRepoSummary -RepoPath $QddRoot
$notebook = Get-NotebookRecoverySummary -ReportPath $notebookReportPath

$lines = New-Object 'System.Collections.Generic.List[string]'
[void]$lines.Add("# External Codex Handoff: QDD under Asolaria")
[void]$lines.Add("")
[void]$lines.Add("Generated: $generatedAt")
[void]$lines.Add("")
[void]$lines.Add("## Identity and Control")
Add-Bullets -Buffer $lines -Lines @(
  "Asolaria is the control plane and owner-facing system.",
  "Vector is the main brain lane inside Asolaria.",
  "External Codex is an auxiliary helper, not a replacement brain.",
  'Do not rename Asolaria, Vector, Rook, Forge, Falcon, Watchdog, or the bridge room `asolaria_bridge`.',
  "Do not change profile-card naming, lane canon, or bridge identity files unless that is the explicit task."
)
[void]$lines.Add("")
[void]$lines.Add("## Read First")
Add-Bullets -Buffer $lines -Lines @(
  "C:\Users\acer\Asolaria\AGENTS.md",
  "C:\Users\acer\Asolaria\docs\CANONICAL_SOURCE.md",
  "C:\Users\acer\Asolaria\docs\AUTHORITY_MODES.md",
  "C:\Users\acer\Asolaria\docs\GATEWAY_TOOL_AUTHORITY.md",
  "C:\Users\acer\Asolaria\reports\morning-handoff-latest.md",
  "C:\Users\acer\Asolaria\reports\google-notebooklm-recovery-plan-latest.md",
  "C:\Users\acer\Asolaria\tools\External-Codex-QDD-SystemCard.prompt.md"
)
[void]$lines.Add("")
[void]$lines.Add("## Live Runtime Snapshot")

if ($null -eq $healthFast) {
  Add-Bullets -Buffer $lines -Lines @("Fast runtime probe failed at $BaseUrl/api/health/fast")
} else {
  $queue = $healthFast.queue
  $brain = $healthFast.brainLeader
  Add-Bullets -Buffer $lines -Lines @(
    ("Asolaria runtime: ok={0}, uptimeSeconds={1}" -f $healthFast.ok, $healthFast.uptimeSeconds),
    ("Queue: running={0}, queued={1}, total={2}" -f $queue.running, $queue.queued, $queue.total),
    ("Brain leader: provider={0}, model={1}, status={2}/{3}" -f $brain.selectedProvider, $brain.selectedModel, $brain.status, $brain.loopStatus),
    ("Phone keeper: running={0}" -f $healthFast.networkPolicy.phoneBridgeKeeper.running),
    ("Phone tunnel monitor: running={0}, latestReportPass={1}" -f $healthFast.networkPolicy.phoneTunnelMonitor.running, $healthFast.networkPolicy.phoneTunnelMonitor.latestReportPass),
    ("Connection routing: selected={0}, remoteBaseUrl={1}" -f $healthFast.connectionRouting.selected.channel, $healthFast.connectionRouting.remoteBaseUrl)
  )
}

if ($null -ne $health) {
  $colony = $health.agentColony
  Add-Bullets -Buffer $lines -Lines @(
    ("Named colony counts: online={0}/{1}, active={2}/{1}" -f $colony.counts.online, $colony.counts.total, $colony.counts.active),
    ("Bridge helpers: relay={0}, tunnel={1}, notify={2}" -f $colony.relay.running, $colony.tunnel.running, $colony.notify.running)
  )
  if ($colony.counts.online -le 1) {
    Add-Bullets -Buffer $lines -Lines @(
      "Only Asolaria appears live right now; the other named lanes are offline from the bridge and dashboard perspective."
    )
  }
}

[void]$lines.Add("")
[void]$lines.Add("## NotebookLM Snapshot")
Add-Bullets -Buffer $lines -Lines $notebook.SummaryLines

[void]$lines.Add("")
[void]$lines.Add("## QDD Repo Snapshot")
Add-Bullets -Buffer $lines -Lines $repo.SummaryLines

[void]$lines.Add("")
[void]$lines.Add("## Default Working Rules")
Add-Bullets -Buffer $lines -Lines @(
  "Default write scope is D:\projects\QDD\ebacmap unless the task is explicitly about Asolaria plumbing.",
  "Inspect before editing. Respect dirty worktrees and do not discard existing local work.",
  "When asked to help Asolaria, keep identity and runtime-stability paths unchanged unless the owner explicitly approves a naming or control-plane migration.",
  "If live owner conversation is needed, use the direct Asolaria terminal for conversation and the super-admin terminal for status."
)

[void]$lines.Add("")
[void]$lines.Add("## Local Operator Commands")
[void]$lines.Add('```powershell')
[void]$lines.Add("powershell -NoExit -NoProfile -ExecutionPolicy Bypass -File C:\Users\acer\Asolaria\tools\Talk-To-Asolaria.ps1 -ChatId main -RouteMode direct")
[void]$lines.Add("powershell -NoExit -NoProfile -ExecutionPolicy Bypass -File C:\Users\acer\Asolaria\tools\Open-Asolaria-SuperAdminTerminal.ps1 -Target admin -Port 4781")
[void]$lines.Add('```')
[void]$lines.Add("")
[void]$lines.Add("## Immediate Intent")
Add-Bullets -Buffer $lines -Lines @(
  "Help with QDD without breaking Asolaria's naming model or profile cards.",
  "Treat Asolaria plus Vector as the organizing brain/control pair.",
  "Use this handoff only as a bootstrap; verify current state locally before making claims."
)

$content = ($lines -join "`r`n") + "`r`n"
Set-Content -LiteralPath $outputPath -Value $content -Encoding utf8
Set-Content -LiteralPath $latestPath -Value $content -Encoding utf8

if ($CopyToClipboard.IsPresent) {
  Set-Clipboard -Value $content
}

Write-Host ("Wrote handoff: " + $outputPath)
Write-Host ("Updated latest: " + $latestPath)
if ($CopyToClipboard.IsPresent) {
  Write-Host "Copied handoff contents to clipboard."
}
