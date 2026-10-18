param(
  [string]$ConnectorsDir = "src/connectors",
  [string]$OutDir = "tools-manifests",
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path $ConnectorsDir)) {
  throw "Connectors directory not found: $ConnectorsDir"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$files = Get-ChildItem -Path $ConnectorsDir -File -Filter "*.js" | Sort-Object Name
foreach ($file in $files) {
  $connectorName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
  $connectorDir = Join-Path $OutDir $connectorName
  New-Item -ItemType Directory -Force -Path $connectorDir | Out-Null

  $schemaPath = Join-Path $connectorDir "$connectorName.invoke.schema.json"
  if ((Test-Path $schemaPath) -and -not $Force) {
    Write-Host "Skip existing: $schemaPath"
    continue
  }

  $schema = @"
{
  "name": "$connectorName.invoke",
  "description": "Generic invocation wrapper for $connectorName. Replace with per-function schemas.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "action": { "type": "string", "minLength": 1 },
      "args": { "type": "object" }
    },
    "required": ["action"],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "ok": { "type": "boolean" },
      "result": {}
    },
    "required": ["ok"],
    "additionalProperties": true
  }
}
"@

  [System.IO.File]::WriteAllText($schemaPath, $schema, [System.Text.Encoding]::UTF8)
  Write-Host "Generated: $schemaPath"
}

Write-Host "Done."
