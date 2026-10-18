param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$Account = "plasmatoid@gmail.com",
  [string]$Project = "winged-complex-390417",
  [string]$Location = "global",
  [string]$NotebookTitle = "Asolaria Enterprise Memory"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$scriptPath = Join-Path $PSScriptRoot "sync-notebooklm-core.js"
if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw "Node sync script not found: $scriptPath"
}

$node = $null
try {
  $cmd = Get-Command node -ErrorAction Stop
  $node = if ($cmd.Source) { $cmd.Source } elseif ($cmd.Path) { $cmd.Path } else { $null }
} catch {
  $node = $null
}
if (-not $node) {
  foreach ($candidate in @("C:\nvm4w\nodejs\node.exe", "C:\Program Files\nodejs\node.exe")) {
    if (Test-Path $candidate) {
      $node = $candidate
      break
    }
  }
}
if (-not $node) {
  throw "Node executable not found."
}

& $node $scriptPath `
  --baseUrl $BaseUrl `
  --account $Account `
  --project $Project `
  --location $Location `
  --notebookTitle $NotebookTitle

if ($LASTEXITCODE -ne 0) {
  throw "NotebookLM core sync failed with exit code $LASTEXITCODE."
}
