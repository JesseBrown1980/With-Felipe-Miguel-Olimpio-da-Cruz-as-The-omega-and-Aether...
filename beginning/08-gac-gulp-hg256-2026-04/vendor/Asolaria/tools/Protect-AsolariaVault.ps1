param(
  [string]$VaultRoot = "C:\Users\acer\Asolaria\data\vault",
  [switch]$ReportOnly
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $VaultRoot)) {
  throw "Vault path not found: $VaultRoot"
}

if (-not $ReportOnly) {
  $currentUser = if ($env:USERDOMAIN) {
    "$($env:USERDOMAIN)\$($env:USERNAME)"
  } else {
    $env:USERNAME
  }

  # Use SIDs for locale-safe principal mapping:
  #  S-1-5-18      = Local System
  #  S-1-5-32-544  = Built-in Administrators
  # Apply explicit rights for the current object and inheritable rights for children.
  & icacls $VaultRoot /inheritance:r /grant:r `
    "${currentUser}:(F)" "${currentUser}:(OI)(CI)(F)" `
    "*S-1-5-18:(F)" "*S-1-5-18:(OI)(CI)(F)" `
    "*S-1-5-32-544:(F)" "*S-1-5-32-544:(OI)(CI)(F)" `
    /T | Out-Null
  & icacls $VaultRoot /remove:g "Users" "Authenticated Users" "Everyone" /T 2>$null | Out-Null
}

Write-Host "Vault ACL status:"
& icacls $VaultRoot
