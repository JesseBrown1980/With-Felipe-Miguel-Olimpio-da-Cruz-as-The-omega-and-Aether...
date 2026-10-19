param(
  [string]$Serial = "${BEHCS_DEVICE_SERIAL}",
  [int]$Port = 8789,
  [int]$IntervalMs = 15000,
  [switch]$Cycle,
  [switch]$Execute
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$script = Join-Path $PSScriptRoot "omnicoder-pilot-daemon.mjs"
$logDir = Join-Path $repoRoot "logs"
$pidPath = Join-Path $repoRoot "data\behcs\omnicoder\pilot.pid"
$outLogPath = Join-Path $logDir "omnicoder-pilot.out.log"
$errLogPath = Join-Path $logDir "omnicoder-pilot.err.log"

if (-not (Test-Path -LiteralPath $script)) { throw "Pilot daemon not found: $script" }
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $pidPath -Parent) | Out-Null

if (Test-Path -LiteralPath $pidPath) {
  $oldPid = Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($oldPid) {
    Stop-Process -Id ([int]$oldPid) -Force -ErrorAction SilentlyContinue
  }
}

$args = @(
  $script,
  "--serial", $Serial,
  "--port", ([string]$Port),
  "--interval-ms", ([string]$IntervalMs)
)
if ($Cycle.IsPresent) { $args += "--cycle" }
if ($Execute.IsPresent) { $args += "--execute" }

$proc = Start-Process -FilePath "node" -ArgumentList $args -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput $outLogPath -RedirectStandardError $errLogPath -PassThru
Set-Content -LiteralPath $pidPath -Value ([string]$proc.Id) -Encoding ASCII

[pscustomobject]@{
  ok = $true
  pid = $proc.Id
  script = $script
  stdout_log = $outLogPath
  stderr_log = $errLogPath
  pid_file = $pidPath
  cycle = [bool]$Cycle
  execute = [bool]$Execute
}
