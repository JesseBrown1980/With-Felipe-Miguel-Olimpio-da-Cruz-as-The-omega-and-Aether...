param(
  [int]$Port = 4792,
  [string]$PythonPath = "",
  [switch]$Restart
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

function Get-PortOwner {
  param([int]$LocalPort)
  try {
    return Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction Stop |
      Select-Object -First 1 -ExpandProperty OwningProcess
  } catch {
    return 0
  }
}

function Test-PythonTorch {
  param([string]$Candidate)
  if ([string]::IsNullOrWhiteSpace($Candidate)) { return $false }
  if (-not (Test-Path -LiteralPath $Candidate)) { return $false }
  try {
    & $Candidate -c "import torch; import torch.nn as nn; print(getattr(torch, '__version__', 'unknown'))" *> $null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

function Resolve-GnnPython {
  param([string]$Explicit)
  $candidates = @()
  if (-not [string]::IsNullOrWhiteSpace($Explicit)) { $candidates += $Explicit }
  if (-not [string]::IsNullOrWhiteSpace($env:ASOLARIA_GNN_PYTHON)) { $candidates += $env:ASOLARIA_GNN_PYTHON }
  $candidates += "${USER_HOME}\anaconda3\python.exe"
  try { $candidates += (Get-Command python -ErrorAction Stop).Source } catch {}

  foreach ($candidate in $candidates) {
    if (Test-PythonTorch -Candidate $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }
  throw "No usable Python found for GNN sidecar. Need an interpreter where 'import torch.nn' succeeds."
}

function Wait-Port {
  param([int]$LocalPort, [int]$Seconds = 80)
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    $owner = Get-PortOwner -LocalPort $LocalPort
    if ($owner -gt 0) { return $owner }
    Start-Sleep -Milliseconds 750
  }
  return 0
}

$repoRoot = Get-AsolariaRoot
$sidecarDir = Join-Path $repoRoot "services\gnn-sidecar"
$serverScript = Join-Path $sidecarDir "inference_server.py"
$logsDir = Join-Path $repoRoot "logs"
Ensure-Dir -Path $logsDir

if (-not (Test-Path -LiteralPath $serverScript)) {
  throw "GNN sidecar script not found: $serverScript"
}

$owner = Get-PortOwner -LocalPort $Port
if ($owner -gt 0) {
  if (-not $Restart.IsPresent) {
    Write-Host ("GNN sidecar already listening on port {0} (pid={1})." -f $Port, $owner)
    return
  }
  Stop-Process -Id $owner -Force -ErrorAction Stop
  Start-Sleep -Seconds 2
}

$python = Resolve-GnnPython -Explicit $PythonPath
$outLog = Join-Path $logsDir "daemon-gnn-$Port.out.log"
$errLog = Join-Path $logsDir "daemon-gnn-$Port.err.log"

$proc = Start-Process -FilePath $python `
  -ArgumentList @($serverScript) `
  -WorkingDirectory $sidecarDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -PassThru

$owner = Wait-Port -LocalPort $Port -Seconds 90
if ($owner -le 0) {
  throw "GNN sidecar did not begin listening on port $Port. See $errLog"
}

Write-Host ("GNN sidecar listening on port {0} (pid={1}, python={2})." -f $Port, $owner, $python)
