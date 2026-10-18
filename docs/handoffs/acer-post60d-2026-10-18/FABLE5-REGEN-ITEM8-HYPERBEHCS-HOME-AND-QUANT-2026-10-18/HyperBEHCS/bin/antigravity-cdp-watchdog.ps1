# ============================================================================
# Asolaria V50-D Antigravity CDP Watchdog
# Anchor PID: ASOLARIA-V50-D-ANTIGRAVITY-CDP-LOCK-PID-2026-05-24
# Quintuple-auth granted 2026-05-24 by OP-JESSE
# ----------------------------------------------------------------------------
# Probes :2027 every 30s. If unreachable OR no main process w/ CDP flag,
# kill-all and relaunch with --remote-debugging-port=2027 flag.
# 3-restart limit per hour. Antigravity is Electron so subprocess count > 1
# is normal — health is CDP-port-reachable + at least one flagged main.
# ============================================================================

$ErrorActionPreference = 'SilentlyContinue'
$ExePath  = 'C:/Users/acer/AppData/Local/Programs/Antigravity/Antigravity.exe'
$CdpPort  = 2027
$LogFile  = 'C:/HyperBEHCS/store/antigravity-cdp-watchdog.log'
$TickSec  = 30
$RestartCapPerHour = 3

$restartTimestamps = New-Object System.Collections.ArrayList
$backoffUntil = [DateTime]::MinValue

function Write-Tick([string]$msg) {
  $ts = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
  Add-Content -Path $LogFile -Value "$ts $msg"
}

function Test-Cdp {
  try {
    $tc = Test-NetConnection 127.0.0.1 -Port $CdpPort -InformationLevel Quiet -WarningAction SilentlyContinue
    return [bool]$tc
  } catch { return $false }
}

function Get-AgCount {
  $procs = Get-Process -Name Antigravity -ErrorAction SilentlyContinue
  if ($null -eq $procs) { return 0 }
  return @($procs).Count
}

function Test-FlaggedMain {
  # Returns $true if at least one Antigravity.exe process has the CDP flag.
  try {
    $matches = Get-CimInstance Win32_Process -Filter "Name='Antigravity.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -and $_.CommandLine -match '--remote-debugging-port=2027' }
    return (@($matches).Count -ge 1)
  } catch { return $false }
}

function Restart-Antigravity {
  $now = Get-Date
  if ($now -lt $backoffUntil) {
    Write-Tick "BACKOFF skip restart until=$($backoffUntil.ToString('o'))"
    return
  }
  # prune restart timestamps older than 1 hour
  $cutoff = $now.AddHours(-1)
  $kept = @($restartTimestamps | Where-Object { $_ -gt $cutoff })
  $restartTimestamps.Clear() | Out-Null
  foreach ($t in $kept) { [void]$restartTimestamps.Add($t) }

  if ($restartTimestamps.Count -ge $RestartCapPerHour) {
    $script:backoffUntil = $now.AddHours(1)
    Write-Tick "ALERT restart_cap_hit count=$($restartTimestamps.Count) cap=$RestartCapPerHour backoff_until=$($backoffUntil.ToString('o'))"
    return
  }

  Write-Tick "RESTART kill_all_then_launch exe=$ExePath flag=--remote-debugging-port=$CdpPort"
  Get-Process -Name Antigravity -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
  Start-Process -FilePath $ExePath -ArgumentList "--remote-debugging-port=$CdpPort" -WindowStyle Normal
  [void]$restartTimestamps.Add($now)
  Start-Sleep -Seconds 5
}

Write-Tick "BOOT watchdog pid=$PID tick=${TickSec}s cap=${RestartCapPerHour}/hr exe=$ExePath"

while ($true) {
  try {
    $cdp = Test-Cdp
    $count = Get-AgCount
    $flagged = Test-FlaggedMain
    $healthy = ($cdp -and $flagged -and $count -ge 1)
    Write-Tick "TICK cdp_up=$cdp proc_count=$count flagged_main=$flagged healthy=$healthy restarts_in_window=$($restartTimestamps.Count)"
    if (-not $healthy) {
      Restart-Antigravity
    }
  } catch {
    Write-Tick "ERROR loop exception=$($_.Exception.Message)"
  }
  Start-Sleep -Seconds $TickSec
}
