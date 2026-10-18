param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Path
)

$ErrorActionPreference = "Stop"

function Get-WorkspaceRoot {
  $root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
  return $root.Path
}

function Is-WithinPath([string]$child, [string]$parent) {
  $childFull = [IO.Path]::GetFullPath($child)
  $parentFull = [IO.Path]::GetFullPath($parent)
  if (-not $parentFull.EndsWith([IO.Path]::DirectorySeparatorChar)) {
    $parentFull = $parentFull + [IO.Path]::DirectorySeparatorChar
  }
  return $childFull.ToLowerInvariant().StartsWith($parentFull.ToLowerInvariant())
}

function Read-HeaderBytes([string]$filePath, [int]$count) {
  $fs = [IO.File]::Open($filePath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $buffer = New-Object byte[] $count
    $read = $fs.Read($buffer, 0, $buffer.Length)
    return ,@($buffer, $read)
  } finally {
    $fs.Dispose()
  }
}

$resolved = Resolve-Path -LiteralPath $Path
$fullPath = $resolved.Path
$item = Get-Item -LiteralPath $fullPath -Force
if ($item.PSIsContainer) {
  throw "Path is a directory, expected a file: $fullPath"
}

$workspaceRoot = Get-WorkspaceRoot
if (-not (Is-WithinPath $fullPath $workspaceRoot)) {
  Write-Host "WARNING: File is outside workspace root ($workspaceRoot). Consider copying it into inbox/ first."
}

$hash = Get-FileHash -LiteralPath $fullPath -Algorithm SHA256
$ext = [IO.Path]::GetExtension($fullPath).ToLowerInvariant()

$header = Read-HeaderBytes $fullPath 4096
$buf = $header[0]
$read = [int]$header[1]

$hasNull = $false
for ($i = 0; $i -lt $read; $i++) {
  if ($buf[$i] -eq 0) { $hasNull = $true; break }
}

$sigAscii = ""
if ($read -gt 0) {
  $sigLen = [Math]::Min(8, $read)
  $sigAscii = [Text.Encoding]::ASCII.GetString($buf, 0, $sigLen)
}

$isPdf = ($read -ge 5) -and ([Text.Encoding]::ASCII.GetString($buf, 0, 5) -eq "%PDF-")
$isZip = ($read -ge 2) -and ($buf[0] -eq 0x50) -and ($buf[1] -eq 0x4B)
$looksBinary = $hasNull -or $isPdf -or $isZip

$hex = ""
if ($read -gt 0) {
  $hexCount = [Math]::Min(16, $read)
  $hex = ($buf[0..($hexCount - 1)] | ForEach-Object { $_.ToString("X2") }) -join " "
}

Write-Host "Path:   $fullPath"
Write-Host "Size:   $($item.Length) bytes"
Write-Host "SHA256: $($hash.Hash.ToLowerInvariant())"
Write-Host "Ext:    $ext"
Write-Host "Head:   $hex"
if ($sigAscii) {
  Write-Host "ASCII:  $sigAscii"
}
Write-Host "Binary: $looksBinary"

if ($looksBinary) {
  if ($isPdf) {
    Write-Host "Note: PDF detected. Prefer text extraction over opening in a PDF viewer."
  } elseif ($isZip) {
    Write-Host "Note: ZIP detected. Do not extract unknown archives without review."
  } else {
    Write-Host "Note: Likely binary (null bytes detected). Skipping preview."
  }
  exit 0
}

$previewLines = 120
Write-Host ""
Write-Host "Preview (first $previewLines lines):"
try {
  Get-Content -LiteralPath $fullPath -TotalCount $previewLines
} catch {
  Write-Host "(preview failed: $($_.Exception.Message))"
}

