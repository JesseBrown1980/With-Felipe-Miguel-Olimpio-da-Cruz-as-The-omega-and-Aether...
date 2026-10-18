param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$Provider = "cursor",
  [string]$ExternalModel = "gpt-5.2-codex",
  [string]$ApiKey = "",
  [switch]$EnableMcp,
  [string]$McpServerLabel = "",
  [string]$McpServerUrl = "",
  [string]$McpConnectorId = "",
  [string]$McpPreset = "balanced",
  [string]$McpApprovalMode = "auto",
  [int]$McpDynamicAllowlistMax = 5,
  [int]$McpContextTtlSeconds = 1800,
  [string]$DotnetRepo = "C:\Users\acer\source\repos\Test",
  [switch]$RestartBridge,
  [switch]$SkipModelAudit,
  [switch]$SkipDotnetBuild
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

function Parse-LastJsonObjectFromLines {
  param(
    [string[]]$Lines
  )
  if ($null -eq $Lines -or $Lines.Count -lt 1) {
    return $null
  }
  $start = -1
  for ($i = $Lines.Count - 1; $i -ge 0; $i--) {
    $line = [string]$Lines[$i]
    if ($line.TrimStart().StartsWith("{")) {
      $start = $i
      break
    }
  }
  if ($start -lt 0) {
    return $null
  }
  $jsonText = ($Lines[$start..($Lines.Count - 1)] -join "`n")
  try {
    return ($jsonText | ConvertFrom-Json -ErrorAction Stop)
  } catch {
    return $null
  }
}

function Add-StepResult {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Summary,
    [object]$Data = $null,
    [string]$ErrorMessage = ""
  )
  $entry = [ordered]@{
    name = $Name
    status = $Status
    summary = $Summary
    error = $ErrorMessage
    at = [DateTimeOffset]::UtcNow.ToString("o")
    data = $Data
  }
  $script:stepResults += $entry
  if ($Status -eq "failed") {
    $script:hasFailure = $true
  }
  if ($Status -eq "warning") {
    $script:hasWarning = $true
  }
}

function Has-Property {
  param(
    [object]$Object,
    [string]$Name
  )
  if ($null -eq $Object) {
    return $false
  }
  return ($Object.PSObject.Properties.Name -contains $Name)
}

function Invoke-StagedExternalConfig {
  param(
    [string]$BaseUrl,
    [string]$ProviderId,
    [string]$Model,
    [bool]$EnableMcp,
    [string]$McpServerLabel,
    [string]$McpServerUrl,
    [string]$McpConnectorId,
    [string]$McpPreset,
    [string]$McpApprovalMode,
    [int]$McpDynamicAllowlistMax,
    [int]$McpContextTtlSeconds
  )

  $payload = [ordered]@{
    provider = $ProviderId
    enabled = $false
    apiStyle = "openai_responses"
    apiBaseUrl = "https://api.openai.com"
    apiPath = "/v1/responses"
    model = $Model
    requireOfficialApi = $true
    mcpEnabled = $EnableMcp
  }

  if ($EnableMcp) {
    if ([string]::IsNullOrWhiteSpace($McpServerLabel)) {
      throw "MCP staging requires -McpServerLabel."
    }
    if ([string]::IsNullOrWhiteSpace($McpServerUrl) -and [string]::IsNullOrWhiteSpace($McpConnectorId)) {
      throw "MCP staging requires -McpServerUrl or -McpConnectorId."
    }
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
  }

  $body = $payload | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method Post -Uri ($BaseUrl + "/api/integrations/external/config") -ContentType "application/json" -Body $body -TimeoutSec 30
}

$providerId = if ([string]::IsNullOrWhiteSpace($Provider)) { "cursor" } else { $Provider.Trim().ToLowerInvariant() }
if ($providerId -ne "cursor" -and $providerId -ne "antigravity") {
  throw "Provider must be 'cursor' or 'antigravity'."
}

$base = $BaseUrl.TrimEnd("/")
$asolariaRoot = Split-Path -Parent $PSScriptRoot
$bridgeRoot = Join-Path (Split-Path -Parent $asolariaRoot) "codex-bridge"
$applyScriptPath = Join-Path $PSScriptRoot "Apply-Asolaria-ExternalCodexUpgrade.ps1"
$mcpSmokePath = Join-Path $PSScriptRoot "Test-Asolaria-ExternalMcpUpgrade.ps1"

if (-not (Test-Path $applyScriptPath)) {
  throw "Missing script: $applyScriptPath"
}
if (-not (Test-Path $mcpSmokePath)) {
  throw "Missing script: $mcpSmokePath"
}

