param(
  [string]$RepoRoot = "",
  [switch]$ApplyFixes,
  [string]$LiveDocPath = "",
  [string]$LatestReportPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  param([string]$InputRepoRoot)
  if (-not [string]::IsNullOrWhiteSpace($InputRepoRoot)) {
    return (Resolve-Path -LiteralPath $InputRepoRoot).Path
  }
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

function Escape-Markdown {
  param([string]$Text)
  if ($null -eq $Text) { return "" }
  return ($Text -replace '\|', '\|')
}

function Get-ShortcutClass {
  param(
    [string]$Name,
    [string]$TargetPath,
    [string]$Arguments
  )

  $n = ([string]$Name).ToLowerInvariant()
  $t = ([string]$TargetPath).ToLowerInvariant()
  $a = ([string]$Arguments).ToLowerInvariant()

  if ($n -match "one button startup\.lnk") { return "startup_auto" }
  if ($t -match "start-asolaria-onebutton\.cmd") { return "launch_one_button" }
  if ($t -match "start-asolaria-phone\.cmd") { return "launch_phone" }
  if ($t -match "adb-healthcheck\.cmd") { return "adb_health" }
  if ($t -match "start-asolaria-controlplane-sandbox\.cmd") { return "launch_control_plane_sandbox" }
  if ($t -match "start-asolaria-controlplane\.cmd") { return "launch_control_plane" }
  if ($t -match "stop-asolaria-controlplane\.cmd") { return "stop_control_plane" }
  if ($t -match "stop-asolaria\.cmd") { return "stop_main" }
  if ($t -match "start-asolaria\.cmd") { return "launch_main" }
  if (($t -match "notepad\.exe") -and ($a -match "phone-recovery-runbook\.md")) { return "documentation" }
  if ($n -match "recovery guide") { return "documentation" }
  return "other"
}

function Test-IsAsolariaShortcutCandidate {
  param(
    [string]$Name,
    [string]$TargetPath,
    [string]$RepoRootResolved
  )

  $nameHit = ([string]$Name) -match "(?i)asolaria|adb health|phone connect|control plane|stop asolaria"
  $repoHit = (-not [string]::IsNullOrWhiteSpace($TargetPath)) -and ([string]$TargetPath).StartsWith($RepoRootResolved, [System.StringComparison]::OrdinalIgnoreCase)
  $targetHit = ([string]$TargetPath) -match "(?i)start-asolaria|stop-asolaria|adb-healthcheck|asolaria"
  return ($nameHit -or $repoHit -or $targetHit)
}

function Test-IsRuntimeShortcut {
  param([string]$ShortcutClass)
  return @(
    "startup_auto",
    "launch_one_button",
    "launch_phone",
    "adb_health",
    "launch_control_plane_sandbox",
    "launch_control_plane",
    "stop_control_plane",
    "stop_main",
    "launch_main",
    "other"
  ) -contains $ShortcutClass
}

function Get-ShortcutRoots {
  $desktopLocal = Join-Path $env:USERPROFILE "Desktop"
  $desktopActive = [Environment]::GetFolderPath("Desktop")
  return @(
    [pscustomobject]@{ id = "desktop_local"; path = $desktopLocal; recurse = $false },
    [pscustomobject]@{ id = "desktop_active"; path = $desktopActive; recurse = $false },
    [pscustomobject]@{ id = "startup"; path = [Environment]::GetFolderPath("Startup"); recurse = $false },
    [pscustomobject]@{ id = "start_menu_user"; path = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"; recurse = $true },
    [pscustomobject]@{ id = "start_menu_common"; path = "C:\ProgramData\Microsoft\Windows\Start Menu\Programs"; recurse = $true },
    [pscustomobject]@{ id = "taskbar_pinned"; path = Join-Path $env:APPDATA "Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"; recurse = $true },
    [pscustomobject]@{ id = "start_pinned"; path = Join-Path $env:APPDATA "Microsoft\Internet Explorer\Quick Launch\User Pinned\StartMenu"; recurse = $true }
  )
}

function Get-ExistingPhaseNotes {
  param([string]$DocPath)
  if (-not (Test-Path -LiteralPath $DocPath)) {
    return @(
      "- Add phase-upgrade notes here.",
      "- Keep this section manual; the script preserves it when refreshing live snapshot."
    ) -join [Environment]::NewLine
  }
  $raw = Get-Content -LiteralPath $DocPath -Raw
  if ($raw -match "(?s)<!-- PHASE_NOTES_START -->(.*?)<!-- PHASE_NOTES_END -->") {
    $value = $matches[1].Trim()
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      return $value
    }
  }
  return @(
    "- Add phase-upgrade notes here.",
    "- Keep this section manual; the script preserves it when refreshing live snapshot."
  ) -join [Environment]::NewLine
}

$repoRootPath = Resolve-RepoRoot -InputRepoRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($LiveDocPath)) {
  $LiveDocPath = Join-Path $repoRootPath "docs\ASOLARIA_SHORTCUT_ICON_LIVE.md"
}
if ([string]::IsNullOrWhiteSpace($LatestReportPath)) {
  $LatestReportPath = Join-Path $repoRootPath "reports\asolaria-shortcut-icon-audit-latest.md"
}

