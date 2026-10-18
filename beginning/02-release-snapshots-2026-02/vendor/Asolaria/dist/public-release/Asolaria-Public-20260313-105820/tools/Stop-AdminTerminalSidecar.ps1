[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("Helm", "Sentinel")]
  [string]$TerminalId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "AdminTerminalSidecar.Common.ps1")

$resolvedTerminalId = Resolve-AdminTerminalId -TerminalId $TerminalId
$paths = New-AdminTerminalSidecarPaths -TerminalId $resolvedTerminalId
$status = Get-AdminTerminalSidecarStatus -TerminalId $resolvedTerminalId

$stopped = [ordered]@{
  ok = $true
  terminalId = $resolvedTerminalId
  stoppedSidecarPid = $null
  stoppedChildPid = $null
}

if ($null -ne $status) {
  if ($status.childPid -and (Test-PidRunning -ProcessId ([int]$status.childPid))) {
    Stop-Process -Id ([int]$status.childPid) -Force
    $stopped.stoppedChildPid = [int]$status.childPid
  }
  if ($status.sidecarPid -and (Test-PidRunning -ProcessId ([int]$status.sidecarPid))) {
    Stop-Process -Id ([int]$status.sidecarPid) -Force
    $stopped.stoppedSidecarPid = [int]$status.sidecarPid
  }
}

$stopped | ConvertTo-Json -Depth 8
