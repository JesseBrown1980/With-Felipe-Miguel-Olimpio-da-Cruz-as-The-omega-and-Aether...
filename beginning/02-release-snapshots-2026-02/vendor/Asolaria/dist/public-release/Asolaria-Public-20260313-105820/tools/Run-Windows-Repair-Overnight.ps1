[CmdletBinding()]
param(
  [string]$OutDir = "",
  [string]$DriveLetter = "C"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Write-Log {
  param(
    [string]$Path,
    [string]$Message
  )
  $line = "[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $Path -Value $line -Encoding UTF8
}

function Invoke-Step {
  param(
    [string]$Name,
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$LogPath
  )

  Write-Log -Path $LogPath -Message ("step_start name={0} file={1}" -f $Name, $FilePath)
  $stdout = New-TemporaryFile
  $stderr = New-TemporaryFile
  try {
    $proc = Start-Process -FilePath $FilePath `
      -ArgumentList $ArgumentList `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $stdout.FullName `
      -RedirectStandardError $stderr.FullName

    $outText = ""
    $errText = ""
    if (Test-Path -LiteralPath $stdout.FullName) {
      $outText = (Get-Content -LiteralPath $stdout.FullName -Raw -ErrorAction SilentlyContinue)
    }
    if (Test-Path -LiteralPath $stderr.FullName) {
      $errText = (Get-Content -LiteralPath $stderr.FullName -Raw -ErrorAction SilentlyContinue)
    }

    Write-Log -Path $LogPath -Message ("step_stop name={0} exit={1}" -f $Name, $proc.ExitCode)
    return [pscustomobject]@{
      name = $Name
      filePath = $FilePath
      arguments = @($ArgumentList)
      exitCode = [int]$proc.ExitCode
      stdout = [string]$outText
      stderr = [string]$errText
    }
  } finally {
    Remove-Item -LiteralPath $stdout.FullName -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $stderr.FullName -Force -ErrorAction SilentlyContinue
  }
}

$root = Get-AsolariaRoot
$reportsDir = if ($OutDir) { $OutDir } else { Join-Path $root "reports" }
$logsDir = Join-Path $root "logs"
Ensure-Dir -Path $reportsDir
Ensure-Dir -Path $logsDir

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $logsDir ("windows-repair-overnight-" + $stamp + ".log")
$jsonPath = Join-Path $reportsDir ("windows-repair-overnight-" + $stamp + ".json")
$mdPath = Join-Path $reportsDir ("windows-repair-overnight-" + $stamp + ".md")
$assocPath = Join-Path $reportsDir ("default-app-associations-" + $stamp + ".xml")

Write-Log -Path $logPath -Message ("repair_start drive={0}" -f $DriveLetter)

$steps = [System.Collections.Generic.List[object]]::new()

$dismExe = Join-Path $env:SystemRoot "System32\dism.exe"
$sfcExe = Join-Path $env:SystemRoot "System32\sfc.exe"
$cmdExe = Join-Path $env:SystemRoot "System32\cmd.exe"

$steps.Add((Invoke-Step -Name "export_default_app_associations" -FilePath $dismExe -ArgumentList @(
  "/Online",
  "/Export-DefaultAppAssociations:${assocPath}"
) -LogPath $logPath))

$steps.Add((Invoke-Step -Name "dism_scanhealth" -FilePath $dismExe -ArgumentList @(
  "/Online",
  "/Cleanup-Image",
  "/ScanHealth"
) -LogPath $logPath))

$steps.Add((Invoke-Step -Name "dism_restorehealth" -FilePath $dismExe -ArgumentList @(
  "/Online",
  "/Cleanup-Image",
  "/RestoreHealth"
) -LogPath $logPath))

$steps.Add((Invoke-Step -Name "sfc_scannow" -FilePath $sfcExe -ArgumentList @(
  "/scannow"
) -LogPath $logPath))

$steps.Add((Invoke-Step -Name "chkdsk_scan" -FilePath $cmdExe -ArgumentList @(
  "/d",
  "/s",
  "/c",
  ("chkdsk {0}: /scan" -f $DriveLetter)
) -LogPath $logPath))

$summary = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  driveLetter = $DriveLetter
  logPath = $logPath
  defaultAssociationsPath = $assocPath
  steps = @($steps | ForEach-Object {
      [ordered]@{
        name = $_.name
        exitCode = $_.exitCode
        stdoutTail = (($_.stdout -split "`r?`n") | Select-Object -Last 20)
        stderrTail = (($_.stderr -split "`r?`n") | Select-Object -Last 20)
      }
    })
}

$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$md = New-Object System.Collections.Generic.List[string]
$md.Add("# Windows Repair Overnight")
$md.Add("")
$md.Add("- Generated: " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz"))
$md.Add("- Log: " + $logPath)
$md.Add("- Default app associations export: " + $assocPath)
$md.Add("")
$md.Add("## Steps")
foreach ($step in $summary.steps) {
  $md.Add("- " + [string]$step.name + ": exit=" + [string]$step.exitCode)
}
$md.Add("")
$md.Add("## Tail")
foreach ($step in $summary.steps) {
  $md.Add("### " + [string]$step.name)
  $md.Add("")
  $md.Add('```text')
  foreach ($line in @($step.stdoutTail)) {
    if ($line -ne $null) {
      $md.Add([string]$line)
    }
  }
  foreach ($line in @($step.stderrTail)) {
    if (-not [string]::IsNullOrWhiteSpace([string]$line)) {
      $md.Add("[stderr] " + [string]$line)
    }
  }
  $md.Add('```')
  $md.Add("")
}
$md | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Log -Path $logPath -Message "repair_stop"

[pscustomobject]@{
  ok = $true
  generatedAt = (Get-Date).ToString("o")
  jsonPath = $jsonPath
  markdownPath = $mdPath
  logPath = $logPath
  defaultAssociationsPath = $assocPath
} | ConvertTo-Json -Depth 6
