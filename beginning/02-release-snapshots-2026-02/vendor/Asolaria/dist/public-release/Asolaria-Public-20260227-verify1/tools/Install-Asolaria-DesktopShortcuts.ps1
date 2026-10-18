param(
  [switch]$MirrorToActiveDesktop,
  [switch]$CleanupActiveDesktopLegacy,
  [switch]$IncludeUtilityShortcuts,
  [switch]$IncludeControlPlaneShortcuts,
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Path cannot be empty."
  }
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Write-PngAsIco {
  param(
    [string]$PngPath,
    [string]$IcoPath,
    [int]$Size = 256
  )

  Add-Type -AssemblyName System.Drawing
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

  $outDir = Split-Path -Parent $IcoPath
  Ensure-Dir -Path $outDir
  $fs = [System.IO.File]::Open($IcoPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
  try {
    $bw = New-Object System.IO.BinaryWriter($fs)
    try {
      $bw.Write([UInt16]0)    # reserved
      $bw.Write([UInt16]1)    # type = icon
      $bw.Write([UInt16]1)    # count
      $bw.Write([Byte]$widthByte)
      $bw.Write([Byte]$heightByte)
      $bw.Write([Byte]0)      # color count
      $bw.Write([Byte]0)      # reserved
      $bw.Write([UInt16]1)    # color planes
      $bw.Write([UInt16]32)   # bits per pixel
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

function Ensure-AsolariaShortcutIcon {
  param(
    [string]$RepoRoot
  )

  $iconsDir = Join-Path $RepoRoot "public\icons"
  $pngPath = Join-Path $iconsDir "asolaria-icon-512.png"
  $icoPath = Join-Path $iconsDir "asolaria-icon.ico"
  if (-not (Test-Path -LiteralPath $pngPath)) {
    return ""
  }

  $shouldRebuild = $true
  if (Test-Path -LiteralPath $icoPath) {
    try {
      $pngTime = (Get-Item -LiteralPath $pngPath).LastWriteTimeUtc
      $icoTime = (Get-Item -LiteralPath $icoPath).LastWriteTimeUtc
      $shouldRebuild = $icoTime -lt $pngTime
    } catch {
      $shouldRebuild = $true
    }
  }

  if ($shouldRebuild) {
    try {
      Write-PngAsIco -PngPath $pngPath -IcoPath $icoPath -Size 256
    } catch {
      return ""
    }
  }

  if (Test-Path -LiteralPath $icoPath) {
    return ($icoPath + ",0")
  }
  return ""
}

function Add-ShortcutSpec {
  param(
    [System.Collections.Generic.List[Object]]$List,
    [string]$Name,
    [string]$TargetPath,
    [string]$Arguments,
    [string]$WorkingDirectory,
    [string]$Description,
    [string]$IconLocation = ""
  )

  $List.Add([ordered]@{
      Name = $Name
      TargetPath = $TargetPath
      Arguments = $Arguments
      WorkingDirectory = $WorkingDirectory
      Description = $Description
      IconLocation = $IconLocation
    })
}

function Set-DesktopShortcut {
  param(
    $ShortcutShell,
    [string]$DesktopPath,
    $Spec
  )

  $targetPath = [string]$Spec.TargetPath
  if (($targetPath -ne "notepad.exe") -and (-not (Test-Path -LiteralPath $targetPath))) {
    Write-Warning ("Skipping '{0}' because target was not found: {1}" -f $Spec.Name, $targetPath)
    return $null
  }

  $shortcutPath = Join-Path $DesktopPath ([string]$Spec.Name)
  if ((Test-Path -LiteralPath $shortcutPath) -and (-not $Force)) {
    # Existing files are updated in place by default.
  }

  $shortcut = $ShortcutShell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $targetPath
  $shortcut.Arguments = [string]$Spec.Arguments
  $shortcut.WorkingDirectory = [string]$Spec.WorkingDirectory
  $shortcut.Description = [string]$Spec.Description
  $iconLocation = [string]$Spec.IconLocation
  if (-not [string]::IsNullOrWhiteSpace($iconLocation)) {
    $shortcut.IconLocation = $iconLocation
  }
  $shortcut.Save()

  return [ordered]@{
    name = [string]$Spec.Name
    desktop = $DesktopPath
    path = $shortcutPath
    target = $targetPath
    arguments = [string]$Spec.Arguments
  }
}

function Remove-DesktopShortcutIfExists {
  param(
    [string]$DesktopPath,
    [string]$Name
  )

  $shortcutPath = Join-Path $DesktopPath $Name
  if (Test-Path -LiteralPath $shortcutPath) {
    Remove-Item -LiteralPath $shortcutPath -Force -ErrorAction SilentlyContinue
    return $shortcutPath
  }
  return $null
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$defaultShortcutIconLocation = Ensure-AsolariaShortcutIcon -RepoRoot $repoRoot
$localDesktopPath = Join-Path $env:USERPROFILE "Desktop"
$activeDesktopPath = [Environment]::GetFolderPath("Desktop")
$runbookPath = Join-Path $repoRoot "tools\Phone-Recovery-Runbook.md"
$notepadPath = Join-Path $env:WINDIR "System32\notepad.exe"
if (-not (Test-Path -LiteralPath $notepadPath)) {
  $notepadPath = "notepad.exe"
}

$desktopTargets = New-Object System.Collections.Generic.List[string]
$desktopTargets.Add($localDesktopPath)

if ($MirrorToActiveDesktop.IsPresent) {
  if (-not [string]::IsNullOrWhiteSpace($activeDesktopPath)) {
    if (-not [string]::Equals($localDesktopPath, $activeDesktopPath, [System.StringComparison]::OrdinalIgnoreCase)) {
      $desktopTargets.Add($activeDesktopPath)
    }
  }
}

$shortcutSpecs = New-Object System.Collections.Generic.List[Object]
Add-ShortcutSpec -List $shortcutSpecs `
  -Name "Asolaria.lnk" `
  -TargetPath (Join-Path $repoRoot "Start-Asolaria.cmd") `
  -Arguments "" `
  -WorkingDirectory $repoRoot `
  -Description "Primary Asolaria launcher with desktop authentication gate, one-button startup, and auto reconnect." `
  -IconLocation $defaultShortcutIconLocation

Add-ShortcutSpec -List $shortcutSpecs `
  -Name "Stop Asolaria (Admin).lnk" `
  -TargetPath (Join-Path $repoRoot "Stop-Asolaria.cmd") `
  -Arguments "" `
  -WorkingDirectory $repoRoot `
  -Description "Stop Asolaria core app." `
  -IconLocation $defaultShortcutIconLocation

if ($IncludeUtilityShortcuts.IsPresent) {
  Add-ShortcutSpec -List $shortcutSpecs `
    -Name "Asolaria App (One Button).lnk" `
    -TargetPath (Join-Path $repoRoot "Start-Asolaria-OneButton.cmd") `
    -Arguments "" `
    -WorkingDirectory $repoRoot `
    -Description "Alias launcher for one-button startup." `
    -IconLocation $defaultShortcutIconLocation

  Add-ShortcutSpec -List $shortcutSpecs `
    -Name "Asolaria Phone Connect.lnk" `
    -TargetPath (Join-Path $repoRoot "Start-Asolaria-Phone.cmd") `
    -Arguments "" `
    -WorkingDirectory $repoRoot `
    -Description "Start Asolaria phone workflow and generate the phone URL." `
    -IconLocation $defaultShortcutIconLocation

  Add-ShortcutSpec -List $shortcutSpecs `
    -Name "Asolaria ADB Health Check.lnk" `
    -TargetPath (Join-Path $repoRoot "ADB-HealthCheck.cmd") `
    -Arguments "" `
    -WorkingDirectory $repoRoot `
    -Description "Run ADB health diagnostics and recovery." `
    -IconLocation $defaultShortcutIconLocation

  if (Test-Path -LiteralPath $runbookPath) {
    Add-ShortcutSpec -List $shortcutSpecs `
      -Name "Asolaria Phone Recovery Guide.lnk" `
      -TargetPath $notepadPath `
      -Arguments ("`"{0}`"" -f $runbookPath) `
      -WorkingDirectory (Split-Path -Path $runbookPath -Parent) `
      -Description "Open the Asolaria phone recovery runbook." `
      -IconLocation $defaultShortcutIconLocation
  }
}

if ($IncludeControlPlaneShortcuts.IsPresent) {
  Add-ShortcutSpec -List $shortcutSpecs `
    -Name "Asolaria Control Plane (Admin).lnk" `
    -TargetPath (Join-Path $repoRoot "Start-Asolaria-ControlPlane.cmd") `
    -Arguments "" `
    -WorkingDirectory $repoRoot `
    -Description "Start core app plus gateway tooling (sandbox disabled by default)." `
    -IconLocation $defaultShortcutIconLocation

  Add-ShortcutSpec -List $shortcutSpecs `
    -Name "Asolaria Control Plane + Sandbox (Admin).lnk" `
    -TargetPath (Join-Path $repoRoot "Start-Asolaria-ControlPlane-Sandbox.cmd") `
    -Arguments "" `
    -WorkingDirectory $repoRoot `
    -Description "Start core app, gateway, and sandbox manager." `
    -IconLocation $defaultShortcutIconLocation

  Add-ShortcutSpec -List $shortcutSpecs `
    -Name "Stop Asolaria Control Plane (Admin).lnk" `
    -TargetPath (Join-Path $repoRoot "Stop-Asolaria-ControlPlane.cmd") `
    -Arguments "" `
    -WorkingDirectory $repoRoot `
    -Description "Stop gateway/sandbox tooling and optionally core app." `
    -IconLocation $defaultShortcutIconLocation
}

$shortcutShell = New-Object -ComObject WScript.Shell
$written = New-Object System.Collections.Generic.List[Object]
$removed = New-Object System.Collections.Generic.List[string]

foreach ($desktopPath in $desktopTargets) {
  Ensure-Dir -Path $desktopPath
  foreach ($spec in $shortcutSpecs) {
    $result = Set-DesktopShortcut -ShortcutShell $shortcutShell -DesktopPath $desktopPath -Spec $spec
    if ($null -ne $result) {
      $written.Add($result)
    }
  }

if (-not $IncludeUtilityShortcuts.IsPresent) {
    $cleanupNames = @(
      "Asolaria (Admin).lnk",
      "Asolaria App (One Button).lnk",
      "Asolaria Phone Connect.lnk",
      "Asolaria ADB Health Check.lnk",
      "Asolaria Phone Recovery Guide.lnk"
    )
    foreach ($name in $cleanupNames) {
      $removedPath = Remove-DesktopShortcutIfExists -DesktopPath $desktopPath -Name $name
      if ($removedPath) {
        $removed.Add($removedPath)
      }
    }
  }

  if (-not $IncludeControlPlaneShortcuts.IsPresent) {
    $controlPlaneNames = @(
      "Asolaria Control Plane (Admin).lnk",
      "Asolaria Control Plane + Sandbox (Admin).lnk",
      "Stop Asolaria Control Plane (Admin).lnk"
    )
    foreach ($name in $controlPlaneNames) {
      $removedPath = Remove-DesktopShortcutIfExists -DesktopPath $desktopPath -Name $name
      if ($removedPath) {
        $removed.Add($removedPath)
      }
    }
  }
}

if ($CleanupActiveDesktopLegacy.IsPresent -and (-not $MirrorToActiveDesktop.IsPresent) -and (-not [string]::IsNullOrWhiteSpace($activeDesktopPath)) -and (-not [string]::Equals($activeDesktopPath, $localDesktopPath, [System.StringComparison]::OrdinalIgnoreCase))) {
  $legacyNames = @(
    "Asolaria.lnk",
    "Asolaria (Admin).lnk",
    "Stop Asolaria (Admin).lnk",
    "Asolaria Control Plane (Admin).lnk",
    "Asolaria Control Plane + Sandbox (Admin).lnk",
    "Stop Asolaria Control Plane (Admin).lnk",
    "Asolaria App (One Button).lnk",
    "Asolaria Phone Connect.lnk",
    "Asolaria ADB Health Check.lnk",
    "Asolaria Phone Recovery Guide.lnk"
  )
  foreach ($name in $legacyNames) {
    $removedPath = Remove-DesktopShortcutIfExists -DesktopPath $activeDesktopPath -Name $name
    if ($removedPath) {
      $removed.Add($removedPath)
    }
  }
}

$writtenArray = @($written.ToArray())
$removedArray = @($removed.ToArray())
Write-Host "Asolaria desktop shortcuts installed."
Write-Host (" - local desktop:  " + $localDesktopPath)
Write-Host (" - active desktop: " + $activeDesktopPath)
Write-Host (" - mirror enabled: " + ([string]$MirrorToActiveDesktop.IsPresent))
Write-Host (" - active legacy cleanup: " + ([string]$CleanupActiveDesktopLegacy.IsPresent))
Write-Host (" - utility shortcuts: " + ([string]$IncludeUtilityShortcuts.IsPresent))
Write-Host (" - control-plane shortcuts: " + ([string]$IncludeControlPlaneShortcuts.IsPresent))
Write-Host (" - shortcuts written: " + $writtenArray.Count)
foreach ($item in $writtenArray | Sort-Object path) {
  Write-Host ("   * " + $item.path)
}
Write-Host (" - shortcuts removed: " + $removedArray.Count)
foreach ($path in $removedArray | Sort-Object) {
  Write-Host ("   - removed " + $path)
}
