[CmdletBinding()]
param(
  [ValidateSet("Status", "Relay", "Dispatch", "Symphony", "Projects", "MistakeHints", "MistakePatterns", "BrowserTask", "Playwright")]
  [string]$Action = "Status",
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$RelayUrl = "http://127.0.0.1:8788",
  [string]$RelayRoom = "asolaria_bridge",
  [ValidateSet("asolaria", "vector", "rook", "forge", "falcon", "watchdog", "oli")]
  [string]$RelayFrom = "asolaria",
  [string]$RelaySenderToken,
  [ValidateSet("vector", "rook", "asolaria", "forge", "falcon", "watchdog", "oli")]
  [string]$RelayTarget,
  [ValidateSet("NOTE", "TASK", "QUESTION", "RESULT")]
  [string]$RelayKind = "NOTE",
  [string]$Thread,
  [string]$Text,
  [string]$Title,
  [string]$Objective,
  [ValidateSet("quick_chore", "research", "patch", "review", "orchestration", "long_running", "issue_execution")]
  [string]$TaskType = "quick_chore",
  [ValidateSet("internal", "privileged", "owner_plane")]
  [string]$Sensitivity = "internal",
  [ValidateSet("small", "medium", "large")]
  [string]$Size = "medium",
  [string[]]$AllowedPath = @(),
  [string[]]$ExpectedArtifact = @(),
  [string]$WorkerId,
  [string]$ProjectScope = "qdd",
  [string]$ProjectId = "qdd",
  [string]$Instructions,
  [bool]$ExecuteNow = $false,
  [bool]$EnsureService = $true,
  [string]$Url,
  [string[]]$BrowserStep = @(),
  [string]$Organization,
  [int]$WaitMs = 900,
  [int]$MaxChars = 24000,
  [int]$MaxLinks = 40,
  [int]$ActionTimeoutMs = 12000,
  [int]$Limit = 8,
  [string]$SkillId,
  [string]$ToolId,
  [string]$ActivityType,
  [string[]]$PlaywrightArgs = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$script:BridgeRoot = "C:\Users\acer\codex-bridge"

function Write-JsonResult {
  param(
    [Parameter(Mandatory = $true)]
    $Value
  )

  $Value | ConvertTo-Json -Depth 12
}

function Join-ApiUrl {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root,
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  return "{0}/{1}" -f $Root.TrimEnd("/"), $Path.TrimStart("/")
}

function New-QueryString {
  param(
    [hashtable]$Query
  )

  if ($null -eq $Query -or $Query.Count -lt 1) {
    return ""
  }

  $pairs = @()
  foreach ($entry in $Query.GetEnumerator()) {
    if ($null -eq $entry.Value) {
      continue
    }
    $value = [string]$entry.Value
    if ([string]::IsNullOrWhiteSpace($value)) {
      continue
    }
    $pairs += ("{0}={1}" -f [uri]::EscapeDataString([string]$entry.Key), [uri]::EscapeDataString($value))
  }
  if ($pairs.Count -lt 1) {
    return ""
  }
  return "?" + ($pairs -join "&")
}

function Invoke-AsolariaApi {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("GET", "POST")]
    [string]$Method,
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [hashtable]$Query,
    $Body
  )

  $uri = Join-ApiUrl -Root $BaseUrl -Path $Path
  $uri += New-QueryString -Query $Query
  if ($Method -eq "GET") {
    return Invoke-RestMethod -Method Get -Uri $uri
  }
  $jsonBody = if ($null -eq $Body) { "{}" } else { $Body | ConvertTo-Json -Depth 10 }
  return Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $jsonBody
}

function Get-BridgeTokenPath {
  foreach ($candidate in @(
    (Join-Path $script:BridgeRoot "bridge-token2.txt"),
    (Join-Path $script:BridgeRoot "bridge-token.txt")
  )) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }
  throw "Could not find a relay token in codex-bridge."
}

function Convert-TextToJsonIfPossible {
  param(
    [AllowEmptyString()]
    [string]$TextValue
  )

  if ([string]::IsNullOrWhiteSpace($TextValue)) {
    return $null
  }
  try {
    return $TextValue | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-RelaySenderTokenValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Sender
  )

  if (-not [string]::IsNullOrWhiteSpace($RelaySenderToken)) {
    return $RelaySenderToken.Trim()
  }

  $profilesDir = Join-Path $script:BridgeRoot "profiles"
  if (Test-Path $profilesDir) {
    foreach ($profileFile in Get-ChildItem -Path $profilesDir -Filter "*.profile.json" -File -ErrorAction SilentlyContinue) {
      try {
        $profile = Get-Content -Raw $profileFile.FullName | ConvertFrom-Json
      } catch {
        continue
      }
      $relayProperty = $profile.PSObject.Properties["relay"]
      $securityProperty = $profile.PSObject.Properties["security"]
      if ($null -eq $relayProperty -or $null -eq $securityProperty) {
        continue
      }
      $profileSender = [string]$relayProperty.Value.from
      if ($profileSender -ne $Sender) {
        continue
      }
      $envName = [string]$securityProperty.Value.senderTokenEnv
      if (-not [string]::IsNullOrWhiteSpace($envName) -and (Test-Path ("Env:{0}" -f $envName))) {
        return (Get-Item ("Env:{0}" -f $envName)).Value.Trim()
      }
    }
  }

  $policyPath = Join-Path $script:BridgeRoot "airlock-policy.json"
  if (Test-Path $policyPath) {
    try {
      $policy = Get-Content -Raw $policyPath | ConvertFrom-Json
      $senderTokens = $policy.senderTokens
      if ($null -ne $senderTokens) {
        $property = $senderTokens.PSObject.Properties[$Sender]
        if ($null -ne $property -and -not [string]::IsNullOrWhiteSpace([string]$property.Value)) {
          return ([string]$property.Value).Trim()
        }
      }
    } catch {
      # best-effort fallback only
    }
  }

  return ""
}