$runId = "upgrade-wave-" + [DateTimeOffset]::UtcNow.ToString("yyyyMMdd-HHmmss")
$startedAt = [DateTimeOffset]::UtcNow
$reportDir = Join-Path $asolariaRoot "reports"
$jsonReportPath = Join-Path $reportDir ($runId + ".json")
$mdReportPath = Join-Path $reportDir ($runId + ".md")

$stepResults = @()
$hasFailure = $false
$hasWarning = $false

Write-Output ("Run ID: " + $runId)
Write-Output ("Base URL: " + $base)
Write-Output ("Provider: " + $providerId)

try {
  $health = Invoke-RestMethod -Uri ($base + "/api/health") -TimeoutSec 20
  $external = Invoke-RestMethod -Uri ($base + "/api/integrations/external/status") -TimeoutSec 20
  $agents = @($health.agentColony.agents)
  $coreAgent = $agents | Where-Object {
    $id = [string]$_.id
    $id -eq "asolaria"
  } | Select-Object -First 1
  $snapshot = [ordered]@{
    asolariaOk = [bool]$health.ok
    uptimeSeconds = [int]$health.uptimeSeconds
    asolariaPid = if ($coreAgent) { [int]$coreAgent.pid } else { 0 }
    externalProviders = @($external.status).Count
    mcpCacheProviders = [int]$external.mcpCache.providerCatalogCount
    mcpCacheContexts = [int]$external.mcpCache.scopedContextCount
  }
  Add-StepResult -Name "baseline_status" -Status "ok" -Summary "Captured Asolaria and external integration status." -Data $snapshot
} catch {
  Add-StepResult -Name "baseline_status" -Status "failed" -Summary "Failed to capture baseline status." -ErrorMessage ([string]$_.Exception.Message)
}

if ($RestartBridge.IsPresent) {
  if (Test-Path $bridgeRoot) {
    try {
      $bridgeCtl = Join-Path $bridgeRoot "bridgectl.ps1"
      if (-not (Test-Path $bridgeCtl)) {
        throw "Missing bridge control script: $bridgeCtl"
      }
      $restartOutput = & $bridgeCtl -Command restart 2>&1
      Start-Sleep -Seconds 2
      $statusOutput = & $bridgeCtl -Command status 2>&1
      $statusLines = @($statusOutput | ForEach-Object { [string]$_ })
      $statusTail = @()
      if ($statusLines.Count -gt 12) {
        $statusTail = $statusLines[($statusLines.Count - 12)..($statusLines.Count - 1)]
      } else {
        $statusTail = $statusLines
      }
      Add-StepResult -Name "bridge_restart" -Status "ok" -Summary "Bridge stack restarted and status captured." -Data ([ordered]@{
        restarted = $true
        statusTail = $statusTail
      })
    } catch {
      Add-StepResult -Name "bridge_restart" -Status "failed" -Summary "Bridge restart failed." -ErrorMessage ([string]$_.Exception.Message)
    }
  } else {
    Add-StepResult -Name "bridge_restart" -Status "warning" -Summary "Bridge root not found; restart skipped." -Data ([ordered]@{
      bridgeRoot = $bridgeRoot
    })
  }
} else {
  Add-StepResult -Name "bridge_restart" -Status "skipped" -Summary "Bridge restart not requested."
}

$resolvedApiKey = Resolve-ApiKey -InputKey $ApiKey -ProviderId $providerId
$hasApiKey = -not [string]::IsNullOrWhiteSpace($resolvedApiKey)

$applyParams = @{
  BaseUrl = $base
  Provider = $providerId
  Model = $ExternalModel
}
if ($EnableMcp.IsPresent) {
  $applyParams.EnableMcp = $true
  $applyParams.McpServerLabel = $McpServerLabel
  $applyParams.McpServerUrl = $McpServerUrl
  $applyParams.McpConnectorId = $McpConnectorId
  $applyParams.McpPreset = $McpPreset
  $applyParams.McpApprovalMode = $McpApprovalMode
  $applyParams.McpDynamicAllowlistMax = $McpDynamicAllowlistMax
  $applyParams.McpContextTtlSeconds = $McpContextTtlSeconds
}

