param(
  [string]$Email = "jesse@jbrowndevelopmentllc.com",
  [string]$ProfileDisplayName = "jbrowndevelopmentllc.com",
  [string]$ProfileDirectory = "Profile 7",
  [string]$SourceUrl = "https://myaccount.google.com/?pli=1",
  [string]$PasswordPlain = "",
  [string]$Notes = "Owner-provided LinkedIn credential used with ContactOut."
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Convert-ToSecretSlug {
  param([string]$Value)
  $raw = [string]$Value
  $safe = $raw.ToLowerInvariant() -replace "[^a-z0-9]+", "_"
  $safe = $safe.Trim("_")
  if ([string]::IsNullOrWhiteSpace($safe)) {
    throw "Email could not be converted into a safe secret key."
  }
  return $safe
}

$securePassword = $null
$password = ""
if (-not [string]::IsNullOrWhiteSpace($PasswordPlain)) {
  $password = [string]$PasswordPlain
} else {
  $securePassword = Read-Host "LinkedIn password (hidden input)" -AsSecureString
  $password = [System.Net.NetworkCredential]::new("", $securePassword).Password
}
if (-not $password) {
  throw "Password is required."
}

$secretName = "integrations.linkedin.password." + (Convert-ToSecretSlug -Value $Email)
$payload = [ordered]@{
  email = $Email
  password = $password
  service = "linkedin"
  kind = "password"
  linkedApps = @("linkedin", "contactout")
  loginUrl = "https://www.linkedin.com/login"
  sourceUrl = $SourceUrl
  chromeProfileDisplayName = $ProfileDisplayName
  chromeProfileDirectory = $ProfileDirectory
  status = "active"
  notes = $Notes
}

$payloadJson = $payload | ConvertTo-Json -Depth 6 -Compress

$nodeScript = @'
const fs = require("fs");
const path = require("path");
const { setSecret, getVaultStatus } = require(path.join(process.cwd(), "src", "secureVault"));

const key = process.argv[2];
if (!key) {
  throw new Error("secret key is required");
}

const value = JSON.parse(fs.readFileSync(0, "utf8"));
setSecret(
  key,
  value,
  {
    label: "LinkedIn password used with ContactOut",
    service: "linkedin",
    kind: "password",
    accountEmail: value.email,
    capturedFrom: "secure_prompt",
    app: "Asolaria",
    component: "contactout-linkedin",
    actor: "owner",
    updatedBy: "secure_prompt",
    credentialOwner: "owner"
  },
  { namespace: "owner" }
);

const vault = getVaultStatus({ namespace: "owner" });
process.stdout.write(JSON.stringify({
  ok: true,
  namespace: "owner",
  key,
  entriesCount: Number(vault.entriesCount || 0)
}, null, 2));
'@

$tempScriptPath = Join-Path $env:TEMP "asolaria-store-linkedin-contactout.js"
[System.IO.File]::WriteAllText($tempScriptPath, $nodeScript, [System.Text.Encoding]::ASCII)
try {
  $payloadJson | node $tempScriptPath $secretName
} finally {
  Remove-Item $tempScriptPath -Force -ErrorAction SilentlyContinue
}

$password = $null
Remove-Variable securePassword -ErrorAction SilentlyContinue
