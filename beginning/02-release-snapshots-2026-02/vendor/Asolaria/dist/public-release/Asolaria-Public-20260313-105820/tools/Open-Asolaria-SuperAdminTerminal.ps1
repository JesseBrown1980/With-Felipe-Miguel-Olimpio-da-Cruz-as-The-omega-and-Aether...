param(
  [ValidateSet("brain", "admin")]
  [string]$Target = "brain",
  [int]$Port = 4781,
  [int]$RefreshSeconds = 4,
  [switch]$ClearEachRefresh,
  [switch]$RunOnce
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

function Get-AsolariaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Invoke-LocalJson {
  param(
    [string]$Path,
    [int]$TimeoutSec = 8
  )
  try {
    return Invoke-RestMethod -Uri ("http://127.0.0.1:{0}{1}" -f $Port, $Path) -TimeoutSec $TimeoutSec
  } catch {
    return $null
  }
}

function Get-TailText {
  param(
    [string]$Path,
    [int]$Tail = 18
  )
  try {
    if (-not (Test-Path -LiteralPath $Path)) {
      return ""
    }
    $lines = Get-Content -LiteralPath $Path -Tail $Tail -ErrorAction Stop
    if ($lines -is [System.Array]) {
      return ($lines -join "`n")
    }
    return [string]$lines
  } catch {
    return ""
  }
}

function Write-Section {
  param(
    [string]$Title,
    [string]$Text,
    [ConsoleColor]$Color = [ConsoleColor]::Gray
  )
  if ([string]::IsNullOrWhiteSpace($Text)) {
    return
  }
  Write-Host ""
  Write-Host ("===== " + $Title + " =====") -ForegroundColor $Color
  Write-Host $Text
}

function Get-DisplayText {
  param(
    $Value,
    [string]$Fallback = ""
  )
  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $Fallback
  }
  return $text
}

function Get-ObjectProperty {
  param(
    $Object,
    [string]$Name,
    $Default = $null
  )
  if ($null -eq $Object) {
    return $Default
  }
  if ($Object -is [System.Collections.IDictionary]) {
    if ($Object.Contains($Name)) {
      return $Object[$Name]
    }
    return $Default
  }
  $property = $Object.PSObject.Properties[$Name]
  if ($property) {
    return $property.Value
  }
  return $Default
}

function Get-NestedValue {
  param(
    $Object,
    [string[]]$Path,
    $Default = $null
  )
  $current = $Object
  foreach ($segment in $Path) {
    $current = Get-ObjectProperty -Object $current -Name $segment -Default $null
    if ($null -eq $current) {
      return $Default
    }
  }
  return $current
}

function Resolve-BrainSnapshot {
  param($Source)
  $brain = Get-ObjectProperty -Object $Source -Name "brainLeader"
  if ($null -eq $brain) {
    $brain = Get-ObjectProperty -Object $Source -Name "brain"
  }
  return $brain
}

$root = Get-AsolariaRoot
$logsDir = Join-Path $root "logs"
$reportsDir = Join-Path $root "reports"
$windowTitle = if ($Target -eq "brain") {
  "Asolaria Brain Terminal"
} else {
  "Asolaria Super Admin Terminal"
}

try {
  $host.UI.RawUI.WindowTitle = $windowTitle
} catch {
  # Best-effort title only.
}

