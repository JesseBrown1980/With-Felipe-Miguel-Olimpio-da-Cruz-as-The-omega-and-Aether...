[CmdletBinding()]
param(
  [string]$OutputRoot = "C:\Users\acer\captures\vision",
  [string]$Tag = "",
  [string]$WindowTitle = "Chrome",
  [int]$WindowId = 0,
  [switch]$IncludeVirtualDesktop,
  [switch]$SkipPerScreen,
  [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Directory {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Path cannot be empty."
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Write-JsonFileNoBom {
  param(
    [string]$Path,
    [Parameter(Mandatory = $true)]$Value
  )
  $jsonText = $Value | ConvertTo-Json -Depth 10
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $jsonText, $utf8NoBom)
}

function Build-RunTag {
  param([string]$InputTag)
  $candidate = [string]$InputTag
  if ([string]::IsNullOrWhiteSpace($candidate)) {
    return (Get-Date).ToString("yyyyMMdd-HHmmss")
  }
  $safe = ($candidate -replace "[^a-zA-Z0-9._-]", "_").Trim("_")
  if ([string]::IsNullOrWhiteSpace($safe)) {
    return (Get-Date).ToString("yyyyMMdd-HHmmss")
  }
  return $safe
}

$captureWindowScript = Join-Path $PSScriptRoot "Capture-Window.ps1"
$captureScreenScript = Join-Path $PSScriptRoot "Capture-PrimaryScreen.ps1"
if (-not (Test-Path -LiteralPath $captureWindowScript)) {
  throw "Missing script: $captureWindowScript"
}
if (-not (Test-Path -LiteralPath $captureScreenScript)) {
  throw "Missing script: $captureScreenScript"
}

Add-Type -AssemblyName System.Windows.Forms
$screenCount = [System.Windows.Forms.Screen]::AllScreens.Count

$runTag = Build-RunTag -InputTag $Tag
Ensure-Directory -Path $OutputRoot
$runDir = Join-Path $OutputRoot $runTag
Ensure-Directory -Path $runDir

$manifest = [ordered]@{
  ok = $true
  runTag = $runTag
  outputRoot = $OutputRoot
  runDir = $runDir
  startedAt = (Get-Date).ToString("o")
  screenCount = [int]$screenCount
  captures = [ordered]@{
    screens = @()
    virtualDesktop = $null
    window = $null
  }
  errors = @()
}

if (-not $SkipPerScreen.IsPresent) {
  for ($i = 0; $i -lt $screenCount; $i += 1) {
    try {
      $path = Join-Path $runDir ("screen-{0}.png" -f $i)
      & $captureScreenScript -OutputPath $path -ScreenIndex $i | Out-Null
      $manifest.captures.screens += [ordered]@{
        index = $i
        path = $path
      }
    } catch {
      $manifest.ok = $false
      $manifest.errors += ("screen_capture_failed index={0}: {1}" -f $i, $_.Exception.Message)
    }
  }
}

if ($IncludeVirtualDesktop.IsPresent) {
  try {
    $allPath = Join-Path $runDir "screen-all.png"
    & $captureScreenScript -OutputPath $allPath -CaptureAll | Out-Null
    $manifest.captures.virtualDesktop = [ordered]@{
      path = $allPath
    }
  } catch {
    $manifest.ok = $false
    $manifest.errors += ("virtual_screen_capture_failed: {0}" -f $_.Exception.Message)
  }
}

try {
  $windowPath = Join-Path $runDir "window-focus.png"
  $windowRaw = if ($WindowId -gt 0) {
    & $captureWindowScript -OutputPath $windowPath -WindowId $WindowId
  } else {
    & $captureWindowScript -OutputPath $windowPath -WindowTitle $WindowTitle
  }
  $windowJson = $windowRaw | ConvertFrom-Json -ErrorAction Stop
  $manifest.captures.window = [ordered]@{
    path = $windowPath
    processId = [int]($windowJson.processId)
    processName = [string]($windowJson.processName)
    title = [string]($windowJson.title)
    left = [int]($windowJson.left)
    top = [int]($windowJson.top)
    width = [int]($windowJson.width)
    height = [int]($windowJson.height)
    capturedAt = [string]($windowJson.capturedAt)
  }
} catch {
  $manifest.ok = $false
  $manifest.errors += ("window_capture_failed: {0}" -f $_.Exception.Message)
}

$manifest.finishedAt = (Get-Date).ToString("o")
$manifestPath = Join-Path $runDir "manifest.json"
Write-JsonFileNoBom -Path $manifestPath -Value $manifest

if ($Json.IsPresent) {
  $manifest | ConvertTo-Json -Depth 10
  return
}

Write-Host "Dual capture complete."
Write-Host (" - run dir: " + $runDir)
Write-Host (" - screens captured: " + (@($manifest.captures.screens).Count))
Write-Host (" - virtual desktop: " + [bool]($null -ne $manifest.captures.virtualDesktop))
Write-Host (" - window title: " + [string]($manifest.captures.window.title))
Write-Host (" - manifest: " + $manifestPath)
if (@($manifest.errors).Count -gt 0) {
  Write-Host " - errors:"
  foreach ($item in @($manifest.errors)) {
    Write-Host ("   * " + $item)
  }
}
