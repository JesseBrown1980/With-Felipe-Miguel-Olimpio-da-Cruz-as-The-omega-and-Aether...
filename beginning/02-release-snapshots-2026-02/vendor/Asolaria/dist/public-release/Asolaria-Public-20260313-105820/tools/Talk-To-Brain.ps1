param(
  [string]$Message = "",
  [int]$Port = 4781,
  [int]$TimeoutSeconds = 300,
  [string]$ChatId = "brain-main"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "Talk-To-Asolaria.ps1"
if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw "Talk-To-Asolaria.ps1 not found at $scriptPath"
}

$args = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $scriptPath,
  "-Port", [string]$Port,
  "-ChatId", [string]$ChatId,
  "-TimeoutSeconds", [string]$TimeoutSeconds,
  "-RouteMode", "deep"
)

if (-not [string]::IsNullOrWhiteSpace($Message)) {
  $args += @("-Message", $Message)
}

& powershell @args

