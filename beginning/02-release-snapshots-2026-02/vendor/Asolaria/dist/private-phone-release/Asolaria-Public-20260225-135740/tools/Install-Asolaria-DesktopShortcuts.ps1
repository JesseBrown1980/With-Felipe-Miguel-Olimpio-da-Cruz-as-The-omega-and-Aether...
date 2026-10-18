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

function Add-ShortcutSpec {
  param(
    [System.Collections.Generic.List[Object]]$List,
    [string]$Name,
    [string]$TargetPath,
    [string]$Arguments,
    [string]$WorkingDirectory,
    [string]$Description
  )

  $List.Add([ordered]@{
      Name = $Name
      TargetPath = $TargetPath
      Arguments = $Arguments
      WorkingDirectory = $WorkingDirectory
      Description = $Description
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
  -Description "Primary Asolaria launcher with desktop authentication gate, one-button startup, and auto reconnect."

Add-ShortcutSpec -List $shortcutSpecs `
  -Name "Stop Asolaria (Admin).lnk" `
  -TargetPath (Join-Path $repoRoot "Stop-Asolaria.cmd") `
  -Arguments "" `
  -WorkingDirectory $repoRoot `
  -Description "Stop Asolaria core app."

if ($IncludeUtilityShortcuts.IsPresent) {
  Add-ShortcutSpec -List $shortcutSpecs `
    -Name "Asolaria App (One Button).lnk" `
    -TargetPath (Join-Path $repoRoot "Start-Asolaria-OneButton.cmd") `
    -Arguments "" `
    -WorkingDirectory $repoRoot `
    -Description "Alias launcher for one-button startup."

  Add-ShortcutSpec -List $shortcutSpecs `
    -Name "Asolaria Phone Connect.lnk" `
    -TargetPath (Join-Path $repoRoot "Start-Asolaria-Phone.cmd") `
    -Arguments "" `
    -WorkingDirectory $repoRoot `
    -Description "Start Asolaria phone workflow and generate the phone URL."

  Add-ShortcutSpec -List $shortcutSpecs `
    -Name "Asolaria ADB Health Check.lnk" `
    -TargetPath (Join-Path $repoRoot "ADB-HealthCheck.cmd") `
    -Arguments "" `
    -WorkingDirectory $repoRoot `
    -Description "Run ADB health diagnostics and recovery."

  if (Test-Path -LiteralPath $runbookPath) {
    Add-ShortcutSpec -List $shortcutSpecs `
      -Name "Asolaria Phone Recovery Guide.lnk" `
      -TargetPath $notepadPath `
      -Arguments ("`"{0}`"" -f $runbookPath) `
      -WorkingDirectory (Split-Path -Path $runbookPath -Parent) `
      -Description "Open the Asolaria phone recovery runbook."
  }
}

if ($IncludeControlPlaneShortcuts.IsPresent) {
  Add-ShortcutSpec -List $shortcutSpecs `
    -Name "Asolaria Control Plane (Admin).lnk" `
    -TargetPath (Join-Path $repoRoot "Start-Asolaria-ControlPlane.cmd") `
    -Arguments "" `
    -WorkingDirectory $repoRoot `
    -Description "Start core app plus gateway tooling (sandbox disabled by default)."

  Add-ShortcutSpec -List $shortcutSpecs `
    -Name "Asolaria Control Plane + Sandbox (Admin).lnk" `
    -TargetPath (Join-Path $repoRoot "Start-Asolaria-ControlPlane-Sandbox.cmd") `
    -Arguments "" `
    -WorkingDirectory $repoRoot `
    -Description "Start core app, gateway, and sandbox manager."

  Add-ShortcutSpec -List $shortcutSpecs `
    -Name "Stop Asolaria Control Plane (Admin).lnk" `
    -TargetPath (Join-Path $repoRoot "Stop-Asolaria-ControlPlane.cmd") `
    -Arguments "" `
    -WorkingDirectory $repoRoot `
    -Description "Stop gateway/sandbox tooling and optionally core app."
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
