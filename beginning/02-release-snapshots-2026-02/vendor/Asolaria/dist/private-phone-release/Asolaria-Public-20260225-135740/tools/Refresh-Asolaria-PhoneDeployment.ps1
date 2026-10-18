param(
  [int]$Port = 4781,
  [string]$VersionTag = "",
  [string]$ReleaseOutputRoot = "",
  [string]$PrivateDownloadsDir = "",
  [switch]$SkipBuild,
  [switch]$SkipPhoneCleanup,
  [switch]$SkipPushToPhone,
  [switch]$SkipOpenPhone,
  [switch]$SkipNotebookNote,
  [bool]$RunTunnelSmokeTest = $true,
  [bool]$TunnelSmokeIncludeRawProbe = $false,
  [switch]$RemoveLegacyAsolariaApp,
  [int[]]$LegacyCloneUsers = @(95)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir([string]$Path) {
  if (-not [string]::IsNullOrWhiteSpace($Path) -and -not (Test-Path $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

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
  foreach ($path in $candidates) {
    if (Test-Path $path) {
      return $path
    }
  }
  return $null
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
  if (-not $IgnoreExitCode -and $LASTEXITCODE -ne 0) {
    $joined = ($output | ForEach-Object { "$_" }) -join [Environment]::NewLine
    throw "ADB command failed ($LASTEXITCODE): adb $($AdbArgs -join ' ')`n$joined"
  }
  return @($output | ForEach-Object { "$_" })
}

function Get-AuthorizedDeviceCount {
  param([string]$AdbPath)
  $rows = Invoke-Adb -AdbPath $AdbPath -AdbArgs @("devices")
  $count = 0
  foreach ($row in $rows) {
    if ($row -match "^\S+\s+device$") {
      $count++
    }
  }
  return $count
}

function Ensure-ServerHealth {
  param(
    [string]$RepoRoot,
    [int]$HttpPort
  )

  try {
    $null = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/health" -f $HttpPort) -TimeoutSec 3
    return
  } catch {
    $startScript = Join-Path $RepoRoot "tools\Start-Asolaria-Phone.ps1"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $startScript `
      -Port $HttpPort `
      -OpenDesktopUi:$false `
      -OpenOnPhone:$false `
      -CopyUrl:$false `
      -WaitForPhoneSeconds 10 | Out-Null
  }

  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) {
    try {
      $null = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/health" -f $HttpPort) -TimeoutSec 2
      return
    } catch {
      Start-Sleep -Milliseconds 600
    }
  }
  throw "Asolaria health check failed on port $HttpPort."
}

function Get-MobileBootstrap {
  param([int]$HttpPort)
  return Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/mobile/bootstrap" -f $HttpPort) -TimeoutSec 4
}

function Get-InstalledPackagesByUser {
  param(
    [string]$AdbPath,
    [int]$UserId
  )

  $rows = Invoke-Adb -AdbPath $AdbPath -AdbArgs @("shell", "cmd", "package", "list", "packages", "--user", "$UserId") -IgnoreExitCode
  $packages = New-Object System.Collections.Generic.HashSet[string]
  foreach ($row in $rows) {
    if ($row -match "^package:(.+)$") {
      $null = $packages.Add($matches[1].Trim())
    }
  }
  return $packages
}

function Uninstall-PackageUser0 {
  param(
    [string]$AdbPath,
    [string]$PackageName
  )

  $rows = Invoke-Adb -AdbPath $AdbPath -AdbArgs @("uninstall", $PackageName) -IgnoreExitCode
  $text = ($rows -join " ").ToLowerInvariant()
  if ($text.Contains("success")) {
    return "removed_user0"
  }
  if ($text.Contains("unknown package") -or $text.Contains("not installed for 0")) {
    return "missing_user0"
  }
  return ("user0_result:" + ($rows -join " | "))
}

function Uninstall-PackageForUser {
  param(
    [string]$AdbPath,
    [string]$PackageName,
    [int]$UserId
  )

  $rows = Invoke-Adb -AdbPath $AdbPath -AdbArgs @("shell", "pm", "uninstall", "--user", "$UserId", $PackageName) -IgnoreExitCode
  $text = ($rows -join " ").ToLowerInvariant()
  if ($text.Contains("success")) {
    return "removed_user_$UserId"
  }
  if ($text.Contains("unknown package") -or $text.Contains("not installed")) {
    return "missing_user_$UserId"
  }
  return ("user_${UserId}_result:" + ($rows -join " | "))
}

function Build-PrivateRelease {
  param(
    [string]$RepoRoot,
    [string]$BuildVersionTag,
    [string]$OutputRoot
  )

  $buildScript = Join-Path $RepoRoot "tools\Build-PublicRelease.ps1"
  $buildOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $buildScript `
    -OutputRoot $OutputRoot `
    -VersionTag $BuildVersionTag `
    -Zip 2>&1
  if ($LASTEXITCODE -ne 0) {
    $joined = ($buildOutput | ForEach-Object { "$_" }) -join [Environment]::NewLine
    throw "Build-PublicRelease failed ($LASTEXITCODE).`n$joined"
  }

  $stageRoot = Join-Path $OutputRoot ("Asolaria-Public-" + $BuildVersionTag)
  $zipPath = "$stageRoot.zip"
  if (-not (Test-Path $zipPath)) {
    throw "Expected release zip not found: $zipPath"
  }
  return [pscustomobject]@{
    stageRoot = $stageRoot
    zipPath = $zipPath
    sizeBytes = (Get-Item $zipPath).Length
    sha256 = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash
  }
}

function Update-PrivateDownloadIndex {
  param(
    [string]$IndexPath,
    [hashtable]$Entry
  )

  $entries = @()
  if (Test-Path $IndexPath) {
    try {
      $existing = Get-Content -Path $IndexPath -Raw | ConvertFrom-Json
      if ($existing -is [System.Array]) {
        $entries = @($existing)
      } elseif ($existing) {
        $entries = @($existing)
      }
    } catch {
      $entries = @()
    }
  }

  $rows = @($Entry) + @($entries | ForEach-Object {
    [ordered]@{
      id = "$($_.id)"
      createdAt = "$($_.createdAt)"
      versionTag = "$($_.versionTag)"
      fileName = "$($_.fileName)"
      privatePath = "$($_.privatePath)"
      sourcePath = "$($_.sourcePath)"
      sizeBytes = [long]$_.sizeBytes
      sha256 = "$($_.sha256)"
      phonePushPath = "$($_.phonePushPath)"
      note = "$($_.note)"
    }
  })
  $trimmed = @($rows | Select-Object -First 20)
  $trimmed | ConvertTo-Json -Depth 6 | Set-Content -Path $IndexPath -Encoding UTF8
}

function Try-WriteNotebookNote {
  param(
    [int]$HttpPort,
    [string]$Title,
    [string]$Content
  )

  $payload = @{
    title = $Title
    content = $Content
    pinned = $true
    tags = @("notebooklm", "phone", "private-download", "deploy")
  } | ConvertTo-Json -Depth 6

  try {
    $response = Invoke-RestMethod `
      -Method Post `
      -Uri ("http://127.0.0.1:{0}/api/notebook/notes" -f $HttpPort) `
      -ContentType "application/json" `
      -Body $payload `
      -TimeoutSec 6
    $noteId = ""
    if ($null -ne $response) {
      if ($response.PSObject.Properties.Name -contains "note" -and $null -ne $response.note) {
        $noteId = [string]$response.note.id
      } elseif ($response.PSObject.Properties.Name -contains "id") {
        $noteId = [string]$response.id
      }
    }
    return [pscustomobject]@{
      ok = $true
      id = $noteId
      message = "saved"
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      id = ""
      message = $_.Exception.Message
    }
  }
}

function Invoke-TunnelSmokeTest {
  param(
    [string]$RepoRoot,
    [int]$HttpPort,
    [bool]$IncludeRawProbe = $false
  )

  $tester = Join-Path $RepoRoot "tools\Test-Asolaria-PhoneTunnelPath.ps1"
  if (-not (Test-Path $tester)) {
    return [pscustomobject]@{
      ok = $false
      reason = "tester_not_found"
      reportPath = ""
      remoteBaseUrl = ""
      notes = @("Test-Asolaria-PhoneTunnelPath.ps1 not found.")
    }
  }

  $argList = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $tester,
    "-BaseUrl", ("http://127.0.0.1:{0}" -f $HttpPort),
    "-Channel", "auto"
  )
  if ($IncludeRawProbe) {
    $argList += "-IncludePhoneRawProbe"
  }

  try {
    $output = & powershell @argList
    $jsonText = [string](@($output) -join [Environment]::NewLine)
    $parsed = $jsonText | ConvertFrom-Json -ErrorAction Stop
    return [pscustomobject]@{
      ok = [bool]$parsed.ok
      reason = if ($parsed.ok) { "ok" } else { "smoke_failed" }
      reportPath = [string]$parsed.reportPath
      remoteBaseUrl = [string]$parsed.remote.baseUrl
      notes = @($parsed.notes)
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      reason = ("smoke_run_failed: " + $_.Exception.Message)
      reportPath = ""
      remoteBaseUrl = ""
      notes = @()
    }
  }
}

$repoRoot = Resolve-RepoRoot
if ([string]::IsNullOrWhiteSpace($VersionTag)) {
  $VersionTag = (Get-Date).ToString("yyyyMMdd-HHmmss")
}
if ([string]::IsNullOrWhiteSpace($ReleaseOutputRoot)) {
  $ReleaseOutputRoot = Join-Path $repoRoot "dist\private-phone-release"
}
if ([string]::IsNullOrWhiteSpace($PrivateDownloadsDir)) {
  $PrivateDownloadsDir = Join-Path $repoRoot "data\private-downloads"
}

Ensure-Dir $ReleaseOutputRoot
Ensure-Dir $PrivateDownloadsDir
Ensure-ServerHealth -RepoRoot $repoRoot -HttpPort $Port

$adbPath = Resolve-AdbPath
if (-not $adbPath) {
  throw "ADB executable not found."
}
$deviceCount = Get-AuthorizedDeviceCount -AdbPath $adbPath
if ($deviceCount -lt 1) {
  throw "No authorized ADB device found."
}

$cleanupResults = New-Object System.Collections.Generic.List[string]
if (-not $SkipPhoneCleanup) {
  $ownerPackages = Get-InstalledPackagesByUser -AdbPath $adbPath -UserId 0
  $legacy = @("com.maazm7d.termuxhub")
  if ($RemoveLegacyAsolariaApp.IsPresent) {
    $legacy += "com.jessebrown.asolaria"
  }

  foreach ($pkg in $legacy) {
    if ($ownerPackages.Contains($pkg)) {
      $cleanupResults.Add(("{0}: {1}" -f $pkg, (Uninstall-PackageUser0 -AdbPath $adbPath -PackageName $pkg)))
    } else {
      $cleanupResults.Add("${pkg}: missing_user0")
    }

    foreach ($userId in $LegacyCloneUsers) {
      $cleanupResults.Add(("{0}: {1}" -f $pkg, (Uninstall-PackageForUser -AdbPath $adbPath -PackageName $pkg -UserId $userId)))
    }
  }
}

$release = $null
if (-not $SkipBuild) {
  $release = Build-PrivateRelease -RepoRoot $repoRoot -BuildVersionTag $VersionTag -OutputRoot $ReleaseOutputRoot
}

$privateZipPath = ""
$phonePushPath = ""
if ($release) {
  $fileName = Split-Path -Leaf $release.zipPath
  $privateZipPath = Join-Path $PrivateDownloadsDir $fileName
  Copy-Item -Path $release.zipPath -Destination $privateZipPath -Force

  if (-not $SkipPushToPhone) {
    $phonePushPath = "/sdcard/Download/$fileName"
    Invoke-Adb -AdbPath $adbPath -AdbArgs @("push", $privateZipPath, $phonePushPath) | Out-Null
  }

  $indexPath = Join-Path $PrivateDownloadsDir "index.json"
  $entry = [ordered]@{
    id = ("private-release-" + $VersionTag)
    createdAt = (Get-Date).ToString("o")
    versionTag = $VersionTag
    fileName = $fileName
    privatePath = $privateZipPath
    sourcePath = $release.zipPath
    sizeBytes = [long]$release.sizeBytes
    sha256 = [string]$release.sha256
    phonePushPath = $phonePushPath
    note = "Sanitized public release bundle for private phone deployment."
  }
  Update-PrivateDownloadIndex -IndexPath $indexPath -Entry $entry
}

Invoke-Adb -AdbPath $adbPath -AdbArgs @("reverse", "tcp:$Port", "tcp:$Port") | Out-Null
$bootstrap = Get-MobileBootstrap -HttpPort $Port
$localConsoleUrl = [string]$bootstrap.urls.localConsole
if ($localConsoleUrl -and -not $SkipOpenPhone) {
  Invoke-Adb -AdbPath $adbPath -AdbArgs @("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", $localConsoleUrl) -IgnoreExitCode | Out-Null
}

$tunnelSmoke = $null
if ($RunTunnelSmokeTest) {
  $tunnelSmoke = Invoke-TunnelSmokeTest -RepoRoot $repoRoot -HttpPort $Port -IncludeRawProbe $TunnelSmokeIncludeRawProbe
}

$reportLines = @(
  "# Phone Deployment Refresh Report",
  "",
  ("Generated: {0}" -f ((Get-Date).ToString("o"))),
  "",
  "## Summary",
  "",
  ("- Repo root: {0}" -f $repoRoot),
  ("- Port: {0}" -f $Port),
  ("- ADB path: {0}" -f $adbPath),
  ("- Authorized devices: {0}" -f $deviceCount),
  ("- Local console URL: {0}" -f $localConsoleUrl),
  ("- Build executed: {0}" -f (-not $SkipBuild)),
  ("- Phone cleanup executed: {0}" -f (-not $SkipPhoneCleanup)),
  ("- Phone push executed: {0}" -f (-not $SkipPushToPhone)),
  ("- Phone open executed: {0}" -f (-not $SkipOpenPhone)),
  ("- Tunnel smoke executed: {0}" -f $RunTunnelSmokeTest),
  ""
)

if ($cleanupResults.Count -gt 0) {
  $reportLines += "## Cleanup Results"
  $reportLines += ""
  foreach ($row in $cleanupResults) {
    $reportLines += "- $row"
  }
  $reportLines += ""
}

if ($release) {
  $reportLines += "## Release Bundle"
  $reportLines += ""
  $reportLines += ("- Version tag: {0}" -f $VersionTag)
  $reportLines += ("- Stage path: {0}" -f $release.stageRoot)
  $reportLines += ("- Source zip: {0}" -f $release.zipPath)
  $reportLines += ("- Private download path: {0}" -f $privateZipPath)
  $reportLines += ("- Phone push path: {0}" -f $phonePushPath)
  $reportLines += ("- Size bytes: {0}" -f $release.sizeBytes)
  $reportLines += ("- SHA256: {0}" -f $release.sha256)
  $reportLines += ""
}

if ($tunnelSmoke) {
  $reportLines += "## Tunnel Smoke"
  $reportLines += ""
  $reportLines += ("- Smoke status: {0}" -f $tunnelSmoke.reason)
  $reportLines += ("- Smoke ok: {0}" -f $tunnelSmoke.ok)
  $reportLines += ("- Smoke remote base: {0}" -f $tunnelSmoke.remoteBaseUrl)
  $reportLines += ("- Smoke report path: {0}" -f $tunnelSmoke.reportPath)
  if ($tunnelSmoke.notes -and $tunnelSmoke.notes.Count -gt 0) {
    foreach ($note in $tunnelSmoke.notes) {
      $reportLines += ("- note: {0}" -f $note)
    }
  }
  $reportLines += ""
}

$reportDir = Join-Path $repoRoot "reports"
Ensure-Dir $reportDir
$reportPath = Join-Path $reportDir ("phone-private-redeploy-" + (Get-Date).ToString("yyyyMMdd-HHmmss") + ".md")
$reportLines | Set-Content -Path $reportPath -Encoding UTF8

$noteResult = [pscustomobject]@{
  ok = $false
  id = ""
  message = "skipped"
}
if (-not $SkipNotebookNote) {
  $noteResult = Try-WriteNotebookNote `
    -HttpPort $Port `
    -Title ("Phone Refresh + Private Release (" + $VersionTag + ")") `
    -Content ($reportLines -join [Environment]::NewLine)
}

Write-Host ""
Write-Host "Phone deployment refresh completed."
Write-Host ("Report: {0}" -f $reportPath)
if ($release) {
  Write-Host ("Private zip: {0}" -f $privateZipPath)
  Write-Host ("SHA256: {0}" -f $release.sha256)
}
Write-Host ("ADB reverse: tcp:{0} -> tcp:{0}" -f $Port)
Write-Host ("Phone URL: {0}" -f $localConsoleUrl)
if ($tunnelSmoke) {
  Write-Host ("Tunnel smoke status: {0}" -f $tunnelSmoke.reason)
  Write-Host ("Tunnel smoke ok: {0}" -f $tunnelSmoke.ok)
  Write-Host ("Tunnel smoke report: {0}" -f $tunnelSmoke.reportPath)
}
Write-Host ("Notebook note saved: {0}" -f $noteResult.ok)
if ($noteResult.id) {
  Write-Host ("Notebook note id: {0}" -f $noteResult.id)
}
if ($noteResult.message) {
  Write-Host ("Notebook note status: {0}" -f $noteResult.message)
}
