param(
  [string]$Reason = "Open Asolaria",
  [switch]$SkipSetup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Path cannot be empty."
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Convert-SecureStringToPlainText {
  param([Security.SecureString]$Secure)
  if ($null -eq $Secure) {
    return ""
  }
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

function Get-RandomSaltHex {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return ([BitConverter]::ToString($bytes) -replace "-", "").ToLowerInvariant()
}

function Get-PasswordHashHex {
  param(
    [string]$PlainText,
    [string]$SaltHex
  )
  $plain = [string]$PlainText
  $salt = [string]$SaltHex
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $data = [System.Text.Encoding]::UTF8.GetBytes("$salt`n$plain")
    $hash = $sha.ComputeHash($data)
    return ([BitConverter]::ToString($hash) -replace "-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Read-CredentialPassword {
  param([string]$Prompt)

  try {
    $credential = Get-Credential -UserName "Asolaria" -Message $Prompt
    if ($null -eq $credential) {
      return ""
    }
    return Convert-SecureStringToPlainText -Secure $credential.Password
  } catch {
    return ""
  }
}

function Invoke-WindowsHelloGate {
  param([string]$Prompt)

  $result = [ordered]@{
    attempted = $false
    available = $false
    verified = $false
    reason = "not_attempted"
  }

  try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue | Out-Null
    $verifierType = [Windows.Security.Credentials.UI.UserConsentVerifier, Windows.Security.Credentials.UI, ContentType=WindowsRuntime]
    if ($null -eq $verifierType) {
      $result.reason = "verifier_type_missing"
      return [pscustomobject]$result
    }

    $asTaskMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() |
      Where-Object {
        $_.Name -eq "AsTask" -and $_.IsGenericMethodDefinition -and
          $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1
      } |
      Select-Object -First 1
    if ($null -eq $asTaskMethod) {
      $result.reason = "as_task_method_missing"
      return [pscustomobject]$result
    }

    $availabilityOp = [Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()
    $availabilityTask = $asTaskMethod.MakeGenericMethod([Windows.Security.Credentials.UI.UserConsentVerifierAvailability]).Invoke($null, @($availabilityOp))
    $availability = $availabilityTask.GetAwaiter().GetResult()
    $result.attempted = $true
    if ([string]$availability -ne "Available") {
      $result.available = $false
      $result.reason = ("availability_" + [string]$availability)
      return [pscustomobject]$result
    }

    $result.available = $true
    $requestOp = [Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync($Prompt)
    $verificationTask = $asTaskMethod.MakeGenericMethod([Windows.Security.Credentials.UI.UserConsentVerificationResult]).Invoke($null, @($requestOp))
    $verification = $verificationTask.GetAwaiter().GetResult()
    $result.verified = ([string]$verification -eq "Verified")
    $result.reason = ("verification_" + [string]$verification)
    return [pscustomobject]$result
  } catch {
    $result.reason = ("exception_" + $_.Exception.Message)
    return [pscustomobject]$result
  }
}

function Load-PasswordGateConfig {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }
  try {
    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Save-PasswordGateConfig {
  param(
    [string]$Path,
    [string]$SaltHex,
    [string]$HashHex
  )

  $obj = [ordered]@{
    version = 1
    createdAt = (Get-Date).ToString("o")
    saltHex = [string]$SaltHex
    hashHex = [string]$HashHex
  }
  ($obj | ConvertTo-Json -Depth 4) | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Ensure-PasswordGateConfig {
  param(
    [string]$Path,
    [switch]$DisallowSetup
  )

  $config = Load-PasswordGateConfig -Path $Path
  if ($null -ne $config) {
    return $config
  }
  if ($DisallowSetup.IsPresent) {
    return $null
  }

  $first = Read-CredentialPassword -Prompt "Create Asolaria desktop password"
  if ([string]::IsNullOrWhiteSpace($first)) {
    return $null
  }
  $confirm = Read-CredentialPassword -Prompt "Confirm Asolaria desktop password"
  if ($first -ne $confirm) {
    [System.Windows.Forms.MessageBox]::Show(
      "Password setup failed: confirmation mismatch.",
      "Asolaria Desktop Auth",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Warning
    ) | Out-Null
    return $null
  }

  $saltHex = Get-RandomSaltHex
  $hashHex = Get-PasswordHashHex -PlainText $first -SaltHex $saltHex
  Save-PasswordGateConfig -Path $Path -SaltHex $saltHex -HashHex $hashHex
  return Load-PasswordGateConfig -Path $Path
}

function Invoke-PasswordGate {
  param(
    [string]$ConfigPath,
    [switch]$DisallowSetup
  )

  $gate = Ensure-PasswordGateConfig -Path $ConfigPath -DisallowSetup:$DisallowSetup
  if ($null -eq $gate) {
    return [pscustomobject]@{
      ok = $false
      reason = "password_gate_not_configured"
    }
  }

  $saltHex = [string]$gate.saltHex
  $hashHex = [string]$gate.hashHex
  if ([string]::IsNullOrWhiteSpace($saltHex) -or [string]::IsNullOrWhiteSpace($hashHex)) {
    return [pscustomobject]@{
      ok = $false
      reason = "password_gate_invalid_config"
    }
  }

  $entered = Read-CredentialPassword -Prompt "Enter Asolaria desktop password"
  if ([string]::IsNullOrWhiteSpace($entered)) {
    return [pscustomobject]@{
      ok = $false
      reason = "password_gate_cancelled"
    }
  }

  $actualHash = Get-PasswordHashHex -PlainText $entered -SaltHex $saltHex
  $ok = [string]::Equals($actualHash, $hashHex, [System.StringComparison]::OrdinalIgnoreCase)
  return [pscustomobject]@{
    ok = $ok
    reason = if ($ok) { "password_verified" } else { "password_mismatch" }
  }
}

Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue | Out-Null

$repoRoot = Get-AsolariaRoot
$dataDir = Join-Path $repoRoot "data"
Ensure-Dir -Path $dataDir
$passwordConfigPath = Join-Path $dataDir "desktop-auth-password.json"

$hello = Invoke-WindowsHelloGate -Prompt $Reason
if ($hello.verified) {
  Write-Host ("Desktop auth verified via Windows Hello: " + [string]$hello.reason)
  exit 0
}

$password = Invoke-PasswordGate -ConfigPath $passwordConfigPath -DisallowSetup:$SkipSetup
if ($password.ok) {
  Write-Host ("Desktop auth verified via password gate: " + [string]$password.reason)
  exit 0
}

[System.Windows.Forms.MessageBox]::Show(
  "Asolaria launch blocked. Authentication failed.",
  "Asolaria Desktop Auth",
  [System.Windows.Forms.MessageBoxButtons]::OK,
  [System.Windows.Forms.MessageBoxIcon]::Error
) | Out-Null

Write-Host ("Desktop auth failed. Hello=" + [string]$hello.reason + " Password=" + [string]$password.reason)
exit 1
