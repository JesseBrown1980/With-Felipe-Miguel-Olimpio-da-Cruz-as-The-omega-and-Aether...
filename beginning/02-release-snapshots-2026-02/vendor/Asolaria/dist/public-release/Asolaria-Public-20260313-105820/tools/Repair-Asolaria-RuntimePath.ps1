[CmdletBinding()]
param(
  [string]$OutDir = "C:\Users\acer\Asolaria\reports",
  [string]$Tag = "runtime-path-repair",
  [switch]$Apply,
  [switch]$AlignJavaHome = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Split-PathEntries {
  param([string]$RawPath)
  if ([string]::IsNullOrWhiteSpace($RawPath)) {
    return @()
  }
  return @(
    $RawPath.Split(";") |
      ForEach-Object { [string]$_.Trim() } |
      Where-Object { $_ -ne "" }
  )
}

function Join-PathEntries {
  param([string[]]$Entries)
  return [string](@($Entries) -join ";")
}

function Normalize-PathKey {
  param([string]$Entry)
  if ([string]::IsNullOrWhiteSpace($Entry)) {
    return ""
  }
  return [string]$Entry.Trim().TrimEnd("\").ToLowerInvariant()
}

function Get-DedupedPathEntries {
  param([string[]]$Entries)
  $seen = [System.Collections.Generic.HashSet[string]]::new()
  $out = [System.Collections.Generic.List[string]]::new()
  foreach ($entry in @($Entries)) {
    $key = Normalize-PathKey -Entry $entry
    if ([string]::IsNullOrWhiteSpace($key)) { continue }
    if ($seen.Contains($key)) { continue }
    [void]$seen.Add($key)
    $out.Add([string]$entry)
  }
  return @($out)
}

function Move-EntriesBeforeTarget {
  param(
    [string[]]$Entries,
    [string[]]$EntriesToMove,
    [string]$TargetEntry
  )
  $targetKey = Normalize-PathKey -Entry $TargetEntry
  if ([string]::IsNullOrWhiteSpace($targetKey)) {
    return @($Entries)
  }

  $moveKeys = [System.Collections.Generic.HashSet[string]]::new()
  foreach ($move in @($EntriesToMove)) {
    $key = Normalize-PathKey -Entry $move
    if (-not [string]::IsNullOrWhiteSpace($key)) {
      [void]$moveKeys.Add($key)
    }
  }
  if ($moveKeys.Count -lt 1) {
    return @($Entries)
  }

  $targetIndex = -1
  for ($i = 0; $i -lt $Entries.Count; $i++) {
    if ((Normalize-PathKey -Entry $Entries[$i]) -eq $targetKey) {
      $targetIndex = $i
      break
    }
  }
  if ($targetIndex -lt 0) {
    return @($Entries)
  }

  $selected = [System.Collections.Generic.List[string]]::new()
  $remaining = [System.Collections.Generic.List[string]]::new()
  foreach ($entry in @($Entries)) {
    $key = Normalize-PathKey -Entry $entry
    if ($moveKeys.Contains($key)) {
      $selected.Add([string]$entry)
    } else {
      $remaining.Add([string]$entry)
    }
  }
  if ($selected.Count -lt 1) {
    return @($Entries)
  }

  $insertIndex = 0
  for ($i = 0; $i -lt $remaining.Count; $i++) {
    if ((Normalize-PathKey -Entry $remaining[$i]) -eq $targetKey) {
      $insertIndex = $i
      break
    }
  }

  $result = [System.Collections.Generic.List[string]]::new()
  for ($i = 0; $i -lt $remaining.Count; $i++) {
    if ($i -eq $insertIndex) {
      foreach ($s in $selected) { $result.Add($s) }
    }
    $result.Add($remaining[$i])
  }
  if ($insertIndex -ge $remaining.Count) {
    foreach ($s in $selected) { $result.Add($s) }
  }
  return @($result)
}

function Get-WhereResult {
  param([string]$ExeName)
  $out = @(& where.exe $ExeName 2>$null)
  return @($out | ForEach-Object { [string]$_.Trim() } | Where-Object { $_ -ne "" })
}

$timestamp = Get-Date
$stamp = $timestamp.ToString("yyyyMMdd-HHmmss")
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$jsonPath = Join-Path $OutDir "$Tag-$stamp.json"
$mdPath = Join-Path $OutDir "$Tag-$stamp.md"
$rollbackPath = Join-Path $OutDir "$Tag-$stamp-rollback.json"

$userHome = [Environment]::GetFolderPath("UserProfile")
$pythonPath = Join-Path $userHome "AppData\Local\Programs\Python\Python313"
$pythonScriptsPath = Join-Path $pythonPath "Scripts"
$windowsAppsPath = Join-Path $userHome "AppData\Local\Microsoft\WindowsApps"

$oldMachinePath = [string][Environment]::GetEnvironmentVariable("Path", "Machine")
$oldUserPath = [string][Environment]::GetEnvironmentVariable("Path", "User")
$oldMachineEntries = Split-PathEntries -RawPath $oldMachinePath
$oldUserEntries = Split-PathEntries -RawPath $oldUserPath

$newMachineEntries = Get-DedupedPathEntries -Entries $oldMachineEntries
$newUserEntries = Get-DedupedPathEntries -Entries $oldUserEntries

# Keep WindowsApps in PATH, but move real Python entries before WindowsApps to reduce shim collisions.
$newMachineEntries = Move-EntriesBeforeTarget `
  -Entries $newMachineEntries `
  -EntriesToMove @($pythonScriptsPath, $pythonPath) `
  -TargetEntry $windowsAppsPath

# Drop User PATH entries that are already present in Machine PATH to reduce duplicate resolution noise.
$machineKeys = [System.Collections.Generic.HashSet[string]]::new()
foreach ($entry in @($newMachineEntries)) {
  $key = Normalize-PathKey -Entry $entry
  if (-not [string]::IsNullOrWhiteSpace($key)) {
    [void]$machineKeys.Add($key)
  }
}
$newUserEntries = @(
  $newUserEntries | Where-Object {
    $key = Normalize-PathKey -Entry $_
    -not [string]::IsNullOrWhiteSpace($key) -and -not $machineKeys.Contains($key)
  }
)

$newMachinePath = Join-PathEntries -Entries $newMachineEntries
$newUserPath = Join-PathEntries -Entries $newUserEntries

$oldJavaHomeMachine = [string][Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine")
$oldJavaHomeUser = [string][Environment]::GetEnvironmentVariable("JAVA_HOME", "User")
$newJavaHomeUser = $oldJavaHomeUser
$java8HomeUser = [string][Environment]::GetEnvironmentVariable("JAVA8_HOME", "User")
$java21HomeUser = [string][Environment]::GetEnvironmentVariable("JAVA21_HOME", "User")

if ($AlignJavaHome.IsPresent -and -not [string]::IsNullOrWhiteSpace($oldJavaHomeMachine)) {
  if (-not [string]::IsNullOrWhiteSpace($oldJavaHomeUser) -and (Normalize-PathKey -Entry $oldJavaHomeUser) -ne (Normalize-PathKey -Entry $oldJavaHomeMachine)) {
    $java8HomeUser = $oldJavaHomeUser
  }
  $newJavaHomeUser = $oldJavaHomeMachine
  $java21HomeUser = $oldJavaHomeMachine
}

$rollback = [ordered]@{
  generatedAt = $timestamp.ToString("o")
  machinePath = $oldMachinePath
  userPath = $oldUserPath
  javaHomeMachine = $oldJavaHomeMachine
  javaHomeUser = $oldJavaHomeUser
  java8HomeUser = [string][Environment]::GetEnvironmentVariable("JAVA8_HOME", "User")
  java21HomeUser = [string][Environment]::GetEnvironmentVariable("JAVA21_HOME", "User")
}
($rollback | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $rollbackPath -Encoding UTF8

$changed = [ordered]@{
  machinePathChanged = ($oldMachinePath -ne $newMachinePath)
  userPathChanged = ($oldUserPath -ne $newUserPath)
  javaHomeUserChanged = ($oldJavaHomeUser -ne $newJavaHomeUser)
}

if ($Apply.IsPresent) {
  if ($changed.machinePathChanged) {
    [Environment]::SetEnvironmentVariable("Path", $newMachinePath, "Machine")
  }
  if ($changed.userPathChanged) {
    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
  }
  if ($AlignJavaHome.IsPresent) {
    if (-not [string]::IsNullOrWhiteSpace($newJavaHomeUser)) {
      [Environment]::SetEnvironmentVariable("JAVA_HOME", $newJavaHomeUser, "User")
    }
    if (-not [string]::IsNullOrWhiteSpace($java8HomeUser)) {
      [Environment]::SetEnvironmentVariable("JAVA8_HOME", $java8HomeUser, "User")
    }
    if (-not [string]::IsNullOrWhiteSpace($java21HomeUser)) {
      [Environment]::SetEnvironmentVariable("JAVA21_HOME", $java21HomeUser, "User")
      [Environment]::SetEnvironmentVariable("JAVA21_HOME", $oldJavaHomeMachine, "Machine")
    }
  }
}

$effectiveMachinePath = [string][Environment]::GetEnvironmentVariable("Path", "Machine")
$effectiveUserPath = [string][Environment]::GetEnvironmentVariable("Path", "User")
$effectiveJavaHomeUser = [string][Environment]::GetEnvironmentVariable("JAVA_HOME", "User")
$effectiveJava8Home = [string][Environment]::GetEnvironmentVariable("JAVA8_HOME", "User")
$effectiveJava21Home = [string][Environment]::GetEnvironmentVariable("JAVA21_HOME", "User")

$wherePython = Get-WhereResult -ExeName "python"
$whereJava = Get-WhereResult -ExeName "java"
$pythonVersion = [string](& python --version 2>$null)
$javaVersion = ""
try {
  $javaVersion = [string](cmd /c "java -version 2>&1" | Select-Object -First 1)
} catch {
  $javaVersion = ""
}

$result = [ordered]@{
  ok = $true
  generatedAt = $timestamp.ToString("o")
  applied = [bool]$Apply.IsPresent
  rollbackFile = $rollbackPath
  changed = $changed
  machinePath = [ordered]@{
    oldCount = @($oldMachineEntries).Count
    newCount = @(Split-PathEntries -RawPath $effectiveMachinePath).Count
    containsWindowsApps = [bool](@(Split-PathEntries -RawPath $effectiveMachinePath | Where-Object { (Normalize-PathKey -Entry $_) -eq (Normalize-PathKey -Entry $windowsAppsPath) }).Count -gt 0)
  }
  userPath = [ordered]@{
    oldCount = @($oldUserEntries).Count
    newCount = @(Split-PathEntries -RawPath $effectiveUserPath).Count
  }
  javaHomes = [ordered]@{
    machine = $oldJavaHomeMachine
    user = $effectiveJavaHomeUser
    java8User = $effectiveJava8Home
    java21User = $effectiveJava21Home
  }
  resolution = [ordered]@{
    wherePython = @($wherePython)
    pythonVersion = $pythonVersion
    whereJava = @($whereJava)
    javaVersionLine = $javaVersion
  }
  notes = @(
    "Microsoft WindowsApps PATH entry was preserved.",
    "Rollback file captured original PATH/JAVA_HOME values."
  )
}

($result | ConvertTo-Json -Depth 10) | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$md = [System.Collections.Generic.List[string]]::new()
$md.Add("# Runtime Path Repair")
$md.Add("")
$md.Add("- Generated: $($timestamp.ToString('u'))")
$md.Add("- Applied: $([bool]$Apply.IsPresent)")
$md.Add("- Rollback file: $rollbackPath")
$md.Add("- Machine PATH changed: $($changed.machinePathChanged)")
$md.Add("- User PATH changed: $($changed.userPathChanged)")
$md.Add("- User JAVA_HOME changed: $($changed.javaHomeUserChanged)")
$md.Add("")
$md.Add("## Resolution")
$md.Add("- where python:")
foreach ($p in @($wherePython)) { $md.Add("  - $p") }
$md.Add("- python --version: $pythonVersion")
$md.Add("- where java:")
foreach ($j in @($whereJava)) { $md.Add("  - $j") }
$md.Add("- java -version (first line): $javaVersion")
$md.Add("")
$md.Add("## Guardrails")
$md.Add("- WindowsApps in Machine PATH: $($result.machinePath.containsWindowsApps)")
$md.Add("- Notes:")
foreach ($n in @($result.notes)) { $md.Add("  - $n") }

$md | Set-Content -LiteralPath $mdPath -Encoding UTF8

[pscustomobject]@{
  ok = $true
  applied = [bool]$Apply.IsPresent
  jsonReport = $jsonPath
  markdownReport = $mdPath
  rollbackFile = $rollbackPath
  wherePythonFirst = if ($wherePython.Count -gt 0) { $wherePython[0] } else { "" }
  whereJavaFirst = if ($whereJava.Count -gt 0) { $whereJava[0] } else { "" }
  windowsAppsPreserved = [bool]$result.machinePath.containsWindowsApps
} | ConvertTo-Json -Depth 6
