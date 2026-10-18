param(
  [int]$Port = 4781,
  [int]$CheckIntervalSeconds = 45,
  [int]$MaxHours = 24,
  [int]$UnhealthyRestartThreshold = 4,
  [string]$LogPath = "",
  [string]$CloudflaredPath = "",
  [switch]$RunOnce
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Write-Log {
  param(
    [string]$Path,
    [string]$Message
  )
  $line = ("[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Message)
  Add-Content -Path $Path -Value $line -Encoding UTF8
}

function Convert-WmiDateToDateTime {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }
  try {
    return [System.Management.ManagementDateTimeConverter]::ToDateTime($Value)
  } catch {
    return $null
  }
}

function Remove-PathIfExists {
  param([string]$Path)
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  }
}

function Read-PidFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    return 0
  }
  $raw = ""
  try {
    $raw = [string](Get-Content -LiteralPath $Path -Raw -ErrorAction Stop)
  } catch {
    return 0
  }
  $value = 0
  if ([int]::TryParse($raw.Trim(), [ref]$value) -and $value -gt 0) {
    return $value
  }
  return 0
}

function Write-PidFile {
  param(
    [string]$Path,
    [int]$ProcessId
  )
  if ($ProcessId -gt 0) {
    Set-Content -LiteralPath $Path -Value ([string]$ProcessId) -Encoding ASCII
  } else {
    Remove-PathIfExists -Path $Path
  }
}