function Send-RelayMessage {
  param(
    [Parameter(Mandatory = $true)]
    [string]$MessageText
  )

  $token = (Get-Content -Raw (Get-BridgeTokenPath)).Trim()
  $senderToken = Get-RelaySenderTokenValue -Sender $RelayFrom
  $tempPath = Join-Path ([System.IO.Path]::GetTempPath()) ("helm-relay-" + [guid]::NewGuid().ToString("n") + ".txt")
  try {
    Set-Content -Path $tempPath -Value $MessageText -Encoding Ascii -NoNewline
    Push-Location $script:BridgeRoot
    try {
      $commandArgs = @(
        ".\\bridge.js",
        "send",
        "--url", $RelayUrl,
        "--token", $token,
        "--room", $RelayRoom,
        "--from", $RelayFrom,
        "--textFile", $tempPath
      )
      if (-not [string]::IsNullOrWhiteSpace($senderToken)) {
        $commandArgs += @("--senderToken", $senderToken)
      }
      $previousErrorAction = $ErrorActionPreference
      $ErrorActionPreference = "Continue"
      try {
        $output = & node @commandArgs 2>&1
        $exitCode = $LASTEXITCODE
      } finally {
        $ErrorActionPreference = $previousErrorAction
      }
    } finally {
      Pop-Location
    }
  } finally {
    Remove-Item $tempPath -ErrorAction SilentlyContinue
  }

  if ($exitCode -ne 0) {
    throw "bridge.js send failed with exit code $exitCode. Output: $output"
  }

  $outputText = (($output | ForEach-Object {
    if ($_ -is [System.Management.Automation.ErrorRecord]) {
      $_.ToString()
    } else {
      [string]$_
    }
  }) -join [Environment]::NewLine).Trim()
  return [ordered]@{
    ok = $true
    raw = $outputText
    parsed = Convert-TextToJsonIfPossible -TextValue $outputText
  }
}

