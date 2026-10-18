param(
  [ValidateSet("wrappers", "inventory", "compare")]
  [string]$Mode = "wrappers",
  [string]$CodexSkillsRoot = "",
  [string]$WrapperSkillsRoot = "",
  [string]$ExpectedSkillsPath = "",
  [string]$OtherInventoryPath = "",
  [string]$LocalName = "local",
  [string]$OtherName = "other",
  [string]$OutputPath = "",
  [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Normalize-SkillName {
  param([string]$Name)
  if ([string]::IsNullOrWhiteSpace($Name)) {
    return ""
  }
  return $Name.Trim().ToLowerInvariant()
}

function Normalize-Array {
  param([object[]]$Items)
  $set = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($item in @($Items)) {
    $name = Normalize-SkillName -Name ([string]$item)
    if (-not [string]::IsNullOrWhiteSpace($name)) {
      [void]$set.Add($name)
    }
  }
  return @($set | Sort-Object)
}

function Get-NormalizedCodexSkillNames {
  param([string]$Root)
  if ([string]::IsNullOrWhiteSpace($Root) -or -not (Test-Path -LiteralPath $Root)) {
    return @()
  }
  $names = New-Object System.Collections.Generic.List[string]
  $dirs = Get-ChildItem -LiteralPath $Root -Directory -ErrorAction SilentlyContinue
  foreach ($dir in @($dirs)) {
    if ($dir.Name -eq ".system") {
      $sysDirs = Get-ChildItem -LiteralPath $dir.FullName -Directory -ErrorAction SilentlyContinue
      foreach ($sysDir in @($sysDirs)) {
        $names.Add(("system-" + [string]$sysDir.Name))
      }
      continue
    }
    if ($dir.Name.StartsWith(".")) {
      continue
    }
    $names.Add([string]$dir.Name)
  }
  return @(Normalize-Array -Items $names)
}

function Get-NormalizedWrapperSkillNames {
  param([string]$Root)
  if ([string]::IsNullOrWhiteSpace($Root) -or -not (Test-Path -LiteralPath $Root)) {
    return @()
  }
  $result = New-Object System.Collections.Generic.List[string]
  $dirs = Get-ChildItem -LiteralPath $Root -Directory -ErrorAction SilentlyContinue
  foreach ($dir in @($dirs)) {
    $name = [string]$dir.Name
    if (-not $name.StartsWith("codex-ref-")) {
      continue
    }
    $normalized = $name.Substring("codex-ref-".Length).Trim()
    if (-not [string]::IsNullOrWhiteSpace($normalized)) {
      $result.Add($normalized)
    }
  }
  return @(Normalize-Array -Items $result)
}

function Get-ExpectedSkillNames {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    return @()
  }
  $raw = [string](Get-Content -LiteralPath $Path -Raw -ErrorAction Stop)
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @()
  }

  $names = @()
  try {
    $parsed = $raw | ConvertFrom-Json -ErrorAction Stop
    if ($parsed -is [System.Collections.IEnumerable] -and -not ($parsed -is [string])) {
      foreach ($entry in @($parsed)) {
        $names += [string]$entry
      }
    } else {
      $names += [string]$parsed
    }
  } catch {
    $lines = $raw -split "(`r`n|`n|`r)"
    foreach ($line in @($lines)) {
      $trimmed = [string]$line
      if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
      $trimmed = $trimmed.Trim()
      if ($trimmed.StartsWith("#")) { continue }
      $names += $trimmed
    }
  }
  return @(Normalize-Array -Items $names)
}

