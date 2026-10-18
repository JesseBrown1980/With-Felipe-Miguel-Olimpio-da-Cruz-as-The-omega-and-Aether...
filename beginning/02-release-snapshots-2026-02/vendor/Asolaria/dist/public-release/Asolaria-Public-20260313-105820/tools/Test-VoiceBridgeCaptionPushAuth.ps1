param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$SessionId = "",
  [string]$BridgePushToken = "",
  [string]$ReportPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-QueryString {
  param([hashtable]$Params)
  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($key in ($Params.Keys | Sort-Object)) {
    $raw = $Params[$key]
    if ($null -eq $raw) {
      continue
    }
    $text = [string]$raw
    if ([string]::IsNullOrWhiteSpace($text)) {
      continue
    }
    $parts.Add(
      ("{0}={1}" -f [uri]::EscapeDataString([string]$key), [uri]::EscapeDataString($text))
    )
  }
  return [string]::Join("&", $parts)
}

function Parse-JsonSafe {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) {
    return $null
  }
  try {
    return ($Text | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Invoke-HttpJson {
  param(
    [Parameter(Mandatory = $true)][ValidateSet("GET", "POST")] [string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [object]$Body = $null,
    [hashtable]$Headers = $null
  )
  $invokeParams = @{
    Method = $Method
    Uri = $Url
    TimeoutSec = 20
    ErrorAction = "Stop"
    UseBasicParsing = $true
  }
  if ($Headers) {
    $invokeParams["Headers"] = $Headers
  }
  if ($Method -eq "POST") {
    $invokeParams["ContentType"] = "application/json"
    $invokeParams["Body"] = (($Body | ConvertTo-Json -Depth 12))
  }
  try {
    $response = Invoke-WebRequest @invokeParams
    $statusCode = [int]$response.StatusCode
    $content = [string]$response.Content
    return [pscustomobject]@{
      ok = $true
      statusCode = $statusCode
      content = $content
      json = Parse-JsonSafe -Text $content
      error = ""
    }
  } catch {
    $statusCode = 0
    $content = ""
    $exception = $_.Exception
    $message = [string]($exception.Message)
    $response = $null
    if ($exception) {
      try {
        $response = $exception | Select-Object -ExpandProperty Response -ErrorAction Stop
      } catch {
        $response = $null
      }
    }
    if ($response) {
      $statusCode = [int]$response.StatusCode
      try {
        $stream = $response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $content = [string]$reader.ReadToEnd()
          $reader.Dispose()
          $stream.Dispose()
        }
      } catch {}
    }
    return [pscustomobject]@{
      ok = $false
      statusCode = $statusCode
      content = $content
      json = Parse-JsonSafe -Text $content
      error = $message
    }
  }
}

function Format-YesNo {
  param([bool]$Value)
  if ($Value) {
    return "yes"
  }
  return "no"
}

function Format-PassFail {
  param([bool]$Value)
  if ($Value) {
    return "PASS"
  }
  return "FAIL"
}

$base = $BaseUrl.TrimEnd("/")
if ([string]::IsNullOrWhiteSpace($SessionId)) {
  $SessionId = "bridge_auth_{0}_{1}" -f (Get-Date -Format "yyyyMMdd_HHmmss"), ([guid]::NewGuid().ToString("N").Substring(0, 6))
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $repoRoot "reports"
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null
if ([string]::IsNullOrWhiteSpace($ReportPath)) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $ReportPath = Join-Path $reportsDir ("bridge-caption-auth-smoke-{0}.md" -f $stamp)
}

$authResponse = Invoke-HttpJson -Method GET -Url ("{0}/api/voice/bridge-caption/auth-status" -f $base)
if (-not $authResponse.ok -or $authResponse.statusCode -lt 200 -or $authResponse.statusCode -ge 300) {
  throw ("auth_status_failed: status={0}; error={1}" -f $authResponse.statusCode, $authResponse.error)
}

$auth = $authResponse.json.auth
$authRequired = [bool]$auth.required
$authConfigured = [bool]$auth.configured
$laneId = "auth_smoke_lane"

[void](Invoke-HttpJson -Method POST -Url ("{0}/api/voice/bridge-caption/reset" -f $base) -Body @{
  sessionId = $SessionId
  source = "auth_smoke"
  laneId = $laneId
})

function Invoke-PushProbe {
  param(
    [string]$Name,
    [string]$Token = ""
  )
  $query = New-QueryString @{
    text = ("Auth smoke line {0} {1}" -f $Name, [DateTimeOffset]::UtcNow.ToString("o"))
    source = "auth_smoke"
    laneId = $laneId
    sessionId = $SessionId
    at = [DateTimeOffset]::UtcNow.ToString("o")
    token = $Token
  }
  $url = "{0}/api/voice/bridge-caption/push?{1}" -f $base, $query
  $response = Invoke-HttpJson -Method GET -Url $url
  $accepted = [bool]($response.json.accepted -eq $true -or $response.json.deduped -eq $true)
  return [pscustomobject]@{
    name = $Name
    tokenProvided = -not [string]::IsNullOrWhiteSpace($Token)
    statusCode = [int]$response.statusCode
    accepted = $accepted
    okTransport = ($response.statusCode -ge 200 -and $response.statusCode -lt 300)
    error = [string]$response.error
    raw = $response
  }
}

$probeNoToken = Invoke-PushProbe -Name "no_token"
$probeWrongToken = Invoke-PushProbe -Name "wrong_token" -Token "__wrong__"
$probeCorrectToken = $null
if (-not [string]::IsNullOrWhiteSpace($BridgePushToken)) {
  $probeCorrectToken = Invoke-PushProbe -Name "correct_token" -Token $BridgePushToken
}

$assertions = New-Object System.Collections.Generic.List[object]

if (-not $authRequired) {
  $assertions.Add([pscustomobject]@{
    name = "open_mode_no_token_allows_push"
    expected = "status 2xx"
    observed = ("status {0}" -f $probeNoToken.statusCode)
    pass = ($probeNoToken.statusCode -ge 200 -and $probeNoToken.statusCode -lt 300)
  }) | Out-Null
} elseif ($authConfigured) {
  $assertions.Add([pscustomobject]@{
    name = "required_mode_no_token_blocked"
    expected = "status 403"
    observed = ("status {0}" -f $probeNoToken.statusCode)
    pass = ($probeNoToken.statusCode -eq 403)
  }) | Out-Null
  $assertions.Add([pscustomobject]@{
    name = "required_mode_wrong_token_blocked"
    expected = "status 403"
    observed = ("status {0}" -f $probeWrongToken.statusCode)
    pass = ($probeWrongToken.statusCode -eq 403)
  }) | Out-Null
  if ($probeCorrectToken) {
    $assertions.Add([pscustomobject]@{
      name = "required_mode_correct_token_allows_push"
      expected = "status 2xx"
      observed = ("status {0}" -f $probeCorrectToken.statusCode)
      pass = ($probeCorrectToken.statusCode -ge 200 -and $probeCorrectToken.statusCode -lt 300)
    }) | Out-Null
  } else {
    $assertions.Add([pscustomobject]@{
      name = "required_mode_correct_token_probe_missing"
      expected = "BridgePushToken input"
      observed = "not provided"
      pass = $false
    }) | Out-Null
  }
} else {
  $assertions.Add([pscustomobject]@{
    name = "required_but_unconfigured_blocks_push"
    expected = "status 403"
    observed = ("status {0}" -f $probeNoToken.statusCode)
    pass = ($probeNoToken.statusCode -eq 403)
  }) | Out-Null
}

$failedAssertions = @($assertions | Where-Object { $_.pass -ne $true })
$overallOk = ($failedAssertions.Count -eq 0)

$reportLines = @(
  "# Voice Bridge Caption Push Auth Smoke",
  "",
  ("Generated: {0}" -f [DateTimeOffset]::UtcNow.ToString("o")),
  ("Base URL: {0}" -f $base),
  ("Session ID: {0}" -f $SessionId),
  ("BridgePushToken provided to script: {0}" -f (Format-YesNo (-not [string]::IsNullOrWhiteSpace($BridgePushToken)))),
  "",
  "## Runtime Auth Status",
  "",
  ("- required: {0}" -f (Format-YesNo $authRequired)),
  ("- requiredBySetting: {0}" -f (Format-YesNo ([bool]$auth.requiredBySetting))),
  ("- configured: {0}" -f (Format-YesNo $authConfigured)),
  ("- mode: {0}" -f [string]$auth.mode),
  "",
  "## Probe Results",
  "",
  "| Probe | Token Provided | HTTP Status | Accepted | Error |",
  "| --- | --- | ---: | --- | --- |",
  ("| {0} | {1} | {2} | {3} | {4} |" -f $probeNoToken.name, (Format-YesNo $probeNoToken.tokenProvided), $probeNoToken.statusCode, (Format-YesNo $probeNoToken.accepted), ([string]$probeNoToken.error).Replace('|', '/')),
  ("| {0} | {1} | {2} | {3} | {4} |" -f $probeWrongToken.name, (Format-YesNo $probeWrongToken.tokenProvided), $probeWrongToken.statusCode, (Format-YesNo $probeWrongToken.accepted), ([string]$probeWrongToken.error).Replace('|', '/'))
)
if ($probeCorrectToken) {
  $reportLines += ("| {0} | {1} | {2} | {3} | {4} |" -f $probeCorrectToken.name, (Format-YesNo $probeCorrectToken.tokenProvided), $probeCorrectToken.statusCode, (Format-YesNo $probeCorrectToken.accepted), ([string]$probeCorrectToken.error).Replace('|', '/'))
}

$reportLines += ""
$reportLines += "## Assertions"
$reportLines += ""
$reportLines += "| Assertion | Expected | Observed | Result |"
$reportLines += "| --- | --- | --- | --- |"
foreach ($assertion in $assertions) {
  $reportLines += ("| {0} | {1} | {2} | {3} |" -f [string]$assertion.name, [string]$assertion.expected, [string]$assertion.observed, (Format-PassFail ([bool]$assertion.pass)))
}
$reportLines += ""
$reportLines += ("Overall: {0}" -f (Format-PassFail $overallOk))

$reportDir = Split-Path -Parent $ReportPath
if ($reportDir) {
  New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
}
($reportLines -join "`r`n") | Set-Content -Path $ReportPath -Encoding UTF8

[pscustomobject]@{
  ok = $overallOk
  baseUrl = $base
  sessionId = $SessionId
  reportPath = $ReportPath
  auth = [pscustomobject]@{
    required = $authRequired
    requiredBySetting = [bool]$auth.requiredBySetting
    configured = $authConfigured
    mode = [string]$auth.mode
  }
  probes = @(
    [pscustomobject]@{
      name = $probeNoToken.name
      statusCode = $probeNoToken.statusCode
      tokenProvided = $probeNoToken.tokenProvided
      accepted = $probeNoToken.accepted
    },
    [pscustomobject]@{
      name = $probeWrongToken.name
      statusCode = $probeWrongToken.statusCode
      tokenProvided = $probeWrongToken.tokenProvided
      accepted = $probeWrongToken.accepted
    }
  ) + @(
    if ($probeCorrectToken) {
      [pscustomobject]@{
        name = $probeCorrectToken.name
        statusCode = $probeCorrectToken.statusCode
        tokenProvided = $probeCorrectToken.tokenProvided
        accepted = $probeCorrectToken.accepted
      }
    }
  )
  assertions = $assertions
  testedAt = [DateTimeOffset]::UtcNow.ToString("o")
} | ConvertTo-Json -Depth 8
