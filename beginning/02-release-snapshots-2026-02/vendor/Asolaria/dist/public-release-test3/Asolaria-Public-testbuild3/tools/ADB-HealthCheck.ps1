param(
  [switch]$FixUnauthorized = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Resolve-AdbPath {
  try {
    $cmd = Get-Command adb -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {
    # Continue to known paths.
  }

  $candidates = @(
    "C:\Users\acer\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "C:\Android\platform-tools\adb.exe",
    "C:\platform-tools\adb.exe",
    "C:\Program Files\Android\platform-tools\adb.exe",
    "C:\Users\acer\AppData\Local\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe"
  )

  foreach ($path in $candidates) {
    if (Test-Path $path) {
      return $path
    }
  }

  return $null
}

function Parse-AdbDevices {
  param([string[]]$Lines)

  $rows = @()
  foreach ($line in $Lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line -like "List of devices attached*") { continue }
    $trimmed = $line.Trim()
    if ($trimmed -match "^(\S+)\s+(\S+)(.*)$") {
      $rows += [pscustomobject]@{
        Serial = $Matches[1]
        State = $Matches[2]
        Extra = $Matches[3].Trim()
      }
    }
  }
  return $rows
}

function Print-UnauthorizedHelp {
  Write-Host ""
  Write-Host "Device is connected but unauthorized."
  Write-Host "1) On phone: Settings -> Developer options -> Revoke USB debugging authorizations."
  Write-Host "2) Unplug/replug USB cable."
  Write-Host "3) On phone popup, check 'Always allow from this computer' and tap Allow."
  Write-Host ""
}

$root = Get-AsolariaRoot
$logDir = Join-Path $root "logs"
New-Item -Path $logDir -ItemType Directory -Force | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $logDir ("adb-health-{0}.log" -f $stamp)

Start-Transcript -Path $logPath -Force | Out-Null
try {
  $adbPath = Resolve-AdbPath
  if (-not $adbPath) {
    throw "adb.exe not found. Install platform-tools first."
  }

  Write-Host "ADB executable: $adbPath"
  & $adbPath start-server | Out-Null

  $deviceLines = & $adbPath devices -l
  $rows = @(Parse-AdbDevices -Lines $deviceLines)
  Write-Host ""
  Write-Host "adb devices -l"
  $deviceLines | ForEach-Object { Write-Host $_ }

  if ($rows.Count -eq 0) {
    Write-Host ""
    Write-Host "No device detected."
    Write-Host "Check cable, USB mode, and that phone is unlocked."
    return
  }

  $unauthorized = $rows | Where-Object { $_.State -eq "unauthorized" }
  if ($unauthorized -and $FixUnauthorized) {
    Write-Host ""
    Write-Host "Unauthorized device detected. Restarting adb server once..."
    & $adbPath kill-server | Out-Null
    Start-Sleep -Milliseconds 600
    & $adbPath start-server | Out-Null
    $deviceLines = & $adbPath devices -l
    $rows = @(Parse-AdbDevices -Lines $deviceLines)
    Write-Host ""
    Write-Host "adb devices -l (after reset)"
    $deviceLines | ForEach-Object { Write-Host $_ }
  }

  $first = $rows | Select-Object -First 1
  if ($first.State -eq "device") {
    $model = (& $adbPath shell getprop ro.product.model 2>$null).Trim()
    $android = (& $adbPath shell getprop ro.build.version.release 2>$null).Trim()
    $fingerprint = (& $adbPath shell getprop ro.build.fingerprint 2>$null).Trim()
    Write-Host ""
    Write-Host "Connected and authorized."
    Write-Host "Model: $model"
    Write-Host "Android: $android"
    Write-Host "Fingerprint: $fingerprint"
  } elseif ($first.State -eq "unauthorized") {
    Print-UnauthorizedHelp
  } elseif ($first.State -eq "sideload") {
    Write-Host ""
    Write-Host "Device is in sideload mode. This is expected only during recovery updates."
  } else {
    Write-Host ""
    Write-Host ("Device state: {0}" -f $first.State)
  }
} finally {
  Stop-Transcript | Out-Null
  Write-Host ""
  Write-Host "Health check log saved to:"
  Write-Host $logPath
}
