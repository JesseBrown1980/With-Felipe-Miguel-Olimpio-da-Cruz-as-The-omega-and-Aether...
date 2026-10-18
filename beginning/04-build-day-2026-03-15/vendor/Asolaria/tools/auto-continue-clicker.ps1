<#
.SYNOPSIS
  Auto-continue clicker for Claude Code terminals.
  Presses Enter every N seconds, types "continue" + Enter every 15 minutes.
.PARAMETER IntervalSeconds
  Seconds between Enter presses (default 10)
.PARAMETER ContinueMinutes
  Minutes between "continue" commands (default 15)
.PARAMETER TargetTitle
  Window title substring to target (default: matches any terminal)
#>
param(
    [int]$IntervalSeconds = 10,
    [int]$ContinueMinutes = 15,
    [switch]$Stop
)

Add-Type -AssemblyName System.Windows.Forms

$continueIntervalTicks = $ContinueMinutes * 60
$tickCount = 0
$running = $true

Write-Host "=== Auto-Continue Clicker ===" -ForegroundColor Cyan
Write-Host "  Enter every: ${IntervalSeconds}s" -ForegroundColor Green
Write-Host "  'continue' + Enter every: ${ContinueMinutes}m" -ForegroundColor Yellow
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Red
Write-Host ""

while ($running) {
    $tickCount += $IntervalSeconds

    if ($tickCount -ge $continueIntervalTicks) {
        # Time for "continue" + Enter
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Typing 'continue' + Enter" -ForegroundColor Yellow
        [System.Windows.Forms.SendKeys]::SendWait("continue")
        Start-Sleep -Milliseconds 100
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        $tickCount = 0
    } else {
        # Just press Enter
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Enter (next 'continue' in $([math]::Round(($continueIntervalTicks - $tickCount) / 60, 1))m)" -ForegroundColor DarkGray
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    }

    Start-Sleep -Seconds $IntervalSeconds
}
