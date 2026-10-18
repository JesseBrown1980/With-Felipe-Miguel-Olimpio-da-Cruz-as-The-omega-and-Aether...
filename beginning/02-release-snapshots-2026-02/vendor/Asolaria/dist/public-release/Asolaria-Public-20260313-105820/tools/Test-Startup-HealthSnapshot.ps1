[CmdletBinding()]
param(
  [string]$OutDir = "C:\Users\acer\Asolaria\reports"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-BridgeToken {
  param(
    [Parameter(Mandatory = $true)][string]$Token,
    [Parameter(Mandatory = $true)][string]$DeviceId
  )

  if ([string]::IsNullOrWhiteSpace($Token)) {
    return $false
  }

  try {
    $ws = [System.Net.WebSockets.ClientWebSocket]::new()
    $cts = [System.Threading.CancellationTokenSource]::new()
    $cts.CancelAfter(7000)
    $uri = [Uri](
      "ws://127.0.0.1:8765/ws/phone?token=$([Uri]::EscapeDataString($Token))&device_id=$([Uri]::EscapeDataString($DeviceId))"
    )
    [void]$ws.ConnectAsync($uri, $cts.Token).GetAwaiter().GetResult()
    Start-Sleep -Milliseconds 200
    $ok = ($ws.State -eq [System.Net.WebSockets.WebSocketState]::Open)
    try {
      [void]$ws.CloseAsync(
        [System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure,
        "done",
        [Threading.CancellationToken]::None
      ).GetAwaiter().GetResult()
    } catch {}
    $ws.Dispose()
    return [bool]$ok
  } catch {
    return $false
  }
}

$ts = Get-Date
$stamp = $ts.ToString("yyyyMMdd-HHmmss")
$base = Join-Path $OutDir ("startup-health-snapshot-" + $stamp)
$null = New-Item -ItemType Directory -Path $base -Force

$startupFolder = [Environment]::GetFolderPath("Startup")
$startupLink = Join-Path $startupFolder "Asolaria One Button Startup.lnk"
$startupLinkDisabled = Join-Path $startupFolder "Asolaria One Button Startup.lnk.disabled"

$taskRows = @(
  Get-ScheduledTask -ErrorAction SilentlyContinue |
    Where-Object { $_.TaskName -like "Asolaria*" } |
    Select-Object TaskName, TaskPath, State
)

$bridgeStatus = $null
try {
  $bridgeStatus = Invoke-RestMethod -Uri "http://127.0.0.1:8765/api/status" -TimeoutSec 8
} catch {}

$newToken = [Environment]::GetEnvironmentVariable("BRIDGE_SHARED_TOKEN", "User")
$oldToken = ""
$rollbackTokenFile = "C:\Users\acer\Asolaria\reports\fix-increment9-20260302-180827\rollback-secret.json"
if (Test-Path -LiteralPath $rollbackTokenFile) {
  try {
    $oldToken = [string]((Get-Content -Raw -LiteralPath $rollbackTokenFile | ConvertFrom-Json).OldToken)
  } catch {}
}

$runtime = [pscustomobject]@{
  pythonWhere = @(& where.exe python 2>$null)
  pythonVersion = (& python --version 2>$null)
  javaWhere = @(& where.exe java 2>$null)
  storePresent = [bool](Get-AppxPackage -Name Microsoft.WindowsStore -ErrorAction SilentlyContinue)
  windowsAppsShimExists = Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\python.exe")
}

$snapshot = [pscustomobject]@{
  generatedAt = $ts.ToString("o")
  startup = [pscustomobject]@{
    startupFolder = $startupFolder
    linkExists = Test-Path -LiteralPath $startupLink
    disabledLinkExists = Test-Path -LiteralPath $startupLinkDisabled
  }
  tasks = @($taskRows)
  bridge = [pscustomobject]@{
    statusEndpointOk = [bool]$bridgeStatus
    statusServerTime = if ($bridgeStatus) { [string]$bridgeStatus.serverTime } else { "" }
    newTokenLength = ([string]$newToken).Length
    oldTokenLength = ([string]$oldToken).Length
    newTokenAccepted = Test-BridgeToken -Token $newToken -DeviceId "snapshot-new"
    oldTokenAccepted = Test-BridgeToken -Token $oldToken -DeviceId "snapshot-old"
  }
  runtime = $runtime
}

$jsonPath = Join-Path $base "snapshot.json"
$mdPath = Join-Path $base "snapshot.md"
$snapshot | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$md = @()
$md += "# Startup Health Snapshot"
$md += ""
$md += "- Generated: $($ts.ToString('u'))"
$md += "- Startup link exists: $(Test-Path -LiteralPath $startupLink)"
$md += "- Startup disabled link exists: $(Test-Path -LiteralPath $startupLinkDisabled)"
$md += "- Bridge status endpoint OK: $([bool]$bridgeStatus)"
$md += "- New token accepted: $($snapshot.bridge.newTokenAccepted)"
$md += "- Old token accepted: $($snapshot.bridge.oldTokenAccepted)"
$md += "- Store present: $($runtime.storePresent)"
$md += "- WindowsApps shim exists: $($runtime.windowsAppsShimExists)"
$md += ""
$md += "## Tasks"
foreach ($t in $taskRows) {
  $md += "- $($t.TaskPath)$($t.TaskName): $($t.State)"
}
$md += ""
$md += "JSON: $jsonPath"
$md | Set-Content -LiteralPath $mdPath -Encoding UTF8

[pscustomobject]@{
  ok = $true
  outDir = $base
  json = $jsonPath
  markdown = $mdPath
} | ConvertTo-Json -Depth 6
