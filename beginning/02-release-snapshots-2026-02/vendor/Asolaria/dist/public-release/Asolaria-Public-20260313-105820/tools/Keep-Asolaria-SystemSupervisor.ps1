param(
  [int]$CheckIntervalSeconds = 60,
  [int]$MaxHours = 0,
  [double]$MemoryWarnPercent = 80,
  [double]$CpuWarnPercent = 85,
  [double]$GpuWarnPercent = 90,
  [int]$AlertCooldownSeconds = 600,
  [int]$TopProcessCount = 6,
  [string]$BridgeRoot = "",
  [string]$BridgeRoom = "asolaria_bridge",
  [string]$BridgeFrom = "vector",
  [string]$ThreadId = "asolaria-system-supervisor-20260302",
  [string]$LogPath = "",
  [string]$StatePath = "",
  [switch]$RunOnce
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Path cannot be empty."
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Write-Log {
  param(
    [string]$Path,
    [string]$Message
  )
  $stamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
  Add-Content -Path $Path -Encoding UTF8 -Value ("[{0}] {1}" -f $stamp, [string]$Message)
}

function Resolve-NodePath {
  try {
    $cmd = Get-Command node -ErrorAction Stop
    if ($cmd.Source) { return [string]$cmd.Source }
    if ($cmd.Path) { return [string]$cmd.Path }
  } catch {}
  foreach ($candidate in @("C:\nvm4w\nodejs\node.exe", "C:\Program Files\nodejs\node.exe")) {
    if (Test-Path -LiteralPath $candidate) {
      return [string]$candidate
    }
  }
  return ""
}

function Read-FirstAvailableFileValue {
  param([string[]]$Paths)
  foreach ($path in @($Paths)) {
    if ([string]::IsNullOrWhiteSpace($path)) { continue }
    if (-not (Test-Path -LiteralPath $path)) { continue }
    try {
      $value = [string](Get-Content -LiteralPath $path -Raw -ErrorAction Stop).Trim()
      if (-not [string]::IsNullOrWhiteSpace($value)) {
        return $value
      }
    } catch {}
  }
  return ""
}

function Resolve-BridgeRootPath {
  param([string]$RepoRoot)
  if (-not [string]::IsNullOrWhiteSpace($BridgeRoot)) {
    return [string]$BridgeRoot
  }
  return [string](Join-Path (Split-Path -Parent $RepoRoot) "codex-bridge")
}

function Get-BridgeConfig {
  param([string]$RepoRoot)
  $root = Resolve-BridgeRootPath -RepoRoot $RepoRoot
  $nodePath = Resolve-NodePath
  $bridgeScript = if (-not [string]::IsNullOrWhiteSpace($root)) { Join-Path $root "bridge.js" } else { "" }
  $url = [string]([Environment]::GetEnvironmentVariable("ASOLARIA_CODEX_BRIDGE_URL", "Process"))
  if ([string]::IsNullOrWhiteSpace($url)) {
    $url = [string]([Environment]::GetEnvironmentVariable("ASOLARIA_CODEX_BRIDGE_URL", "User"))
  }
  if ([string]::IsNullOrWhiteSpace($url)) {
    $url = "http://127.0.0.1:8788"
  }
  $tokenPaths = @()
  if (-not [string]::IsNullOrWhiteSpace($root)) {
    $tokenPaths += (Join-Path $root "bridge-token2.txt")
    $tokenPaths += (Join-Path $root "bridge-token.txt")
  }
  $token = Read-FirstAvailableFileValue -Paths $tokenPaths
  $senderToken = ""
  $policyPath = if (-not [string]::IsNullOrWhiteSpace($root)) { Join-Path $root "airlock-policy.json" } else { "" }
  if (-not [string]::IsNullOrWhiteSpace($policyPath) -and (Test-Path -LiteralPath $policyPath)) {
    try {
      $policy = Get-Content -LiteralPath $policyPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
      $senderToken = [string]$policy.senderTokens.$BridgeFrom
    } catch {}
  }
  $ok = -not [string]::IsNullOrWhiteSpace($nodePath) `
    -and -not [string]::IsNullOrWhiteSpace($bridgeScript) `
    -and (Test-Path -LiteralPath $bridgeScript) `
    -and -not [string]::IsNullOrWhiteSpace($token)

  return [pscustomobject]@{
    ok = [bool]$ok
    root = [string]$root
    nodePath = [string]$nodePath
    bridgeScript = [string]$bridgeScript
    url = [string]$url
    token = [string]$token
    senderToken = [string]$senderToken
  }
}

function Send-BridgeMessage {
  param(
    [object]$Config,
    [string]$Text
  )
  if ($null -eq $Config -or -not [bool]$Config.ok) {
    return [pscustomobject]@{
      ok = $false
      output = "bridge_config_unavailable"
    }
  }
  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    Set-Content -LiteralPath $tmp -Value ([string]$Text) -NoNewline -Encoding UTF8
    $argList = @(
      $Config.bridgeScript,
      "send",
      "--url", $Config.url,
      "--token", $Config.token,
      "--room", $BridgeRoom,
      "--from", $BridgeFrom,
      "--textFile", $tmp
    )
    if (-not [string]::IsNullOrWhiteSpace([string]$Config.senderToken)) {
      $argList += @("--senderToken", [string]$Config.senderToken)
    }
    $out = & $Config.nodePath @argList 2>&1
    return [pscustomobject]@{
      ok = [bool]($LASTEXITCODE -eq 0)
      output = [string](@($out) -join " ")
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      output = $_.Exception.Message
    }
  } finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
}

function Read-State {
  param([string]$Path)

  $defaultState = [ordered]@{
    savedAt = ""
    inAlert = $false
    lastAlertAt = ""
    lastAlertTypes = @()
    initSent = $false
    latestTickAt = ""
    latestSnapshot = [ordered]@{}
    thresholds = [ordered]@{}
  }
  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    return [pscustomobject]$defaultState
  }

  try {
    $raw = [string](Get-Content -LiteralPath $Path -Raw -ErrorAction Stop)
    if ([string]::IsNullOrWhiteSpace($raw)) {
      return [pscustomobject]$defaultState
    }
    $parsed = $raw | ConvertFrom-Json -ErrorAction Stop
    return [pscustomobject]@{
      savedAt = [string]$parsed.savedAt
      inAlert = [bool]$parsed.inAlert
      lastAlertAt = [string]$parsed.lastAlertAt
      lastAlertTypes = @($parsed.lastAlertTypes)
      initSent = [bool]$parsed.initSent
      latestTickAt = [string]$parsed.latestTickAt
      latestSnapshot = if ($null -ne $parsed.latestSnapshot) { $parsed.latestSnapshot } else { [pscustomobject]@{} }
      thresholds = if ($null -ne $parsed.thresholds) { $parsed.thresholds } else { [pscustomobject]@{} }
    }
  } catch {
    return [pscustomobject]$defaultState
  }
}

function Write-State {
  param(
    [string]$Path,
    [bool]$InAlert,
    [DateTime]$LastAlertAt,
    [string[]]$LastAlertTypes,
    [bool]$InitSent,
    [string]$LatestTickAt = "",
    [object]$LatestSnapshot = $null,
    [object]$Thresholds = $null
  )
  if ([string]::IsNullOrWhiteSpace($Path)) {
    return
  }
  $payload = [ordered]@{
    savedAt = (Get-Date).ToString("o")
    inAlert = [bool]$InAlert
    lastAlertAt = if ($LastAlertAt -gt [DateTime]::MinValue) { $LastAlertAt.ToString("o") } else { "" }
    lastAlertTypes = @($LastAlertTypes)
    initSent = [bool]$InitSent
    latestTickAt = [string]$LatestTickAt
    latestSnapshot = if ($null -ne $LatestSnapshot) { $LatestSnapshot } else { [ordered]@{} }
    thresholds = if ($null -ne $Thresholds) { $Thresholds } else { [ordered]@{} }
  }
  try {
    $dir = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($dir)) {
      Ensure-Dir -Path $dir
    }
    ($payload | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $Path -Encoding UTF8
  } catch {}
}

function Get-InstantCpuPercent {
  try {
    return [math]::Round((Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction Stop).CounterSamples[0].CookedValue, 1)
  } catch {
    return 0
  }
}

function Get-MaxGpuPercent {
  try {
    $counter = Get-Counter '\GPU Engine(*)\Utilization Percentage' -ErrorAction Stop
    $samples = @($counter.CounterSamples | Where-Object { $_.CookedValue -gt 0 })
    if ($samples.Count -lt 1) {
      return 0
    }
    $max = ($samples | Measure-Object -Property CookedValue -Maximum).Maximum
    return [math]::Round([double]$max, 1)
  } catch {
    return 0
  }
}

function Get-TopProcessSummary {
  param([int]$Count)
  $rows = @()
  try {
    $rows = @(
      Get-Process |
        Sort-Object WS -Descending |
        Select-Object -First $Count ProcessName, Id, WS, PM
    )
  } catch {
    return ""
  }
  $items = @(
    $rows | ForEach-Object {
      $ws = [math]::Round(([double]$_.WS / 1MB), 1)
      "{0}#{1}({2}MB)" -f [string]$_.ProcessName, [int]$_.Id, $ws
    }
  )
  return [string](@($items) -join ", ")
}

function Get-Snapshot {
  $os = Get-CimInstance Win32_OperatingSystem
  $totalGB = [math]::Round(([double]$os.TotalVisibleMemorySize / 1MB), 2)
  $freeGB = [math]::Round(([double]$os.FreePhysicalMemory / 1MB), 2)
  $usedGB = [math]::Round(($totalGB - $freeGB), 2)
  $usedPct = if ($totalGB -gt 0) { [math]::Round((($usedGB / $totalGB) * 100), 1) } else { 0 }
  $cpuPct = Get-InstantCpuPercent
  $gpuPct = Get-MaxGpuPercent
  $top = Get-TopProcessSummary -Count ([Math]::Max(3, $TopProcessCount))

  return [pscustomobject]@{
    totalGB = $totalGB
    usedGB = $usedGB
    freeGB = $freeGB
    memoryUsedPct = $usedPct
    cpuPct = $cpuPct
    gpuPct = $gpuPct
    topProcesses = $top
  }
}

$repoRoot = Get-AsolariaRoot
$logsDir = Join-Path $repoRoot "logs"
Ensure-Dir -Path $logsDir
if ([string]::IsNullOrWhiteSpace($LogPath)) {
  $LogPath = Join-Path $logsDir ("system-supervisor-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".log")
}
Ensure-Dir -Path (Split-Path -Parent $LogPath)
if ([string]::IsNullOrWhiteSpace($StatePath)) {
  $StatePath = Join-Path $logsDir "system-supervisor.state.json"
}
Ensure-Dir -Path (Split-Path -Parent $StatePath)

$bridge = Get-BridgeConfig -RepoRoot $repoRoot
$state = Read-State -Path $StatePath
$inAlert = [bool]$state.inAlert
$initSent = [bool]$state.initSent
$lastAlertTypes = @($state.lastAlertTypes)
$lastAlertAt = [DateTime]::MinValue
if (-not [string]::IsNullOrWhiteSpace([string]$state.lastAlertAt)) {
  $parsedAlertAt = [DateTime]::MinValue
  if ([DateTime]::TryParse([string]$state.lastAlertAt, [ref]$parsedAlertAt)) {
    $lastAlertAt = $parsedAlertAt
  }
}

$deadline = if ($MaxHours -gt 0) { (Get-Date).AddHours([double]$MaxHours) } else { [DateTime]::MaxValue }
$cooldown = [TimeSpan]::FromSeconds([Math]::Max(30, $AlertCooldownSeconds))
$thresholds = [ordered]@{
  memoryWarnPercent = [double]$MemoryWarnPercent
  cpuWarnPercent = [double]$CpuWarnPercent
  gpuWarnPercent = [double]$GpuWarnPercent
  checkIntervalSeconds = [int]$CheckIntervalSeconds
  alertCooldownSeconds = [int]$AlertCooldownSeconds
  topProcessCount = [int]$TopProcessCount
}

Write-Log -Path $LogPath -Message ("monitor_start interval_s={0} max_hours={1} memory_warn={2} cpu_warn={3} gpu_warn={4} cooldown_s={5} bridge_ok={6}" -f $CheckIntervalSeconds, $MaxHours, $MemoryWarnPercent, $CpuWarnPercent, $GpuWarnPercent, $AlertCooldownSeconds, [string]$bridge.ok)

while ($true) {
  $now = Get-Date
  if ($now -gt $deadline) {
    Write-Log -Path $LogPath -Message "monitor_stop reason=max_hours_reached"
    break
  }

  $snapshot = $null
  try {
    $snapshot = Get-Snapshot
  } catch {
    Write-Log -Path $LogPath -Message ("snapshot_error: " + $_.Exception.Message)
    if ($RunOnce.IsPresent) { break }
    Start-Sleep -Seconds ([Math]::Max(10, $CheckIntervalSeconds))
    continue
  }

  $alertTypes = [System.Collections.Generic.List[string]]::new()
  if ([double]$snapshot.memoryUsedPct -ge $MemoryWarnPercent) { $alertTypes.Add("memory") }
  if ([double]$snapshot.cpuPct -ge $CpuWarnPercent) { $alertTypes.Add("cpu") }
  if ([double]$snapshot.gpuPct -ge $GpuWarnPercent) { $alertTypes.Add("gpu") }
  $currentAlertTypes = @($alertTypes)
  $hasAlert = ($currentAlertTypes.Count -gt 0)

  Write-Log -Path $LogPath -Message ("tick mem_pct={0} cpu_pct={1} gpu_pct={2} alert={3} alert_types={4}" -f $snapshot.memoryUsedPct, $snapshot.cpuPct, $snapshot.gpuPct, [string]$hasAlert, [string](@($currentAlertTypes) -join ","))

  if (-not $initSent) {
    $initText = "@Asolaria @Oli #thread:$ThreadId SYSTEM-SUPERVISOR INIT: thresholds memory>=$MemoryWarnPercent cpu>=$CpuWarnPercent gpu>=$GpuWarnPercent interval=${CheckIntervalSeconds}s."
    $sendInit = Send-BridgeMessage -Config $bridge -Text $initText
    Write-Log -Path $LogPath -Message ("bridge_init ok={0} output={1}" -f [string]$sendInit.ok, [string]$sendInit.output)
    $initSent = $true
  }

  $sendAlert = $false
  if ($hasAlert) {
    $elapsed = ($now - $lastAlertAt)
    $typesChanged = [string](@($currentAlertTypes | Sort-Object) -join ",") -ne [string](@($lastAlertTypes | Sort-Object) -join ",")
    if (-not $inAlert -or $typesChanged -or $elapsed -ge $cooldown) {
      $sendAlert = $true
    }
  }

  if ($sendAlert) {
    $alertText = "@Asolaria @Oli #thread:$ThreadId SYSTEM-SUPERVISOR ALERT: mem=$($snapshot.memoryUsedPct)% cpu=$($snapshot.cpuPct)% gpu=$($snapshot.gpuPct)% types=$([string](@($currentAlertTypes) -join ',')) top_ws=$($snapshot.topProcesses)"
    $send = Send-BridgeMessage -Config $bridge -Text $alertText
    Write-Log -Path $LogPath -Message ("bridge_alert ok={0} output={1}" -f [string]$send.ok, [string]$send.output)
    $lastAlertAt = $now
  }

  if (-not $hasAlert -and $inAlert) {
    $recoverText = "@Asolaria @Oli #thread:$ThreadId SYSTEM-SUPERVISOR RECOVERY: mem=$($snapshot.memoryUsedPct)% cpu=$($snapshot.cpuPct)% gpu=$($snapshot.gpuPct)% back within configured thresholds."
    $sendRecover = Send-BridgeMessage -Config $bridge -Text $recoverText
    Write-Log -Path $LogPath -Message ("bridge_recovery ok={0} output={1}" -f [string]$sendRecover.ok, [string]$sendRecover.output)
  }

  $inAlert = $hasAlert
  $lastAlertTypes = @($currentAlertTypes)
  Write-State `
    -Path $StatePath `
    -InAlert $inAlert `
    -LastAlertAt $lastAlertAt `
    -LastAlertTypes $lastAlertTypes `
    -InitSent $initSent `
    -LatestTickAt $now.ToString("o") `
    -LatestSnapshot $snapshot `
    -Thresholds $thresholds

  if ($RunOnce.IsPresent) {
    Write-Log -Path $LogPath -Message "monitor_stop reason=run_once"
    break
  }
  Start-Sleep -Seconds ([Math]::Max(10, $CheckIntervalSeconds))
}
