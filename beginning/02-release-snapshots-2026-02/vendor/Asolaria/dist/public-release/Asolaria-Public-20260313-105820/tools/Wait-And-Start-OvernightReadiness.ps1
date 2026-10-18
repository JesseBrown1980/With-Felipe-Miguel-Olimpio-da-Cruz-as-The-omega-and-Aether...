[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$StartupJobId,
  [datetime]$EndAt,
  [int]$PollSeconds = 45,
  [int]$MaxWaitMinutes = 90,
  [int]$ReadinessPollSeconds = 30,
  [int]$ReadinessJobTimeoutMinutes = 25,
  [int]$ReadinessMaxCycles = 16
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

function Invoke-AsolariaApi {
  param(
    [string]$Path
  )
  return Invoke-RestMethod -Uri ("http://127.0.0.1:4781" + $Path) -Method Get -TimeoutSec 30
}

function Read-Pid([string]$Path) {
  try {
    $raw = (Get-Content -LiteralPath $Path -Raw -ErrorAction Stop).Trim()
    if (-not $raw) {
      return $null
    }
    return [int]$raw
  } catch {
    return $null
  }
}

function Is-Running([Nullable[int]]$ProcId) {
  if (-not $ProcId) {
    return $false
  }
  try {
    Get-Process -Id $ProcId -ErrorAction Stop | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Start-ReadinessLoop {
  param(
    [string]$ScriptPath,
    [datetime]$Deadline,
    [int]$LoopPollSeconds,
    [int]$LoopTimeoutMinutes,
    [int]$LoopMaxCycles,
    [string]$LogsDir
  )

  $pidPath = Join-Path $LogsDir "overnight-readiness-loop.pid"
  $outLog = Join-Path $LogsDir "overnight-readiness-loop.out.log"
  $errLog = Join-Path $LogsDir "overnight-readiness-loop.err.log"
  $existingPid = Read-Pid -Path $pidPath
  if ($existingPid -and (Is-Running $existingPid)) {
    Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }

  $ps = (Get-Command powershell.exe -ErrorAction Stop).Source
  $proc = Start-Process -FilePath $ps `
    -ArgumentList @(
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", $ScriptPath,
      "-EndAt", $Deadline.ToString("s"),
      "-PollSeconds", [string]$LoopPollSeconds,
      "-JobTimeoutMinutes", [string]$LoopTimeoutMinutes,
      "-ThreadId", "overnight-readiness-20260310",
      "-MaxCycles", [string]$LoopMaxCycles
    ) `
    -WorkingDirectory (Split-Path -Parent $ScriptPath) `
    -NoNewWindow `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -PassThru

  Set-Content -LiteralPath $pidPath -Value $proc.Id -Encoding ASCII
  return [pscustomobject]@{
    pid = $proc.Id
    pidPath = $pidPath
    outLog = $outLog
    errLog = $errLog
  }
}

if (-not $PSBoundParameters.ContainsKey("EndAt")) {
  $EndAt = (Get-Date).Date.AddDays(1).AddHours(8)
}

$root = Get-AsolariaRoot
$logsDir = Join-Path $root "logs"
Ensure-Dir -Path $logsDir

$logPath = Join-Path $logsDir "wait-and-start-overnight-readiness.log"
$deadline = (Get-Date).AddMinutes([Math]::Max(5, $MaxWaitMinutes))
Write-Log -Path $logPath -Message ("wait_start startupJobId={0} endAt={1}" -f $StartupJobId, $EndAt.ToString("o"))

$lastStatus = ""
while ((Get-Date) -lt $deadline) {
  try {
    $jobResp = Invoke-AsolariaApi -Path ("/api/jobs/" + $StartupJobId)
    $lastStatus = [string]$jobResp.job.status
    Write-Log -Path $logPath -Message ("startup_job status={0}" -f $lastStatus)
    if ($lastStatus -in @("completed", "failed")) {
      break
    }
  } catch {
    Write-Log -Path $logPath -Message ("startup_job check_failed error=" + $_.Exception.Message)
  }

  Start-Sleep -Seconds ([Math]::Max(15, $PollSeconds))
}

$readinessScript = Join-Path $PSScriptRoot "Run-Asolaria-OvernightReadiness.ps1"
$started = Start-ReadinessLoop -ScriptPath $readinessScript -Deadline $EndAt -LoopPollSeconds $ReadinessPollSeconds -LoopTimeoutMinutes $ReadinessJobTimeoutMinutes -LoopMaxCycles $ReadinessMaxCycles -LogsDir $logsDir
Write-Log -Path $logPath -Message ("readiness_started pid={0}" -f $started.pid)

[pscustomobject]@{
  ok = $true
  startupJobId = $StartupJobId
  lastStatus = $lastStatus
  readinessPid = $started.pid
  readinessOutLog = $started.outLog
  readinessErrLog = $started.errLog
  logPath = $logPath
} | ConvertTo-Json -Depth 6
