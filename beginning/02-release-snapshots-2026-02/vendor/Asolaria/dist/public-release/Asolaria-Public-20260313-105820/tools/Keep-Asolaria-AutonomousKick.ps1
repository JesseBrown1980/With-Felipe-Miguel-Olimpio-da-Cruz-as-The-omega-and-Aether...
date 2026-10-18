param(
  [int]$MaxHours = 3,
  [int]$MinKickMinutes = 15,
  [int]$MaxKickMinutes = 20,
  [int]$AsolariaPort = 4781,
  [string]$BridgeRoot = "C:\Users\acer\codex-bridge",
  [string]$BridgeUrl = "http://127.0.0.1:8788",
  [string]$Room = "asolaria_bridge",
  [string]$From = "vector",
  [string]$Thread = "",
  [string]$ChatKickMessage = "continue tasks and continue asolaria work now; implement improvements, verify, and log evidence",
  [string]$RelayKickTemplate = "@Vector #thread:{THREAD} NOTE: kick {COUNT}. Continue all active Asolaria improvements now. Restart unhealthy services and keep moving without waiting.",
  [string]$LogPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Directory {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Path cannot be empty."
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Write-LoopLog {
  param(
    [string]$Path,
    [string]$Message
  )
  $line = "[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $Path -Value $line -Encoding UTF8
}

function Read-TextFileSafe {
  param([string]$Path)
  try {
    return (Get-Content -LiteralPath $Path -Raw -ErrorAction Stop).Trim()
  } catch {
    return ""
  }
}

function Read-RelayToken {
  param([string]$Root)
  $tokenPathPrimary = Join-Path $Root "bridge-token2.txt"
  $tokenPathFallback = Join-Path $Root "bridge-token.txt"
  $tokenPath = if (Test-Path -LiteralPath $tokenPathPrimary) { $tokenPathPrimary } else { $tokenPathFallback }
  $token = Read-TextFileSafe -Path $tokenPath
  if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Bridge token is missing."
  }
  return $token
}

function Resolve-BridgeBaseUrl {
  param(
    [string]$Root,
    [string]$Preferred
  )

  $candidates = @()
  if (-not [string]::IsNullOrWhiteSpace($Preferred)) {
    $candidates += $Preferred.Trim()
  }
  $tunnelPath = Join-Path $Root "bridge-tunnel-url.txt"
  $tunnel = Read-TextFileSafe -Path $tunnelPath
  if (-not [string]::IsNullOrWhiteSpace($tunnel)) {
    $candidates += $tunnel
  }
  $candidates += "http://127.0.0.1:8788"

  foreach ($candidate in $candidates) {
    try {
      $null = Invoke-RestMethod -Method Get -Uri ("{0}/health" -f $candidate.TrimEnd("/")) -TimeoutSec 6
      return $candidate.TrimEnd("/")
    } catch {
      continue
    }
  }

  return ""
}

function Test-AsolariaHealth {
  param([int]$Port)
  try {
    $health = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/health/fast" -f $Port) -TimeoutSec 6
    if ($null -eq $health) {
      return $false
    }
    return [bool]$health.ok
  } catch {
    return $false
  }
}

function Ensure-AsolariaHealthy {
  param(
    [string]$Root,
    [int]$Port
  )
  if (Test-AsolariaHealth -Port $Port) {
    return "healthy"
  }

  $restartScript = Join-Path $Root "tools\Restart-Asolaria-Main.ps1"
  if (-not (Test-Path -LiteralPath $restartScript)) {
    return "restart_script_missing"
  }

  try {
    & $restartScript -Port $Port | Out-Null
  } catch {
    return ("restart_failed: " + $_.Exception.Message)
  }

  Start-Sleep -Seconds 4
  if (Test-AsolariaHealth -Port $Port) {
    return "recovered_via_restart"
  }
  return "still_unhealthy"
}

function Ensure-BridgeWatchdog {
  param([string]$Root)
  $bridgectl = Join-Path $Root "bridgectl.ps1"
  if (-not (Test-Path -LiteralPath $bridgectl)) {
    return "bridgectl_missing"
  }
  try {
    & $bridgectl -Command start | Out-Null
    return "watchdog_start_ok"
  } catch {
    return ("watchdog_start_failed: " + $_.Exception.Message)
  }
}

function Send-RelayKick {
  param(
    [string]$BaseUrl,
    [string]$Token,
    [string]$RoomName,
    [string]$FromName,
    [string]$Text
  )
  $headers = @{ Authorization = "Bearer $Token" }
  $body = @{
    from = $FromName
    text = $Text
  } | ConvertTo-Json -Compress
  return Invoke-RestMethod -Method Post -Uri ("{0}/rooms/{1}/messages" -f $BaseUrl.TrimEnd("/"), $RoomName) -Headers $headers -ContentType "application/json" -Body $body -TimeoutSec 12
}

function Send-ChatKick {
  param(
    [int]$Port,
    [string]$Message
  )
  $body = @{
    message = $Message
  } | ConvertTo-Json -Compress
  return Invoke-RestMethod -Method Post -Uri ("http://127.0.0.1:{0}/api/chat" -f $Port) -ContentType "application/json" -Body $body -TimeoutSec 20
}

if ($MinKickMinutes -lt 1) {
  throw "MinKickMinutes must be >= 1."
}
if ($MaxKickMinutes -lt $MinKickMinutes) {
  throw "MaxKickMinutes must be >= MinKickMinutes."
}
if ($MaxHours -lt 1) {
  throw "MaxHours must be >= 1."
}

$asolariaRoot = Get-AsolariaRoot
$logsDir = Join-Path $asolariaRoot "logs"
Ensure-Directory -Path $logsDir

if ([string]::IsNullOrWhiteSpace($Thread)) {
  $Thread = "asolaria-autokick-{0}" -f (Get-Date).ToString("yyyyMMdd-HHmm")
}
if ([string]::IsNullOrWhiteSpace($LogPath)) {
  $LogPath = Join-Path $logsDir ("asolaria-autonomous-kick-{0}.log" -f (Get-Date).ToString("yyyyMMdd-HHmmss"))
}

$token = Read-RelayToken -Root $BridgeRoot
$deadline = (Get-Date).AddHours($MaxHours)
$count = 0

Write-LoopLog -Path $LogPath -Message ("start maxHours={0} minKick={1}m maxKick={2}m port={3} room={4} thread={5}" -f $MaxHours, $MinKickMinutes, $MaxKickMinutes, $AsolariaPort, $Room, $Thread)

while ((Get-Date) -lt $deadline) {
  $count += 1

  $healthStatus = Ensure-AsolariaHealthy -Root $asolariaRoot -Port $AsolariaPort
  $watchdogStatus = Ensure-BridgeWatchdog -Root $BridgeRoot
  $bridgeBase = Resolve-BridgeBaseUrl -Root $BridgeRoot -Preferred $BridgeUrl

  $relayState = "skip:no_bridge"
  if (-not [string]::IsNullOrWhiteSpace($bridgeBase)) {
    $relayText = $RelayKickTemplate.Replace("{THREAD}", $Thread).Replace("{COUNT}", [string]$count)
    try {
      $relayResp = Send-RelayKick -BaseUrl $bridgeBase -Token $token -RoomName $Room -FromName $From -Text $relayText
      $relayId = ""
      if ($null -ne $relayResp) {
        $idProp = $relayResp.PSObject.Properties["id"]
        if ($null -ne $idProp -and -not [string]::IsNullOrWhiteSpace([string]$idProp.Value)) {
          $relayId = [string]$idProp.Value
        }
      }
      $relayState = if ($relayId) {
        "sent:id={0}" -f $relayId
      } else {
        "sent"
      }
    } catch {
      $relayState = "send_failed:{0}" -f $_.Exception.Message
    }
  }

  $chatState = "not_sent"
  try {
    $chatResp = Send-ChatKick -Port $AsolariaPort -Message $ChatKickMessage
    $chatMode = ""
    if ($null -ne $chatResp -and $null -ne $chatResp.mode) {
      $chatMode = [string]$chatResp.mode
    }
    $chatModeLabel = "unknown"
    if (-not [string]::IsNullOrWhiteSpace($chatMode)) {
      $chatModeLabel = $chatMode
    }
    $chatState = "sent:mode={0}" -f $chatModeLabel
  } catch {
    $chatState = "send_failed:{0}" -f $_.Exception.Message
  }

  $bridgeLabel = "none"
  if (-not [string]::IsNullOrWhiteSpace($bridgeBase)) {
    $bridgeLabel = $bridgeBase
  }
  Write-LoopLog -Path $LogPath -Message ("tick={0} asolaria={1} watchdog={2} bridge={3} relay={4} chat={5}" -f $count, $healthStatus, $watchdogStatus, $bridgeLabel, $relayState, $chatState)

  $sleepSecondsMin = $MinKickMinutes * 60
  $sleepSecondsMaxInclusive = ($MaxKickMinutes * 60) + 1
  $sleepSeconds = Get-Random -Minimum $sleepSecondsMin -Maximum $sleepSecondsMaxInclusive
  Write-LoopLog -Path $LogPath -Message ("sleep_seconds={0}" -f $sleepSeconds)
  Start-Sleep -Seconds $sleepSeconds
}

Write-LoopLog -Path $LogPath -Message "stop reason=deadline_reached"
