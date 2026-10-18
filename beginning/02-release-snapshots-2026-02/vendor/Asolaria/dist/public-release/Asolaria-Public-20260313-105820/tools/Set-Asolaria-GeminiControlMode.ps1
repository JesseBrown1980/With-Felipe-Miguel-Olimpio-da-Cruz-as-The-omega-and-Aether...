[CmdletBinding()]
param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$GeminiModel = "gemini-2.0-flash",
  [switch]$LockPrimaryProvider = $true,
  [switch]$EnableSwarmAutoDispatch = $true,
  [switch]$EnableSuperSwarm = $true,
  [int]$SuperSwarmAgentFanout = 3,
  [string]$SuperSwarmMission = "qdd",
  [switch]$EnableBridgeAutoSync = $true,
  [switch]$EnableColonyWatchdog = $true,
  [string]$OutDir = "",
  [switch]$UpdateLatest = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-JsonGet {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$TimeoutSec = 30
  )
  return Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec $TimeoutSec
}

function Invoke-JsonPost {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [object]$Body = @{},
    [int]$TimeoutSec = 30
  )
  $json = $Body | ConvertTo-Json -Depth 12
  return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $json -TimeoutSec $TimeoutSec
}

function Get-PropValue {
  param(
    [object]$Object,
    [string]$Name,
    $Default = $null
  )
  if ($null -eq $Object) { return $Default }
  if ($Object -is [System.Collections.IDictionary]) {
    if ($Object.Contains($Name)) { return $Object[$Name] }
    return $Default
  }
  $prop = $Object.PSObject.Properties[$Name]
  if ($null -eq $prop) { return $Default }
  return $prop.Value
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportsDir = if ($OutDir) { $OutDir } else { Join-Path $repoRoot "reports" }
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$base = $BaseUrl.TrimEnd("/")

$settingsBody = [ordered]@{
  brainPrimaryProvider = "gemini-api"
  brainFallbackOrder = @("codex", "anthropic", "vertex", "openclaw", "gemini-cli", "cursor", "antigravity")
  startupBrainAutoSelectEnabled = (-not $LockPrimaryProvider)
  swarmModeEnabled = [bool]$EnableSwarmAutoDispatch
  swarmModeAutoDispatch = [bool]$EnableSwarmAutoDispatch
  superSwarmEnabled = [bool]$EnableSuperSwarm
  superSwarmMethod = "super_swarm"
  superSwarmMission = [string]$SuperSwarmMission
  superSwarmAgentFanout = [Math]::Max(1, [Math]::Min(9, [int]$SuperSwarmAgentFanout))
  superSwarmParticipants = @("local_codex", "abacus", "symphony", "gemini_api", "augment_context")
  bridgeAutoSyncEnabled = [bool]$EnableBridgeAutoSync
  agentColonyWatchdogEnabled = [bool]$EnableColonyWatchdog
  authorityPolicyEnabled = $true
  allowExternalPosting = $false
  modelAuditMirrorNotebookGoogle = $true
}

$settingsResp = Invoke-JsonPost -Url ("{0}/api/settings" -f $base) -Body $settingsBody -TimeoutSec 40
$geminiConfigResp = Invoke-JsonPost -Url ("{0}/api/integrations/gemini_api/config" -f $base) -Body @{
  enabled = $true
  defaultModel = $GeminiModel
} -TimeoutSec 40
$leaderResp = Invoke-JsonPost -Url ("{0}/api/automation/brain-leader/select" -f $base) -Body @{
  reason = "owner_asolaria_gemini_control_mode"
  continuous = $false
} -TimeoutSec 80

$health = Invoke-JsonGet -Url ("{0}/api/health" -f $base) -TimeoutSec 25
$swarm = Invoke-JsonGet -Url ("{0}/api/swarm/status" -f $base) -TimeoutSec 25
$geminiApiStatus = Invoke-JsonGet -Url ("{0}/api/integrations/gemini_api/status" -f $base) -TimeoutSec 25
$geminiWebStatus = Invoke-JsonGet -Url ("{0}/api/integrations/gemini_enterprise_web/status" -f $base) -TimeoutSec 25

$summary = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  baseUrl = $base
  mode = [ordered]@{
    name = "asolaria_gemini_control_mode"
    asolariaLed = $true
    geminiPrimary = $true
    startupBrainAutoSelectEnabled = [bool](Get-PropValue -Object $settingsResp.settings -Name "startupBrainAutoSelectEnabled" -Default $false)
    lockPrimaryProvider = [bool]$LockPrimaryProvider
  }
  settings = [ordered]@{
    brainPrimaryProvider = [string](Get-PropValue -Object $health.settings -Name "brainPrimaryProvider" -Default "")
    brainFallbackOrder = @((Get-PropValue -Object $health.settings -Name "brainFallbackOrder" -Default @()))
    swarmModeEnabled = [bool](Get-PropValue -Object $health.settings -Name "swarmModeEnabled" -Default $false)
    swarmModeAutoDispatch = [bool](Get-PropValue -Object $health.settings -Name "swarmModeAutoDispatch" -Default $false)
    superSwarmEnabled = [bool](Get-PropValue -Object $health.settings -Name "superSwarmEnabled" -Default $false)
    superSwarmAgentFanout = [int](Get-PropValue -Object $health.settings -Name "superSwarmAgentFanout" -Default 0)
    superSwarmMission = [string](Get-PropValue -Object $health.settings -Name "superSwarmMission" -Default "")
    bridgeAutoSyncEnabled = [bool](Get-PropValue -Object $health.settings -Name "bridgeAutoSyncEnabled" -Default $false)
    agentColonyWatchdogEnabled = [bool](Get-PropValue -Object $health.settings -Name "agentColonyWatchdogEnabled" -Default $false)
    authorityPolicyEnabled = [bool](Get-PropValue -Object $health.settings -Name "authorityPolicyEnabled" -Default $false)
    allowExternalPosting = [bool](Get-PropValue -Object $health.settings -Name "allowExternalPosting" -Default $true)
  }
  runtime = [ordered]@{
    brainLeaderSelectedProvider = [string](Get-PropValue -Object $health.brainLeader -Name "selectedProvider" -Default "")
    brainLeaderSelectedModel = [string](Get-PropValue -Object $health.brainLeader -Name "selectedModel" -Default "")
    swarmOnlineAgents = [int](Get-PropValue -Object $swarm.swarm -Name "onlineAgents" -Default 0)
    swarmActiveAgents = [int](Get-PropValue -Object $swarm.swarm -Name "activeAgents" -Default 0)
    swarmWatchdogEnabled = [bool](Get-PropValue -Object $swarm.swarm -Name "watchdogEnabled" -Default $false)
  }
  gemini = [ordered]@{
    apiEnabled = [bool](Get-PropValue -Object $geminiApiStatus.status -Name "enabled" -Default $false)
    apiConfigured = [bool](Get-PropValue -Object $geminiApiStatus.status -Name "configured" -Default $false)
    apiDefaultModel = [string](Get-PropValue -Object $geminiApiStatus.status -Name "defaultModel" -Default "")
    enterpriseWebEnabled = [bool](Get-PropValue -Object $geminiWebStatus.status -Name "enabled" -Default $false)
    enterpriseWebDefaultHost = [string](Get-PropValue -Object $geminiWebStatus.status -Name "defaultHost" -Default "")
    enterpriseWebBrowserTasksEnabled = [bool](Get-PropValue -Object $geminiWebStatus.status -Name "browserTasksEnabled" -Default $false)
  }
  applied = [ordered]@{
    settingsOk = [bool]$settingsResp.ok
    geminiConfigOk = [bool]$geminiConfigResp.ok
    leaderSelectOk = [bool]$leaderResp.ok
  }
}

