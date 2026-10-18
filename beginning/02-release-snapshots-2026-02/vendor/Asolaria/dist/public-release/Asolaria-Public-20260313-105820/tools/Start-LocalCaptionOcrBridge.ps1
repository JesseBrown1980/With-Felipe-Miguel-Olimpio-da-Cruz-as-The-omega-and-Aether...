param(
  [string]$SessionId = "",
  [string]$Source = "google_meet_caption",
  [string]$ApiBase = "http://127.0.0.1:4781",
  [int]$IntervalMs = 900,
  [ValidateSet("auto", "tesseract", "easyocr")]
  [string]$Engine = "auto",
  [string]$Language = "en",
  [double]$MinConfidence = 0.15,
  [string]$Bbox = "",
  [int]$ScreenIndex = -1,
  [switch]$AllScreens,
  [string]$AiHealthcareRoot = "C:\Users\acer\ai_healthcare_project"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Directory {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Read-State {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try {
    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Test-PythonBridgeRuntime {
  param([string]$PythonExe)
  if ([string]::IsNullOrWhiteSpace($PythonExe)) { return $false }
  try {
    & $PythonExe -c "import PIL; from PIL import ImageGrab; import requests; print('ok')" 1>$null 2>$null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

$runtimeDir = "C:\Users\acer\Asolaria\runtime"
Ensure-Directory -Path $runtimeDir

$statePath = Join-Path $runtimeDir "caption-ocr-bridge.json"
$existing = Read-State -Path $statePath
if ($existing -and $existing.pid) {
  $running = Get-Process -Id ([int]$existing.pid) -ErrorAction SilentlyContinue
  if ($running) {
    throw ("caption_ocr_bridge_already_running pid={0}" -f [int]$existing.pid)
  }
}

$scriptPath = Join-Path $PSScriptRoot "caption_ocr_bridge.py"
if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw ("bridge_script_missing: {0}" -f $scriptPath)
}

$pythonCandidates = @(
  (Join-Path $AiHealthcareRoot ".venv\Scripts\python.exe"),
  (Join-Path $AiHealthcareRoot ".venv_new\Scripts\python.exe"),
  "python"
)
$pythonPath = $null
foreach ($candidate in $pythonCandidates) {
  if ($candidate -eq "python") {
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) {
      $resolved = [string]$cmd.Source
      if (Test-PythonBridgeRuntime -PythonExe $resolved) {
        $pythonPath = $resolved
        break
      }
    }
  } elseif (Test-Path -LiteralPath $candidate) {
    if (Test-PythonBridgeRuntime -PythonExe $candidate) {
      $pythonPath = $candidate
      break
    }
  }
}
if (-not $pythonPath) {
  throw "python_not_found_for_caption_ocr_bridge"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stdoutLogPath = Join-Path $runtimeDir ("caption-ocr-bridge-{0}.out.log" -f $stamp)
$stderrLogPath = Join-Path $runtimeDir ("caption-ocr-bridge-{0}.err.log" -f $stamp)

$argsList = @(
  "`"$scriptPath`"",
  "--api-base", "`"$ApiBase`"",
  "--source", "`"$Source`"",
  "--ai-healthcare-root", "`"$AiHealthcareRoot`"",
  "--interval-ms", [string][Math]::Max(200, $IntervalMs),
  "--engine", "`"$Engine`"",
  "--language", "`"$Language`"",
  "--min-confidence", ([string]::Format([System.Globalization.CultureInfo]::InvariantCulture, "{0:0.###}", $MinConfidence))
)
if (-not [string]::IsNullOrWhiteSpace($SessionId)) {
  $argsList += @("--session-id", "`"$SessionId`"")
}
if (-not [string]::IsNullOrWhiteSpace($Bbox)) {
  $argsList += @("--bbox", "`"$Bbox`"")
}
if ($ScreenIndex -ge 0) {
  $argsList += @("--screen-index", [string]$ScreenIndex)
}
if ($AllScreens.IsPresent) {
  $argsList += "--all-screens"
}

if (-not [string]::IsNullOrWhiteSpace($SessionId)) {
  $body = @{
    sessionId = $SessionId
    source = $Source
  } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Post -Uri ($ApiBase.TrimEnd("/") + "/api/voice/bridge-caption/reset") -ContentType "application/json" -Body $body | Out-Null
  } catch {
    Write-Warning ("caption_bridge_reset_failed: {0}" -f $_.Exception.Message)
  }
}

$proc = Start-Process `
  -FilePath $pythonPath `
  -ArgumentList $argsList `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLogPath `
  -RedirectStandardError $stderrLogPath `
  -PassThru

$state = [ordered]@{
  startedAt = (Get-Date).ToString("o")
  pid = [int]$proc.Id
  pythonPath = $pythonPath
  scriptPath = $scriptPath
  stdoutLogPath = $stdoutLogPath
  stderrLogPath = $stderrLogPath
  apiBase = $ApiBase
  source = $Source
  sessionId = $SessionId
  intervalMs = [int][Math]::Max(200, $IntervalMs)
  engine = $Engine
  language = $Language
  minConfidence = $MinConfidence
  bbox = $Bbox
  screenIndex = [int]$ScreenIndex
  allScreens = [bool]$AllScreens.IsPresent
  aiHealthcareRoot = $AiHealthcareRoot
}
$state | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $statePath -Encoding UTF8

Start-Sleep -Milliseconds 600
$running = Get-Process -Id ([int]$proc.Id) -ErrorAction SilentlyContinue
if (-not $running) {
  $tail = ""
  if (Test-Path -LiteralPath $stderrLogPath) {
    $tail = (Get-Content -LiteralPath $stderrLogPath -Tail 60 -ErrorAction SilentlyContinue) -join "`n"
  } elseif (Test-Path -LiteralPath $stdoutLogPath) {
    $tail = (Get-Content -LiteralPath $stdoutLogPath -Tail 60 -ErrorAction SilentlyContinue) -join "`n"
  }
  throw ("caption_ocr_bridge_failed_to_start`n{0}" -f $tail)
}

[pscustomobject]$state | ConvertTo-Json -Depth 8
