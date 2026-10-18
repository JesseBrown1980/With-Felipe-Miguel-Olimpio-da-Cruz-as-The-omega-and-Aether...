param(
  [string]$OutputPath = "C:\Users\acer\tmp_phone_capture.png",
  [string]$AdbPath = "",
  [string]$DeviceId = "",
  [int]$TimeoutSec = 20
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-AdbPath {
  param([string]$Provided)
  $candidates = @(
    $Provided,
    $env:ASOLARIA_ADB_PATH,
    "C:\Users\acer\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "C:\Android\platform-tools\adb.exe",
    "C:\platform-tools\adb.exe",
    "C:\Program Files\Android\platform-tools\adb.exe",
    "C:\Users\acer\AppData\Local\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe"
  ) | Where-Object { $_ -and $_.Trim() -ne "" }

  foreach ($item in $candidates) {
    if (Test-Path -LiteralPath $item) { return $item }
  }

  try {
    $cmd = Get-Command adb -ErrorAction Stop
    if ($cmd -and $cmd.Source) { return [string]$cmd.Source }
  } catch {}

  return ""
}

function Get-AuthorizedDeviceId {
  param(
    [string]$AdbPath,
    [string]$Preferred
  )
  if ($Preferred -and $Preferred.Trim() -ne "") {
    return $Preferred.Trim()
  }

  $rows = & $AdbPath devices 2>$null
  foreach ($row in @($rows)) {
    $line = [string]$row
    if (-not $line -or $line -match '^List of devices attached') { continue }
    if ($line -match '^\s*(\S+)\s+device\s*$') {
      return [string]$Matches[1]
    }
  }
  return ""
}

function Test-PngHeader {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  if ($bytes.Length -lt 8) { return $false }
  $sig = @(0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A)
  for ($i = 0; $i -lt $sig.Count; $i++) {
    if ($bytes[$i] -ne $sig[$i]) { return $false }
  }
  return $true
}

$resolvedAdb = Resolve-AdbPath -Provided $AdbPath
if (-not $resolvedAdb) {
  throw "adb_not_found"
}

$resolvedDeviceId = Get-AuthorizedDeviceId -AdbPath $resolvedAdb -Preferred $DeviceId
if (-not $resolvedDeviceId) {
  throw "no_authorized_phone_device"
}

$outDir = Split-Path -Parent $OutputPath
if ($outDir) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$cmdPath = if ($env:ComSpec -and (Test-Path -LiteralPath $env:ComSpec)) { $env:ComSpec } else { "cmd.exe" }
$adbEsc = '"' + $resolvedAdb.Replace('"', '""') + '"'
$deviceEsc = '"' + $resolvedDeviceId.Replace('"', '""') + '"'
$outEsc = '"' + $OutputPath.Replace('"', '""') + '"'
$rawCmd = "$adbEsc -s $deviceEsc exec-out screencap -p > $outEsc"

try {
  & $cmdPath /d /s /c $rawCmd
  $exitCode = [int]$LASTEXITCODE
} catch {
  throw ("adb_screencap_failed: " + $_.Exception.Message)
}

if ($exitCode -ne 0) {
  throw ("adb_screencap_failed_exit_{0}" -f $exitCode)
}

$info = Get-Item -LiteralPath $OutputPath
if ($info.Length -lt 80) {
  throw ("adb_screencap_too_small_{0}_bytes" -f $info.Length)
}
if (-not (Test-PngHeader -Path $OutputPath)) {
  throw "adb_screencap_invalid_png_header"
}

[pscustomobject]@{
  ok = $true
  outputPath = [string]$info.FullName
  sizeBytes = [int64]$info.Length
  adbPath = [string]$resolvedAdb
  deviceId = [string]$resolvedDeviceId
} | ConvertTo-Json -Depth 4
