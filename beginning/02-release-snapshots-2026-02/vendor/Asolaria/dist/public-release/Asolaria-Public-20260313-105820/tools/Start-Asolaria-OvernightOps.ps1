[CmdletBinding()]
param(
  [datetime]$EndAt,
  [int]$MinKickMinutes = 18,
  [int]$MaxKickMinutes = 25,
  [int]$ReadinessPollSeconds = 30,
  [int]$ReadinessJobTimeoutMinutes = 25,
  [int]$ReadinessMaxCycles = 16,
  [switch]$StartWindowsRepair = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Read-Pid([string]$Path) {
  try {
    $raw = (Get-Content -LiteralPath $Path -Raw -ErrorAction Stop).Trim()
    if (-not $raw) {
      return $null
    }
    return [int]$raw
  } catch {
    return $null
  }
}

function Is-Running([Nullable[int]]$ProcId) {
  if (-not $ProcId) {
    return $false
  }
  try {
    Get-Process -Id $ProcId -ErrorAction Stop | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Stop-IfRunning([string]$PidPath) {
  $existingPid = Read-Pid -Path $PidPath
  if ($existingPid -and (Is-Running $existingPid)) {
    try {
      Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
    } catch {
      # no-op
    }
  }
}

function Start-BackgroundPowerShell {
  param(
    [string]$ScriptPath,
    [string[]]$ArgumentList,
    [string]$PidPath,
    [string]$OutLog,
    [string]$ErrLog
  )

  Stop-IfRunning -PidPath $PidPath
  $ps = (Get-Command powershell.exe -ErrorAction Stop).Source
  $fullArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $ScriptPath
  ) + @($ArgumentList)

  $proc = Start-Process -FilePath $ps `
    -ArgumentList $fullArgs `
    -WorkingDirectory (Split-Path -Parent $ScriptPath) `
    -NoNewWindow `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -PassThru

  Set-Content -LiteralPath $PidPath -Value $proc.Id -Encoding ASCII
  Start-Sleep -Milliseconds 600
  return [pscustomobject]@{
    ok = (Is-Running $proc.Id)
    pid = $proc.Id
    pidPath = $PidPath
    outLog = $OutLog
    errLog = $ErrLog
    script = $ScriptPath
  }
}

if (-not $PSBoundParameters.ContainsKey("EndAt")) {
  $EndAt = (Get-Date).Date.AddDays(1).AddHours(8)
}

$root = Get-AsolariaRoot
$logsDir = Join-Path $root "logs"
$reportsDir = Join-Path $root "reports"
Ensure-Dir -Path $logsDir
Ensure-Dir -Path $reportsDir

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$deadlineHours = [Math]::Max(1, [int][Math]::Ceiling((New-TimeSpan -Start (Get-Date) -End $EndAt).TotalHours))
$threadId = "overnight-readiness-20260310"

$autonomousKick = & (Join-Path $PSScriptRoot "Start-Asolaria-AutonomousKick.ps1") `
  -MaxHours $deadlineHours `
  -MinKickMinutes $MinKickMinutes `
  -MaxKickMinutes $MaxKickMinutes `
  -From "watchdog" `
  -Thread $threadId `
  -Tag "overnight" `
  -ChatKickMessage "Continue overnight readiness work in bounded reversible slices. Keep focus on system readiness, media/default safeguards, NotebookLM posture, swarm readiness, and eBacMap morning prep. Summarize blockers and completed slices only." `
  -RelayKickTemplate "@Asolaria @Vector @Rook @Forge @Falcon #thread:{THREAD} NOTE: Overnight readiness kick {COUNT}. Asolaria coordinates. Keep changes reversible, stay within the existing named colony, and post only blockers or completed slices."

$darkNightPidPath = Join-Path $logsDir "dark-night-watch-overnight.pid"
$darkNightOutLog = Join-Path $logsDir "dark-night-watch-overnight.out.log"
$darkNightErrLog = Join-Path $logsDir "dark-night-watch-overnight.err.log"
$darkNight = Start-BackgroundPowerShell -ScriptPath (Join-Path $PSScriptRoot "Keep-Asolaria-DarkNightWatch.ps1") -ArgumentList @(
  "-EndAt", $EndAt.ToString("s"),
  "-IntervalSeconds", "60",
  "-AsolariaPort", "4781"
) -PidPath $darkNightPidPath -OutLog $darkNightOutLog -ErrLog $darkNightErrLog

$readinessPidPath = Join-Path $logsDir "overnight-readiness-loop.pid"
$readinessOutLog = Join-Path $logsDir "overnight-readiness-loop.out.log"
$readinessErrLog = Join-Path $logsDir "overnight-readiness-loop.err.log"
$readiness = Start-BackgroundPowerShell -ScriptPath (Join-Path $PSScriptRoot "Run-Asolaria-OvernightReadiness.ps1") -ArgumentList @(
  "-EndAt", $EndAt.ToString("s"),
  "-PollSeconds", [string]$ReadinessPollSeconds,
  "-JobTimeoutMinutes", [string]$ReadinessJobTimeoutMinutes,
  "-ThreadId", $threadId,
  "-MaxCycles", [string]$ReadinessMaxCycles
) -PidPath $readinessPidPath -OutLog $readinessOutLog -ErrLog $readinessErrLog

$windowsRepair = $null
if ($StartWindowsRepair) {
  $repairPidPath = Join-Path $logsDir "windows-repair-overnight.pid"
  $repairOutLog = Join-Path $logsDir "windows-repair-overnight.out.log"
  $repairErrLog = Join-Path $logsDir "windows-repair-overnight.err.log"
  $windowsRepair = Start-BackgroundPowerShell -ScriptPath (Join-Path $PSScriptRoot "Run-Windows-Repair-Overnight.ps1") -ArgumentList @() -PidPath $repairPidPath -OutLog $repairOutLog -ErrLog $repairErrLog
}

$summary = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  endAt = $EndAt.ToString("o")
  threadId = $threadId
  autonomousKick = $autonomousKick
  darkNightWatch = $darkNight
  readinessLoop = $readiness
  windowsRepair = $windowsRepair
}

$jsonPath = Join-Path $reportsDir ("overnight-ops-launch-" + $stamp + ".json")
$mdPath = Join-Path $reportsDir ("overnight-ops-launch-" + $stamp + ".md")
$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$md = New-Object System.Collections.Generic.List[string]
$md.Add("# Overnight Ops Launch")
$md.Add("")
$md.Add("- Generated: " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz"))
$md.Add("- EndAt: " + $EndAt.ToString("yyyy-MM-dd HH:mm:ss zzz"))
$md.Add("- Thread: " + $threadId)
$md.Add("")
$md.Add("## Processes")
$md.Add("- Autonomous kick: pid=" + [string]$autonomousKick.pid + " log=" + [string]$autonomousKick.outLog)
$md.Add("- Dark night watch: pid=" + [string]$darkNight.pid + " log=" + [string]$darkNight.outLog)
$md.Add("- Overnight readiness: pid=" + [string]$readiness.pid + " log=" + [string]$readiness.outLog)
if ($windowsRepair) {
  $md.Add("- Windows repair: pid=" + [string]$windowsRepair.pid + " log=" + [string]$windowsRepair.outLog)
}
$md.Add("")
$md.Add("## Artifacts")
$md.Add("- " + $jsonPath)
$md.Add("- " + $mdPath)
$md | Set-Content -LiteralPath $mdPath -Encoding UTF8

[pscustomobject]@{
  ok = $true
  generatedAt = (Get-Date).ToString("o")
  jsonPath = $jsonPath
  markdownPath = $mdPath
  threadId = $threadId
} | ConvertTo-Json -Depth 6