$iconPath = Join-Path $repoRootPath "public\icons\asolaria-icon.ico"
$expectedIconLocation = ""
if (Test-Path -LiteralPath $iconPath) {
  $expectedIconLocation = ($iconPath + ",0")
}

$shell = New-Object -ComObject WScript.Shell
$roots = Get-ShortcutRoots
$items = New-Object System.Collections.Generic.List[Object]
$visited = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
$fixCount = 0
$fixFailures = New-Object System.Collections.Generic.List[string]

foreach ($root in $roots) {
  if ([string]::IsNullOrWhiteSpace($root.path) -or -not (Test-Path -LiteralPath $root.path)) {
    continue
  }

  $enumerated = @()
  if ($root.recurse) {
    $enumerated = @(Get-ChildItem -LiteralPath $root.path -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue)
  } else {
    $enumerated = @(Get-ChildItem -LiteralPath $root.path -Filter "*.lnk" -ErrorAction SilentlyContinue)
  }

  foreach ($entry in $enumerated) {
    $shortcutPath = $entry.FullName
    if (-not $visited.Add($shortcutPath)) {
      continue
    }

    $shortcut = $shell.CreateShortcut($shortcutPath)
    $name = [string]$entry.Name
    $targetPath = [string]$shortcut.TargetPath
    $arguments = [string]$shortcut.Arguments
    $iconLocation = [string]$shortcut.IconLocation

    if (-not (Test-IsAsolariaShortcutCandidate -Name $name -TargetPath $targetPath -RepoRootResolved $repoRootPath)) {
      continue
    }

    $shortcutClass = Get-ShortcutClass -Name $name -TargetPath $targetPath -Arguments $arguments
    $isRuntime = Test-IsRuntimeShortcut -ShortcutClass $shortcutClass
    $iconOk = $false
    if (-not [string]::IsNullOrWhiteSpace($expectedIconLocation)) {
      $iconOk = [string]::Equals($iconLocation, $expectedIconLocation, [System.StringComparison]::OrdinalIgnoreCase)
    }

    if ($ApplyFixes.IsPresent -and $isRuntime -and (-not [string]::IsNullOrWhiteSpace($expectedIconLocation)) -and (-not $iconOk)) {
      try {
        $shortcut.IconLocation = $expectedIconLocation
        $shortcut.Save()
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $iconLocation = [string]$shortcut.IconLocation
        $iconOk = [string]::Equals($iconLocation, $expectedIconLocation, [System.StringComparison]::OrdinalIgnoreCase)
        if ($iconOk) {
          $fixCount++
        } else {
          $fixFailures.Add("Icon update did not persist for: $shortcutPath")
        }
      } catch {
        $fixFailures.Add(("Failed to update icon for {0}: {1}" -f $shortcutPath, $_.Exception.Message))
      }
    }

    $items.Add([pscustomobject]@{
        rootId = [string]$root.id
        shortcutName = $name
        shortcutPath = $shortcutPath
        targetPath = $targetPath
        arguments = $arguments
        shortcutClass = $shortcutClass
        isRuntime = $isRuntime
        iconLocation = $iconLocation
        iconExpected = $expectedIconLocation
        iconOk = $iconOk
      })
  }
}

