param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$scriptPath = Join-Path $RepoRoot "tools\crypto\crypto-capsule.js"
node $scriptPath build