Clear-Host
$lastHealth = $null
$lastBrainResponse = $null
while ($true) {
  if ($ClearEachRefresh) {
    Clear-Host
  } else {
    Write-Host ""
  }
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

  if ($Target -eq "brain") {
    $brainResponseLive = Invoke-LocalJson -Path "/api/automation/brain-leader/status" -TimeoutSec 8
    if ($brainResponseLive) {
      $lastBrainResponse = $brainResponseLive
    }
    $brainResponse = if ($brainResponseLive) { $brainResponseLive } else { $lastBrainResponse }
    $brain = Resolve-BrainSnapshot -Source $brainResponse
    Write-Host $windowTitle -ForegroundColor Cyan
    Write-Host ("Updated: " + $stamp)
    Write-Host ("Provider: " + (Get-DisplayText -Value (Get-NestedValue -Object $brain -Path @("selectedProvider")) -Fallback "unknown"))
    Write-Host ("Model   : " + (Get-DisplayText -Value (Get-NestedValue -Object $brain -Path @("selectedModel")) -Fallback "default"))
    Write-Host ("Status  : " + (Get-DisplayText -Value (Get-NestedValue -Object $brain -Path @("status")) -Fallback "idle") + " / " + (Get-DisplayText -Value (Get-NestedValue -Object $brain -Path @("loopStatus")) -Fallback "idle"))
    if (Get-DisplayText -Value (Get-NestedValue -Object $brain -Path @("reason"))) {
      Write-Host ("Reason  : " + (Get-DisplayText -Value (Get-NestedValue -Object $brain -Path @("reason"))))
    }
    if (Get-DisplayText -Value (Get-NestedValue -Object $brain -Path @("lastRunAt"))) {
      Write-Host ("Last run: " + (Get-DisplayText -Value (Get-NestedValue -Object $brain -Path @("lastRunAt"))))
    }
    $outTail = Get-TailText -Path (Join-Path $logsDir "server.out.log") -Tail 18
    $errTail = Get-TailText -Path (Join-Path $logsDir "server.err.log") -Tail 10
    Write-Section -Title "server.out.log" -Text $outTail -Color Cyan
    Write-Section -Title "server.err.log" -Text $errTail -Color Red
  } else {
    $healthLive = Invoke-LocalJson -Path "/api/health" -TimeoutSec 8
    if ($healthLive) {
      $lastHealth = $healthLive
    }
    $health = if ($healthLive) { $healthLive } else { $lastHealth }
    $brainResponseLive = Invoke-LocalJson -Path "/api/automation/brain-leader/status" -TimeoutSec 8
    if ($brainResponseLive) {
      $lastBrainResponse = $brainResponseLive
    }
    $brainResponse = if ($brainResponseLive) { $brainResponseLive } else { $lastBrainResponse }
    $brain = Resolve-BrainSnapshot -Source $health
    $brainFromStatus = Resolve-BrainSnapshot -Source $brainResponse
    if ($brainFromStatus) {
      $brain = $brainFromStatus
    }
    $https = Get-ObjectProperty -Object $health -Name "https"
    $queue = Get-ObjectProperty -Object $health -Name "queue"
    Write-Host $windowTitle -ForegroundColor Yellow
    Write-Host ("Updated: " + $stamp)
    Write-Host ("Brain   : " + (Get-DisplayText -Value (Get-NestedValue -Object $brain -Path @("selectedProvider")) -Fallback "unknown") + " / " + (Get-DisplayText -Value (Get-NestedValue -Object $brain -Path @("selectedModel")) -Fallback "default"))
    Write-Host ("HTTP    : 127.0.0.1:" + $Port)
    if (Get-NestedValue -Object $https -Path @("enabled")) {
      Write-Host ("HTTPS   : 127.0.0.1:" + (Get-DisplayText -Value (Get-NestedValue -Object $https -Path @("port")) -Fallback "5443"))
    } else {
      Write-Host "HTTPS   : disabled"
    }
    Write-Host ("Queue   : " + (Get-DisplayText -Value (Get-NestedValue -Object $queue -Path @("queued")) -Fallback "0") + " queued / " + (Get-DisplayText -Value (Get-NestedValue -Object $queue -Path @("running")) -Fallback "0") + " running")

    $oneButtonTail = Get-TailText -Path (Join-Path $reportsDir "one-button-start-latest.md") -Tail 18
    Write-Section -Title "one-button-start-latest.md" -Text $oneButtonTail -Color Yellow

    $supervisorLog = Get-ChildItem -Path $logsDir -Filter "system-supervisor-*.log" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($supervisorLog) {
      $supervisorTail = Get-TailText -Path $supervisorLog.FullName -Tail 16
      Write-Section -Title $supervisorLog.Name -Text $supervisorTail -Color Green
    }
  }

  if ($RunOnce.IsPresent) {
    break
  }

  Start-Sleep -Seconds ([Math]::Max(2, $RefreshSeconds))
}
