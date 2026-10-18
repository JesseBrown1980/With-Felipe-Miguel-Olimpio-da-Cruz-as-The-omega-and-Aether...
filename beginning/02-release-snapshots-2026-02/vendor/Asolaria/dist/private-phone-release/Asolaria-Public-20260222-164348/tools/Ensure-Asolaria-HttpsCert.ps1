param(
  [string]$PfxPath = "C:\Users\acer\Asolaria\certs\asolaria-local.pfx",
  [string]$PassPath = "C:\Users\acer\Asolaria\certs\asolaria-local.pass",
  [string]$CerPath = "C:\Users\acer\Asolaria\public\asolaria-local.cer",
  [string]$CaCerPath = "C:\Users\acer\Asolaria\certs\asolaria-local-ca.cer",
  [int]$Years = 3
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-TailscalePath {
  try {
    $cmd = Get-Command tailscale -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {
    # continue
  }

  $candidates = @(
    "C:\Program Files\Tailscale\tailscale.exe"
  )
  foreach ($path in $candidates) {
    if (Test-Path $path) {
      return $path
    }
  }
  return ""
}

function Get-TailnetDnsNames {
  $names = @()
  $tailscale = Resolve-TailscalePath
  if (-not $tailscale) {
    return $names
  }

  try {
    $raw = & $tailscale status --json 2>$null
    if (-not $raw) {
      return $names
    }
    $status = $raw | ConvertFrom-Json -ErrorAction Stop
    $dns = [string]$status.Self.DNSName
    if (-not $dns) {
      return $names
    }
    $trimmed = $dns.Trim().TrimEnd(".")
    if ($trimmed) {
      $names += $trimmed
      if ($trimmed -match "^([^\.]+)\.") {
        $short = [string]$matches[1]
        if ($short) {
          $names += $short
        }
      }
    }
  } catch {
    # ignore tailscale probe failures
  }

  return @($names | Sort-Object -Unique)
}

function Get-PrivateIpv4List {
  $ips = @()
  try {
    $all = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object {
        $_.IPAddress -and
        $_.IPAddress -ne "127.0.0.1" -and
        $_.PrefixOrigin -ne "WellKnown"
      }
    foreach ($entry in $all) {
      $ip = [string]$entry.IPAddress
      if ($ip -match '^10\.' -or $ip -match '^192\.168\.' -or $ip -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.') {
        $ips += $ip
      }
    }
  } catch {
    # fallback below
  }

  if ($ips.Count -eq 0) {
    try {
      $parsed = ipconfig | Select-String -Pattern 'IPv4|Endere'
      foreach ($line in $parsed) {
        if ($line.Line -match '(\d{1,3}\.){3}\d{1,3}') {
          $ip = $Matches[0]
          if ($ip -ne "127.0.0.1") {
            $ips += $ip
          }
        }
      }
    } catch {
      # ignore
    }
  }

  return $ips | Sort-Object -Unique
}

function Ensure-Directory {
  param([string]$FilePath)
  $dir = Split-Path -Path $FilePath -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -Path $dir -ItemType Directory -Force | Out-Null
  }
}

function Test-IsCaCertificateFile {
  param([string]$Path)
  if (-not $Path) { return $false }
  if (-not (Test-Path $Path)) { return $false }
  try {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($Path)
    $basic = $cert.Extensions | Where-Object { $_.Oid.Value -eq "2.5.29.19" } | Select-Object -First 1
    if (-not $basic) { return $false }
    $bc = [System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]$basic
    return [bool]$bc.CertificateAuthority
  } catch {
    return $false
  }
}

function Get-AsolariaCaCert {
  param(
    [int]$Years = 3
  )

  $subject = "CN=Asolaria Local CA"
  $minNotAfter = (Get-Date).AddDays(7)
  try {
    $candidates = @(Get-ChildItem -Path "Cert:\\CurrentUser\\My" -ErrorAction Stop |
      Where-Object { $_.Subject -eq $subject -and $_.HasPrivateKey -and $_.NotAfter -gt $minNotAfter })
    foreach ($candidate in $candidates) {
      try {
        $basic = $candidate.Extensions | Where-Object { $_.Oid.Value -eq "2.5.29.19" } | Select-Object -First 1
        if (-not $basic) { continue }
        $bc = [System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]$basic
        if ($bc.CertificateAuthority) {
          return $candidate
        }
      } catch {
        # ignore bad candidate
      }
    }
  } catch {
    # ignore store read errors and fall back to creation
  }

  return New-SelfSignedCertificate `
    -Type Custom `
    -KeySpec Signature `
    -Subject $subject `
    -FriendlyName "Asolaria Local Root CA" `
    -CertStoreLocation "Cert:\\CurrentUser\\My" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -KeyExportPolicy Exportable `
    -KeyUsageProperty Sign `
    -KeyUsage CertSign,CRLSign `
    -NotAfter (Get-Date).AddYears($Years) `
    -TextExtension @(
      "2.5.29.19={text}CA=true&pathlength=1"
    )
}

function Read-TextFile {
  param([string]$Path)
  if (-not $Path) { return "" }
  if (-not (Test-Path $Path)) { return "" }
  try {
    return [string](Get-Content -Path $Path -Raw)
  } catch {
    return ""
  }
}

function Test-PfxSelfSigned {
  param(
    [string]$PfxPath,
    [string]$Passphrase
  )
  if (-not (Test-Path $PfxPath)) { return $true }
  try {
    $bytes = [System.IO.File]::ReadAllBytes($PfxPath)
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($bytes, $Passphrase)
    return ($cert.Subject -eq $cert.Issuer)
  } catch {
    return $true
  }
}

function Test-PfxHasExpectedDnsSans {
  param(
    [string]$PfxPath,
    [string]$Passphrase,
    [string[]]$ExpectedDnsNames
  )
  if (-not (Test-Path $PfxPath)) { return $false }
  $expected = @($ExpectedDnsNames | ForEach-Object { [string]$_ } | Where-Object { $_ } | Sort-Object -Unique)
  if ($expected.Count -lt 1) { return $true }

  try {
    $bytes = [System.IO.File]::ReadAllBytes($PfxPath)
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($bytes, $Passphrase)
    $actual = @($cert.DnsNameList | ForEach-Object { [string]$_.Unicode } | Where-Object { $_ } | Sort-Object -Unique)
    foreach ($name in $expected) {
      $match = $actual | Where-Object { [string]::Equals($_, $name, [System.StringComparison]::OrdinalIgnoreCase) } | Select-Object -First 1
      if (-not $match) {
        return $false
      }
    }
    return $true
  } catch {
    return $false
  }
}

Ensure-Directory -FilePath $PfxPath
Ensure-Directory -FilePath $PassPath
Ensure-Directory -FilePath $CerPath
Ensure-Directory -FilePath $CaCerPath

$passForCheck = Read-TextFile -Path $PassPath
$tailnetDnsNames = Get-TailnetDnsNames
$expectedDnsSans = @("localhost", "$env:COMPUTERNAME") + @($tailnetDnsNames)
$ready = (Test-Path $PfxPath) `
  -and (Test-Path $PassPath) `
  -and (Test-IsCaCertificateFile -Path $CerPath) `
  -and (Test-IsCaCertificateFile -Path $CaCerPath) `
  -and (-not (Test-PfxSelfSigned -PfxPath $PfxPath -Passphrase $passForCheck)) `
  -and (Test-PfxHasExpectedDnsSans -PfxPath $PfxPath -Passphrase $passForCheck -ExpectedDnsNames $expectedDnsSans)

if ($ready) {
  Write-Output "HTTPS_CERT_READY"
  Write-Output $PfxPath
  return
}

$pass = ""
if (Test-Path $PassPath) {
  $pass = [string](Get-Content $PassPath -Raw)
}
if (-not $pass) {
  $pass = ([Guid]::NewGuid().ToString("N") + [Guid]::NewGuid().ToString("N")).Substring(0, 40)
  Set-Content -Path $PassPath -Value $pass -NoNewline -Encoding UTF8
}

$ipList = Get-PrivateIpv4List
$san = @("DNS=localhost", "DNS=$env:COMPUTERNAME", "IPAddress=127.0.0.1")
foreach ($dns in $tailnetDnsNames) {
  $san += "DNS=$dns"
}
foreach ($ip in $ipList) {
  $san += "IPAddress=$ip"
}
$sanText = "2.5.29.17={text}" + ($san -join "&")

$ca = Get-AsolariaCaCert -Years $Years
$cert = New-SelfSignedCertificate `
  -Subject "CN=Asolaria Local" `
  -FriendlyName "Asolaria Local TLS" `
  -CertStoreLocation "Cert:\\CurrentUser\\My" `
  -Signer $ca `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -HashAlgorithm SHA256 `
  -KeyExportPolicy Exportable `
  -KeyUsage DigitalSignature,KeyEncipherment `
  -NotAfter (Get-Date).AddYears($Years) `
  -TextExtension @(
    $sanText,
    "2.5.29.37={text}1.3.6.1.5.5.7.3.1"
  )

$securePass = ConvertTo-SecureString -String $pass -AsPlainText -Force
Export-PfxCertificate -Cert $cert -FilePath $PfxPath -Password $securePass | Out-Null
Export-Certificate -Cert $ca -FilePath $CerPath | Out-Null
Export-Certificate -Cert $ca -FilePath $CaCerPath | Out-Null

Write-Output "HTTPS_CERT_CREATED"
Write-Output $PfxPath
