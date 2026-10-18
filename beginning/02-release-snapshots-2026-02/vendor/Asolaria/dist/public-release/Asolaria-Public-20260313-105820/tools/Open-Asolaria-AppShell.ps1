param(
  [ValidateSet("simple", "admin", "advanced")]
  [string]$Mode = "simple",
  [int]$Port = 4781,
  [switch]$SkipStart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Wait-ForAsolariaHealth {
  param(
    [int]$ProbePort,
    [int]$TimeoutSeconds = 50
  )
  $deadline = (Get-Date).AddSeconds([Math]::Max(10, $TimeoutSeconds))
  while ((Get-Date) -lt $deadline) {
    try {
      $health = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/health/fast" -f $ProbePort) -TimeoutSec 3
      if ($health -and $health.ok) {
        return $true
      }
    } catch {
      # keep waiting
    }
    Start-Sleep -Milliseconds 900
  }
  return $false
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$startScript = Join-Path $PSScriptRoot "Start-Asolaria-OneButton.ps1"
$openUiScript = Join-Path $PSScriptRoot "Open-Asolaria-Ui.ps1"
if (-not (Test-Path -LiteralPath $startScript)) {
  throw "Start script not found: $startScript"
}
if (-not (Test-Path -LiteralPath $openUiScript)) {
  throw "UI launcher script not found: $openUiScript"
}

if (-not $SkipStart.IsPresent) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $startScript -Port $Port -NoUi
}

$healthy = Wait-ForAsolariaHealth -ProbePort $Port -TimeoutSeconds 55
if (-not $healthy) {
  throw ("Asolaria did not become healthy on port {0} before app-shell open." -f $Port)
}

$startupMonitorEnabled = $true
$startupMonitorRaw = [string][Environment]::GetEnvironmentVariable("ASOLARIA_UI_STARTUP_MONITOR", "Process")
if ([string]::IsNullOrWhiteSpace($startupMonitorRaw)) {
  $startupMonitorRaw = [string][Environment]::GetEnvironmentVariable("ASOLARIA_UI_STARTUP_MONITOR", "User")
}
if (-not [string]::IsNullOrWhiteSpace($startupMonitorRaw)) {
  switch ($startupMonitorRaw.Trim().ToLowerInvariant()) {
    "0" { $startupMonitorEnabled = $false }
    "false" { $startupMonitorEnabled = $false }
    "no" { $startupMonitorEnabled = $false }
    "off" { $startupMonitorEnabled = $false }
    default { $startupMonitorEnabled = $true }
  }
}

$url = if ($startupMonitorEnabled) {
  ("http://127.0.0.1:{0}/?uiMode={1}&startup=1" -f $Port, [string]$Mode)
} else {
  ("http://127.0.0.1:{0}/?uiMode={1}" -f $Port, [string]$Mode)
}
$openResult = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $openUiScript -Url $url -AppWindow

[pscustomobject]@{
  ok = $true
  mode = [string]$Mode
  port = [int]$Port
  url = [string]$url
  appWindow = $true
  repoRoot = [string]$repoRoot
  openResult = $openResult
}
