param(
  [int]$Port = 4781,
  [switch]$StopTunnel,
  [switch]$ClearUrl
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-RunningKeeperProcesses {
  $rows = @()
  try {
    $rows = @(Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction Stop)
  } catch {
    return @()
  }

  $signaturePattern = ('(?i)Keep-Asolaria-PublicTunnel\.ps1"\s+-Port\s+{0}(\s|$)' -f $Port)
  $result = @()
  foreach ($row in $rows) {
    $cmd = [string]$row.CommandLine
    if ([string]::IsNullOrWhiteSpace($cmd)) { continue }
    if ($cmd -notmatch $signaturePattern) { continue }
    $result += $row
  }
  return @($result)
}

function Get-ManagedTunnelProcesses {
  $rows = @()
  try {
    $rows = @(Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" -ErrorAction Stop)
  } catch {
    return @()
  }

  $urlPattern = ('(?i)--url\s+["'']?http://(127\.0\.0\.1|localhost):{0}(\b|/)' -f $Port)
  $result = @()
  foreach ($row in $rows) {
    $cmd = [string]$row.CommandLine
    if ([string]::IsNullOrWhiteSpace($cmd)) { continue }
    if ($cmd -notmatch '(?i)\btunnel\b') { continue }
    if ($cmd -notmatch $urlPattern) { continue }
    $result += $row
  }
  return @($result)
}

function Stop-RowProcesses {
  param([object[]]$Rows)
  $stopped = @()
  foreach ($row in @($Rows)) {
    $processId = [int]$row.ProcessId
    if ($processId -le 0) { continue }
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      $stopped += $processId
    } catch {
      # continue
    }
  }
  return @($stopped)
}

$repoRoot = Get-AsolariaRoot
$logsDir = Join-Path $repoRoot "logs"
$keeperPidFilePath = Join-Path $logsDir "public-tunnel-keeper.pid"
$tunnelPidFilePath = Join-Path $logsDir "cloudflared-asolaria.pid"
$urlFilePath = Join-Path $logsDir "cloudflared-asolaria-url.txt"

$keepers = @(Get-RunningKeeperProcesses)
if ($keepers.Count -eq 0) {
  Write-Host "No public tunnel keeper process is running."
} else {
  $stoppedKeepers = Stop-RowProcesses -Rows $keepers
  foreach ($stoppedProcessId in $stoppedKeepers) {
    Write-Host ("Stopped public tunnel keeper pid={0}" -f $stoppedProcessId)
  }
}

if (Test-Path -LiteralPath $keeperPidFilePath) {
  Remove-Item -LiteralPath $keeperPidFilePath -Force -ErrorAction SilentlyContinue
}

if ($StopTunnel.IsPresent) {
  $tunnels = @(Get-ManagedTunnelProcesses)
  if ($tunnels.Count -eq 0) {
    Write-Host "No managed public cloudflared tunnel process is running."
  } else {
    $stoppedTunnels = Stop-RowProcesses -Rows $tunnels
    foreach ($stoppedProcessId in $stoppedTunnels) {
      Write-Host ("Stopped managed cloudflared pid={0}" -f $stoppedProcessId)
    }
  }
  if (Test-Path -LiteralPath $tunnelPidFilePath) {
    Remove-Item -LiteralPath $tunnelPidFilePath -Force -ErrorAction SilentlyContinue
  }
}

if ($ClearUrl.IsPresent -and (Test-Path -LiteralPath $urlFilePath)) {
  Remove-Item -LiteralPath $urlFilePath -Force -ErrorAction SilentlyContinue
  Write-Host ("Removed tunnel URL file: {0}" -f $urlFilePath)
}
