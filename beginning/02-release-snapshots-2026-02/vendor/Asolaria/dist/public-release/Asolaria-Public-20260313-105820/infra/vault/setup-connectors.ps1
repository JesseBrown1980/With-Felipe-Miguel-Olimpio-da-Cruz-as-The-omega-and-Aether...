param(
  [string]$OwnerName = "owner",
  [string]$VaultAddr = "http://127.0.0.1:8200",
  [string]$ConnectorsDir = "src/connectors",
  [string]$KvMount = "kv",
  [string]$AppRoleMount = "approle"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Require-VaultCli {
  try {
    $cmd = Get-Command vault -ErrorAction Stop
    return $cmd.Source
  } catch {
    throw "Vault CLI not found on PATH. Install with: winget install -e --id Hashicorp.Vault"
  }
}

function Invoke-Vault([string[]]$Args) {
  $output = & vault @Args 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "vault $($Args -join ' ') failed: $output"
  }
  return $output
}

function Set-PrivateAcl([string]$Path) {
  try {
    & icacls $Path /inheritance:r | Out-Null
    & icacls $Path /grant:r "$env:USERDOMAIN\$env:USERNAME:(F)" | Out-Null
    & icacls $Path /remove:g "Users" "Authenticated Users" "Everyone" 2>$null | Out-Null
  } catch {
    Write-Warning "Could not tighten ACL for $Path"
  }
}

function Sanitize-ConnectorName([string]$Name) {
  $raw = [System.IO.Path]::GetFileNameWithoutExtension([string]$Name)
  $safe = ($raw -replace "[^a-zA-Z0-9._-]", "").Trim()
  if ([string]::IsNullOrWhiteSpace($safe)) { return "" }
  return $safe
}

$null = Require-VaultCli
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$connectorsPath = Resolve-Path (Join-Path $repoRoot $ConnectorsDir)
$policyDir = Join-Path $repoRoot "infra\vault\policies"
$approleOutRoot = Join-Path $repoRoot ("data\vault\{0}\approle" -f $OwnerName)

Ensure-Dir $policyDir
Ensure-Dir $approleOutRoot

$env:VAULT_ADDR = $VaultAddr
Write-Host "Using VAULT_ADDR=$VaultAddr"

# Enable mounts if missing (idempotent).
try { Invoke-Vault @("auth", "enable", $AppRoleMount) | Out-Null } catch {}
try { Invoke-Vault @("secrets", "enable", "-path=$KvMount", "kv-v2") | Out-Null } catch {}

$connectorFiles = Get-ChildItem -Path $connectorsPath -File -Filter "*.js" | Sort-Object Name
foreach ($file in $connectorFiles) {
  $connector = Sanitize-ConnectorName -Name $file.Name
  if (-not $connector) { continue }

  $policyName = "asolaria-connector-$connector"
  $policyPath = Join-Path $policyDir "$policyName.hcl"
  $policyContent = @"
path "$KvMount/data/connectors/$connector/*" {
  capabilities = ["read"]
}

path "$KvMount/metadata/connectors/$connector/*" {
  capabilities = ["list"]
}
"@
  [System.IO.File]::WriteAllText($policyPath, $policyContent, [System.Text.Encoding]::UTF8)

  Invoke-Vault @("policy", "write", $policyName, $policyPath) | Out-Null

  Invoke-Vault @(
    "write",
    "auth/$AppRoleMount/role/$connector",
    "token_policies=$policyName",
    "token_ttl=20m",
    "token_max_ttl=30m",
    "secret_id_ttl=10m",
    "secret_id_num_uses=1"
  ) | Out-Null

  $roleId = (Invoke-Vault @("read", "-field=role_id", "auth/$AppRoleMount/role/$connector/role-id")) -join ""
  $secretId = (Invoke-Vault @("write", "-f", "-field=secret_id", "auth/$AppRoleMount/role/$connector/secret-id")) -join ""

  $connectorOutDir = Join-Path $approleOutRoot $connector
  Ensure-Dir $connectorOutDir

  $roleIdPath = Join-Path $connectorOutDir "role_id.txt"
  $secretIdPath = Join-Path $connectorOutDir "secret_id.txt"
  [System.IO.File]::WriteAllText($roleIdPath, $roleId.Trim(), [System.Text.Encoding]::ASCII)
  [System.IO.File]::WriteAllText($secretIdPath, $secretId.Trim(), [System.Text.Encoding]::ASCII)
  Set-PrivateAcl -Path $roleIdPath
  Set-PrivateAcl -Path $secretIdPath

  Write-Host "Configured AppRole: $connector -> $connectorOutDir"
}

Write-Host "Done. Policies written to $policyDir"
