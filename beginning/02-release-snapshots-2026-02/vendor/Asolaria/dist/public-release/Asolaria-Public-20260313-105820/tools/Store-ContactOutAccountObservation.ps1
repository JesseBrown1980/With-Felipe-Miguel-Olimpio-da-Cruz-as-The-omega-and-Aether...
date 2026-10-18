param(
  [string]$Email = "jesse@jbrowndevelopmentllc.com",
  [string]$AccountType = "free",
  [int]$EmailCredits = 5,
  [int]$PhoneCredits = 5,
  [int]$SearchesLast30Days = 52,
  [switch]$LinkedInAvailable,
  [string]$Notes = "Observed in ContactOut UI during rollout on 2026-03-11."
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

$secretName = "integrations.contactout.account." + (Convert-ToSecretSlug -Value $Email)
$payload = [ordered]@{
  email = $Email
  service = "contactout"
  kind = "account"
  accountType = $AccountType
  emailCredits = [int]$EmailCredits
  phoneCredits = [int]$PhoneCredits
  searchesLast30Days = [int]$SearchesLast30Days
  linkedInAvailable = [bool]$LinkedInAvailable.IsPresent
  status = "active"
  portalUrl = "https://contactout.com/"
  notes = $Notes
}

$payloadJson = $payload | ConvertTo-Json -Depth 6 -Compress

$nodeScript = @'
const fs = require("fs");
const path = require("path");
const { setSecret } = require(path.join(process.cwd(), "src", "secureVault"));

const key = process.argv[2];
if (!key) {
  throw new Error("secret key is required");
}

const value = JSON.parse(fs.readFileSync(0, "utf8"));
setSecret(
  key,
  value,
  {
    label: "ContactOut account observation",
    service: "contactout",
    kind: "account",
    accountEmail: value.email,
    capturedFrom: "secure_local_script",
    app: "Asolaria",
    component: "contactout",
    actor: "owner",
    updatedBy: "secure_local_script",
    credentialOwner: "owner"
  },
  { namespace: "owner" }
);

process.stdout.write(JSON.stringify({
  ok: true,
  namespace: "owner",
  key
}, null, 2));
'@

$tempScriptPath = Join-Path $env:TEMP "asolaria-store-contactout-account.js"
[System.IO.File]::WriteAllText($tempScriptPath, $nodeScript, [System.Text.Encoding]::ASCII)
try {
  $payloadJson | node $tempScriptPath $secretName
} finally {
  Remove-Item $tempScriptPath -Force -ErrorAction SilentlyContinue
}
