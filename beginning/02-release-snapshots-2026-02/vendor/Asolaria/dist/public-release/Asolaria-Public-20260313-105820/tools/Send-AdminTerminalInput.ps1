[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("Helm", "Sentinel")]
  [string]$TerminalId,
  [Parameter(Mandatory = $true)]
  [string]$Text,
  [string]$Source = "Helm",
  [string]$Reason = "manual_prompt"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "AdminTerminalSidecar.Common.ps1")

$resolvedTerminalId = Resolve-AdminTerminalId -TerminalId $TerminalId
$paths = New-AdminTerminalSidecarPaths -TerminalId $resolvedTerminalId
Ensure-AdminTerminalSidecarPaths -Paths $paths

$message = New-AdminTerminalCommandEnvelope -Text $Text -Source $Source -Reason $Reason
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::AppendAllText(
  $paths.inboxPath,
  (ConvertTo-CompactJson -Value $message) + [Environment]::NewLine,
  $utf8NoBom
)

[pscustomobject]@{
  ok = $true
  terminalId = $resolvedTerminalId
  inboxPath = $paths.inboxPath
  queuedMessageId = $message.id
  queuedAt = $message.ts
  source = $Source
  reason = $Reason
} | ConvertTo-Json -Depth 8
