param(
  [int]$Port = 4781,
  [switch]$SkipDirectChat,
  [switch]$SkipAdminMonitor
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$root = Get-AsolariaRoot
$powershellPath = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"
if (-not (Test-Path -LiteralPath $powershellPath)) {
  $powershellPath = "powershell.exe"
}

$handoffScript = Join-Path $root "tools\Write-QDD-ExternalAdmin-Handoff.ps1"
$talkScript = Join-Path $root "tools\Talk-To-Asolaria.ps1"
$adminScript = Join-Path $root "tools\Open-Asolaria-SuperAdminTerminal.ps1"

& $powershellPath -NoProfile -ExecutionPolicy Bypass -File $handoffScript -BaseUrl ("http://127.0.0.1:{0}" -f $Port) -CopyToClipboard

if (-not $SkipDirectChat.IsPresent) {
  Start-Process -FilePath $powershellPath -ArgumentList @(
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $talkScript,
    "-ChatId", "main",
    "-Port", [string]$Port,
    "-RouteMode", "direct"
  ) | Out-Null
}

if (-not $SkipAdminMonitor.IsPresent) {
  Start-Process -FilePath $powershellPath -ArgumentList @(
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $adminScript,
    "-Target", "admin",
    "-Port", [string]$Port
  ) | Out-Null
}

Write-Host "QDD owner console prepared."
Write-Host "Bootstrap handoff copied to clipboard for the external helper terminal."
if (-not $SkipDirectChat.IsPresent) {
  Write-Host "Opened direct Asolaria chat terminal."
}
if (-not $SkipAdminMonitor.IsPresent) {
  Write-Host "Opened super-admin monitor terminal."
}
