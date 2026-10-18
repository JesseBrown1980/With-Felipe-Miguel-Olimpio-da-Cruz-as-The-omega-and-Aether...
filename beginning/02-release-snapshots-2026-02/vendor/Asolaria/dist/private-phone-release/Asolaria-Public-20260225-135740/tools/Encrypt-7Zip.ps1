param(
  [string]$SourcePath = "C:\Users\acer\Asolaria",
  [string]$OutputArchive = "C:\Users\acer\Asolaria\archive.7z"
)

$ErrorActionPreference = "Stop"

$sevenZip = "C:\Program Files\7-Zip\7z.exe"
if (-not (Test-Path $sevenZip)) {
  throw "7-Zip was not found at $sevenZip"
}

if (-not (Test-Path $SourcePath)) {
  throw "Source path does not exist: $SourcePath"
}

$outputDir = Split-Path -Path $OutputArchive -Parent
if ($outputDir -and -not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

Write-Host "7-Zip will prompt for your password locally."
Write-Host "Source : $SourcePath"
Write-Host "Output : $OutputArchive"

& $sevenZip a -t7z -mhe=on -p $OutputArchive $SourcePath

if ($LASTEXITCODE -ne 0) {
  throw "7-Zip returned exit code $LASTEXITCODE"
}

Write-Output $OutputArchive
