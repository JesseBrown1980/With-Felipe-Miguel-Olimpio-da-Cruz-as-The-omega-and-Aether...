[CmdletBinding()]
param(
  [string]$OutDir = "C:\Users\acer\Asolaria\reports",
  [string]$Tag = "media-sprawl-snapshot",
  [int]$MaxFilesPerRoot = 12000,
  [int]$DuplicateGroupLimit = 300,
  [int]$MinFileSizeKB = 128
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Safe {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Script,
    $Default = $null
  )
  try {
    return & $Script
  } catch {
    return $Default
  }
}

function Get-MediaRoots {
  $roots = @(
    "C:\Users\acer\Pictures",
    "C:\Users\acer\Videos",
    "C:\Users\acer\OneDrive",
    "C:\Users\acer\Downloads",
    "C:\Users\acer\Desktop",
    "C:\Users\acer\Documents",
    "C:\Users\acer\Asolaria\captures",
    "C:\Users\acer\Asolaria\reports",
    "C:\Users\acer\CrossDevice",
    "D:\Pictures",
    "D:\Videos",
    "D:\DCIM",
    "D:\Camera",
    "D:\Users\acer\Pictures",
    "D:\Users\acer\Videos"
  )
  return @($roots | Where-Object { Test-Path -LiteralPath $_ })
}