switch ($Action) {
  "Status" {
    $health = Invoke-AsolariaApi -Method GET -Path "/api/health"
    $swarm = Invoke-AsolariaApi -Method GET -Path "/api/swarm/status"
    $workerRouter = Invoke-AsolariaApi -Method GET -Path "/api/worker-router/status"
    $symphony = Invoke-AsolariaApi -Method GET -Path "/api/integrations/symphony/status"
    $augment = Invoke-AsolariaApi -Method GET -Path "/api/integrations/augment-context/status"
    $gemini = Invoke-AsolariaApi -Method GET -Path "/api/integrations/gemini_api/status"
    $project = Invoke-AsolariaApi -Method GET -Path ("/api/projects/{0}" -f [uri]::EscapeDataString($ProjectId))
    $mistakes = Invoke-AsolariaApi -Method GET -Path "/api/mistakes/hints" -Query @{ limit = $Limit }

    Write-JsonResult ([ordered]@{
      ok = $true
      identity = "Helm"
      action = "status"
      generatedAt = (Get-Date).ToString("o")
      project = $project.project
      runtime = [ordered]@{
        activeWorkOrg = $health.settings.activeWorkOrg
        brainPrimaryProvider = $health.settings.brainPrimaryProvider
        swarmModeEnabled = $health.settings.swarmModeEnabled
        superSwarmEnabled = $health.settings.superSwarmEnabled
        superSwarmMission = $health.settings.superSwarmMission
        superSwarmFanout = $health.settings.superSwarmAgentFanout
      }
      relay = [ordered]@{
        room = $swarm.swarm.room
        peers = $swarm.swarm.superSwarm.relayPeers
        agentsOnline = $swarm.agentColony.counts.online
        agentsActive = $swarm.agentColony.counts.active
      }
      integrations = [ordered]@{
        workerRouter = $workerRouter.status.integrationSummary
        symphony = [ordered]@{
          configured = $symphony.status.configured
          running = $symphony.status.process.running
          issueCount = $symphony.liveState.summary.issueIdentifiers
        }
        augment = [ordered]@{
          configured = $augment.status.configured
          mode = $augment.status.mode
          allowedTools = $augment.status.allowedTools
        }
        gemini = [ordered]@{
          configured = $gemini.status.configured
          source = $gemini.status.apiKeySource
          model = $gemini.status.defaultModel
        }
      }
      mistakes = $mistakes
    })
    break
  }
  "Relay" {
    if ([string]::IsNullOrWhiteSpace($RelayTarget)) {
      throw "Relay requires -RelayTarget."
    }
    if ([string]::IsNullOrWhiteSpace($Text)) {
      throw "Relay requires -Text."
    }

    $messageParts = @("@$RelayTarget")
    if (-not [string]::IsNullOrWhiteSpace($Thread)) {
      $messageParts += "#thread:$Thread"
    }
    $messageParts += ("{0}:" -f $RelayKind)
    $messageParts += $Text.Trim()
    $messageText = ($messageParts -join " ").Trim()
    $result = Send-RelayMessage -MessageText $messageText

    Write-JsonResult ([ordered]@{
      ok = $true
      identity = "Helm"
      action = "relay"
      room = $RelayRoom
      from = $RelayFrom
      senderTokenResolved = -not [string]::IsNullOrWhiteSpace((Get-RelaySenderTokenValue -Sender $RelayFrom))
      target = $RelayTarget
      thread = $Thread
      text = $messageText
      relay = $result
    })
    break
  }
  "Dispatch" {
    if ([string]::IsNullOrWhiteSpace($Title) -and [string]::IsNullOrWhiteSpace($Objective)) {
      throw "Dispatch requires -Title or -Objective."
    }

    $body = [ordered]@{
      title = $Title
      objective = $Objective
      taskType = $TaskType
      sensitivity = $Sensitivity
      size = $Size
      allowedPaths = $AllowedPath
      expectedArtifacts = $ExpectedArtifact
      workerId = $WorkerId
      projectScope = $ProjectScope
      instructions = $Instructions
      executeNow = $ExecuteNow
      ensureService = $EnsureService
    }

    $dispatch = Invoke-AsolariaApi -Method POST -Path "/api/worker-router/dispatch" -Body $body
    Write-JsonResult $dispatch
    break
  }
  "Symphony" {
    if ([string]::IsNullOrWhiteSpace($Title) -and [string]::IsNullOrWhiteSpace($Objective)) {
      throw "Symphony requires -Title or -Objective."
    }

    $body = [ordered]@{
      title = $Title
      objective = $Objective
      instructions = $Instructions
      allowedPaths = $AllowedPath
      expectedArtifacts = $ExpectedArtifact
      taskType = $TaskType
      sensitivity = $Sensitivity
      size = $Size
      ensureService = $EnsureService
    }

    $submission = Invoke-AsolariaApi -Method POST -Path "/api/integrations/symphony/submit" -Body $body
    Write-JsonResult $submission
    break
  }
  "Projects" {
    if ([string]::IsNullOrWhiteSpace($ProjectId)) {
      Write-JsonResult (Invoke-AsolariaApi -Method GET -Path "/api/projects")
    } else {
      Write-JsonResult (Invoke-AsolariaApi -Method GET -Path ("/api/projects/{0}" -f [uri]::EscapeDataString($ProjectId)))
    }
    break
  }
  "MistakeHints" {
    Write-JsonResult (Invoke-AsolariaApi -Method GET -Path "/api/mistakes/hints" -Query @{
      limit = $Limit
      skillId = $SkillId
      toolId = $ToolId
      activityType = $ActivityType
    })
    break
  }
  "MistakePatterns" {
    Write-JsonResult (Invoke-AsolariaApi -Method GET -Path "/api/mistakes/patterns" -Query @{
      limit = $Limit
      skillId = $SkillId
      toolId = $ToolId
      activityType = $ActivityType
    })
    break
  }
  "BrowserTask" {
    if ([string]::IsNullOrWhiteSpace($Url)) {
      throw "BrowserTask requires -Url."
    }
    if ($BrowserStep.Count -lt 1) {
      throw "BrowserTask requires at least one -BrowserStep."
    }

    $body = [ordered]@{
      url = $Url
      steps = $BrowserStep
      organization = $Organization
      waitMs = $WaitMs
      maxChars = $MaxChars
      maxLinks = $MaxLinks
      actionTimeoutMs = $ActionTimeoutMs
    }

    $browserTask = Invoke-AsolariaApi -Method POST -Path "/api/browser/task" -Body $body
    Write-JsonResult $browserTask
    break
  }
  "Playwright" {
    if ($PlaywrightArgs.Count -lt 1) {
      throw "Playwright requires one or more -PlaywrightArgs values."
    }

    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      $output = & npx --yes --package @playwright/cli playwright-cli @PlaywrightArgs 2>&1
      $exitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorAction
    }
    if ($exitCode -ne 0) {
      throw "Playwright CLI failed with exit code $exitCode. Output: $output"
    }
    Write-JsonResult ([ordered]@{
      ok = $true
      identity = "Helm"
      action = "playwright"
      command = @("npx", "--yes", "--package", "@playwright/cli", "playwright-cli") + $PlaywrightArgs
      output = ($output | ForEach-Object {
        if ($_ -is [System.Management.Automation.ErrorRecord]) {
          $_.ToString()
        } else {
          [string]$_
        }
      })
    })
    break
  }
}