$sortedItems = @($items.ToArray() | Sort-Object shortcutPath)
$runtimeItems = @($sortedItems | Where-Object { $_.isRuntime })
$runtimeWithCorrectIcon = @($runtimeItems | Where-Object { $_.iconOk })
$runtimeMissingIcon = @($runtimeItems | Where-Object { -not $_.iconOk })
$docsItems = @($sortedItems | Where-Object { -not $_.isRuntime })

$phaseNotes = Get-ExistingPhaseNotes -DocPath $LiveDocPath
$generatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")

$tableLines = @(
  "| Root | Shortcut | Class | Runtime | Icon Status | Target |",
  "|---|---|---|---|---|---|"
)
foreach ($row in $sortedItems) {
  $status = if ($row.iconOk) { "ok" } else { "needs_fix" }
  $runtimeText = if ($row.isRuntime) { "yes" } else { "no" }
  $tableLines += ("| {0} | {1} | {2} | {3} | {4} | `{5}` |" -f `
      (Escape-Markdown $row.rootId), `
      (Escape-Markdown $row.shortcutName), `
      (Escape-Markdown $row.shortcutClass), `
      $runtimeText, `
      $status, `
      (Escape-Markdown $row.targetPath))
}

$docLines = @(
  "# Asolaria Shortcut Icon Live",
  "",
  "Generated: $generatedAt",
  "",
  "## Canonical Icon Source",
  "",
  ('- Canonical `.ico`: `{0}`' -f $iconPath),
  ('- Expected shortcut icon location: `{0}`' -f $expectedIconLocation),
  "- Refresh command (apply icon fixes + update this live doc):",
  "",
  '```powershell',
  "cd $repoRootPath",
  "powershell -ExecutionPolicy Bypass -File .\\tools\\Refresh-Asolaria-ShortcutIconLiveDoc.ps1 -ApplyFixes",
  '```',
  "",
  "## Snapshot Summary",
  "",
  ("- Total Asolaria-related shortcuts scanned: {0}" -f $sortedItems.Count),
  ("- Runtime launch/stop shortcuts: {0}" -f $runtimeItems.Count),
  ("- Runtime shortcuts with expected icon: {0}" -f $runtimeWithCorrectIcon.Count),
  ("- Runtime shortcuts missing/incorrect icon: {0}" -f $runtimeMissingIcon.Count),
  ("- Non-runtime Asolaria docs/util shortcuts: {0}" -f $docsItems.Count),
  ("- Fixes applied this run: {0}" -f $fixCount),
  "",
  "## Shortcut Layout",
  "",
  $tableLines,
  "",
  "## Phase Upgrade Notes (Manual, preserved across refreshes)",
  "",
  "<!-- PHASE_NOTES_START -->",
  $phaseNotes,
  "<!-- PHASE_NOTES_END -->",
  ""
)

if ($fixFailures.Count -gt 0) {
  $docLines += "## Fix Errors"
  $docLines += ""
  foreach ($err in $fixFailures) {
    $docLines += ("- " + $err)
  }
  $docLines += ""
}

Ensure-Dir -Path (Split-Path -Parent $LiveDocPath)
Ensure-Dir -Path (Split-Path -Parent $LatestReportPath)
$docLines | Set-Content -LiteralPath $LiveDocPath -Encoding UTF8
$docLines | Set-Content -LiteralPath $LatestReportPath -Encoding UTF8

Write-Host "Asolaria shortcut icon live doc refreshed."
Write-Host (" - live doc: " + $LiveDocPath)
Write-Host (" - report: " + $LatestReportPath)
Write-Host (" - total scanned: " + $sortedItems.Count)
Write-Host (" - runtime: " + $runtimeItems.Count)
Write-Host (" - runtime icon ok: " + $runtimeWithCorrectIcon.Count)
Write-Host (" - runtime icon needs fix: " + $runtimeMissingIcon.Count)
Write-Host (" - fixes applied: " + $fixCount)
if ($fixFailures.Count -gt 0) {
  Write-Host (" - fix errors: " + $fixFailures.Count)
}
