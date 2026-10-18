param(
  [int]$Port = 4781
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Resolve-NodePath {
  try {
    $cmd = Get-Command node -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {}
  foreach ($candidate in @("C:\nvm4w\nodejs\node.exe", "C:\Program Files\nodejs\node.exe")) {
    if (Test-Path $candidate) { return $candidate }
  }
  throw "Node executable not found."
}

function Test-AppHealth {
  param(
    [int]$PortToCheck,
    [int]$TimeoutSec = 2
  )
  try {
    $null = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/health/fast" -f $PortToCheck) -TimeoutSec $TimeoutSec
    return $true
  } catch {
    return $false
  }
}

function Get-AsolariaServerProcessIds {
  param(
    [string]$Root
  )
  try {
    $rows = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
      Where-Object { $_.CommandLine -like "*$Root*server.js*" }
    return @($rows | ForEach-Object { [int]$_.ProcessId } | Sort-Object -Unique)
  } catch {
    return @()
  }
}

function Get-ListeningProcessIdsForPort {
  param(
    [int]$PortToCheck
  )
  $ids = @()

  # Preferred path: locale-agnostic listener lookup.
  try {
    $rows = Get-NetTCPConnection -LocalPort $PortToCheck -State Listen -ErrorAction Stop
    foreach ($row in @($rows)) {
      $listenerPid = 0
      if ([int]::TryParse([string]$row.OwningProcess, [ref]$listenerPid) -and $listenerPid -gt 0) {
        $ids += $listenerPid
      }
    }
  } catch {
    # Fallback for hosts where Get-NetTCPConnection is unavailable/restricted.
    try {
      $rows = netstat -ano | Select-String (":{0}\s" -f $PortToCheck)
      foreach ($row in $rows) {
        $parts = ($row.Line -split "\s+") | Where-Object { $_ }
        if ($parts.Count -lt 5) { continue }
        $state = [string]$parts[3]
        if ($state -notmatch "^(LISTENING|ESCUTANDO)$") { continue }
        $listenerPid = 0
        if ([int]::TryParse($parts[4], [ref]$listenerPid) -and $listenerPid -gt 0) {
          $ids += $listenerPid
        }
      }
    } catch {}
  }

  return @($ids | Sort-Object -Unique)
}

function Stop-ProcessIdsSafe {
  param(
    [int[]]$Ids
  )
  foreach ($targetPid in @($Ids | Sort-Object -Unique)) {
    if ($targetPid -lt 1) { continue }
    try {
      Stop-Process -Id $targetPid -Force -ErrorAction Stop
    } catch {
      Write-Warning ("Failed to stop PID {0}: {1}" -f $targetPid, $_.Exception.Message)
    }
  }
}

function Wait-ForPortClose {
  param(
    [int]$PortToCheck,
    [int]$MaxSeconds = 15
  )
  $deadline = (Get-Date).AddSeconds($MaxSeconds)
  while ((Get-Date) -lt $deadline) {
    $active = @(Get-ListeningProcessIdsForPort -PortToCheck $PortToCheck)
    if ($active.Count -lt 1) {
      return $true
    }
    Start-Sleep -Milliseconds 300
  }
  return (@(Get-ListeningProcessIdsForPort -PortToCheck $PortToCheck).Count -lt 1)
}

function Start-AsolariaServer {
  param(
    [string]$Root,
    [string]$NodePath
  )
  $entry = Join-Path $Root "server.js"
  $logDir = Join-Path $Root "logs"
  New-Item -Path $logDir -ItemType Directory -Force | Out-Null
  $stdoutLog = Join-Path $logDir "server.out.log"
  $stderrLog = Join-Path $logDir "server.err.log"
  $proc = Start-Process -FilePath $NodePath `
    -ArgumentList "`"$entry`"" `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog
  return [int]$proc.Id
}

function Wait-ForHealth {
  param(
    [int]$PortToCheck,
    [int]$MaxSeconds = 45
  )
  $deadline = (Get-Date).AddSeconds($MaxSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-AppHealth -PortToCheck $PortToCheck -TimeoutSec 2) {
      return $true
    }
    Start-Sleep -Milliseconds 600
  }
  return $false
}

$root = Get-AsolariaRoot
$nodePath = Resolve-NodePath

$commandLinePids = Get-AsolariaServerProcessIds -Root $root
$portPids = Get-ListeningProcessIdsForPort -PortToCheck $Port
$httpsPortPids = Get-ListeningProcessIdsForPort -PortToCheck 5443
$allStopPids = @((@($commandLinePids) + @($portPids) + @($httpsPortPids)) | Sort-Object -Unique)
if ($allStopPids.Count -gt 0) {
  Stop-ProcessIdsSafe -Ids $allStopPids
  [void](Wait-ForPortClose -PortToCheck $Port -MaxSeconds 20)
}

$newPid = Start-AsolariaServer -Root $root -NodePath $nodePath
$healthy = Wait-ForHealth -PortToCheck $Port -MaxSeconds 50
if (-not $healthy) {
  throw "Asolaria failed to become healthy on port $Port after restart. PID=$newPid"
}

$listenerPids = @(Get-ListeningProcessIdsForPort -PortToCheck $Port)
if ($listenerPids.Count -lt 1) {
  throw "Asolaria health responded, but no listener was detected on port $Port. PID=$newPid"
}
if ($listenerPids -notcontains $newPid) {
  throw ("Asolaria health responded on port {0}, but listener owner mismatch. Expected new PID {1}; active listener PID(s): {2}. Existing protected listener may still be active." -f $Port, $newPid, (($listenerPids -join ", ")))
}

Write-Output "Asolaria main restarted on port $Port (pid=$newPid)."
