param(
  [int]$HttpPort = 4781,
  [int]$HttpsPort = 5443,
  [int]$OliPort = 8787,
  [int]$CheckIntervalSeconds = 300,
  [int]$MaxHours = 0,
  [string]$BridgeRoot = "",
  [string]$BridgeRoom = "asolaria_bridge",
  [string]$BridgeFrom = "vector",
  [string]$ThreadId = "asolaria-upgrade-20260301",
  [int]$OliAlertCooldownMinutes = 30,
  [int]$OliAlertCooldownSeconds = 0,
  [string]$LogPath = "",
  [string]$StatePath = "",
  [switch]$SkipOli,
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

function Read-MonitorState {
  param([string]$Path)
  $state = [ordered]@{
    loaded = $false
    lastMainOk = $null
    lastOliIssue = $null
    lastOliAlertAt = [DateTime]::MinValue
  }
  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    return [pscustomobject]$state
  }
  try {
    $raw = [string](Get-Content -LiteralPath $Path -Raw -ErrorAction Stop)
    if ([string]::IsNullOrWhiteSpace($raw)) {
      return [pscustomobject]$state
    }
    $parsed = $raw | ConvertFrom-Json -ErrorAction Stop
    if ($null -ne $parsed.lastMainOk) {
      $state.lastMainOk = [bool]$parsed.lastMainOk
    }
    if ($null -ne $parsed.lastOliIssue) {
      $state.lastOliIssue = [bool]$parsed.lastOliIssue
    }
    $lastAlertRaw = [string]$parsed.lastOliAlertAt
    if (-not [string]::IsNullOrWhiteSpace($lastAlertRaw)) {
      $parsedDate = [DateTime]::MinValue
      if ([DateTime]::TryParse($lastAlertRaw, [ref]$parsedDate)) {
        $state.lastOliAlertAt = $parsedDate
      }
    }
    $state.loaded = $true
  } catch {}
  return [pscustomobject]$state
}

