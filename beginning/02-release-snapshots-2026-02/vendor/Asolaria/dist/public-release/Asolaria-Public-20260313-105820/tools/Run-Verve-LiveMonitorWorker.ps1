param(
  [Parameter(Mandatory = $true)]
  [string]$StatePath,
  [Parameter(Mandatory = $true)]
  [string]$StopSignalPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Directory {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Append-Ndjson {
  param(
    [string]$Path,
    [Parameter(Mandatory = $true)]$Value
  )
  $json = $Value | ConvertTo-Json -Depth 10 -Compress
  Add-Content -LiteralPath $Path -Value $json -Encoding UTF8
}

function Update-State {
  param(
    [string]$Path,
    [hashtable]$Patch
  )
  if (-not (Test-Path -LiteralPath $Path)) { return }
  try {
    $obj = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    foreach ($key in $Patch.Keys) {
      $obj | Add-Member -NotePropertyName $key -NotePropertyValue $Patch[$key] -Force
    }
    $obj | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $Path -Encoding UTF8
  } catch {}
}

function Resolve-VerveIps {
  param([string[]]$DomainNames)
  $acc = @()
  foreach ($d in $DomainNames) {
    if ([string]::IsNullOrWhiteSpace($d)) { continue }
    try {
      $addresses = [System.Net.Dns]::GetHostAddresses($d)
      foreach ($addr in $addresses) {
        if ($addr.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork) {
          $acc += [string]$addr.IPAddressToString
        }
      }
    } catch {}
  }
  return @($acc | Sort-Object -Unique)
}

if (-not (Test-Path -LiteralPath $StatePath)) {
  throw ("state_not_found: {0}" -f $StatePath)
}

$state = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
$sessionDir = [string]$state.sessionDir
$windowTitle = [string]$state.windowTitle
$windowId = 0
if ($state.windowId) {
  $windowId = [int]$state.windowId
}
$intervalSec = [int]$state.intervalSec
$domains = @($state.verveDomains)

if ($intervalSec -lt 1) { $intervalSec = 1 }

$captureWindowScript = Join-Path $PSScriptRoot "Capture-Window.ps1"
if (-not (Test-Path -LiteralPath $captureWindowScript)) {
  throw ("capture_window_script_missing: {0}" -f $captureWindowScript)
}
$captureScreenScript = Join-Path $PSScriptRoot "Capture-PrimaryScreen.ps1"
if (-not (Test-Path -LiteralPath $captureScreenScript)) {
  throw ("capture_primary_screen_script_missing: {0}" -f $captureScreenScript)
}

Ensure-Directory -Path $sessionDir
$snapDir = Join-Path $sessionDir "window-snaps"
Ensure-Directory -Path $snapDir

$networkLog = Join-Path $sessionDir "verve-network.ndjson"
$eventsLog = Join-Path $sessionDir "monitor-events.ndjson"

Update-State -Path $StatePath -Patch @{
  workerPid = [int]$PID
  workerStartedAt = (Get-Date).ToString("o")
  snapDir = $snapDir
  networkLog = $networkLog
  eventsLog = $eventsLog
}

Append-Ndjson -Path $eventsLog -Value @{
  ts = (Get-Date).ToString("o")
  type = "worker_started"
  pid = [int]$PID
  windowTitle = $windowTitle
  windowId = $windowId
  intervalSec = $intervalSec
  domains = $domains
}

$ipCache = Resolve-VerveIps -DomainNames $domains
$lastResolve = Get-Date
$lastNetworkProbe = Get-Date "2000-01-01T00:00:00Z"

try {
  while (-not (Test-Path -LiteralPath $StopSignalPath)) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
    $tsIso = (Get-Date).ToString("o")
    $snapPath = Join-Path $snapDir ("window-{0}.png" -f $stamp)

    try {
      $captureRaw = if ($windowId -gt 0) {
        & $captureWindowScript -OutputPath $snapPath -WindowId $windowId
      } else {
        & $captureWindowScript -OutputPath $snapPath -WindowTitle $windowTitle
      }
      $capture = $captureRaw | ConvertFrom-Json -ErrorAction Stop
      Append-Ndjson -Path $eventsLog -Value @{
        ts = $tsIso
        type = "window_capture_ok"
        path = $snapPath
        title = [string]$capture.title
        processName = [string]$capture.processName
        processId = [int]$capture.processId
      }
    } catch {
      $windowError = $_.Exception.Message
      if (Test-Path -LiteralPath $snapPath) {
        Remove-Item -LiteralPath $snapPath -Force -ErrorAction SilentlyContinue
      }
      $screenPath = Join-Path $snapDir ("screen-{0}.png" -f $stamp)
      try {
        & $captureScreenScript -OutputPath $screenPath | Out-Null
        Append-Ndjson -Path $eventsLog -Value @{
          ts = $tsIso
          type = "screen_capture_fallback_ok"
          path = $screenPath
          reason = $windowError
        }
      } catch {
        if (Test-Path -LiteralPath $screenPath) {
          Remove-Item -LiteralPath $screenPath -Force -ErrorAction SilentlyContinue
        }
        Append-Ndjson -Path $eventsLog -Value @{
          ts = $tsIso
          type = "screen_capture_fallback_error"
          reason = $windowError
          message = $_.Exception.Message
        }
      }
    }

    if (((Get-Date) - $lastNetworkProbe).TotalSeconds -ge 15) {
      try {
        if (((Get-Date) - $lastResolve).TotalSeconds -ge 60 -or @($ipCache).Count -eq 0) {
          $ipCache = Resolve-VerveIps -DomainNames $domains
          $lastResolve = Get-Date
        }
        $ips = @($ipCache)
        $connections = @()
        if ($ips.Count -gt 0) {
          $tcp = Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue |
            Where-Object { $ips -contains $_.RemoteAddress }
          foreach ($row in $tcp) {
            $procName = ""
            try {
              $procName = (Get-Process -Id $row.OwningProcess -ErrorAction Stop).ProcessName
            } catch {}
            $connections += [ordered]@{
              local = ("{0}:{1}" -f $row.LocalAddress, $row.LocalPort)
              remote = ("{0}:{1}" -f $row.RemoteAddress, $row.RemotePort)
              processId = [int]$row.OwningProcess
              processName = [string]$procName
              state = [string]$row.State
            }
          }
        }

        Append-Ndjson -Path $networkLog -Value @{
          ts = $tsIso
          domains = $domains
          ips = $ips
          connectionCount = @($connections).Count
          connections = $connections
        }
      } catch {
        Append-Ndjson -Path $eventsLog -Value @{
          ts = $tsIso
          type = "network_probe_error"
          message = $_.Exception.Message
        }
      } finally {
        $lastNetworkProbe = Get-Date
      }
    }

    Start-Sleep -Seconds $intervalSec
  }
} finally {
  Update-State -Path $StatePath -Patch @{
    workerExitedAt = (Get-Date).ToString("o")
  }
  Append-Ndjson -Path $eventsLog -Value @{
    ts = (Get-Date).ToString("o")
    type = "worker_stopped"
    pid = [int]$PID
  }
}
