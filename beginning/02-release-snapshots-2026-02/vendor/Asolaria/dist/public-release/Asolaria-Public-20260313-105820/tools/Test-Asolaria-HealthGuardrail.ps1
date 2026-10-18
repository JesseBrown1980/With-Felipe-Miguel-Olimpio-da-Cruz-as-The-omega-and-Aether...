param(
  [int]$HttpPort = 4781,
  [int]$HttpsPort = 5443,
  [int]$OliPort = 8787,
  [int]$TimeoutSec = 5,
  [switch]$SkipOli,
  [switch]$Json,
  [switch]$Strict
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ListeningPids {
  param([int]$Port)
  $ids = @()
  $shouldFallback = $true
  try {
    $rows = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop
    foreach ($row in @($rows)) {
      $pid = [int]$row.OwningProcess
      if ($pid -gt 0) {
        $ids += $pid
      }
    }
    if (@($ids).Count -gt 0) {
      $shouldFallback = $false
    }
  } catch {
    $shouldFallback = $true
  }
  if ($shouldFallback) {
    try {
      $lines = netstat -ano | Select-String (":{0}\s" -f $Port)
      foreach ($line in @($lines)) {
        $parts = ($line.Line -split "\s+") | Where-Object { $_ }
        if ($parts.Count -lt 5) { continue }
        if ($parts[3] -ne "LISTENING") { continue }
        $pid = 0
        if ([int]::TryParse($parts[4], [ref]$pid) -and $pid -gt 0) {
          $ids += $pid
        }
      }
    } catch {}
  }
  return [int[]](@($ids | Sort-Object -Unique))
}

function Probe-HttpJson {
  param(
    [string]$Url,
    [int]$ProbeTimeoutSec = 5
  )
  try {
    $data = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec $ProbeTimeoutSec
    return [ordered]@{
      url = $Url
      ok = $true
      transport = "Invoke-RestMethod"
      error = ""
      data = $data
    }
  } catch {
    return [ordered]@{
      url = $Url
      ok = $false
      transport = "Invoke-RestMethod"
      error = [string]$_.Exception.Message
      data = $null
    }
  }
}

function Probe-HttpsJsonWithCurl {
  param(
    [string]$Url,
    [int]$ProbeTimeoutSec = 5
  )
  $curlPath = Join-Path $env:SystemRoot "System32\curl.exe"
  if (-not (Test-Path -LiteralPath $curlPath)) {
    $curlPath = "curl.exe"
  }
  try {
    $raw = & $curlPath -k -sS -m $ProbeTimeoutSec $Url 2>&1
    if ($LASTEXITCODE -ne 0) {
      return [ordered]@{
        url = $Url
        ok = $false
        transport = "curl -k"
        error = [string]$raw
        data = $null
      }
    }
    $text = [string]$raw
    $data = $text | ConvertFrom-Json
    return [ordered]@{
      url = $Url
      ok = $true
      transport = "curl -k"
      error = ""
      data = $data
    }
  } catch {
    return [ordered]@{
      url = $Url
      ok = $false
      transport = "curl -k"
      error = [string]$_.Exception.Message
      data = $null
    }
  }
}

function Select-HealthSummary {
  param([object]$Data)
  if ($null -eq $Data) {
    return $null
  }
  $queue = $Data.queue
  $avatar = $Data.avatar
  $voice = $Data.voice
  return [ordered]@{
    ok = [bool]$Data.ok
    app = [string]$Data.app
    uptimeSeconds = [int]([double]($Data.uptimeSeconds | ForEach-Object { $_ }))
    queueQueued = if ($queue) { [int]$queue.queued } else { 0 }
    queueRunning = if ($queue) { [int]$queue.running } else { 0 }
    voiceMode = if ($voice) { [string]$voice.outputMode } else { "" }
    voiceEnabled = if ($voice) { [bool]$voice.enabled } else { $false }
    avatarState = if ($avatar) { [string]$avatar.state } else { "" }
    avatarEnabled = if ($avatar) { [bool]$avatar.enabled } else { $false }
  }
}

$httpUrl = "http://127.0.0.1:$HttpPort/api/health"
$httpsUrl = "https://127.0.0.1:$HttpsPort/api/health"
$oliUrl = "https://127.0.0.1:$OliPort/api/status"

$httpProbe = Probe-HttpJson -Url $httpUrl -ProbeTimeoutSec $TimeoutSec
$httpsProbe = Probe-HttpsJsonWithCurl -Url $httpsUrl -ProbeTimeoutSec $TimeoutSec
$oliProbe = [ordered]@{
  url = $oliUrl
  ok = $false
  skipped = [bool]$SkipOli.IsPresent
  transport = "curl -k"
  error = ""
  data = $null
}
if (-not $SkipOli.IsPresent) {
  $oliProbe = Probe-HttpsJsonWithCurl -Url $oliUrl -ProbeTimeoutSec $TimeoutSec
  $oliProbe.skipped = $false
}

$httpSummary = Select-HealthSummary -Data $httpProbe.data
$httpsSummary = Select-HealthSummary -Data $httpsProbe.data

$listeners = [ordered]@{
  http = [ordered]@{
    port = $HttpPort
    pids = Get-ListeningPids -Port $HttpPort
  }
  https = [ordered]@{
    port = $HttpsPort
    pids = Get-ListeningPids -Port $HttpsPort
  }
  oli = [ordered]@{
    port = $OliPort
    pids = Get-ListeningPids -Port $OliPort
  }
}

$notes = New-Object System.Collections.Generic.List[string]
if ($httpProbe.ok -and $httpsProbe.ok) {
  $notes.Add("Asolaria main health contract is healthy on $HttpPort/$HttpsPort.")
} elseif (-not $httpProbe.ok -and $httpsProbe.ok) {
  $notes.Add("HTTPS is healthy but HTTP probe failed. Check ASOLARIA_PORT and local HTTP binding.")
} elseif ($httpProbe.ok -and -not $httpsProbe.ok) {
  $notes.Add("HTTP is healthy but HTTPS probe failed. Check cert/bind or ASOLARIA_HTTPS_PORT.")
} else {
  $notes.Add("Both Asolaria health probes failed. Verify runtime start and listener ports.")
}

if ($SkipOli.IsPresent) {
  $notes.Add("Oli gateway probe skipped by request.")
} elseif (-not $oliProbe.ok -and ($httpProbe.ok -or $httpsProbe.ok)) {
  $notes.Add("Oli gateway probe failed on $OliPort while Asolaria is healthy. 8787 is a separate service.")
}
if (-not $SkipOli.IsPresent -and $oliProbe.ok) {
  $notes.Add("Oli gateway is reachable on $OliPort.")
}

$result = [ordered]@{
  ok = [bool]($httpProbe.ok -or $httpsProbe.ok)
  timestamp = (Get-Date).ToString("o")
  powershell = [ordered]@{
    edition = [string]$PSVersionTable.PSEdition
    version = [string]$PSVersionTable.PSVersion
  }
  ports = [ordered]@{
    asolariaHttp = $HttpPort
    asolariaHttps = $HttpsPort
    oliGateway = $OliPort
  }
  listeners = $listeners
  probes = [ordered]@{
    asolariaHttp = [ordered]@{
      url = $httpProbe.url
      ok = [bool]$httpProbe.ok
      transport = [string]$httpProbe.transport
      error = [string]$httpProbe.error
      summary = $httpSummary
    }
    asolariaHttps = [ordered]@{
      url = $httpsProbe.url
      ok = [bool]$httpsProbe.ok
      transport = [string]$httpsProbe.transport
      error = [string]$httpsProbe.error
      summary = $httpsSummary
    }
    oliGateway = [ordered]@{
      url = $oliProbe.url
      skipped = [bool]$oliProbe.skipped
      ok = [bool]$oliProbe.ok
      transport = [string]$oliProbe.transport
      error = [string]$oliProbe.error
      summary = if ($oliProbe.data) {
        [ordered]@{
          ok = [bool]$oliProbe.data.ok
          bridgeRunning = [bool]$oliProbe.data.state.bridgeRunning
          voiceProvider = [string]$oliProbe.data.state.voice.provider
          avatar = [string]$oliProbe.data.state.avatar
        }
      } else { $null }
    }
  }
  checks = [ordered]@{
    asolariaHttpHealth = [ordered]@{
      ok = [bool]$httpProbe.ok
      url = $httpProbe.url
      error = [string]$httpProbe.error
      summary = $httpSummary
    }
    asolariaHttpsHealth = [ordered]@{
      ok = [bool]$httpsProbe.ok
      url = $httpsProbe.url
      error = [string]$httpsProbe.error
      summary = $httpsSummary
    }
    oliStatus = [ordered]@{
      skipped = [bool]$oliProbe.skipped
      ok = [bool]$oliProbe.ok
      url = $oliProbe.url
      error = [string]$oliProbe.error
    }
  }
  diagnostics = [ordered]@{
    listeners = $listeners
    notes = @($notes)
  }
  notes = @($notes)
}

if ($Json.IsPresent) {
  $result | ConvertTo-Json -Depth 10
} else {
  Write-Host ("Asolaria health guardrail @ " + $result.timestamp)
  Write-Host ("- PS: " + $result.powershell.edition + " " + $result.powershell.version)
  Write-Host ("- Asolaria HTTP (" + $HttpPort + "): " + $(if ($httpProbe.ok) { "OK" } else { "FAIL" }))
  if (-not $httpProbe.ok -and $httpProbe.error) { Write-Host ("  error: " + $httpProbe.error) }
  Write-Host ("- Asolaria HTTPS (" + $HttpsPort + "): " + $(if ($httpsProbe.ok) { "OK" } else { "FAIL" }) + " via " + $httpsProbe.transport)
  if (-not $httpsProbe.ok -and $httpsProbe.error) { Write-Host ("  error: " + $httpsProbe.error) }
  if ($SkipOli.IsPresent) {
    Write-Host ("- Oli gateway (" + $OliPort + "): SKIPPED")
  } else {
    Write-Host ("- Oli gateway (" + $OliPort + "): " + $(if ($oliProbe.ok) { "OK" } else { "FAIL" }) + " via " + $oliProbe.transport)
    if (-not $oliProbe.ok -and $oliProbe.error) { Write-Host ("  error: " + $oliProbe.error) }
  }
  Write-Host ("- Listeners: http=" + (@($listeners.http.pids) -join ",") + " https=" + (@($listeners.https.pids) -join ",") + " oli=" + (@($listeners.oli.pids) -join ","))
  Write-Host "- Notes:"
  foreach ($note in $result.notes) {
    Write-Host ("  - " + $note)
  }
}

if ($Strict.IsPresent -and -not $result.ok) {
  exit 2
}
