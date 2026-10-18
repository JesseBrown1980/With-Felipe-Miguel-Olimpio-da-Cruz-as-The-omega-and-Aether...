param(
  [int]$Port = 4793,
  [string]$BindHost = "127.0.0.1",
  [string]$WorkspaceRoot = "",
  [string]$AuggiePath = "",
  [string]$CloudflaredPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Read-Pid {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return 0 }
  try {
    return [int]((Get-Content -LiteralPath $Path -Raw).Trim())
  } catch {
    return 0
  }
}

function Test-PidRunning {
  param([int]$ProcessId)
  if ($ProcessId -le 0) { return $false }
  try {
    $null = Get-Process -Id $ProcessId -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function New-BridgeToken {
  $bytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Read-LatestTunnelUrl {
  param([string[]]$Paths)
  foreach ($path in $Paths) {
    if (-not (Test-Path -LiteralPath $path)) { continue }
    $lines = Get-Content -LiteralPath $path -Tail 200 -ErrorAction SilentlyContinue
    foreach ($line in ($lines | Select-Object -Last 200)) {
      if ([string]$line -match 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com') {
        return $Matches[0]
      }
    }
  }
  return ""
}

function Resolve-AuggiePath {
  param([string]$Candidate)
  $raw = [string]$Candidate
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return ""
  }

  $resolved = $raw.Trim()
  if ($resolved.EndsWith(".ps1", [System.StringComparison]::OrdinalIgnoreCase)) {
    $cmdSibling = [System.IO.Path]::ChangeExtension($resolved, ".cmd")
    if (Test-Path -LiteralPath $cmdSibling) {
      return $cmdSibling
    }
  }
  return $resolved
}

$repoRoot = Get-AsolariaRoot
$logsDir = Join-Path $repoRoot "logs"
Ensure-Dir -Path $logsDir

if ([string]::IsNullOrWhiteSpace($WorkspaceRoot)) {
  $WorkspaceRoot = $repoRoot
}
if ([string]::IsNullOrWhiteSpace($AuggiePath)) {
  try {
    $AuggiePath = (Get-Command auggie.cmd -ErrorAction Stop).Source
  } catch {
    try {
      $AuggiePath = (Get-Command auggie -ErrorAction Stop).Source
    } catch {
      $AuggiePath = "C:\nvm4w\nodejs\auggie.cmd"
    }
  }
}
$AuggiePath = Resolve-AuggiePath -Candidate $AuggiePath
if ([string]::IsNullOrWhiteSpace($CloudflaredPath)) {
  try {
    $CloudflaredPath = (Get-Command cloudflared -ErrorAction Stop).Source
  } catch {
    $CloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
  }
}

$nodePath = (Get-Command node -ErrorAction Stop).Source
$bridgeScript = Join-Path $PSScriptRoot "augment-mcp-bridge.js"
$tokenFile = Join-Path $logsDir "augment-mcp-bridge-token.txt"
$statusFile = Join-Path $logsDir "augment-mcp-bridge-status.json"
$bridgePidFile = Join-Path $logsDir "augment-mcp-bridge.pid"
$bridgeOutLog = Join-Path $logsDir "augment-mcp-bridge.out.log"
$bridgeErrLog = Join-Path $logsDir "augment-mcp-bridge.err.log"
$tunnelPidFile = Join-Path $logsDir "augment-mcp-bridge-tunnel.pid"
$tunnelOutLog = Join-Path $logsDir "augment-mcp-bridge-tunnel.out.log"
$tunnelErrLog = Join-Path $logsDir "augment-mcp-bridge-tunnel.err.log"
$urlFile = Join-Path $logsDir "augment-mcp-bridge-url.txt"

if (-not (Test-Path -LiteralPath $tokenFile)) {
  $token = New-BridgeToken
  Set-Content -LiteralPath $tokenFile -Value $token -Encoding ASCII
}
$token = (Get-Content -LiteralPath $tokenFile -Raw).Trim()

$bridgePid = Read-Pid -Path $bridgePidFile
if (-not (Test-PidRunning -ProcessId $bridgePid)) {
  $bridgeArgs = @(
    "`"$bridgeScript`"",
    "--port", "$Port",
    "--host", "$BindHost",
    "--workspace-root", "`"$WorkspaceRoot`"",
    "--auggie-path", "`"$AuggiePath`"",
    "--token-file", "`"$tokenFile`"",
    "--status-file", "`"$statusFile`""
  )
  $bridgeProc = Start-Process -FilePath $nodePath `
    -ArgumentList $bridgeArgs `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $bridgeOutLog `
    -RedirectStandardError $bridgeErrLog `
    -PassThru
  Set-Content -LiteralPath $bridgePidFile -Value ([string]$bridgeProc.Id) -Encoding ASCII
  $bridgePid = $bridgeProc.Id
}

$healthUrl = "http://$BindHost`:$Port/health"
$healthOk = $false
for ($i = 0; $i -lt 40; $i += 1) {
  Start-Sleep -Milliseconds 750
  try {
    $resp = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 5
    if ($resp.ok) {
      $healthOk = $true
      break
    }
  } catch {
  }
}
if (-not $healthOk) {
  throw "Augment MCP bridge did not become healthy at $healthUrl"
}

$tunnelPid = Read-Pid -Path $tunnelPidFile
$publicUrl = ""
if (Test-PidRunning -ProcessId $tunnelPid) {
  $publicUrl = Read-LatestTunnelUrl -Paths @($tunnelErrLog, $tunnelOutLog, $urlFile)
}
if ([string]::IsNullOrWhiteSpace($publicUrl)) {
  $tunnelArgs = @(
    "tunnel",
    "--no-autoupdate",
    "--url", "http://$BindHost`:$Port"
  )
  $tunnelProc = Start-Process -FilePath $CloudflaredPath `
    -ArgumentList $tunnelArgs `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $tunnelOutLog `
    -RedirectStandardError $tunnelErrLog `
    -PassThru
  Set-Content -LiteralPath $tunnelPidFile -Value ([string]$tunnelProc.Id) -Encoding ASCII
  $tunnelPid = $tunnelProc.Id

  for ($i = 0; $i -lt 80; $i += 1) {
    Start-Sleep -Milliseconds 750
    $publicUrl = Read-LatestTunnelUrl -Paths @($tunnelErrLog, $tunnelOutLog)
    if (-not [string]::IsNullOrWhiteSpace($publicUrl)) {
      break
    }
  }
}

if ([string]::IsNullOrWhiteSpace($publicUrl)) {
  throw "cloudflared tunnel URL was not discovered from logs."
}

Set-Content -LiteralPath $urlFile -Value $publicUrl -Encoding ASCII

[ordered]@{
  ok = $true
  bridgePid = $bridgePid
  tunnelPid = $tunnelPid
  localUrl = "http://$BindHost`:$Port/mcp"
  serverUrl = ($publicUrl.TrimEnd("/") + "/mcp")
  tokenFile = $tokenFile
  authorizationHint = ("Bearer " + $token.Substring(0, [Math]::Min(4, $token.Length)) + "***")
  statusFile = $statusFile
  bridgeLogs = @($bridgeOutLog, $bridgeErrLog)
  tunnelLogs = @($tunnelOutLog, $tunnelErrLog)
} | ConvertTo-Json -Depth 4
