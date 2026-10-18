[CmdletBinding()]
param(
  [string]$OutDir = "C:\Users\acer\Asolaria\reports",
  [string]$QuarantineRoot = "C:\Users\acer\Asolaria\quarantine",
  [string]$OneDriveRoot = "C:\Users\acer\OneDrive",
  [string]$DownloadsRoot = "C:\Users\acer\Downloads",
  [string]$DesktopRoot = "C:\Users\acer\Desktop",
  [int]$MaxMoves = 60,
  [int]$MinFileSizeKB = 128,
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Get-Signature {
  param(
    [string]$Name,
    [int64]$Length
  )
  return ("{0}|{1}" -f [string]$Name.ToLowerInvariant(), [string]$Length)
}

function Get-FileHashSafe {
  param([string]$Path)
  try {
    return [string](Get-FileHash -LiteralPath $Path -Algorithm SHA256 -ErrorAction Stop).Hash
  } catch {
    return ""
  }
}

function Get-RelativePathSafe {
  param(
    [string]$BasePath,
    [string]$FullPath
  )
  try {
    $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd("\") + "\"
    $full = [System.IO.Path]::GetFullPath($FullPath)
    $uriBase = [Uri]$base
    $uriFull = [Uri]$full
    $rel = $uriBase.MakeRelativeUri($uriFull).ToString()
    return [Uri]::UnescapeDataString($rel).Replace("/", "\")
  } catch {
    return [System.IO.Path]::GetFileName($FullPath)
  }
}

$timestamp = Get-Date
$stamp = $timestamp.ToString("yyyyMMdd-HHmmss")

Ensure-Dir -Path $OutDir
Ensure-Dir -Path $QuarantineRoot

$tag = "media-dedupe-quarantine"
$jsonPath = Join-Path $OutDir "$tag-$stamp.json"
$mdPath = Join-Path $OutDir "$tag-$stamp.md"
$csvPath = Join-Path $OutDir "$tag-$stamp-actions.csv"

$ext = @(
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic", ".heif", ".tif", ".tiff",
  ".mp4", ".mov", ".mkv", ".avi", ".wmv", ".webm", ".m4v", ".3gp",
  ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".opus"
)

$minBytes = [int64]([Math]::Max(0, $MinFileSizeKB) * 1KB)
$actions = [System.Collections.Generic.List[object]]::new()

if (-not (Test-Path -LiteralPath $OneDriveRoot)) {
  throw "OneDrive root not found: $OneDriveRoot"
}

$sourceRoots = @($DownloadsRoot, $DesktopRoot) | Where-Object { Test-Path -LiteralPath $_ }
if ($sourceRoots.Count -lt 1) {
  throw "No source roots found (Downloads/Desktop)."
}

$oneDriveFiles = @(
  Get-ChildItem -LiteralPath $OneDriveRoot -File -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $ext -contains ([string]$_.Extension).ToLowerInvariant() -and [int64]$_.Length -ge $minBytes }
)

$bySig = @{}
foreach ($f in $oneDriveFiles) {
  $sig = Get-Signature -Name ([string]$f.Name) -Length ([int64]$f.Length)
  if (-not $bySig.ContainsKey($sig)) {
    $bySig[$sig] = New-Object System.Collections.Generic.List[string]
  }
  $bySig[$sig].Add([string]$f.FullName)
}

$sourceFiles = @()
foreach ($root in $sourceRoots) {
  $sourceFiles += @(
    Get-ChildItem -LiteralPath $root -File -Recurse -Force -ErrorAction SilentlyContinue |
      Where-Object { $ext -contains ([string]$_.Extension).ToLowerInvariant() -and [int64]$_.Length -ge $minBytes }
  )
}

$hashCache = @{}
$movesDone = 0
$quarantineBatchRoot = Join-Path $QuarantineRoot ("batch-" + $stamp)
Ensure-Dir -Path $quarantineBatchRoot

foreach ($src in $sourceFiles) {
  if ($movesDone -ge $MaxMoves) { break }

  $srcPath = [string]$src.FullName
  if ($srcPath.StartsWith($OneDriveRoot, [System.StringComparison]::OrdinalIgnoreCase)) { continue }

  $sig = Get-Signature -Name ([string]$src.Name) -Length ([int64]$src.Length)
  if (-not $bySig.ContainsKey($sig)) { continue }

  $targets = @($bySig[$sig])
  if ($targets.Count -lt 1) { continue }
  $keepPath = [string]$targets[0]

  if (-not $hashCache.ContainsKey($srcPath)) {
    $hashCache[$srcPath] = Get-FileHashSafe -Path $srcPath
  }
  if (-not $hashCache.ContainsKey($keepPath)) {
    $hashCache[$keepPath] = Get-FileHashSafe -Path $keepPath
  }
  $srcHash = [string]$hashCache[$srcPath]
  $keepHash = [string]$hashCache[$keepPath]

  if ([string]::IsNullOrWhiteSpace($srcHash) -or [string]::IsNullOrWhiteSpace($keepHash) -or $srcHash -ne $keepHash) {
    $actions.Add([pscustomobject]@{
        action = "skip"
        reason = "hash_mismatch_or_unavailable"
        source = $srcPath
        keep = $keepPath
        sizeBytes = [int64]$src.Length
      })
    continue
  }

  $sourceLabel = if ($srcPath.StartsWith($DownloadsRoot, [System.StringComparison]::OrdinalIgnoreCase)) { "Downloads" } elseif ($srcPath.StartsWith($DesktopRoot, [System.StringComparison]::OrdinalIgnoreCase)) { "Desktop" } else { "Other" }
  $sourceBase = if ($sourceLabel -eq "Downloads") { $DownloadsRoot } elseif ($sourceLabel -eq "Desktop") { $DesktopRoot } else { Split-Path -Parent $srcPath }
  $rel = Get-RelativePathSafe -BasePath $sourceBase -FullPath $srcPath
  $dest = Join-Path (Join-Path $quarantineBatchRoot $sourceLabel) $rel
  $destDir = Split-Path -Parent $dest
  Ensure-Dir -Path $destDir

  if ($Apply.IsPresent) {
    Move-Item -LiteralPath $srcPath -Destination $dest -Force
    $movesDone += 1
    $actions.Add([pscustomobject]@{
        action = "moved"
        reason = "duplicate_hash_match_with_onedrive"
        source = $srcPath
        destination = $dest
        keep = $keepPath
        sizeBytes = [int64]$src.Length
      })
  } else {
    $movesDone += 1
    $actions.Add([pscustomobject]@{
        action = "planned"
        reason = "duplicate_hash_match_with_onedrive"
        source = $srcPath
        destination = $dest
        keep = $keepPath
        sizeBytes = [int64]$src.Length
      })
  }
}

$actionsArray = @($actions)
$movedRows = @($actionsArray | Where-Object { $_.action -in @("moved", "planned") })
$skipRows = @($actionsArray | Where-Object { $_.action -eq "skip" })
$bytesStagedMeasure = ($movedRows | Measure-Object -Property sizeBytes -Sum)
$bytesStaged = [int64]0
if ($null -ne $bytesStagedMeasure -and $null -ne $bytesStagedMeasure.Sum) {
  $bytesStaged = [int64]$bytesStagedMeasure.Sum
}

$report = [ordered]@{
  ok = $true
  generatedAt = $timestamp.ToString("o")
  applied = [bool]$Apply.IsPresent
  oneDriveRoot = $OneDriveRoot
  sourceRoots = @($sourceRoots)
  quarantineBatchRoot = $quarantineBatchRoot
  maxMoves = $MaxMoves
  plannedOrMoved = @($movedRows).Count
  skipped = @($skipRows).Count
  stagedBytes = $bytesStaged
  stagedGB = [math]::Round(([double]$bytesStaged / 1GB), 4)
  actions = $actionsArray
}

($report | ConvertTo-Json -Depth 12) | Set-Content -LiteralPath $jsonPath -Encoding UTF8
$actionsArray | Export-Csv -NoTypeInformation -Encoding UTF8 -LiteralPath $csvPath

$md = [System.Collections.Generic.List[string]]::new()
$md.Add("# Media Dedupe Quarantine")
$md.Add("")
$md.Add("- Generated: $($timestamp.ToString('u'))")
$md.Add("- Applied: $([bool]$Apply.IsPresent)")
$md.Add("- Planned/Moved: $(@($movedRows).Count)")
$md.Add("- Skipped: $(@($skipRows).Count)")
$md.Add("- Staged size: $([math]::Round(([double]$bytesStaged / 1GB), 4)) GB")
$md.Add("- Quarantine batch root: $quarantineBatchRoot")
$md.Add("")
$md.Add("## Outputs")
$md.Add("- JSON: $jsonPath")
$md.Add("- CSV: $csvPath")
$md.Add("")
$md.Add("## Top Actions")
foreach ($row in @($movedRows | Select-Object -First 30)) {
  $md.Add("- [$($row.action)] $($row.source) -> $($row.destination)")
}

$md | Set-Content -LiteralPath $mdPath -Encoding UTF8

[pscustomobject]@{
  ok = $true
  applied = [bool]$Apply.IsPresent
  jsonReport = $jsonPath
  markdownReport = $mdPath
  csvReport = $csvPath
  quarantineBatchRoot = $quarantineBatchRoot
  plannedOrMoved = @($movedRows).Count
  stagedGB = [math]::Round(([double]$bytesStaged / 1GB), 4)
} | ConvertTo-Json -Depth 6
