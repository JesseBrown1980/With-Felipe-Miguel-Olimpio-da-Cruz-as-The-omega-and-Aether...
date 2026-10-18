param(
  [string]$ProjectRoot = "",
  [string]$CloudflaredLogPath = "",
  [string]$OutputPath = "",
  [int]$TailLines = 500,
  [int]$HealthTimeoutSec = 6,
  [switch]$RequireHealth
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-ProjectRoot {
  if (-not [string]::IsNullOrWhiteSpace($ProjectRoot)) {
    return (Resolve-Path -LiteralPath $ProjectRoot).Path
  }
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Read-LatestTunnelUrlFromLog {
  param(
    [string]$Path,
    [int]$Lines
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return ""
  }

  $tail = @(Get-Content -LiteralPath $Path -Tail ([Math]::Max(50, $Lines)))
  for ($i = $tail.Count - 1; $i -ge 0; $i--) {
    $line = [string]$tail[$i]
    if ($line -match 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com') {
      return [string]$Matches[0]
    }
  }
  return ""
}

function Test-TunnelHealth {
  param(
    [string]$TunnelUrl,
    [int]$TimeoutSec
  )

  if ([string]::IsNullOrWhiteSpace($TunnelUrl)) {
    return $false
  }

  try {
    $resp = Invoke-RestMethod -Uri ($TunnelUrl.TrimEnd("/") + "/api/health") -TimeoutSec ([Math]::Max(2, $TimeoutSec))
    return [bool]$resp.ok
  } catch {
    return $false
  }
}

$root = Resolve-ProjectRoot
$logsDir = Join-Path $root "logs"
if ([string]::IsNullOrWhiteSpace($CloudflaredLogPath)) {
  $CloudflaredLogPath = Join-Path $logsDir "cloudflared-asolaria-public.err.log"
}
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $logsDir "cloudflared-asolaria-url.txt"
}

$url = Read-LatestTunnelUrlFromLog -Path $CloudflaredLogPath -Lines $TailLines
$healthOk = Test-TunnelHealth -TunnelUrl $url -TimeoutSec $HealthTimeoutSec
$shouldWrite = (-not [string]::IsNullOrWhiteSpace($url)) -and ((-not $RequireHealth.IsPresent) -or $healthOk)

$previous = ""
try { $previous = (Get-Content -LiteralPath $OutputPath -Raw -ErrorAction Stop).Trim() } catch {}

if ($shouldWrite) {
  Set-Content -LiteralPath $OutputPath -Value $url -Encoding ASCII
}

$result = [ordered]@{
  ok = $shouldWrite
  url = $url
  previous = $previous
  changed = ($shouldWrite -and ($url -ne $previous))
  healthOk = $healthOk
  requireHealth = [bool]$RequireHealth.IsPresent
  logPath = $CloudflaredLogPath
  outputPath = $OutputPath
  updatedAt = (Get-Date).ToString("o")
}

$result | ConvertTo-Json -Compress
