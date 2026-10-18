[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("Helm", "Sentinel")]
  [string]$TerminalId,
  [int]$Tail = 20
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "AdminTerminalSidecar.Common.ps1")

$resolvedTerminalId = Resolve-AdminTerminalId -TerminalId $TerminalId
$paths = New-AdminTerminalSidecarPaths -TerminalId $resolvedTerminalId
$status = Get-AdminTerminalSidecarStatus -TerminalId $resolvedTerminalId
$tailLines = @()
if (Test-Path $paths.transcriptPath) {
  $tailLines = @(Get-Content -Path $paths.transcriptPath -Tail $Tail)
}

[pscustomobject]@{
  ok = $true
  terminalId = $resolvedTerminalId
  status = $status
  paths = $paths
  transcriptTail = $tailLines
} | ConvertTo-Json -Depth 12