$jsonPath = Join-Path $reportsDir ("gemini-control-mode-{0}.json" -f $stamp)
$mdPath = Join-Path $reportsDir ("gemini-control-mode-{0}.md" -f $stamp)
$latestJson = Join-Path $reportsDir "gemini-control-mode-latest.json"
$latestMd = Join-Path $reportsDir "gemini-control-mode-latest.md"

$summary | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$md = New-Object System.Collections.Generic.List[string]
$md.Add("# Asolaria Gemini Control Mode")
$md.Add("")
$md.Add("- Generated: " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz"))
$md.Add("- Runtime: " + $base)
$md.Add("- Asolaria-led: true")
$md.Add("- Gemini primary lane: true")
$md.Add("- Primary provider lock: " + [string][bool]$LockPrimaryProvider)
$md.Add("")
$md.Add("## Settings")
$md.Add("- brainPrimaryProvider: " + [string]$summary.settings.brainPrimaryProvider)
$md.Add("- swarmModeEnabled: " + [string]$summary.settings.swarmModeEnabled)
$md.Add("- swarmModeAutoDispatch: " + [string]$summary.settings.swarmModeAutoDispatch)
$md.Add("- superSwarmEnabled: " + [string]$summary.settings.superSwarmEnabled)
$md.Add("- superSwarmAgentFanout: " + [string]$summary.settings.superSwarmAgentFanout)
$md.Add("- superSwarmMission: " + [string]$summary.settings.superSwarmMission)
$md.Add("- bridgeAutoSyncEnabled: " + [string]$summary.settings.bridgeAutoSyncEnabled)
$md.Add("- agentColonyWatchdogEnabled: " + [string]$summary.settings.agentColonyWatchdogEnabled)
$md.Add("- authorityPolicyEnabled: " + [string]$summary.settings.authorityPolicyEnabled)
$md.Add("- allowExternalPosting: " + [string]$summary.settings.allowExternalPosting)
$md.Add("")
$md.Add("## Gemini")
$md.Add("- API enabled/configured: " + [string]$summary.gemini.apiEnabled + "/" + [string]$summary.gemini.apiConfigured)
$md.Add("- API default model: " + [string]$summary.gemini.apiDefaultModel)
$md.Add("- Enterprise web enabled: " + [string]$summary.gemini.enterpriseWebEnabled)
$md.Add("- Enterprise web host: " + [string]$summary.gemini.enterpriseWebDefaultHost)
$md.Add("- Enterprise browser tasks enabled: " + [string]$summary.gemini.enterpriseWebBrowserTasksEnabled)
$md.Add("")
$md.Add("## Swarm")
$md.Add("- online agents: " + [string]$summary.runtime.swarmOnlineAgents)
$md.Add("- active agents: " + [string]$summary.runtime.swarmActiveAgents)
$md.Add("- watchdog enabled: " + [string]$summary.runtime.swarmWatchdogEnabled)
$md.Add("")
$md.Add("## Artifacts")
$md.Add("- " + $jsonPath)
$md.Add("- " + $mdPath)
if ($UpdateLatest) {
  $md.Add("- " + $latestJson)
  $md.Add("- " + $latestMd)
}

Set-Content -LiteralPath $mdPath -Encoding UTF8 -Value ($md -join "`r`n")
if ($UpdateLatest) {
  Copy-Item -LiteralPath $jsonPath -Destination $latestJson -Force
  Copy-Item -LiteralPath $mdPath -Destination $latestMd -Force
}

[pscustomobject]@{
  ok = $true
  generatedAt = (Get-Date).ToString("o")
  baseUrl = $base
  jsonPath = $jsonPath
  markdownPath = $mdPath
  latestJson = if ($UpdateLatest) { $latestJson } else { "" }
  latestMarkdown = if ($UpdateLatest) { $latestMd } else { "" }
  brainPrimaryProvider = [string]$summary.settings.brainPrimaryProvider
  brainLeaderSelectedProvider = [string]$summary.runtime.brainLeaderSelectedProvider
  swarmOnlineAgents = [int]$summary.runtime.swarmOnlineAgents
  swarmWatchdogEnabled = [bool]$summary.runtime.swarmWatchdogEnabled
  geminiApiConfigured = [bool]$summary.gemini.apiConfigured
  geminiEnterpriseWebEnabled = [bool]$summary.gemini.enterpriseWebEnabled
} | ConvertTo-Json -Depth 10