function Test-PidRunning {
  param([int]$ProcessId)
  if ($ProcessId -le 0) {
    return $false
  }
  try {
    $null = Get-Process -Id $ProcessId -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Resolve-CloudflaredPath {
  param(
    [string]$PreferredPath,
    [string]$RepoRoot
  )

  if (-not [string]::IsNullOrWhiteSpace($PreferredPath)) {
    try {
      return (Resolve-Path -LiteralPath $PreferredPath).Path
    } catch {
      # continue
    }
  }

  $envPath = [string]$env:CLOUDFLARED_PATH
  if (-not [string]::IsNullOrWhiteSpace($envPath) -and (Test-Path -LiteralPath $envPath)) {
    return (Resolve-Path -LiteralPath $envPath).Path
  }

  try {
    $cmd = Get-Command cloudflared -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {
    # continue
  }

  $candidates = @(
    (Join-Path $RepoRoot "tools\cloudflared.exe"),
    "C:\Program Files (x86)\cloudflared\cloudflared.exe",
    "C:\Program Files\cloudflared\cloudflared.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  return ""
}

function Get-ManagedTunnelProcesses {
  param([int]$HttpPort)

  $rows = @()
  try {
    $rows = @(Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" -ErrorAction Stop)
  } catch {
    return @()
  }

  $urlPattern = ('(?i)--url\s+["'']?http://(127\.0\.0\.1|localhost):{0}(\b|/)' -f $HttpPort)
  $result = @()
  foreach ($row in $rows) {
    $cmdLine = [string]$row.CommandLine
    if ([string]::IsNullOrWhiteSpace($cmdLine)) { continue }
    if ($cmdLine -notmatch '(?i)\btunnel\b') { continue }
    if ($cmdLine -notmatch $urlPattern) { continue }
    $result += [pscustomobject]@{
      ProcessId = [int]$row.ProcessId
      CommandLine = $cmdLine
      CreationTime = Convert-WmiDateToDateTime -Value ([string]$row.CreationDate)
    }
  }

  return @($result)
}

function Stop-Pid {
  param([int]$ProcessId)
  if ($ProcessId -le 0) {
    return $false
  }
  try {
    Stop-Process -Id $ProcessId -Force -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Start-ManagedTunnelProcess {
  param(
    [string]$ExecutablePath,
    [int]$HttpPort,
    [string]$CloudflaredLogPath,
    [string]$RepoRoot
  )

  $arguments = @(
    "tunnel",
    "--url", ("http://127.0.0.1:{0}" -f $HttpPort),
    "--no-autoupdate",
    "--ha-connections", "1",
    "--protocol", "quic",
    "--loglevel", "info",
    "--logfile", $CloudflaredLogPath
  )

  $proc = Start-Process -FilePath $ExecutablePath `
    -ArgumentList $arguments `
    -WorkingDirectory $RepoRoot `
    -WindowStyle Hidden `
    -PassThru
  return [int]$proc.Id
}

function Read-LatestTunnelUrlFromLog {
  param(
    [string]$Path,
    [int]$TailLines = 800
  )
  if (-not (Test-Path -LiteralPath $Path)) {
    return ""
  }
  $tail = @(Get-Content -LiteralPath $Path -Tail ([Math]::Max(80, $TailLines)))
  for ($i = $tail.Count - 1; $i -ge 0; $i--) {
    $line = [string]$tail[$i]
    if ($line -match 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com') {
      return [string]$Matches[0]
    }
  }
  return ""
}

function Test-TunnelUrlHealth {
  param(
    [string]$TunnelUrl,
    [int]$TimeoutSec = 6
  )
  if ([string]::IsNullOrWhiteSpace($TunnelUrl)) {
    return $false
  }
  try {
    $resp = Invoke-RestMethod -Uri ($TunnelUrl.TrimEnd("/") + "/api/health") -TimeoutSec ([Math]::Max(2, $TimeoutSec))
    return [bool]$resp.ok
  } catch {
    return $false
  }
}

function Update-UrlFileState {
  param(
    [string]$Path,
    [string]$TunnelUrl,
    [bool]$HealthOk
  )

  $previous = ""
  try { $previous = [string](Get-Content -LiteralPath $Path -Raw -ErrorAction Stop).Trim() } catch {}

  if (-not [string]::IsNullOrWhiteSpace($TunnelUrl) -and $HealthOk) {
    if ((-not (Test-Path -LiteralPath $Path)) -or ($previous -ne $TunnelUrl)) {
      Set-Content -LiteralPath $Path -Value $TunnelUrl -Encoding ASCII
      return [pscustomobject]@{
        changed = $true
        removed = $false
        current = $TunnelUrl
      }
    }
    return [pscustomobject]@{
      changed = $false
      removed = $false
      current = $previous
    }
  }

  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    return [pscustomobject]@{
      changed = $true
      removed = $true
      current = ""
    }
  }

  return [pscustomobject]@{
    changed = $false
    removed = $false
    current = ""
  }
}

$repoRoot = Get-AsolariaRoot
$logsDir = Join-Path $repoRoot "logs"
Ensure-Dir -Path $logsDir

if ([string]::IsNullOrWhiteSpace($LogPath)) {
  $LogPath = Join-Path $logsDir ("public-tunnel-keeper-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".log")
}

$pidFilePath = Join-Path $logsDir "cloudflared-asolaria.pid"
$urlFilePath = Join-Path $logsDir "cloudflared-asolaria-url.txt"
$cloudflaredLogPath = Join-Path $logsDir "cloudflared-asolaria-public.err.log"

$cloudflaredExe = Resolve-CloudflaredPath -PreferredPath $CloudflaredPath -RepoRoot $repoRoot
if ([string]::IsNullOrWhiteSpace($cloudflaredExe)) {
  throw "cloudflared executable not found. Install cloudflared or set -CloudflaredPath."
}

$intervalSeconds = [Math]::Max(10, $CheckIntervalSeconds)
$restartThreshold = [Math]::Max(1, $UnhealthyRestartThreshold)
$startedAt = Get-Date
$deadline = if ($MaxHours -gt 0) { $startedAt.AddHours($MaxHours) } else { [DateTime]::MaxValue }
$consecutiveUnhealthy = 0
$lastState = ""

Write-Log -Path $LogPath -Message ("keeper_start port={0} interval_s={1} max_hours={2} restart_threshold={3} cloudflared={4}" -f $Port, $intervalSeconds, $MaxHours, $restartThreshold, $cloudflaredExe)

while ($true) {
  $pidFromFile = Read-PidFile -Path $pidFilePath
  if ($pidFromFile -gt 0 -and -not (Test-PidRunning -ProcessId $pidFromFile)) {
    Remove-PathIfExists -Path $pidFilePath
    Write-Log -Path $LogPath -Message ("stale_pid_file_removed pid={0}" -f $pidFromFile)
  }

  $managed = @(Get-ManagedTunnelProcesses -HttpPort $Port)
  $duplicatesStopped = @()
  if ($managed.Count -gt 1) {
    $ordered = @(
      $managed |
        Sort-Object -Property `
          @{ Expression = { if ($_.CreationTime) { [DateTime]$_.CreationTime } else { [DateTime]::MinValue } } }, `
          @{ Expression = { [int]$_.ProcessId } } `
          -Descending
    )
    $keep = $ordered[0]
    foreach ($dup in $ordered[1..($ordered.Count - 1)]) {
      if (Stop-Pid -ProcessId ([int]$dup.ProcessId)) {
        $duplicatesStopped += [int]$dup.ProcessId
      }
    }
    $managed = @($keep)
  }

  $startedPid = 0
  if ($managed.Count -lt 1) {
    $startedPid = Start-ManagedTunnelProcess `
      -ExecutablePath $cloudflaredExe `
      -HttpPort $Port `
      -CloudflaredLogPath $cloudflaredLogPath `
      -RepoRoot $repoRoot
    Start-Sleep -Milliseconds 900
    $managed = @(Get-ManagedTunnelProcesses -HttpPort $Port)
  }

  $activePid = if ($managed.Count -gt 0) { [int]$managed[0].ProcessId } else { 0 }
  Write-PidFile -Path $pidFilePath -ProcessId $activePid

  $tunnelUrl = Read-LatestTunnelUrlFromLog -Path $cloudflaredLogPath
  $healthOk = Test-TunnelUrlHealth -TunnelUrl $tunnelUrl -TimeoutSec 6
  $urlState = Update-UrlFileState -Path $urlFilePath -TunnelUrl $tunnelUrl -HealthOk:$healthOk

  if ($healthOk) {
    $consecutiveUnhealthy = 0
  } else {
    $consecutiveUnhealthy = $consecutiveUnhealthy + 1
  }

  $restartTriggered = $false
  if ($activePid -gt 0 -and $consecutiveUnhealthy -ge $restartThreshold) {
    if (Stop-Pid -ProcessId $activePid) {
      $restartTriggered = $true
    }
    Remove-PathIfExists -Path $pidFilePath
    Remove-PathIfExists -Path $urlFilePath
    $consecutiveUnhealthy = 0
  }

  $state = ("pid={0}; started={1}; duplicates_stopped={2}; url={3}; health_ok={4}; url_changed={5}; url_removed={6}; unhealthy_count={7}; restarted={8}" -f `
    $activePid,
    $startedPid,
    [string](@($duplicatesStopped) -join ","),
    [string]$tunnelUrl,
    [string]$healthOk,
    [string]$urlState.changed,
    [string]$urlState.removed,
    $consecutiveUnhealthy,
    [string]$restartTriggered)
  if ($state -ne $lastState) {
    Write-Log -Path $LogPath -Message $state
    $lastState = $state
  }

  if ($RunOnce.IsPresent) {
    break
  }
  if ((Get-Date) -ge $deadline) {
    Write-Log -Path $LogPath -Message "keeper_stop reason=max_hours_reached"
    break
  }
  Start-Sleep -Seconds $intervalSeconds
}

Write-Log -Path $LogPath -Message "keeper_exit"
