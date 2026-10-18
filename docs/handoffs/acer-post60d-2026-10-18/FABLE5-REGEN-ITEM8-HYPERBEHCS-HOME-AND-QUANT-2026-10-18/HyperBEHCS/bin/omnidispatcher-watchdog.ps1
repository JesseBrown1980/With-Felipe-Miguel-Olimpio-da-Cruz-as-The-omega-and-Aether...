# ============================================================================
# Asolaria V52-A Omnidispatcher Watchdog
# Anchor PID: ASOLARIA-V52-A-OMNIDISPATCHER-RESTART-WATCHDOG-PID-2026-05-24
# Foundation v3 LAW window (through 2026-09-23)
# ----------------------------------------------------------------------------
# Probes :4950 every 30s. Health = port reachable AND at least one node.exe
# process with CommandLine matching 'omnidispatcher'. On unhealthy, kill any
# matching node procs and relaunch via `node omnidispatcher.mjs --boot`.
# 3-restart cap per hour, 1-hour backoff once cap hit.
# Pattern adapted from antigravity-cdp-watchdog.ps1 (sha fd9307b52b3fa6f1).
# ============================================================================

$ErrorActionPreference = 'SilentlyContinue'
$ScriptPath = 'C:/asolaria-acer/federation-remake-1024/tools/omnidispatcher/omnidispatcher.mjs'
$WorkDir    = 'C:/asolaria-acer/federation-remake-1024/tools/omnidispatcher'
$Port       = 4950
$LogFile    = 'C:/HyperBEHCS/store/omnidispatcher-watchdog.log'
$BootLog    = 'C:/asolaria-acer/omnidispatcher.boot.log'
$ErrLog     = 'C:/asolaria-acer/omnidispatcher.err.log'
$TickSec    = 30
$RestartCapPerHour = 3

$restartTimestamps = New-Object System.Collections.ArrayList
$backoffUntil = [DateTime]::MinValue

function Write-Tick([string]$msg) {
  $ts = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
  Add-Content -Path $LogFile -Value "$ts $msg"
}

function Test-Port {
  try {
    return [bool](Test-NetConnection 127.0.0.1 -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue)
  } catch { return $false }
}

function Get-DispatcherProcs {
  try {
    return @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -and $_.CommandLine -match 'omnidispatcher' })
  } catch { return @() }
}

function Test-Healthy {
  $portUp = Test-Port
  $procs = Get-DispatcherProcs
  return ($portUp -and (@($procs).Count -ge 1))
}

function Restart-Omnidispatcher {
  $now = Get-Date
  if ($now -lt $backoffUntil) {
    Write-Tick "BACKOFF skip restart until=$($backoffUntil.ToString('o'))"
    return
  }
  $cutoff = $now.AddHours(-1)
  $kept = @($restartTimestamps | Where-Object { $_ -gt $cutoff })
  $restartTimestamps.Clear() | Out-Null
  foreach ($t in $kept) { [void]$restartTimestamps.Add($t) }

  if ($restartTimestamps.Count -ge $RestartCapPerHour) {
    $script:backoffUntil = $now.AddHours(1)
    Write-Tick "ALERT restart_cap_hit count=$($restartTimestamps.Count) cap=$RestartCapPerHour backoff_until=$($backoffUntil.ToString('o'))"
    return
  }

  Write-Tick "RESTART kill_dispatcher_procs_then_launch script=$ScriptPath port=$Port"
  $procs = Get-DispatcherProcs
  foreach ($p in $procs) {
    try { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
  }
  Start-Sleep -Seconds 3
  Start-Process -FilePath 'node' `
    -ArgumentList @('--experimental-vm-modules', $ScriptPath, '--boot', '--workers=8') `
    -WorkingDirectory $WorkDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $BootLog `
    -RedirectStandardError $ErrLog | Out-Null
  [void]$restartTimestamps.Add($now)
  Start-Sleep -Seconds 5
}

Write-Tick "BOOT watchdog pid=$PID tick=${TickSec}s cap=${RestartCapPerHour}/hr script=$ScriptPath port=$Port"

while ($true) {
  try {
    $portUp = Test-Port
    $procs = Get-DispatcherProcs
    $count = @($procs).Count
    $healthy = ($portUp -and $count -ge 1)
    Write-Tick "TICK port_up=$portUp proc_count=$count healthy=$healthy restarts_in_window=$($restartTimestamps.Count)"
    if (-not $healthy) {
      Restart-Omnidispatcher
    }
  } catch {
    Write-Tick "ERROR loop exception=$($_.Exception.Message)"
  }
  Start-Sleep -Seconds $TickSec
}