function Compare-NameSets {
  param(
    [string[]]$Local,
    [string[]]$Other
  )

  $localSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($item in @($Local)) {
    if (-not [string]::IsNullOrWhiteSpace($item)) {
      [void]$localSet.Add($item)
    }
  }
  $otherSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($item in @($Other)) {
    if (-not [string]::IsNullOrWhiteSpace($item)) {
      [void]$otherSet.Add($item)
    }
  }

  $missingOnLocal = New-Object System.Collections.Generic.List[string]
  foreach ($item in $otherSet) {
    if (-not $localSet.Contains($item)) {
      $missingOnLocal.Add($item)
    }
  }

  $missingOnOther = New-Object System.Collections.Generic.List[string]
  foreach ($item in $localSet) {
    if (-not $otherSet.Contains($item)) {
      $missingOnOther.Add($item)
    }
  }

  $shared = New-Object System.Collections.Generic.List[string]
  foreach ($item in $localSet) {
    if ($otherSet.Contains($item)) {
      $shared.Add($item)
    }
  }

  return [pscustomobject]@{
    missingOnLocal = @($missingOnLocal | Sort-Object)
    missingOnOther = @($missingOnOther | Sort-Object)
    shared = @($shared | Sort-Object)
  }
}

function Read-InventorySkills {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    throw "Inventory file not found: $Path"
  }

  $raw = [string](Get-Content -LiteralPath $Path -Raw -ErrorAction Stop)
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @()
  }

  $parsed = $raw | ConvertFrom-Json -ErrorAction Stop
  if ($parsed -is [System.Collections.IEnumerable] -and -not ($parsed -is [string])) {
    return @(Normalize-Array -Items @($parsed))
  }
  if ($null -ne $parsed.skills) {
    return @(Normalize-Array -Items @($parsed.skills))
  }
  if ($null -ne $parsed.samples -and $null -ne $parsed.samples.codexSkills) {
    return @(Normalize-Array -Items @($parsed.samples.codexSkills))
  }
  throw "Unsupported inventory payload shape. Expected array or object with 'skills'."
}

$repoRoot = Get-AsolariaRoot
if ([string]::IsNullOrWhiteSpace($CodexSkillsRoot)) {
  $CodexSkillsRoot = Join-Path $env:USERPROFILE ".codex\skills"
}
if ([string]::IsNullOrWhiteSpace($WrapperSkillsRoot)) {
  $WrapperSkillsRoot = Join-Path $repoRoot "skills"
}

$codexSkills = @(Get-NormalizedCodexSkillNames -Root $CodexSkillsRoot)
$wrapperSkills = @(Get-NormalizedWrapperSkillNames -Root $WrapperSkillsRoot)
$expectedSkills = @(Get-ExpectedSkillNames -Path $ExpectedSkillsPath)

