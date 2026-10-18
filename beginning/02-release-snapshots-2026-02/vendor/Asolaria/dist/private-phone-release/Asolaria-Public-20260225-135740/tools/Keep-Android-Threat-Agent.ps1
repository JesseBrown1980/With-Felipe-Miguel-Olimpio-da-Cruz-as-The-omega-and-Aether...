param(
  [int]$CheckIntervalSeconds = 180,
  [int]$MaxHours = 12,
  [int]$Top = 20,
  [switch]$AutoQuarantineHighRisk,
  [int]$QuarantineScoreThreshold = 85,
  [string]$LogPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $LogPath -Value $line -Encoding UTF8
}

function Run-Audit {
  param(
    [string[]]$Targets = @(),
    [switch]$DoQuarantine
  )
  $auditScript = Join-Path $PSScriptRoot "Audit-Android-Threats.ps1"
  $args = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $auditScript,
    "-Top", [string]$Top
  )
  if ($DoQuarantine.IsPresent -and @($Targets).Count -gt 0) {
    $args += "-Quarantine"
    foreach ($pkg in @($Targets)) {
      $args += @("-TargetPackages", [string]$pkg)
    }
  }

  try {
    $raw = & powershell @args
    $json = [string](@($raw) -join [Environment]::NewLine)
    if ([string]::IsNullOrWhiteSpace($json)) {
      return [pscustomobject]@{
        ok = $false
        data = $null
        error = "empty_audit_output"
      }
    }
    $parsed = $json | ConvertFrom-Json -ErrorAction Stop
    return [pscustomobject]@{
      ok = $true
      data = $parsed
      error = ""
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      data = $null
      error = $_.Exception.Message
    }
  }
}

$repoRoot = Resolve-RepoRoot
$logsDir = Join-Path $repoRoot "logs"
Ensure-Dir $logsDir

if ([string]::IsNullOrWhiteSpace($LogPath)) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $LogPath = Join-Path $logsDir ("android-threat-agent-" + $stamp + ".log")
}

$started = Get-Date
$deadline = if ($MaxHours -gt 0) { $started.AddHours($MaxHours) } else { [DateTime]::MaxValue }
$lastSummary = ""

Write-Log ("agent_start interval={0}s maxHours={1} autoQuarantine={2} threshold={3}" -f $CheckIntervalSeconds, $MaxHours, $AutoQuarantineHighRisk.IsPresent, $QuarantineScoreThreshold)

while ((Get-Date) -lt $deadline) {
  $audit = Run-Audit
  if (-not $audit.ok -or -not $audit.data) {
    Write-Log ("audit_failed error=" + [string]$audit.error)
    Start-Sleep -Seconds $CheckIntervalSeconds
    continue
  }

  if (-not $audit.data.ok) {
    $reason = [string]$audit.data.reason
    if (-not $reason) { $reason = "unknown" }
    $summary = "audit_not_ready reason=$reason"
    if ($summary -ne $lastSummary) {
      Write-Log $summary
      $lastSummary = $summary
    }
    Start-Sleep -Seconds $CheckIntervalSeconds
    continue
  }

  $topRows = @($audit.data.suspiciousTop)
  $topRow = if ($topRows.Count -gt 0) { $topRows[0] } else { $null }
  $topPkg = [string]($topRow.package)
  $topScore = [int]($topRow.score)
  $summary = "audit_ok suspicious={0} top={1} score={2}" -f $topRows.Count, $topPkg, $topScore
  if ($summary -ne $lastSummary) {
    Write-Log $summary
    $lastSummary = $summary
  }

  if ($AutoQuarantineHighRisk.IsPresent -and $topRows.Count -gt 0) {
    $targets = New-Object System.Collections.Generic.List[string]
    foreach ($row in $topRows) {
      $score = [int]($row.score)
      $isUser = [bool]($row.isUserApp)
      $reasons = @($row.reasons | ForEach-Object { [string]$_ })
      $hasCriticalReason = $false
      foreach ($reason in $reasons) {
        if ($reason -eq "overlay_allowed" -or $reason -eq "accessibility_enabled" -or $reason -eq "active_device_admin") {
          $hasCriticalReason = $true
          break
        }
      }
      if ($isUser -and $score -ge $QuarantineScoreThreshold -and $hasCriticalReason) {
        $targets.Add([string]$row.package)
      }
    }

    if ($targets.Count -gt 0) {
      Write-Log ("quarantine_start targets=" + [string](@($targets.ToArray()) -join ","))
      $q = Run-Audit -Targets @($targets.ToArray()) -DoQuarantine
      if ($q.ok -and $q.data -and $q.data.ok) {
        Write-Log "quarantine_done ok=true"
      } else {
        Write-Log ("quarantine_done ok=false error=" + [string]$q.error)
      }
    }
  }

  Start-Sleep -Seconds $CheckIntervalSeconds
}

Write-Log "agent_exit"
