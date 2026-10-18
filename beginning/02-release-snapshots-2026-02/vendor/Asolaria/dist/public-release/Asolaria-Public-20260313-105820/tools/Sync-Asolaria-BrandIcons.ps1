param(
  [string]$SourceImagePath = "",
  [string]$RepoRoot = "",
  [string]$AndroidProjectRoot = "",
  [switch]$SkipAndroid,
  [switch]$ReinstallDesktopShortcuts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:DrawingLoaded = $false

function Ensure-Dir {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Path cannot be empty."
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Ensure-Drawing {
  if (-not $script:DrawingLoaded) {
    Add-Type -AssemblyName System.Drawing
    $script:DrawingLoaded = $true
  }
}

function Resolve-RepoRoot {
  param([string]$InputRepoRoot)
  if (-not [string]::IsNullOrWhiteSpace($InputRepoRoot)) {
    return (Resolve-Path -LiteralPath $InputRepoRoot).Path
  }
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Write-ResizedPng {
  param(
    [string]$InputPath,
    [string]$OutputPath,
    [int]$Size
  )

  Ensure-Drawing
  Ensure-Dir -Path (Split-Path -Parent $OutputPath)

  $samePath = [string]::Equals(
    ([System.IO.Path]::GetFullPath($InputPath)),
    ([System.IO.Path]::GetFullPath($OutputPath)),
    [System.StringComparison]::OrdinalIgnoreCase
  )
  $readPath = $InputPath
  $tempReadPath = ""
  if ($samePath) {
    $tempReadPath = [System.IO.Path]::GetTempFileName()
    Copy-Item -LiteralPath $InputPath -Destination $tempReadPath -Force
    $readPath = $tempReadPath
  }

  $source = [System.Drawing.Image]::FromFile($readPath)
  try {
    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    try {
      $gfx = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $gfx.Clear([System.Drawing.Color]::Transparent)
        $gfx.DrawImage($source, 0, 0, $Size, $Size)
      } finally {
        $gfx.Dispose()
      }

      $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
    if (-not [string]::IsNullOrWhiteSpace($tempReadPath)) {
      Remove-Item -LiteralPath $tempReadPath -Force -ErrorAction SilentlyContinue
    }
  }
}

function Write-PngAsIco {
  param(
    [string]$PngPath,
    [string]$IcoPath,
    [int]$Size = 256
  )

  Ensure-Drawing

  $source = [System.Drawing.Image]::FromFile($PngPath)
  try {
    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    try {
      $gfx = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $gfx.Clear([System.Drawing.Color]::Transparent)
        $gfx.DrawImage($source, 0, 0, $Size, $Size)
      } finally {
        $gfx.Dispose()
      }

      $pngBuffer = New-Object System.IO.MemoryStream
      try {
        $bitmap.Save($pngBuffer, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngBytes = $pngBuffer.ToArray()
      } finally {
        $pngBuffer.Dispose()
      }
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
  }

  $widthByte = if ($Size -ge 256) { 0 } else { [byte]$Size }
  $heightByte = if ($Size -ge 256) { 0 } else { [byte]$Size }
  $bytesInRes = [uint32]$pngBytes.Length
  $imageOffset = [uint32]22

  Ensure-Dir -Path (Split-Path -Parent $IcoPath)
  $fs = [System.IO.File]::Open($IcoPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
  try {
    $bw = New-Object System.IO.BinaryWriter($fs)
    try {
      $bw.Write([UInt16]0)
      $bw.Write([UInt16]1)
      $bw.Write([UInt16]1)
      $bw.Write([Byte]$widthByte)
      $bw.Write([Byte]$heightByte)
      $bw.Write([Byte]0)
      $bw.Write([Byte]0)
      $bw.Write([UInt16]1)
      $bw.Write([UInt16]32)
      $bw.Write([UInt32]$bytesInRes)
      $bw.Write([UInt32]$imageOffset)
      $bw.Write($pngBytes)
    } finally {
      $bw.Dispose()
    }
  } finally {
    $fs.Dispose()
  }
}

function Write-TextAscii {
  param(
    [string]$Path,
    [string]$Text
  )
  Ensure-Dir -Path (Split-Path -Parent $Path)
  Set-Content -Path $Path -Value $Text -Encoding ASCII -NoNewline
}

function Sync-WebAndDesktopIcons {
  param(
    [string]$RepoPath,
    [string]$SourcePath
  )

  $iconsDir = Join-Path $RepoPath "public\icons"
  Ensure-Dir -Path $iconsDir

  $icon192 = Join-Path $iconsDir "asolaria-icon-192.png"
  $icon512 = Join-Path $iconsDir "asolaria-icon-512.png"
  $iconIco = Join-Path $iconsDir "asolaria-icon.ico"

  Write-ResizedPng -InputPath $SourcePath -OutputPath $icon192 -Size 192
  Write-ResizedPng -InputPath $SourcePath -OutputPath $icon512 -Size 512
  Write-PngAsIco -PngPath $icon512 -IcoPath $iconIco -Size 256

  return [pscustomobject]@{
    Icon192 = $icon192
    Icon512 = $icon512
    IconIco = $iconIco
  }
}

function Sync-AndroidLauncherIcons {
  param(
    [string]$AndroidRoot,
    [string]$SourcePath
  )

  if (-not (Test-Path -LiteralPath $AndroidRoot)) {
    throw ("Android project root not found: " + $AndroidRoot)
  }

  $resRoot = Join-Path $AndroidRoot "app\src\main\res"
  if (-not (Test-Path -LiteralPath $resRoot)) {
    throw ("Android res folder not found: " + $resRoot)
  }

  $legacyByDensity = [ordered]@{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
  }
  $foregroundByDensity = [ordered]@{
    "mipmap-mdpi" = 108
    "mipmap-hdpi" = 162
    "mipmap-xhdpi" = 216
    "mipmap-xxhdpi" = 324
    "mipmap-xxxhdpi" = 432
  }

  foreach ($density in $legacyByDensity.Keys) {
    $targetDir = Join-Path $resRoot $density
    Ensure-Dir -Path $targetDir
    $legacySize = [int]$legacyByDensity[$density]
    $foregroundSize = [int]$foregroundByDensity[$density]
    Write-ResizedPng -InputPath $SourcePath -OutputPath (Join-Path $targetDir "ic_launcher.png") -Size $legacySize
    Write-ResizedPng -InputPath $SourcePath -OutputPath (Join-Path $targetDir "ic_launcher_round.png") -Size $legacySize
    Write-ResizedPng -InputPath $SourcePath -OutputPath (Join-Path $targetDir "ic_launcher_foreground.png") -Size $foregroundSize
  }

  $adaptiveDir = Join-Path $resRoot "mipmap-anydpi-v26"
  Ensure-Dir -Path $adaptiveDir
  $adaptiveXml = @"
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@drawable/ic_launcher_background" />
  <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
"@
  Write-TextAscii -Path (Join-Path $adaptiveDir "ic_launcher.xml") -Text $adaptiveXml
  Write-TextAscii -Path (Join-Path $adaptiveDir "ic_launcher_round.xml") -Text $adaptiveXml

  $backgroundXmlPath = Join-Path $resRoot "drawable\ic_launcher_background.xml"
  $backgroundXml = @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#0B1C36" />
</shape>
"@
  Write-TextAscii -Path $backgroundXmlPath -Text $backgroundXml

  $manifestPath = Join-Path $AndroidRoot "app\src\main\AndroidManifest.xml"
  if (Test-Path -LiteralPath $manifestPath) {
    $manifest = Get-Content -Raw -Path $manifestPath
    if ($manifest -notmatch 'android:roundIcon=') {
      $replacement = "android:icon=""@mipmap/ic_launcher""`r`n    android:roundIcon=""@mipmap/ic_launcher_round"""
      $updated = $manifest -replace 'android:icon="@mipmap/ic_launcher"', $replacement
      if ($updated -ne $manifest) {
        Set-Content -Path $manifestPath -Value $updated -Encoding UTF8
      }
    }
  }
}

$repoPath = Resolve-RepoRoot -InputRepoRoot $RepoRoot

if ([string]::IsNullOrWhiteSpace($SourceImagePath)) {
  $SourceImagePath = Join-Path $repoPath "public\icons\asolaria-icon-512.png"
}

$sourcePath = (Resolve-Path -LiteralPath $SourceImagePath).Path
if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw ("Source image not found: " + $SourceImagePath)
}

$desktopResult = Sync-WebAndDesktopIcons -RepoPath $repoPath -SourcePath $sourcePath

$androidPath = $AndroidProjectRoot
if ([string]::IsNullOrWhiteSpace($androidPath)) {
  $parent = Split-Path -Parent $repoPath
  $androidPath = Join-Path $parent "Asolaria-Android\AsolariaCompanion"
}

$androidSynced = $false
if (-not $SkipAndroid.IsPresent) {
  Sync-AndroidLauncherIcons -AndroidRoot $androidPath -SourcePath $sourcePath
  $androidSynced = $true
}

if ($ReinstallDesktopShortcuts.IsPresent) {
  $shortcutInstaller = Join-Path $repoPath "tools\Install-Asolaria-DesktopShortcuts.ps1"
  if (Test-Path -LiteralPath $shortcutInstaller) {
    # Keep desktop launch UX minimal: one primary Asolaria icon, no utility/control-plane icon sprawl.
    & $shortcutInstaller -MirrorToActiveDesktop -CleanupActiveDesktopLegacy -Force
  }
}

Write-Host "Asolaria brand icon sync complete."
Write-Host (" - source: " + $sourcePath)
Write-Host (" - web 192: " + $desktopResult.Icon192)
Write-Host (" - web 512: " + $desktopResult.Icon512)
Write-Host (" - desktop ico: " + $desktopResult.IconIco)
Write-Host (" - android synced: " + ([string]$androidSynced))
if ($androidSynced) {
  Write-Host (" - android root: " + $androidPath)
}
