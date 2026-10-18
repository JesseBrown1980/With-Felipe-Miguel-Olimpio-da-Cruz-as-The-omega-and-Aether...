# ============================================================================
# Asolaria V52-D V48-Citizens Watchdog (6 daemons: HubSpot + 5 V52-D)
# Anchor PID: ASOLARIA-V52-D-V48-CITIZEN-DAEMONS-BUILT-PID-2026-05-24
# Law: ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23 (4mo window)
# ----------------------------------------------------------------------------
# Probes each citizen port every 30s. If unreachable OR no python process w/
# matching daemon script in CommandLine, kill any stragglers and relaunch.
# 3-restart limit per hour per citizen. HEALTH-CHECK mode preserved on restart.
# Log: C:/HyperBEHCS/store/v48-citizens-watchdog.log
# ============================================================================

$ErrorActionPreference = 'SilentlyContinue'
$LogFile = 'C:/HyperBEHCS/store/v48-citizens-watchdog.log'
$TickSec = 30
$RestartCapPerHour = 3

# Citizen registry — name, port, daemon script (CommandLine regex match key)
$Citizens = @(
    @{ Name='hubspot';   Port=4970; Script='C:/HyperBEHCS/bin/asolaria-hubspot-citizen-daemon.py';   Regex='asolaria-hubspot-citizen-daemon\.py' },
    @{ Name='ms-graph';  Port=4965; Script='C:/HyperBEHCS/bin/asolaria-ms-graph-citizen-daemon.py';  Regex='asolaria-ms-graph-citizen-daemon\.py' },
    @{ Name='azure-arm'; Port=4966; Script='C:/HyperBEHCS/bin/asolaria-azure-arm-citizen-daemon.py'; Regex='asolaria-azure-arm-citizen-daemon\.py' },
    @{ Name='aws-api';   Port=4967; Script='C:/HyperBEHCS/bin/asolaria-aws-api-citizen-daemon.py';   Regex='asolaria-aws-api-citizen-daemon\.py' },
    @{ Name='ms-teams';  Port=4968; Script='C:/HyperBEHCS/bin/asolaria-ms-teams-citizen-daemon.py';  Regex='asolaria-ms-teams-citizen-daemon\.py' },
    @{ Name='onedrive';  Port=4969; Script='C:/HyperBEHCS/bin/asolaria-onedrive-citizen-daemon.py';  Regex='asolaria-onedrive-citizen-daemon\.py' }
)

# Per-citizen state
$RestartHistory = @{}
$BackoffUntil   = @{}
foreach ($c in $Citizens) {
    $RestartHistory[$c.Name] = New-Object System.Collections.ArrayList
    $BackoffUntil[$c.Name]   = [DateTime]::MinValue
}

function Write-Tick([string]$msg) {
    $ts = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    Add-Content -Path $LogFile -Value "$ts $msg"
}

function Test-Port([int]$port) {
    try {
        return [bool](Test-NetConnection 127.0.0.1 -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue)
    } catch { return $false }
}

function Test-DaemonProc([string]$regex) {
    try {
        $matches = Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -and $_.CommandLine -match $regex }
        return (@($matches).Count -ge 1)
    } catch { return $false }
}

function Stop-DaemonProc([string]$regex) {
    try {
        $matches = Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -and $_.CommandLine -match $regex }
        foreach ($m in $matches) {
            Stop-Process -Id $m.ProcessId -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

function Restart-Citizen($cit) {
    $name = $cit.Name
    $now  = Get-Date
    if ($now -lt $BackoffUntil[$name]) {
        Write-Tick "BACKOFF citizen=$name skip until=$($BackoffUntil[$name].ToString('o'))"
        return
    }
    $cutoff = $now.AddHours(-1)
    $kept = @($RestartHistory[$name] | Where-Object { $_ -gt $cutoff })
    $RestartHistory[$name].Clear() | Out-Null
    foreach ($t in $kept) { [void]$RestartHistory[$name].Add($t) }

    if ($RestartHistory[$name].Count -ge $RestartCapPerHour) {
        $script:BackoffUntil[$name] = $now.AddHours(1)
        Write-Tick "ALERT citizen=$name restart_cap_hit count=$($RestartHistory[$name].Count) cap=$RestartCapPerHour backoff_until=$($BackoffUntil[$name].ToString('o'))"
        return
    }

    Write-Tick "RESTART citizen=$name port=$($cit.Port) script=$($cit.Script)"
    Stop-DaemonProc $cit.Regex
    Start-Sleep -Seconds 2
    Start-Process python -ArgumentList $cit.Script -WindowStyle Hidden | Out-Null
    [void]$RestartHistory[$name].Add($now)
    Start-Sleep -Seconds 4
}

Write-Tick "BOOT v48-citizens-watchdog pid=$PID tick=${TickSec}s cap=${RestartCapPerHour}/hr count=$($Citizens.Count)"

while ($true) {
    foreach ($c in $Citizens) {
        try {
            $portUp = Test-Port $c.Port
            $procUp = Test-DaemonProc $c.Regex
            $healthy = ($portUp -and $procUp)
            Write-Tick "TICK citizen=$($c.Name) port=$($c.Port) port_up=$portUp proc_up=$procUp healthy=$healthy restarts_in_window=$($RestartHistory[$c.Name].Count)"
            if (-not $healthy) {
                Restart-Citizen $c
            }
        } catch {
            Write-Tick "ERROR citizen=$($c.Name) exception=$($_.Exception.Message)"
        }
    }
    Start-Sleep -Seconds $TickSec
}
