param(
  [string]$FriendLabel = "FriendCodex",
  [string]$FriendHandle = "",
  [string]$Room = "",
  [string[]]$AllowSenders = @("vector"),
  [string]$OutputRoot = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function To-Slug([string]$Value) {
  $raw = [string]$Value
  $raw = $raw.Trim().ToLowerInvariant()
  if (-not $raw) {
    return "friend-codex"
  }
  $slug = ($raw -replace "[^a-z0-9]+", "-").Trim("-")
  if (-not $slug) {
    return "friend-codex"
  }
  return $slug
}

function To-EnvSafeName([string]$Value) {
  $raw = [string]$Value
  $raw = $raw.Trim().ToUpperInvariant()
  if (-not $raw) {
    return "FRIEND_CODEX"
  }
  return ($raw -replace "[^A-Z0-9]+", "_").Trim("_")
}

function Read-Text([string]$Path) {
  try {
    return (Get-Content -LiteralPath $Path -Raw -ErrorAction Stop).Trim()
  } catch {
    return ""
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$homeRoot = Split-Path -Parent $projectRoot
$bridgeRoot = Join-Path $homeRoot "codex-bridge"
$botSource = Join-Path $bridgeRoot "colony-agent-bot.js"
if (-not (Test-Path -LiteralPath $botSource)) {
  throw "Missing bridge bot source: $botSource"
}

$slug = To-Slug $FriendLabel
$resolvedFriendHandle = if ([string]::IsNullOrWhiteSpace($FriendHandle)) { "friend-$slug-codex" } else { (To-Slug $FriendHandle) }
$roomName = if ([string]::IsNullOrWhiteSpace($Room)) { "asolaria_friend_$slug" } else { (To-Slug $Room) }
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safeLabel = if ([string]::IsNullOrWhiteSpace($FriendLabel)) { "Friend Codex" } else { ([string]$FriendLabel).Trim() }
$profileFileName = "$resolvedFriendHandle.profile.json"
$envFileName = "$resolvedFriendHandle.env.example"
$startScriptName = "Start-Friend-Codex-Bridge.ps1"
$policyFileName = "relay-policy.example.json"
$senderTokenEnv = "CODEX_BRIDGE_SENDER_TOKEN_$(To-EnvSafeName $resolvedFriendHandle)"
$outputRootResolved = if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  Join-Path $projectRoot "reports\friend-codex-bridge-packs"
} else {
  [System.IO.Path]::GetFullPath($OutputRoot)
}
$packDir = Join-Path $outputRootResolved "$timestamp-$slug"
Ensure-Dir $packDir

$bridgeUrlPath = Join-Path $bridgeRoot "bridge-tunnel-url.txt"
$bridgeUrl = Read-Text $bridgeUrlPath
if (-not $bridgeUrl) {
  $bridgeUrl = "https://YOUR-BRIDGE-HOST.example"
}

$normalizedAllowSenders = @()
foreach ($item in @($AllowSenders)) {
  foreach ($part in ([string]$item -split ",")) {
    $trimmed = ([string]$part).Trim()
    if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
      $normalizedAllowSenders += $trimmed
    }
  }
}
if ($normalizedAllowSenders.Count -eq 0) {
  $normalizedAllowSenders = @("vector")
}

$profile = [ordered]@{
  version = 1
  profileName = $resolvedFriendHandle
  description = "Friend machine Codex bridge profile for $safeLabel."
  relay = [ordered]@{
    urlEnv = "CODEX_BRIDGE_URL"
    tokenEnv = "CODEX_BRIDGE_TOKEN"
    room = $roomName
    from = $resolvedFriendHandle
  }
  security = [ordered]@{
    allowSenders = @($normalizedAllowSenders)
    senderTokenEnv = $senderTokenEnv
    requireRoomPolicy = $true
  }
  runtime = [ordered]@{
    cursorFile = "cursor-$resolvedFriendHandle.json"
    pollIntervalMs = 1000
    maxBatch = 50
    maxMessageChars = 6000
  }
  routing = [ordered]@{
    taskPrefixes = @("TASK:", "QUESTION:", "NOTE:")
    requireThreadTag = $true
    requireMention = $true
  }
  ops = [ordered]@{
    logPrefix = $resolvedFriendHandle
    workdir = "."
    startMode = "manual"
  }
}
$profilePath = Join-Path $packDir $profileFileName
$profile | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $profilePath -Encoding UTF8

$envLines = @(
  "# Friend Codex bridge environment example",
  "# Fill these locally on the friend's machine. Do not commit real tokens.",
  "",
  "CODEX_BRIDGE_URL=$bridgeUrl",
  "CODEX_BRIDGE_TOKEN=REPLACE_WITH_RELAY_TOKEN",
  "$senderTokenEnv=REPLACE_WITH_FRIEND_SENDER_TOKEN",
  "",
  "# Optional overrides",
  "CODEX_BRIDGE_ROOM=$roomName",
  "CODEX_BRIDGE_FROM=$resolvedFriendHandle"
)
$envPath = Join-Path $packDir $envFileName
$envLines | Set-Content -LiteralPath $envPath -Encoding ASCII

$startScriptPath = Join-Path $packDir $startScriptName
$startScript = @"
param(
  [string]`$Sandbox = "read-only",
  [string]`$Reasoning = "medium",
  [switch]`$CheckProfile
)

Set-StrictMode -Version Latest
`$ErrorActionPreference = "Stop"

`$scriptRoot = Split-Path -Parent `$MyInvocation.MyCommand.Path
`$botPath = Join-Path `$scriptRoot "colony-agent-bot.js"
`$profilePath = Join-Path `$scriptRoot "$profileFileName"
if (-not (Test-Path -LiteralPath `$botPath)) {
  throw "Missing bridge bot: `$botPath"
}
if (-not (Test-Path -LiteralPath `$profilePath)) {
  throw "Missing profile file: `$profilePath"
}

`$node = (Get-Command node -ErrorAction Stop).Source
`$args = @(
  `$botPath,
  "--profile", `$profilePath,
  "--workdir", `$scriptRoot,
  "--agentName", "$safeLabel Codex",
  "--profileId", "$resolvedFriendHandle-v1",
  "--mentionAliases", "$resolvedFriendHandle",
  "--pingTo", "vector",
  "--bridgeAutoSync", "1",
  "--supervisorRequiresMention", "1",
  "--requireActionablePrefix", "1",
  "--sandbox", `$Sandbox,
  "--reasoning", `$Reasoning
)
if (`$CheckProfile) {
  `$args += "--checkProfile"
}

& `$node @args
"@
$startScript | Set-Content -LiteralPath $startScriptPath -Encoding UTF8

$policy = [ordered]@{
  defaultRequireSenderToken = $false
  senderTokens = [ordered]@{
    "vector" = "CHANGE_ME_VECTOR_SENDER_TOKEN"
    $resolvedFriendHandle = "CHANGE_ME_FRIEND_SENDER_TOKEN"
  }
  rooms = [ordered]@{
    $roomName = [ordered]@{
      allowPostFrom = @("vector", $resolvedFriendHandle)
      requireSenderToken = $true
    }
  }
}
$policyPath = Join-Path $packDir $policyFileName
$policy | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $policyPath -Encoding UTF8

$readmePath = Join-Path $packDir "README.md"
$readme = @"
# Friend Codex Bridge Pack

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")

## Purpose
This pack connects a friend's Codex CLI to your existing codex-bridge relay using a dedicated room and sender identity.

## Bridge Identity
- Friend label: $safeLabel
- Sender handle: $resolvedFriendHandle
- Relay room: $roomName
- Allowed supervisors: $($normalizedAllowSenders -join ", ")

## Files
- ${profileFileName}: no-secrets bridge profile
- ${envFileName}: environment variable template
- colony-agent-bot.js: shared named-lane bridge bot
- ${startScriptName}: one-command launcher
- ${policyFileName}: optional host-side relay policy example

## Host-side Steps
1. Keep your relay reachable and stable:
   powershell -ExecutionPolicy Bypass -File C:\Users\acer\codex-bridge\bridgectl.ps1 -Command start
2. Share only the bridge URL and relay token with your friend.
3. Preferred hardening: merge ${policyFileName} into your live bridge policy and restart the relay with policy enabled.

## Friend-side Steps
1. Put this folder on the friend's machine.
2. Install prerequisites already expected by the bootstrap: node, codex, and access to codex.cmd.
3. Fill the real values from ${envFileName} into the friend's shell session.
4. Dry run the resolved config:
   powershell -ExecutionPolicy Bypass -File .\${startScriptName} -CheckProfile
5. Start the bridge bot:
   powershell -ExecutionPolicy Bypass -File .\${startScriptName}

## Message Contract
Use this form from your side when talking to the friend's bot:

@$resolvedFriendHandle #thread:friend-bootstrap TASK: Run host discovery and report OS, shell, node, codex, and browser status.

The friend's bot requires mention + actionable prefix by default.

## Notes
- This pack does not embed real secrets.
- If you leave bridge policy disabled, the relay token is the only server-side guard.
- Use a dedicated room for each friend machine to avoid cross-talk.
"@
$readme | Set-Content -LiteralPath $readmePath -Encoding UTF8

Copy-Item -LiteralPath $botSource -Destination (Join-Path $packDir "colony-agent-bot.js") -Force

$summary = [ordered]@{
  ok = $true
  friendLabel = $safeLabel
  friendHandle = $resolvedFriendHandle
  room = $roomName
  bridgeUrl = $bridgeUrl
  packDir = $packDir
  profilePath = $profilePath
  envPath = $envPath
  startScriptPath = $startScriptPath
  policyPath = $policyPath
  readmePath = $readmePath
}
$summaryPath = Join-Path $packDir "pack-summary.json"
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $summaryPath -Encoding UTF8

$summary | ConvertTo-Json -Depth 6
