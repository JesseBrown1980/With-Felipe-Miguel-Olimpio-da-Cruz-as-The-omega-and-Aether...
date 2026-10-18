param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$Provider = "cursor",
  [string]$Model = "gpt-5.2-codex",
  [switch]$EnableMcp,
  [string]$McpServerLabel = "",
  [string]$McpServerUrl = "",
  [string]$McpConnectorId = "",
  [string]$McpPreset = "balanced",
  [string]$McpApprovalMode = "auto",
  [int]$McpDynamicAllowlistMax = 5,
  [int]$McpContextTtlSeconds = 1800,
  [string]$ApiKey = "",
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-ApiKey {
  param(
    [string]$InputKey,
    [string]$ProviderId
  )
  if (-not [string]::IsNullOrWhiteSpace($InputKey)) {
    return $InputKey.Trim()
  }
  $providerUpper = $ProviderId.Trim().ToUpperInvariant()
  $providerEnvItem = Get-Item -Path ("Env:ASOLARIA_" + $providerUpper + "_API_KEY") -ErrorAction SilentlyContinue
  $providerSpecific = if ($providerEnvItem) { [string]$providerEnvItem.Value } else { "" }
  if (-not [string]::IsNullOrWhiteSpace($providerSpecific)) {
    return $providerSpecific.Trim()
  }
  $openAiEnvItem = Get-Item -Path "Env:OPENAI_API_KEY" -ErrorAction SilentlyContinue
  $openAi = if ($openAiEnvItem) { [string]$openAiEnvItem.Value } else { "" }
  if (-not [string]::IsNullOrWhiteSpace($openAi)) {
    return $openAi.Trim()
  }
  return ""
}

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )
  if (-not $Condition) {
    throw $Message
  }
}

$providerId = if ([string]::IsNullOrWhiteSpace($Provider)) { "cursor" } else { $Provider.Trim().ToLowerInvariant() }
Assert-True (($providerId -eq "cursor") -or ($providerId -eq "antigravity")) "Provider must be 'cursor' or 'antigravity'."

$base = $BaseUrl.TrimEnd("/")
$resolvedApiKey = Resolve-ApiKey -InputKey $ApiKey -ProviderId $providerId

$payload = [ordered]@{
  provider = $providerId
  enabled = $true
  apiStyle = "openai_responses"
  apiBaseUrl = "https://api.openai.com"
  apiPath = "/v1/responses"
  model = $Model.Trim()
  requireOfficialApi = $true
}

if (-not [string]::IsNullOrWhiteSpace($resolvedApiKey)) {
  $payload.apiKey = $resolvedApiKey
}

if ($EnableMcp.IsPresent) {
  Assert-True (-not [string]::IsNullOrWhiteSpace($McpServerLabel)) "EnableMcp requires -McpServerLabel."
  Assert-True (
    (-not [string]::IsNullOrWhiteSpace($McpServerUrl)) -or
    (-not [string]::IsNullOrWhiteSpace($McpConnectorId))
  ) "EnableMcp requires -McpServerUrl or -McpConnectorId."
  $payload.mcpEnabled = $true
  $payload.mcpServerLabel = $McpServerLabel.Trim()
  if (-not [string]::IsNullOrWhiteSpace($McpServerUrl)) {
    $payload.mcpServerUrl = $McpServerUrl.Trim()
  }
  if (-not [string]::IsNullOrWhiteSpace($McpConnectorId)) {
    $payload.mcpConnectorId = $McpConnectorId.Trim()
  }
  $payload.mcpPreset = $McpPreset.Trim()
  $payload.mcpApprovalMode = $McpApprovalMode.Trim()
  $payload.mcpDynamicAllowlistMax = [Math]::Max(0, [Math]::Min(64, $McpDynamicAllowlistMax))
  $payload.mcpContextTtlSeconds = [Math]::Max(60, [Math]::Min(86400, $McpContextTtlSeconds))
} else {
  $payload.mcpEnabled = $false
}

if ($DryRun.IsPresent) {
  $preview = [ordered]@{
    ok = $true
    dryRun = $true
    baseUrl = $base
    provider = $providerId
    apiKeyResolved = (-not [string]::IsNullOrWhiteSpace($resolvedApiKey))
    payload = $payload
  }
  $preview | ConvertTo-Json -Depth 10
  exit 0
}

Assert-True (-not [string]::IsNullOrWhiteSpace($resolvedApiKey)) (
  "No API key was found. Pass -ApiKey or set OPENAI_API_KEY / ASOLARIA_" + $providerId.ToUpperInvariant() + "_API_KEY."
)

$body = $payload | ConvertTo-Json -Depth 10
$config = Invoke-RestMethod -Method Post -Uri "$base/api/integrations/external/config" -ContentType "application/json" -Body $body -TimeoutSec 20
Assert-True ($config.ok -eq $true) "External config update did not return ok=true."

$status = Invoke-RestMethod -Uri "$base/api/integrations/external/status" -TimeoutSec 20
Assert-True ($status.ok -eq $true) "External status endpoint did not return ok=true."
$providerStatus = $status.status | Where-Object { [string]$_.id -eq $providerId } | Select-Object -First 1
Assert-True ($null -ne $providerStatus) "Configured provider was not present in external status."

$result = [ordered]@{
  ok = $true
  baseUrl = $base
  provider = $providerId
  configured = [bool]$providerStatus.configured
  enabled = [bool]$providerStatus.enabled
  model = [string]$providerStatus.model
  apiStyle = [string]$providerStatus.apiStyle
  mcpEnabled = [bool]$providerStatus.mcpEnabled
  mcpConfigured = [bool]$providerStatus.mcpConfigured
  mcpPreset = [string]$providerStatus.mcpPreset
  updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
}

$result | ConvertTo-Json -Depth 10