switch ($Mode) {
  "inventory" {
    $report = [ordered]@{
      ok = $true
      mode = "inventory"
      timestamp = (Get-Date).ToString("o")
      name = $LocalName
      paths = [ordered]@{
        repoRoot = $repoRoot
        codexSkillsRoot = $CodexSkillsRoot
      }
      count = $codexSkills.Count
      skills = @($codexSkills)
    }
  }
  "compare" {
    if ([string]::IsNullOrWhiteSpace($OtherInventoryPath)) {
      throw "Mode=compare requires -OtherInventoryPath."
    }
    $otherSkills = @(Read-InventorySkills -Path $OtherInventoryPath)
    $diff = Compare-NameSets -Local $codexSkills -Other $otherSkills

    $report = [ordered]@{
      ok = [bool]($diff.missingOnLocal.Count -eq 0 -and $diff.missingOnOther.Count -eq 0)
      mode = "compare"
      timestamp = (Get-Date).ToString("o")
      names = [ordered]@{
        local = $LocalName
        other = $OtherName
      }
      paths = [ordered]@{
        repoRoot = $repoRoot
        codexSkillsRoot = $CodexSkillsRoot
        otherInventoryPath = $OtherInventoryPath
      }
      counts = [ordered]@{
        local = $codexSkills.Count
        other = $otherSkills.Count
        shared = $diff.shared.Count
      }
      missing = [ordered]@{
        missingOnLocal = @($diff.missingOnLocal)
        missingOnOther = @($diff.missingOnOther)
      }
      shared = @($diff.shared)
      samples = [ordered]@{
        local = @($codexSkills | Select-Object -First 20)
        other = @($otherSkills | Select-Object -First 20)
        shared = @($diff.shared | Select-Object -First 20)
      }
    }
  }
  default {
    $mainDiff = Compare-NameSets -Local $codexSkills -Other $wrapperSkills
    $expectedDiff = if ($expectedSkills.Count -gt 0) {
      Compare-NameSets -Local $expectedSkills -Other $codexSkills
    } else {
      [pscustomobject]@{
        missingOnLocal = @()
        missingOnOther = @()
        shared = @()
      }
    }

    $report = [ordered]@{
      ok = [bool]($mainDiff.missingOnLocal.Count -eq 0 -and $mainDiff.missingOnOther.Count -eq 0)
      mode = "wrappers"
      timestamp = (Get-Date).ToString("o")
      paths = [ordered]@{
        repoRoot = $repoRoot
        codexSkillsRoot = $CodexSkillsRoot
        wrapperSkillsRoot = $WrapperSkillsRoot
        expectedSkillsPath = $ExpectedSkillsPath
      }
      counts = [ordered]@{
        codexSkills = $codexSkills.Count
        wrapperSkills = $wrapperSkills.Count
        expectedSkills = $expectedSkills.Count
      }
      missing = [ordered]@{
        wrappersForCodex = @($mainDiff.missingOnOther) # codex - wrappers (legacy contract)
        codexForWrappers = @($mainDiff.missingOnLocal) # wrappers - codex (legacy contract)
        expectedInCodex = @($expectedDiff.missingOnOther) # expected - codex
        codexNotInExpected = @($expectedDiff.missingOnLocal) # codex - expected
      }
      compare = [ordered]@{
        missingOnLocal = @($mainDiff.missingOnLocal)
        missingOnOther = @($mainDiff.missingOnOther)
        shared = @($mainDiff.shared)
      }
      samples = [ordered]@{
        codexSkills = @($codexSkills | Select-Object -First 20)
        wrapperSkills = @($wrapperSkills | Select-Object -First 20)
        expectedSkills = @($expectedSkills | Select-Object -First 20)
      }
    }
  }
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $reportsDir = Join-Path $repoRoot "reports"
  Ensure-Dir -Path $reportsDir
  switch ($Mode) {
    "inventory" { $OutputPath = Join-Path $reportsDir "skills-inventory-latest.json" }
    "compare" { $OutputPath = Join-Path $reportsDir "skills-parity-compare-latest.json" }
    default { $OutputPath = Join-Path $reportsDir "skills-parity-latest.json" }
  }
}
$outputDir = Split-Path -Parent $OutputPath
if (-not [string]::IsNullOrWhiteSpace($outputDir)) {
  Ensure-Dir -Path $outputDir
}

$jsonText = $report | ConvertTo-Json -Depth 10
Set-Content -LiteralPath $OutputPath -Value $jsonText -Encoding UTF8

if ($Json.IsPresent) {
  $jsonText
} else {
  switch ($Mode) {
    "inventory" {
      Write-Host "Asolaria skills inventory report generated."
      Write-Host ("Output: " + $OutputPath)
      Write-Host ("Local skills: " + [string]$report.count)
    }
    "compare" {
      Write-Host "Asolaria skills compare report generated."
      Write-Host ("Output: " + $OutputPath)
      Write-Host ("Missing on local: " + [string]$report.missing.missingOnLocal.Count)
      Write-Host ("Missing on other: " + [string]$report.missing.missingOnOther.Count)
    }
    default {
      Write-Host "Asolaria skills parity report generated."
      Write-Host ("Output: " + $OutputPath)
      Write-Host ("Codex skills: " + [string]$report.counts.codexSkills)
      Write-Host ("Wrapper skills: " + [string]$report.counts.wrapperSkills)
      Write-Host ("Missing wrappers for codex: " + [string]$report.missing.wrappersForCodex.Count)
      Write-Host ("Missing codex for wrappers: " + [string]$report.missing.codexForWrappers.Count)
    }
  }
}
