[CmdletBinding()]
param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$BotToken = "",
  [string]$DefaultChannel = "#general",
  [switch]$SetUserEnv,
  [switch]$SetProcessEnv = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Mask-Token {
  param([string]$Value)
  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return ""
  }
  if ($text.Length -le 4) {
    return ("*" * $text.Length)
  }
  return ("*" * ($text.Length - 4)) + $text.Substring($text.Length - 4)
}

function Get-StatusPayload {
  param([object]$Envelope)
  if ($null -eq $Envelope) { return $null }
  $prop = $Envelope.PSObject.Properties["status"]
  if ($null -ne $prop) { return $prop.Value }
  return $Envelope
}

$base = $BaseUrl.TrimEnd("/")
$token = [string]$BotToken
if ([string]::IsNullOrWhiteSpace($token)) {
  $token = [string][Environment]::GetEnvironmentVariable("ASOLARIA_SLACK_BOT_TOKEN", "Process")
}
if ([string]::IsNullOrWhiteSpace($token)) {
  $token = [string][Environment]::GetEnvironmentVariable("ASOLARIA_SLACK_BOT_TOKEN", "User")
}
if ([string]::IsNullOrWhiteSpace($token)) {
  $token = [string][Environment]::GetEnvironmentVariable("ASOLARIA_SLACK_BOT_TOKEN", "Machine")
}
if ([string]::IsNullOrWhiteSpace($token)) {
  $token = [string][Environment]::GetEnvironmentVariable("ASOLARIA_SLACK_TOKEN", "Process")
}
if ([string]::IsNullOrWhiteSpace($token)) {
  $token = [string][Environment]::GetEnvironmentVariable("ASOLARIA_SLACK_TOKEN", "User")
}
if ([string]::IsNullOrWhiteSpace($token)) {
  $token = [string][Environment]::GetEnvironmentVariable("ASOLARIA_SLACK_TOKEN", "Machine")
}

if ([string]::IsNullOrWhiteSpace($token)) {
  [pscustomobject]@{
    ok = $false
    error = "Slack bot token missing. Provide -BotToken or set ASOLARIA_SLACK_BOT_TOKEN."
  } | ConvertTo-Json -Depth 6
  exit 2
}

if ($SetUserEnv) {
  [Environment]::SetEnvironmentVariable("ASOLARIA_SLACK_BOT_TOKEN", $token, "User")
}
if ($SetProcessEnv) {
  [Environment]::SetEnvironmentVariable("ASOLARIA_SLACK_BOT_TOKEN", $token, "Process")
}

$payload = @{
  botToken = $token
}
if (-not [string]::IsNullOrWhiteSpace([string]$DefaultChannel)) {
  $payload.defaultChannel = [string]$DefaultChannel
}

$configResp = Invoke-RestMethod -Method Post -Uri ("{0}/api/integrations/slack/config" -f $base) -ContentType "application/json" -Body ($payload | ConvertTo-Json -Depth 6) -TimeoutSec 30
$statusResp = Invoke-RestMethod -Method Get -Uri ("{0}/api/integrations/slack/status" -f $base) -TimeoutSec 30
$status = Get-StatusPayload -Envelope $statusResp
$configReply = ""
if ($null -ne $configResp) {
  $replyProp = $configResp.PSObject.Properties["reply"]
  if ($null -ne $replyProp) {
    $configReply = [string]$replyProp.Value
  } else {
    $configReply = "Slack config updated."
  }
}

[pscustomobject]@{
  ok = $true
  baseUrl = $base
  tokenHint = Mask-Token -Value $token
  setUserEnv = [bool]$SetUserEnv
  setProcessEnv = [bool]$SetProcessEnv
  configured = [bool]$status.configured
  tokenSource = [string]$status.tokenSource
  defaultChannel = [string]$status.defaultChannel
  connectionOk = [bool]$status.connection.ok
  connectionError = [string]$status.connection.error
  configReply = $configReply
} | ConvertTo-Json -Depth 8
