param(
  [int]$Port = 4781
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Resolve-NodePath {
  try {
    $cmd = Get-Command node -ErrorAction Stop
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  } catch {}
  foreach ($candidate in @("C:\nvm4w\nodejs\node.exe", "C:\Program Files\nodejs\node.exe")) {
    if (Test-Path $candidate) { return $candidate }
  }
  throw "Node executable not found."
}

$root = Get-AsolariaRoot
$nodePath = Resolve-NodePath
$logDir = Join-Path $root "logs"
New-Item -Path $logDir -ItemType Directory -Force | Out-Null

$helperPath = Join-Path $env:TEMP ("asolaria-main-restart-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".ps1")
$helperContent = @"
param(
  [string]`$Root,
  [string]`$NodePath,
  [int]`$Port
)
Set-StrictMode -Version Latest
`$ErrorActionPreference = "Continue"
Start-Sleep -Milliseconds 1200
try {
  `$listenRows = netstat -ano | Select-String (":" + `$Port + "\s")
  foreach (`$row in `$listenRows) {
    `$parts = (`$row.Line -split "\s+") | Where-Object { `$_ }
    if (`$parts.Count -lt 5) { continue }
    if (`$parts[3] -ne "LISTENING") { continue }
    `$targetPid = 0
    [void][int]::TryParse(`$parts[4], [ref]`$targetPid)
    if (`$targetPid -gt 0) {
      try { Stop-Process -Id `$targetPid -Force -ErrorAction Stop } catch {}
    }
  }
} catch {}
Start-Sleep -Milliseconds 500
try {
  `$stdoutLog = Join-Path `$Root "logs\server.out.log"
  `$stderrLog = Join-Path `$Root "logs\server.err.log"
  Start-Process -FilePath `$NodePath `
    -ArgumentList "`"`$Root\server.js`"" `
    -WorkingDirectory `$Root `
    -WindowStyle Hidden `
    -RedirectStandardOutput `$stdoutLog `
    -RedirectStandardError `$stderrLog | Out-Null
} catch {}
"@

Set-Content -Path $helperPath -Value $helperContent -Encoding UTF8

Start-Process -FilePath "powershell.exe" `
  -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$helperPath`"",
    "-Root", "`"$root`"",
    "-NodePath", "`"$nodePath`"",
    "-Port", "$Port"
  ) `
  -WindowStyle Hidden | Out-Null

Write-Output "Asolaria main restart scheduled on port $Port."
