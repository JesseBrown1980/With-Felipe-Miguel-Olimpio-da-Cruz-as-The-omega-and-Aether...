param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$Provider = "cursor",
  [switch]$SkipClearProbe
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )
  if (-not $Condition) {
    throw $Message
  }
}

function Has-Property {
  param(
    [object]$Object,
    [string]$Name
  )
  return ($Object.PSObject.Properties.Name -contains $Name)
}

$providerNormalized = "cursor"
if (-not [string]::IsNullOrWhiteSpace($Provider)) {
  $providerNormalized = $Provider.Trim().ToLowerInvariant()
}
$base = $BaseUrl.TrimEnd("/")

Write-Output "Checking external integration status at $base ..."
$external = Invoke-RestMethod -Uri "$base/api/integrations/external/status" -TimeoutSec 15
Assert-True ($external.ok -eq $true) "Expected ok=true from /api/integrations/external/status."
Assert-True ($external.status -is [System.Array]) "Expected status array from /api/integrations/external/status."

$providerEntry = $external.status | Where-Object { [string]$_.id -eq $providerNormalized } | Select-Object -First 1
Assert-True ($null -ne $providerEntry) "Provider '$providerNormalized' not present in external status."

foreach ($field in @(
  "mcpEnabled",
  "mcpConfigured",
  "mcpConfigError",
  "mcpServerLabel",
  "mcpAllowedToolsCount",
  "mcpApprovalMode",
  "mcpDynamicAllowlistMax",
  "mcpContextTtlSeconds",
  "mcpPreset"
)) {
  Assert-True (Has-Property -Object $providerEntry -Name $field) "Missing field '$field' in provider status."
}

Assert-True ($null -ne $external.mcpPolicyPresets) "Missing mcpPolicyPresets from /api/integrations/external/status."
foreach ($preset in @("read_only", "balanced", "write_guarded")) {
  Assert-True (Has-Property -Object $external.mcpPolicyPresets -Name $preset) "Missing MCP preset '$preset'."
}

Write-Output "Checking MCP cache endpoint ..."
$cache = Invoke-RestMethod -Uri "$base/api/integrations/external/mcp-cache?provider=$providerNormalized" -TimeoutSec 15
Assert-True ($cache.ok -eq $true) "Expected ok=true from /api/integrations/external/mcp-cache."
Assert-True ($null -ne $cache.cache) "Expected cache object from /api/integrations/external/mcp-cache."
foreach ($field in @("providerCatalogCount", "scopedContextCount", "providerCatalog", "scopedContexts")) {
  Assert-True (Has-Property -Object $cache.cache -Name $field) "Missing field '$field' in MCP cache status."
}

if (-not $SkipClearProbe) {
  Write-Output "Checking MCP cache clear endpoint (scoped probe) ..."
  $probeContext = "smoke-probe-" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
  $clearBody = @{
    provider = $providerNormalized
    contextKey = $probeContext
  } | ConvertTo-Json -Compress
  $clear = Invoke-RestMethod -Method Post -Uri "$base/api/integrations/external/mcp-cache/clear" -ContentType "application/json" -Body $clearBody -TimeoutSec 15
  Assert-True ($clear.ok -eq $true) "Expected ok=true from /api/integrations/external/mcp-cache/clear."
  Assert-True ($null -ne $clear.result) "Expected result object from cache clear endpoint."
}

$summary = [ordered]@{
  ok = $true
  baseUrl = $base
  provider = $providerNormalized
  statusMcpEnabled = [bool]$providerEntry.mcpEnabled
  statusMcpConfigured = [bool]$providerEntry.mcpConfigured
  statusMcpPreset = [string]$providerEntry.mcpPreset
  cacheProviderCatalogCount = [int]$cache.cache.providerCatalogCount
  cacheScopedContextCount = [int]$cache.cache.scopedContextCount
  clearProbeRun = [bool](-not $SkipClearProbe)
  testedAt = [DateTimeOffset]::UtcNow.ToString("o")
}

$summary | ConvertTo-Json -Depth 6