function Write-MonitorState {
  param(
    [string]$Path,
    [object]$LastMainOk,
    [object]$LastOliIssue,
    [DateTime]$LastOliAlertAt,
    [object]$Probe
  )
  if ([string]::IsNullOrWhiteSpace($Path)) {
    return
  }
  $payload = [ordered]@{
    savedAt = (Get-Date).ToString("o")
    lastMainOk = if ($null -eq $LastMainOk) { $null } else { [bool]$LastMainOk }
    lastOliIssue = if ($null -eq $LastOliIssue) { $null } else { [bool]$LastOliIssue }
    lastOliAlertAt = if ($LastOliAlertAt -gt [DateTime]::MinValue) { $LastOliAlertAt.ToString("o") } else { "" }
    probe = [ordered]@{
      ok = [bool]$Probe.ok
      httpOk = [bool]$Probe.probes.asolariaHttp.ok
      httpsOk = [bool]$Probe.probes.asolariaHttps.ok
      oliOk = [bool]$Probe.probes.oliGateway.ok
      oliSkipped = [bool]$Probe.probes.oliGateway.skipped
    }
  }
  try {
    $dir = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($dir)) {
      Ensure-Dir -Path $dir
    }
    ($payload | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $Path -Encoding UTF8
  } catch {}
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

function Resolve-BridgeRootPath {
  param([string]$RepoRoot)
  if (-not [string]::IsNullOrWhiteSpace($BridgeRoot)) {
    return [string]$BridgeRoot
  }
  $defaultRoot = Join-Path (Split-Path -Parent $RepoRoot) "codex-bridge"
  return [string]$defaultRoot
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
    $out = & $Config.nodePath $Config.bridgeScript send `
      --url $Config.url `
      --token $Config.token `
      --room $BridgeRoom `
      --from $BridgeFrom `
      --textFile $tmp 2>&1
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

function Invoke-GuardrailProbe {
  param([string]$RepoRoot)
  $scriptPath = Join-Path $RepoRoot "tools\Test-Asolaria-HealthGuardrail.ps1"
  if (-not (Test-Path -LiteralPath $scriptPath)) {
    throw "Guardrail probe script not found: $scriptPath"
  }
  $args = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $scriptPath,
    "-HttpPort", "$HttpPort",
    "-HttpsPort", "$HttpsPort",
    "-OliPort", "$OliPort",
    "-TimeoutSec", "8",
    "-Json"
  )
  if ($SkipOli.IsPresent) {
    $args += "-SkipOli"
  }
  $raw = & powershell.exe @args
  if ($LASTEXITCODE -ne 0) {
    throw ("Guardrail probe command failed with exit code " + [string]$LASTEXITCODE)
  }
  return ($raw | ConvertFrom-Json)
}

$repoRoot = Get-AsolariaRoot
$logsDir = Join-Path $repoRoot "logs"
Ensure-Dir -Path $logsDir
if ([string]::IsNullOrWhiteSpace($LogPath)) {
  $LogPath = Join-Path $logsDir ("health-guardrail-monitor-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".log")
}
Ensure-Dir -Path (Split-Path -Parent $LogPath)
if ([string]::IsNullOrWhiteSpace($StatePath)) {
  $StatePath = Join-Path $logsDir "health-guardrail-monitor.state.json"
}
Ensure-Dir -Path (Split-Path -Parent $StatePath)

$bridge = Get-BridgeConfig -RepoRoot $repoRoot
$effectiveCooldownSeconds = if ($OliAlertCooldownSeconds -gt 0) { $OliAlertCooldownSeconds } else { [Math]::Max(60, ($OliAlertCooldownMinutes * 60)) }
$cooldown = [TimeSpan]::FromSeconds($effectiveCooldownSeconds)
$startedAt = Get-Date
$deadline = if ($MaxHours -gt 0) { $startedAt.AddHours([double]$MaxHours) } else { [DateTime]::MaxValue }

$lastMainOk = $null
$lastOliIssue = $null
$lastOliAlertAt = [DateTime]::MinValue
$stateRestored = Read-MonitorState -Path $StatePath
if ($null -ne $stateRestored.lastMainOk) {
  $lastMainOk = [bool]$stateRestored.lastMainOk
}
if ($null -ne $stateRestored.lastOliIssue) {
  $lastOliIssue = [bool]$stateRestored.lastOliIssue
}
if ([DateTime]$stateRestored.lastOliAlertAt -gt [DateTime]::MinValue) {
  $lastOliAlertAt = [DateTime]$stateRestored.lastOliAlertAt
}

Write-Log -Path $LogPath -Message ("monitor_start interval_s={0} max_hours={1} skip_oli={2} bridge_ok={3} cooldown_s={4} state_path={5} state_loaded={6}" -f $CheckIntervalSeconds, $MaxHours, [string]$SkipOli.IsPresent, [string]$bridge.ok, $effectiveCooldownSeconds, $StatePath, [string]$stateRestored.loaded)

while ($true) {
  $now = Get-Date
  if ($now -gt $deadline) {
    Write-Log -Path $LogPath -Message "monitor_stop reason=max_hours_reached"
    break
  }

  $probe = $null
  try {
    $probe = Invoke-GuardrailProbe -RepoRoot $repoRoot
  } catch {
    Write-Log -Path $LogPath -Message ("probe_error: " + $_.Exception.Message)
    if ($RunOnce.IsPresent) { break }
    Start-Sleep -Seconds ([Math]::Max(10, $CheckIntervalSeconds))
    continue
  }

  $mainOk = [bool]$probe.ok
  $httpOk = [bool]$probe.probes.asolariaHttp.ok
  $httpsOk = [bool]$probe.probes.asolariaHttps.ok
  $oliSkipped = [bool]($probe.probes.oliGateway.skipped)
  $oliOk = if ($oliSkipped) { $true } else { [bool]$probe.probes.oliGateway.ok }
  $oliIssue = (-not $oliSkipped) -and (-not $oliOk) -and $mainOk
  $notesText = [string](@($probe.notes) -join " | ")

  Write-Log -Path $LogPath -Message ("tick main_ok={0} http_ok={1} https_ok={2} oli_ok={3} notes={4}" -f [string]$mainOk, [string]$httpOk, [string]$httpsOk, [string]$oliOk, $notesText)

  if ($null -eq $lastMainOk) {
    $initialText = "@Asolaria @Oli #thread:$ThreadId HEALTH-GUARDRAIL INIT: main_ok=$mainOk http_ok=$httpOk https_ok=$httpsOk oli_ok=$oliOk."
    $sendInit = Send-BridgeMessage -Config $bridge -Text $initialText
    Write-Log -Path $LogPath -Message ("bridge_init ok={0} output={1}" -f [string]$sendInit.ok, [string]$sendInit.output)
  } elseif ($mainOk -ne [bool]$lastMainOk) {
    if (-not $mainOk) {
      $alertText = "@Asolaria @Oli #thread:$ThreadId HEALTH-GUARDRAIL ALERT: Asolaria health degraded. http_ok=$httpOk https_ok=$httpsOk http_err=$([string]$probe.probes.asolariaHttp.error) https_err=$([string]$probe.probes.asolariaHttps.error)"
      $sendAlert = Send-BridgeMessage -Config $bridge -Text $alertText
      Write-Log -Path $LogPath -Message ("bridge_alert ok={0} output={1}" -f [string]$sendAlert.ok, [string]$sendAlert.output)
    } else {
      $recoverText = "@Asolaria @Oli #thread:$ThreadId HEALTH-GUARDRAIL RECOVERY: Asolaria health restored on $HttpPort/$HttpsPort."
      $sendRecovery = Send-BridgeMessage -Config $bridge -Text $recoverText
      Write-Log -Path $LogPath -Message ("bridge_recovery ok={0} output={1}" -f [string]$sendRecovery.ok, [string]$sendRecovery.output)
    }
  }

  if ($oliIssue) {
    $elapsed = ($now - $lastOliAlertAt)
    $shouldSendOli = ($null -eq $lastOliIssue) -or (-not [bool]$lastOliIssue) -or ($elapsed -ge $cooldown)
    if ($shouldSendOli) {
      $oliText = "@Asolaria @Oli #thread:$ThreadId HEALTH-GUARDRAIL WARN: Oli status unavailable on $OliPort while Asolaria main is healthy. Keep probes on $HttpPort/$HttpsPort for core checks."
      $sendOli = Send-BridgeMessage -Config $bridge -Text $oliText
      Write-Log -Path $LogPath -Message ("bridge_oli_warn ok={0} output={1}" -f [string]$sendOli.ok, [string]$sendOli.output)
      $lastOliAlertAt = $now
    }
  }

  $lastMainOk = $mainOk
  $lastOliIssue = $oliIssue
  Write-MonitorState -Path $StatePath -LastMainOk $lastMainOk -LastOliIssue $lastOliIssue -LastOliAlertAt $lastOliAlertAt -Probe $probe

  if ($RunOnce.IsPresent) {
    Write-Log -Path $LogPath -Message "monitor_stop reason=run_once"
    break
  }
  Start-Sleep -Seconds ([Math]::Max(10, $CheckIntervalSeconds))
}
