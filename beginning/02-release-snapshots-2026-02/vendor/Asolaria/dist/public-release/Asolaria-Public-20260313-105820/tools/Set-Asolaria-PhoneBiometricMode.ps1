param(
  [ValidateSet("bypass","normal")]
  [string]$Mode = "bypass",
  [string]$DeviceId = "",
  [bool]$OpenApp = $true,
  [int]$WaitMs = 1200,
  [bool]$ForceUsbRouteOnBypass = $true,
  [string]$UsbBaseUrl = "http://127.0.0.1:4781"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$PackageName = "com.jessebrown.asolaria"
$ActivityName = "$PackageName/.MainActivity"

function Resolve-AdbPath {
  try {
    $cmd = Get-Command adb -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {
    # continue
  }

  $candidates = @(
    "C:\Users\acer\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "C:\Android\platform-tools\adb.exe",
    "C:\platform-tools\adb.exe",
    "C:\Program Files\Android\platform-tools\adb.exe",
    "C:\Users\acer\AppData\Local\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }
  throw "adb executable not found."
}

function Invoke-Adb {
  param(
    [string]$AdbPath,
    [string[]]$AdbArgs,
    [switch]$IgnoreExitCode
  )

  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $AdbPath @AdbArgs 2>&1
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }
  $exitCode = $LASTEXITCODE
  if (-not $IgnoreExitCode -and $exitCode -ne 0) {
    $joined = (@($output) -join [Environment]::NewLine)
    throw "adb failed ($exitCode): adb $($AdbArgs -join ' ')`n$joined"
  }
  return @($output)
}

function Get-AuthorizedDevices {
  param([string]$AdbPath)

  $lines = Invoke-Adb -AdbPath $AdbPath -AdbArgs @("devices")
  $devices = New-Object System.Collections.Generic.List[string]
  foreach ($line in @($lines)) {
    if ($line -match "^(\S+)\s+device$") {
      $devices.Add([string]$matches[1])
    }
  }
  return @($devices)
}

function Resolve-PreferredDevice {
  param(
    [string[]]$Devices,
    [string]$Requested
  )

  if (-not [string]::IsNullOrWhiteSpace($Requested)) {
    foreach ($device in @($Devices)) {
      if ([string]$device -eq [string]$Requested) {
        return [string]$device
      }
    }
    throw "Requested device is not authorized: $Requested"
  }

  $usb = @($Devices | Where-Object { [string]$_ -notmatch "^\d{1,3}(?:\.\d{1,3}){3}:\d+$" })
  if ($usb.Count -gt 0) {
    return [string]$usb[0]
  }
  if ($Devices.Count -gt 0) {
    return [string]$Devices[0]
  }
  throw "No authorized adb devices found."
}

function Dump-UiXml {
  param(
    [string]$AdbPath,
    [string]$TargetDevice,
    [string]$LocalPath
  )

  $remotePath = "/sdcard/asolaria-bio-mode-ui.xml"
  Invoke-Adb -AdbPath $AdbPath -AdbArgs @("-s", $TargetDevice, "shell", "uiautomator", "dump", $remotePath) | Out-Null
  Invoke-Adb -AdbPath $AdbPath -AdbArgs @("-s", $TargetDevice, "pull", $remotePath, $LocalPath) | Out-Null
  return [string](Get-Content -Path $LocalPath -Raw)
}

function Tap-ContinueLocalRecovery {
  param(
    [string]$AdbPath,
    [string]$TargetDevice,
    [string]$UiXml
  )

  $pattern = 'resource-id="android:id/button1"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'
  if (-not ($UiXml -match $pattern)) {
    return $false
  }

  $x1 = [int]$matches[1]
  $y1 = [int]$matches[2]
  $x2 = [int]$matches[3]
  $y2 = [int]$matches[4]
  $tapX = [int](($x1 + $x2) / 2)
  $tapY = [int](($y1 + $y2) / 2)

  Invoke-Adb -AdbPath $AdbPath -AdbArgs @("-s", $TargetDevice, "shell", "input", "tap", "$tapX", "$tapY") | Out-Null
  return $true
}

$adbPath = Resolve-AdbPath
$authorized = @(Get-AuthorizedDevices -AdbPath $adbPath)
$targetDevice = Resolve-PreferredDevice -Devices $authorized -Requested $DeviceId
$targetMode = if ($Mode -eq "bypass") { "ignore" } else { "allow" }

Invoke-Adb -AdbPath $adbPath -AdbArgs @("-s", $targetDevice, "shell", "cmd", "appops", "set", $PackageName, "USE_BIOMETRIC", $targetMode) | Out-Null
$appOpsState = @(Invoke-Adb -AdbPath $adbPath -AdbArgs @("-s", $targetDevice, "shell", "cmd", "appops", "get", $PackageName, "USE_BIOMETRIC")) -join "`n"

$uiXmlPath = Join-Path $env:TEMP "asolaria-bio-mode-ui.xml"
$opened = $false
$localRecoveryPrompt = $false
$biometricPrompt = $false
$autoContinued = $false
$routeSynced = $false
$launchTarget = ""

if ($OpenApp) {
  Invoke-Adb -AdbPath $adbPath -AdbArgs @("-s", $targetDevice, "shell", "am", "force-stop", $PackageName) | Out-Null
  Start-Sleep -Milliseconds 400
  $launchArgs = @("-s", $targetDevice, "shell", "am", "start", "-W", "-n", $ActivityName)
  if ($Mode -eq "bypass" -and $ForceUsbRouteOnBypass) {
    $normalizedUsbBase = [string]$UsbBaseUrl
    $launchArgs += @("--es", "asolaria.base_url", $normalizedUsbBase)
    $routeSynced = $true
    $launchTarget = $normalizedUsbBase
  }
  Invoke-Adb -AdbPath $adbPath -AdbArgs $launchArgs -IgnoreExitCode | Out-Null
  Start-Sleep -Milliseconds ([Math]::Max(300, $WaitMs))

  $uiXml = Dump-UiXml -AdbPath $adbPath -TargetDevice $targetDevice -LocalPath $uiXmlPath
  $biometricPrompt = ($uiXml -match "com\.samsung\.android\.biometrics\.app\.setting")
  $localRecoveryPrompt = ($uiXml -match "Open Local Recovery Mode\\?")

  if ($Mode -eq "bypass" -and $localRecoveryPrompt) {
    $autoContinued = Tap-ContinueLocalRecovery -AdbPath $adbPath -TargetDevice $targetDevice -UiXml $uiXml
    if ($autoContinued) {
      Start-Sleep -Milliseconds ([Math]::Max(500, $WaitMs))
      $uiXml2 = Dump-UiXml -AdbPath $adbPath -TargetDevice $targetDevice -LocalPath $uiXmlPath
      $biometricPrompt = ($uiXml2 -match "com\.samsung\.android\.biometrics\.app\.setting")
      $localRecoveryPrompt = ($uiXml2 -match "Open Local Recovery Mode\\?")
    }
  }
  $opened = $true
}

$result = [ordered]@{
  ok = $true
  mode = $Mode
  package = $PackageName
  targetDevice = $targetDevice
  adbPath = $adbPath
  appOpsState = $appOpsState
  launch = [ordered]@{
    attempted = [bool]$OpenApp
    opened = [bool]$opened
    routeSynced = [bool]$routeSynced
    launchTarget = [string]$launchTarget
    biometricPrompt = [bool]$biometricPrompt
    localRecoveryPrompt = [bool]$localRecoveryPrompt
    autoContinuedLocalRecovery = [bool]$autoContinued
  }
}

$result | ConvertTo-Json -Depth 8
