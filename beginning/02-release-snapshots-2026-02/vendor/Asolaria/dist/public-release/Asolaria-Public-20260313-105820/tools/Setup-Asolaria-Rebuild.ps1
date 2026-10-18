Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Ensure-GatewayToken([string]$TokenPath) {
  if (Test-Path $TokenPath) {
    Write-Host "Token already exists: $TokenPath"
    return
  }
  Ensure-Dir (Split-Path $TokenPath -Parent)
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $token = [Convert]::ToBase64String($bytes).TrimEnd("=")
  [System.IO.File]::WriteAllText($TokenPath, $token, [System.Text.Encoding]::ASCII)
  Write-Host "Created token file: $TokenPath"
  try {
    & icacls $TokenPath /inheritance:r | Out-Null
    & icacls $TokenPath /grant:r "$env:USERDOMAIN\$env:USERNAME:(F)" | Out-Null
    & icacls $TokenPath /remove:g "Users" "Authenticated Users" "Everyone" 2>$null | Out-Null
    Write-Host "Applied private ACL to token file."
  } catch {
    Write-Warning "Could not apply ACL restrictions automatically."
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$gatewayTokenPath = Join-Path $repoRoot "data/vault/owner/gateway/gateway.token.txt"

Write-Host "Repo root: $repoRoot"
Ensure-GatewayToken -TokenPath $gatewayTokenPath

Write-Host ""
Write-Host "Canonical source: C:\Users\acer\Asolaria"
Write-Host ""
Write-Host "Install and run gateway:"
Write-Host "  cd $repoRoot\\src\\gateway"
Write-Host "  npm install"
Write-Host "  npm start"
Write-Host ""
Write-Host "Install and run sandbox manager:"
Write-Host "  cd $repoRoot\\services\\sandbox-manager"
Write-Host "  npm install"
Write-Host "  npm start"
Write-Host ""
Write-Host "Generate tool manifests:"
Write-Host "  cd $repoRoot"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\\scripts\\gen-tool-manifests.ps1"
Write-Host ""
Write-Host "Start full control plane:"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\\tools\\Start-Asolaria-ControlPlane.ps1 -OpenBrowser"
Write-Host ""
Write-Host "Build sanitized public release:"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\\tools\\Build-PublicRelease.ps1 -Zip"
