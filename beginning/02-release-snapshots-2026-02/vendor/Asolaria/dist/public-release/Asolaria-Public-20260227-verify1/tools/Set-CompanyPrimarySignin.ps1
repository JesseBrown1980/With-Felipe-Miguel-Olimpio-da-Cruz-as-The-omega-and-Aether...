param(
  [string]$Email = "",
  [string]$DisplayName = "J Brown Development LLC",
  [string]$ProfileUrl = "",
  [string]$Label = "main_company_signin",
  [string[]]$Excludes = @("plasmatoid@gmail.com", "jessebrown.soft1980@gmail.com")
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not $Email) {
  $Email = Read-Host "Company sign-in email"
}

$securePassword = Read-Host "Company sign-in password (hidden input)" -AsSecureString
$password = [System.Net.NetworkCredential]::new("", $securePassword).Password
if (-not $password) {
  throw "Password is required."
}

$payload = @{
  portal = "Company"
  accountType = "Owner"
  displayName = $DisplayName
  label = $Label
  email = $Email
  password = $password
  excludes = $Excludes
}
if ($ProfileUrl) {
  $payload.profileUrl = $ProfileUrl
}

$payloadJson = $payload | ConvertTo-Json -Compress

$nodeScript = @'
const fs = require("fs");
const {
  updateCompanyPrimarySignin,
  migrateLegacyCompanyPrimarySigninSecret,
  getCompanyPrimarySigninSummary
} = require("./src/companyPrimarySigninStore");

const payload = JSON.parse(fs.readFileSync(0, "utf8"));
migrateLegacyCompanyPrimarySigninSecret({ deleteLegacy: true });
const account = updateCompanyPrimarySignin(payload);
const summary = getCompanyPrimarySigninSummary();

console.log(JSON.stringify({
  ok: true,
  account,
  legacy: summary.legacy,
  vault: {
    namespace: summary.vault.namespace,
    keySource: summary.vault.keySource,
    entriesCount: summary.vault.entriesCount
  }
}, null, 2));
'@

$payloadJson | node -e $nodeScript

$password = $null
Remove-Variable securePassword -ErrorAction SilentlyContinue