function Get-BucketName {
  param([string]$Path)
  $normalized = [string]$Path
  if ([string]::IsNullOrWhiteSpace($normalized)) {
    return "unknown"
  }

  if ($normalized -match '^(?i)C:\\Users\\acer\\([^\\]+)') {
    return ("C:\Users\acer\" + [string]$matches[1])
  }
  if ($normalized -match '^(?i)D:\\([^\\]+)') {
    return ("D:\" + [string]$matches[1])
  }
  if ($normalized.Length -ge 2 -and $normalized[1] -eq ':') {
    return ($normalized.Substring(0, 2) + "\")
  }
  return "other"
}

$mediaExtensions = @(
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic", ".heif", ".tif", ".tiff",
  ".mp4", ".mov", ".mkv", ".avi", ".wmv", ".webm", ".m4v", ".3gp",
  ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".opus"
)

$minBytes = [int64]([Math]::Max(0, $MinFileSizeKB) * 1KB)
$roots = Get-MediaRoots

$timestamp = Get-Date
$stamp = $timestamp.ToString("yyyyMMdd-HHmmss")
$null = New-Item -ItemType Directory -Path $OutDir -Force
$jsonPath = Join-Path $OutDir "$Tag-$stamp.json"
$mdPath = Join-Path $OutDir "$Tag-$stamp.md"
$csvTopBuckets = Join-Path $OutDir "$Tag-$stamp-top-buckets.csv"
$csvDuplicates = Join-Path $OutDir "$Tag-$stamp-duplicates.csv"
$csvRoots = Join-Path $OutDir "$Tag-$stamp-root-scan.csv"

$mediaRows = [System.Collections.Generic.List[object]]::new()
$rootStats = [System.Collections.Generic.List[object]]::new()

foreach ($root in $roots) {
  $files = @(
    Invoke-Safe {
      Get-ChildItem -LiteralPath $root -File -Recurse -Force -ErrorAction Stop |
        Where-Object { $mediaExtensions -contains ([string]$_.Extension).ToLowerInvariant() -and [int64]$_.Length -ge $minBytes } |
        Select-Object -First $MaxFilesPerRoot
    } @()
  )

  $fileCount = @($files).Count
  $truncated = ($fileCount -ge $MaxFilesPerRoot)

  foreach ($file in $files) {
    $path = [string]$file.FullName
    $bucket = Get-BucketName -Path $path
    $mediaRows.Add([pscustomobject]@{
        root = [string]$root
        bucket = [string]$bucket
        name = [string]$file.Name
        extension = [string]$file.Extension.ToLowerInvariant()
        length = [int64]$file.Length
        modified = [string]$file.LastWriteTime
        path = $path
      })
  }

  $sizeSum = [int64](@($files | Measure-Object -Property Length -Sum).Sum)
  $rootStats.Add([pscustomobject]@{
      root = [string]$root
      filesScanned = $fileCount
      truncatedAtLimit = $truncated
      totalBytes = $sizeSum
      totalGB = [math]::Round(([double]$sizeSum / 1GB), 3)
    })
}

$bucketGroups = @(
  $mediaRows |
    Group-Object bucket |
    ForEach-Object {
      $sum = [int64](@($_.Group | Measure-Object -Property length -Sum).Sum)
      [pscustomobject]@{
        bucket = [string]$_.Name
        fileCount = [int]$_.Count
        totalBytes = $sum
        totalGB = [math]::Round(([double]$sum / 1GB), 3)
      }
    } |
    Sort-Object totalBytes -Descending
)

$extensionGroups = @(
  $mediaRows |
    Group-Object extension |
    ForEach-Object {
      $sum = [int64](@($_.Group | Measure-Object -Property length -Sum).Sum)
      [pscustomobject]@{
        extension = [string]$_.Name
        fileCount = [int]$_.Count
        totalBytes = $sum
        totalGB = [math]::Round(([double]$sum / 1GB), 3)
      }
    } |
    Sort-Object totalBytes -Descending
)

$duplicateGroups = @(
  $mediaRows |
    Group-Object { ("{0}|{1}" -f [string]$_.name.ToLowerInvariant(), [string]$_.length) } |
    Where-Object { $_.Count -gt 1 } |
    Sort-Object Count -Descending |
    Select-Object -First $DuplicateGroupLimit
)

$duplicateRows = @(
  $duplicateGroups | ForEach-Object {
    $first = $_.Group | Select-Object -First 1
    [pscustomobject]@{
      signature = [string]$_.Name
      name = [string]$first.name
      length = [int64]$first.length
      count = [int]$_.Count
      buckets = [string](@($_.Group.bucket | Select-Object -Unique) -join " | ")
      samplePaths = [string](@($_.Group.path | Select-Object -First 5) -join " || ")
    }
  }
)

$summary = [pscustomobject]@{
  generatedAt = $timestamp.ToString("o")
  rootsScanned = @($roots)
  minFileSizeKB = $MinFileSizeKB
  maxFilesPerRoot = $MaxFilesPerRoot
  totalMediaRows = @($mediaRows).Count
  totalMediaBytes = [int64](@($mediaRows | Measure-Object -Property length -Sum).Sum)
  totalMediaGB = [math]::Round(([double]([int64](@($mediaRows | Measure-Object -Property length -Sum).Sum)) / 1GB), 3)
  rootStats = @($rootStats)
  topBuckets = @($bucketGroups)
  byExtension = @($extensionGroups)
  duplicateGroups = @($duplicateRows)
}

$summary | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
$bucketGroups | Export-Csv -NoTypeInformation -Encoding UTF8 -LiteralPath $csvTopBuckets
$duplicateRows | Export-Csv -NoTypeInformation -Encoding UTF8 -LiteralPath $csvDuplicates
$rootStats | Export-Csv -NoTypeInformation -Encoding UTF8 -LiteralPath $csvRoots

$md = [System.Collections.Generic.List[string]]::new()
$md.Add("# Media Sprawl Snapshot")
$md.Add("")
$md.Add("- Generated: $($timestamp.ToString('u'))")
$md.Add("- Total media rows: $(@($mediaRows).Count)")
$md.Add("- Total media size: $([math]::Round(([double]$summary.totalMediaGB), 3)) GB")
$md.Add("- Roots scanned: $(@($roots).Count)")
$md.Add("- Duplicate groups (name+size): $(@($duplicateRows).Count)")
$md.Add("")
$md.Add("## Top Buckets (by size)")
foreach ($row in @($bucketGroups | Select-Object -First 25)) {
  $md.Add("- $($row.bucket): $($row.totalGB) GB across $($row.fileCount) files")
}
$md.Add("")
$md.Add("## Top Extensions (by size)")
foreach ($row in @($extensionGroups | Select-Object -First 20)) {
  $md.Add("- $($row.extension): $($row.totalGB) GB across $($row.fileCount) files")
}
$md.Add("")
$md.Add("## Outputs")
$md.Add("- JSON: $jsonPath")
$md.Add("- CSV buckets: $csvTopBuckets")
$md.Add("- CSV duplicates: $csvDuplicates")
$md.Add("- CSV root scan: $csvRoots")

$md | Set-Content -LiteralPath $mdPath -Encoding UTF8

[pscustomobject]@{
  ok = $true
  generatedAt = $timestamp.ToString("o")
  jsonReport = $jsonPath
  markdownReport = $mdPath
  bucketCsv = $csvTopBuckets
  duplicateCsv = $csvDuplicates
  rootScanCsv = $csvRoots
  totalMediaRows = @($mediaRows).Count
  totalMediaGB = $summary.totalMediaGB
  duplicateGroups = @($duplicateRows).Count
} | ConvertTo-Json -Depth 6
