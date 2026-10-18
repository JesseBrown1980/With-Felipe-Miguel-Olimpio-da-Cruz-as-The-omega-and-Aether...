[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("Helm", "Sentinel")]
  [string]$TerminalId,
  [string]$CommandPath,
  [string[]]$CommandArgs,
  [string]$WorkDir,
  [string]$InitialPromptPath,
  [switch]$Replace
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "AdminTerminalSidecar.Common.ps1")

$resolvedTerminalId = Resolve-AdminTerminalId -TerminalId $TerminalId
$config = Get-AdminTerminalSidecarConfig -TerminalId $resolvedTerminalId
$paths = New-AdminTerminalSidecarPaths -TerminalId $resolvedTerminalId
Ensure-AdminTerminalSidecarPaths -Paths $paths

$existingStatus = Get-AdminTerminalSidecarStatus -TerminalId $resolvedTerminalId
if ($null -ne $existingStatus -and $existingStatus.sidecarPid -and (Test-PidRunning -ProcessId ([int]$existingStatus.sidecarPid))) {
  if (-not $Replace) {
    [pscustomobject]@{
      ok = $true
      alreadyRunning = $true
      terminalId = $resolvedTerminalId
      sidecarPid = [int]$existingStatus.sidecarPid
      childPid = [int]$existingStatus.childPid
      statusPath = $paths.statusPath
      transcriptPath = $paths.transcriptPath
    } | ConvertTo-Json -Depth 8
    exit 0
  }

  & (Join-Path $PSScriptRoot "Stop-AdminTerminalSidecar.ps1") -TerminalId $resolvedTerminalId | Out-Null
  Start-Sleep -Milliseconds 800
}

$runToolPath = [string]$config.runToolPath
$pythonHelperPath = Join-Path $PSScriptRoot "Run-AdminTerminalSidecar.py"
$pythonPath = ""
try {
  $pythonPath = [string](Get-Command python.exe -ErrorAction Stop).Source
} catch {
  $pythonPath = ""
}

$processFilePath = "powershell.exe"
$argumentList = @()
if (-not [string]::IsNullOrWhiteSpace($pythonPath) -and (Test-Path -LiteralPath $pythonHelperPath)) {
  $processFilePath = $pythonPath
  $argumentList = @(
    "-u",
    $pythonHelperPath,
    "--terminal-id", $resolvedTerminalId
  )
} else {
  $argumentList = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $runToolPath,
    "-TerminalId", $resolvedTerminalId
  )
}

if ($PSBoundParameters.ContainsKey("CommandPath") -and -not [string]::IsNullOrWhiteSpace($CommandPath)) {
  if ($processFilePath -eq $pythonPath) {
    $argumentList += @("--command-path", $CommandPath)
  } else {
    $argumentList += @("-CommandPath", $CommandPath)
  }
}
if ($PSBoundParameters.ContainsKey("CommandArgs") -and $null -ne $CommandArgs) {
  if ($processFilePath -eq $pythonPath) {
    foreach ($value in @($CommandArgs)) {
      $argumentList += @("--command-arg", [string]$value)
    }
  } else {
    $argumentList += @("-CommandArgs") + $CommandArgs
  }
}
if ($PSBoundParameters.ContainsKey("WorkDir") -and -not [string]::IsNullOrWhiteSpace($WorkDir)) {
  if ($processFilePath -eq $pythonPath) {
    $argumentList += @("--workdir", $WorkDir)
  } else {
    $argumentList += @("-WorkDir", $WorkDir)
  }
}
if ($PSBoundParameters.ContainsKey("InitialPromptPath") -and -not [string]::IsNullOrWhiteSpace($InitialPromptPath)) {
  if ($processFilePath -eq $pythonPath) {
    $argumentList += @("--initial-prompt-file", $InitialPromptPath)
  }
}

$process = Start-Process -FilePath $processFilePath -ArgumentList $argumentList -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 1

$status = Get-AdminTerminalSidecarStatus -TerminalId $resolvedTerminalId
[pscustomobject]@{
  ok = $true
  terminalId = $resolvedTerminalId
  launcherPid = $process.Id
  sidecarPid = if ($null -ne $status) { $status.sidecarPid } else { $null }
  childPid = if ($null -ne $status) { $status.childPid } else { $null }
  statusPath = $paths.statusPath
  transcriptPath = $paths.transcriptPath
  inboxPath = $paths.inboxPath
} | ConvertTo-Json -Depth 8
