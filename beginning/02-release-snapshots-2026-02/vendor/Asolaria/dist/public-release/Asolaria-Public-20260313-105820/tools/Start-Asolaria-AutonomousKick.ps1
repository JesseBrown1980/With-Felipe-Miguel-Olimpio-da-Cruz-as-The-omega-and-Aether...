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
  [string]$Tag = "main",
  [string]$ChatKickMessage = "continue tasks and continue asolaria work now; implement improvements, verify, and log evidence",
  [string]$RelayKickTemplate = "@Vector #thread:{THREAD} NOTE: kick {COUNT}. Continue all active Asolaria improvements now. Restart unhealthy services and keep moving without waiting."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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

$toolsRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$runnerPath = Join-Path $toolsRoot "Keep-Asolaria-AutonomousKick.ps1"
if (-not (Test-Path -LiteralPath $runnerPath)) {
  throw "Missing script: $runnerPath"
}

$safeTag = ($Tag -replace "[^a-zA-Z0-9._-]", "_").Trim("_")
if ([string]::IsNullOrWhiteSpace($safeTag)) {
  $safeTag = "main"
}

$logsDir = Join-Path (Split-Path -Parent $toolsRoot) "logs"
if (-not (Test-Path -LiteralPath $logsDir)) {
  New-Item -Path $logsDir -ItemType Directory -Force | Out-Null
}

$pidPath = Join-Path $logsDir ("asolaria-autonomous-kick-{0}.pid" -f $safeTag)
$outLog = Join-Path $logsDir ("asolaria-autonomous-kick-{0}.out.log" -f $safeTag)
$errLog = Join-Path $logsDir ("asolaria-autonomous-kick-{0}.err.log" -f $safeTag)

$existingPid = Read-Pid -Path $pidPath
if ($existingPid -and (Is-Running $existingPid)) {
  try {
    Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
  } catch {
    # no-op
  }
}

$ps = (Get-Command powershell.exe -ErrorAction Stop).Source
$args = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $runnerPath,
  "-MaxHours", $MaxHours,
  "-MinKickMinutes", $MinKickMinutes,
  "-MaxKickMinutes", $MaxKickMinutes,
  "-AsolariaPort", $AsolariaPort,
  "-BridgeRoot", $BridgeRoot,
  "-BridgeUrl", $BridgeUrl,
  "-Room", $Room,
  "-From", $From,
  "-Thread", $Thread
)

if ($PSBoundParameters.ContainsKey("ChatKickMessage")) {
  $args += @("-ChatKickMessage", $ChatKickMessage)
}
if ($PSBoundParameters.ContainsKey("RelayKickTemplate")) {
  $args += @("-RelayKickTemplate", $RelayKickTemplate)
}

$proc = Start-Process -FilePath $ps -ArgumentList $args -WorkingDirectory (Split-Path -Parent $toolsRoot) -NoNewWindow -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
Set-Content -LiteralPath $pidPath -Value $proc.Id -Encoding ASCII

Start-Sleep -Milliseconds 600
$running = Is-Running $proc.Id

[pscustomobject]@{
  ok = $running
  pid = $proc.Id
  tag = $safeTag
  pidPath = $pidPath
  outLog = $outLog
  errLog = $errLog
  maxHours = $MaxHours
  minKickMinutes = $MinKickMinutes
  maxKickMinutes = $MaxKickMinutes
  room = $Room
  thread = $Thread
} | ConvertTo-Json -Compress
