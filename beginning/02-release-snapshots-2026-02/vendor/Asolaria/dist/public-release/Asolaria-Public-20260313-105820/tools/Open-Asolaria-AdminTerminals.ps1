Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-TempShellScript {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$WindowTitle,
    [Parameter(Mandatory = $true)]
    [string]$Location,
    [Parameter(Mandatory = $true)]
    [string[]]$BodyLines
  )

  $content = @(
    '$Host.UI.RawUI.WindowTitle = "' + $WindowTitle.Replace('"', '""') + '"',
    "Set-Location '" + $Location.Replace("'", "''") + "'",
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8'
  ) + $BodyLines

  Set-Content -LiteralPath $Path -Value $content -Encoding UTF8
  return $Path
}

function Stop-TempShellProcess {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptPath
  )

  $needle = $ScriptPath.Replace("\", "\\")
  $rows = @()
  try {
    $rows = @(Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
      Where-Object { [string]$_.CommandLine -like "*$needle*" })
  } catch {
    $rows = @()
  }

  foreach ($row in $rows) {
    $pid = 0
    try { $pid = [int]$row.ProcessId } catch { $pid = 0 }
    if ($pid -gt 0) {
      try { Stop-Process -Id $pid -Force -ErrorAction Stop } catch {}
    }
  }
}

function Start-ElevatedTerminal {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Title,
    [Parameter(Mandatory = $true)]
    [string]$StartingDirectory,
    [Parameter(Mandatory = $true)]
    [string]$ScriptPath
  )

  $wtPath = (Get-Command wt.exe -ErrorAction Stop).Source
  $args = @(
    "-w", "new",
    "new-tab",
    "--title", $Title,
    "-d", $StartingDirectory,
    "powershell.exe",
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-File", $ScriptPath
  )
  Start-Process -FilePath $wtPath -Verb RunAs -ArgumentList $args | Out-Null
}

$tempRoot = Join-Path $env:TEMP "asolaria-admin-shells"
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

$asolariaScript = Join-Path $tempRoot "asolaria-admin-shell.ps1"
$bridgeScript = Join-Path $tempRoot "bridge-admin-shell.ps1"

New-TempShellScript `
  -Path $asolariaScript `
  -WindowTitle "Asolaria Admin" `
  -Location "C:\Users\acer\Asolaria" `
  -BodyLines @(
    "Write-Host 'Asolaria admin shell' -ForegroundColor Cyan",
    "Write-Host ''",
    "try { Invoke-RestMethod -Uri 'http://127.0.0.1:4781/api/health/fast' -TimeoutSec 5 | ConvertTo-Json -Depth 6 } catch { Write-Host `$_.Exception.Message -ForegroundColor Yellow }",
    "Write-Host ''",
    "Write-Host 'Quick commands:' -ForegroundColor DarkCyan",
    "Write-Host '  powershell -NoProfile -ExecutionPolicy Bypass -File .\\tools\\Get-Asolaria-ControlPlaneStatus.ps1'",
    "Write-Host '  powershell -NoProfile -ExecutionPolicy Bypass -File .\\tools\\Restart-Asolaria-Main.ps1'"
  ) | Out-Null

New-TempShellScript `
  -Path $bridgeScript `
  -WindowTitle "Bridge Admin" `
  -Location "C:\Users\acer\codex-bridge" `
  -BodyLines @(
    "Write-Host 'codex-bridge admin shell' -ForegroundColor Cyan",
    "Write-Host ''",
    "try { & '.\\bridgectl.ps1' -Command status } catch { Write-Host `$_.Exception.Message -ForegroundColor Yellow }",
    "Write-Host ''",
    "Write-Host 'Quick commands:' -ForegroundColor DarkCyan",
    "Write-Host '  .\\bridgectl.ps1 -Command status'",
    "Write-Host '  .\\bridgectl.ps1 -Command restart'"
  ) | Out-Null

Start-ElevatedTerminal -Title "Asolaria Admin" -StartingDirectory "C:\Users\acer\Asolaria" -ScriptPath $asolariaScript
Start-Sleep -Milliseconds 700
Start-ElevatedTerminal -Title "Bridge Admin" -StartingDirectory "C:\Users\acer\codex-bridge" -ScriptPath $bridgeScript

Start-Sleep -Seconds 4
Stop-TempShellProcess -ScriptPath $asolariaScript
Stop-TempShellProcess -ScriptPath $bridgeScript
