param(
  [Parameter(Mandatory = $true)]
  [string]$ArgsPath,
  [Parameter(Mandatory = $true)]
  [string]$StatePath,
  [Parameter(Mandatory = $true)]
  [string]$StopSignalPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Quote-Argument {
  param([string]$Value)
  if ($null -eq $Value) { return "" }
  if ($Value -match '[\s"]') {
    return '"' + ($Value -replace '"', '\"') + '"'
  }
  return $Value
}

function Update-StateValue {
  param(
    [string]$Path,
    [hashtable]$Patch
  )
  if (-not (Test-Path -LiteralPath $Path)) { return }
  try {
    $obj = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    foreach ($k in $Patch.Keys) {
      $obj | Add-Member -NotePropertyName $k -NotePropertyValue $Patch[$k] -Force
    }
    $obj | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Path -Encoding UTF8
  } catch {}
}

if (-not (Test-Path -LiteralPath $ArgsPath)) {
  throw ("args_file_missing: {0}" -f $ArgsPath)
}

$pack = Get-Content -LiteralPath $ArgsPath -Raw | ConvertFrom-Json
$ffmpegPath = [string]$pack.ffmpegPath
$rawArgs = @($pack.args)
if ([string]::IsNullOrWhiteSpace($ffmpegPath)) {
  throw "ffmpeg_path_missing"
}

$argLine = ($rawArgs | ForEach-Object { Quote-Argument -Value ([string]$_) }) -join " "

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $ffmpegPath
$psi.Arguments = $argLine
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.RedirectStandardInput = $true

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $psi
[void]$proc.Start()

Update-StateValue -Path $StatePath -Patch @{
  workerPid = [int]$PID
  ffmpegPid = [int]$proc.Id
}

try {
  while (-not $proc.HasExited) {
    if (Test-Path -LiteralPath $StopSignalPath) {
      try {
        $proc.StandardInput.WriteLine("q")
        $proc.StandardInput.Flush()
      } catch {}
      break
    }
    Start-Sleep -Milliseconds 400
  }

  if (-not $proc.WaitForExit(20000)) {
    try { $proc.Kill() } catch {}
    $proc.WaitForExit()
  }
} finally {
  if (Test-Path -LiteralPath $StopSignalPath) {
    Remove-Item -LiteralPath $StopSignalPath -Force -ErrorAction SilentlyContinue
  }
  if (Test-Path -LiteralPath $ArgsPath) {
    Remove-Item -LiteralPath $ArgsPath -Force -ErrorAction SilentlyContinue
  }
  Update-StateValue -Path $StatePath -Patch @{
    workerExitedAt = (Get-Date).ToString("o")
    ffmpegExitCode = [int]$proc.ExitCode
  }
}