try {
  if ($hasApiKey) {
    $applyParams.ApiKey = $resolvedApiKey
    $applyOutput = & $applyScriptPath @applyParams 2>&1
    $applyLines = @($applyOutput | ForEach-Object { [string]$_ })
    $applyJson = Parse-LastJsonObjectFromLines -Lines $applyLines
    $summary = if ($null -ne $applyJson -and $applyJson.ok -eq $true) {
      "External provider config applied and verified."
    } else {
      "External provider config applied."
    }
    Add-StepResult -Name "external_provider_config" -Status "ok" -Summary $summary -Data ([ordered]@{
      apiKeyResolved = $true
      output = $applyJson
    })
  } else {
    $staged = Invoke-StagedExternalConfig `
      -BaseUrl $base `
      -ProviderId $providerId `
      -Model $ExternalModel `
      -EnableMcp $EnableMcp.IsPresent `
      -McpServerLabel $McpServerLabel `
      -McpServerUrl $McpServerUrl `
      -McpConnectorId $McpConnectorId `
      -McpPreset $McpPreset `
      -McpApprovalMode $McpApprovalMode `
      -McpDynamicAllowlistMax $McpDynamicAllowlistMax `
      -McpContextTtlSeconds $McpContextTtlSeconds
    Add-StepResult -Name "external_provider_config" -Status "warning" -Summary "No API key found; staged disabled external config for fast activation." -Data ([ordered]@{
      apiKeyResolved = $false
      stagedDisabledConfig = $true
      output = $staged
    })
  }
} catch {
  Add-StepResult -Name "external_provider_config" -Status "failed" -Summary "External provider configuration step failed." -ErrorMessage ([string]$_.Exception.Message)
}

try {
  $mcpSmokeOutput = & $mcpSmokePath -BaseUrl $base -Provider $providerId 2>&1
  $mcpLines = @($mcpSmokeOutput | ForEach-Object { [string]$_ })
  $mcpJson = Parse-LastJsonObjectFromLines -Lines $mcpLines
  if ($null -ne $mcpJson -and $mcpJson.ok -eq $true) {
    Add-StepResult -Name "mcp_smoke_test" -Status "ok" -Summary "MCP integration smoke test passed." -Data $mcpJson
  } else {
    Add-StepResult -Name "mcp_smoke_test" -Status "failed" -Summary "MCP smoke test did not return ok=true." -Data ([ordered]@{
      outputTail = if ($mcpLines.Count -gt 20) { $mcpLines[($mcpLines.Count - 20)..($mcpLines.Count - 1)] } else { $mcpLines }
    })
  }
} catch {
  Add-StepResult -Name "mcp_smoke_test" -Status "failed" -Summary "MCP smoke test execution failed." -ErrorMessage ([string]$_.Exception.Message)
}

if ($SkipModelAudit.IsPresent) {
  Add-StepResult -Name "model_audit_trigger" -Status "skipped" -Summary "Model audit run skipped."
} else {
  try {
    $auditBody = @{
      reason = ("upgrade_wave_" + $runId)
      rearmScheduler = $true
    } | ConvertTo-Json -Compress
    $audit = Invoke-RestMethod -Method Post -Uri ($base + "/api/automation/model-audit/run") -ContentType "application/json" -Body $auditBody -TimeoutSec 240
    if ($audit.ok -eq $true) {
      $auditResult = if (Has-Property -Object $audit -Name "result") { $audit.result } else { $null }
      $auditState = if (Has-Property -Object $audit -Name "modelAudit") { $audit.modelAudit } else { $null }
      $lastSummary = if (Has-Property -Object $auditState -Name "lastSummary") { $auditState.lastSummary } else { $null }
      $resultOk = if (Has-Property -Object $auditResult -Name "ok") {
        [bool]$auditResult.ok
      } elseif (Has-Property -Object $lastSummary -Name "ok") {
        [bool]$lastSummary.ok
      } else {
        $false
      }
      $candidate = ""
      if (Has-Property -Object $auditResult -Name "primaryCandidate") {
        $candidate = [string]$auditResult.primaryCandidate
      } elseif (Has-Property -Object $lastSummary -Name "upgradeCandidate") {
        $candidate = [string]$lastSummary.upgradeCandidate
      } elseif (Has-Property -Object $auditState -Name "lastCandidateKey") {
        $candidate = [string]$auditState.lastCandidateKey
      }
      $switched = if (Has-Property -Object $auditResult -Name "switchedPrimary") {
        [bool]$auditResult.switchedPrimary
      } else {
        $false
      }
      Add-StepResult -Name "model_audit_trigger" -Status "ok" -Summary "Model audit executed." -Data ([ordered]@{
        ok = [bool]$audit.ok
        resultOk = $resultOk
        candidate = $candidate
        switched = $switched
        nextRunAt = if (Has-Property -Object $auditState -Name "nextRunAt") { [string]$auditState.nextRunAt } else { "" }
      })
    } else {
      Add-StepResult -Name "model_audit_trigger" -Status "warning" -Summary "Model audit endpoint returned ok=false." -Data $audit
    }
  } catch {
    Add-StepResult -Name "model_audit_trigger" -Status "warning" -Summary "Model audit trigger failed." -ErrorMessage ([string]$_.Exception.Message)
  }
}

if ($SkipDotnetBuild.IsPresent) {
  Add-StepResult -Name "dotnet_build" -Status "skipped" -Summary ".NET build skipped."
} else {
  try {
    if (-not (Test-Path $DotnetRepo)) {
      throw "Dotnet repo path does not exist: $DotnetRepo"
    }
    $solutionPath = Join-Path $DotnetRepo "Test.sln"
    if (-not (Test-Path $solutionPath)) {
      throw "Missing solution file: $solutionPath"
    }
    Push-Location $DotnetRepo
    try {
      $buildOutput = & dotnet build .\Test.sln -c Release 2>&1
      $exitCode = $LASTEXITCODE
    } finally {
      Pop-Location
    }
    $buildLines = @($buildOutput | ForEach-Object { [string]$_ })
    $warnings = 0
    $errors = 0
    foreach ($line in $buildLines) {
      $warningMatch = [regex]::Match($line, "^\s*(\d+)\s+Warning\(s\)")
      if ($warningMatch.Success) {
        $warnings = [int]$warningMatch.Groups[1].Value
      }
      $errorMatch = [regex]::Match($line, "^\s*(\d+)\s+Error\(s\)")
      if ($errorMatch.Success) {
        $errors = [int]$errorMatch.Groups[1].Value
      }
    }
    if ($exitCode -eq 0) {
      Add-StepResult -Name "dotnet_build" -Status "ok" -Summary ".NET solution build succeeded (net8.0 + net9.0)." -Data ([ordered]@{
        repo = $DotnetRepo
        exitCode = $exitCode
        warnings = $warnings
        errors = $errors
        tail = if ($buildLines.Count -gt 20) { $buildLines[($buildLines.Count - 20)..($buildLines.Count - 1)] } else { $buildLines }
      })
    } else {
      Add-StepResult -Name "dotnet_build" -Status "failed" -Summary ".NET solution build failed." -Data ([ordered]@{
        repo = $DotnetRepo
        exitCode = $exitCode
        warnings = $warnings
        errors = $errors
        tail = if ($buildLines.Count -gt 40) { $buildLines[($buildLines.Count - 40)..($buildLines.Count - 1)] } else { $buildLines }
      })
    }
  } catch {
    Add-StepResult -Name "dotnet_build" -Status "failed" -Summary ".NET build step failed before completion." -ErrorMessage ([string]$_.Exception.Message)
  }
}

$finishedAt = [DateTimeOffset]::UtcNow
$durationSeconds = [Math]::Round(($finishedAt - $startedAt).TotalSeconds, 2)

$report = [ordered]@{
  ok = [bool](-not $hasFailure)
  partial = [bool]$hasWarning
  runId = $runId
  startedAt = $startedAt.ToString("o")
  finishedAt = $finishedAt.ToString("o")
  durationSeconds = $durationSeconds
  baseUrl = $base
  provider = $providerId
  externalModel = $ExternalModel
  apiKeyResolved = $hasApiKey
  enableMcp = [bool]$EnableMcp.IsPresent
  paths = [ordered]@{
    asolariaRoot = $asolariaRoot
    dotnetRepo = $DotnetRepo
    jsonReport = $jsonReportPath
    markdownReport = $mdReportPath
  }
  steps = $stepResults
}

New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
($report | ConvertTo-Json -Depth 12) | Set-Content -Path $jsonReportPath -Encoding UTF8

$mdLines = @()
$mdLines += "# Asolaria Upgrade Wave Report"
$mdLines += ""
$mdLines += "- Run ID: $runId"
$mdLines += "- Started (UTC): $($startedAt.ToString('o'))"
$mdLines += "- Finished (UTC): $($finishedAt.ToString('o'))"
$mdLines += "- Duration seconds: $durationSeconds"
$mdLines += "- Base URL: $base"
$mdLines += "- Provider: $providerId"
$mdLines += "- External model target: $ExternalModel"
$mdLines += "- API key resolved: $hasApiKey"
$mdLines += "- Overall ok: $($report.ok)"
$mdLines += "- Partial (warnings present): $($report.partial)"
$mdLines += ""
$mdLines += "## Step Results"
foreach ($step in $stepResults) {
  $status = [string]$step.status
  $name = [string]$step.name
  $summary = [string]$step.summary
  $mdLines += "- [$status] **$name**: $summary"
  if (-not [string]::IsNullOrWhiteSpace([string]$step.error)) {
    $mdLines += "  - error: $([string]$step.error)"
  }
}
$mdLines | Set-Content -Path $mdReportPath -Encoding UTF8

Write-Output ("Report JSON: " + $jsonReportPath)
Write-Output ("Report MD: " + $mdReportPath)
Write-Output (($report | ConvertTo-Json -Depth 8))

if ($hasFailure) {
  exit 1
}
exit 0
