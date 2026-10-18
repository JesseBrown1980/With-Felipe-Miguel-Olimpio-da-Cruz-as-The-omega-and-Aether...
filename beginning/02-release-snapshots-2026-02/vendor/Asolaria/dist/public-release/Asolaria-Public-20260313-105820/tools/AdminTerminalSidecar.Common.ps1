Set-StrictMode -Version Latest

$script:AdminTerminalSidecarDefaultRoot = "C:\Users\acer\Asolaria\runtime\admin-terminals"

function Resolve-AdminTerminalId {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TerminalId
  )

  switch ($TerminalId.Trim().ToLowerInvariant()) {
    "helm" { return "Helm" }
    "sentinel" { return "Sentinel" }
    default { throw "Unsupported admin terminal id: $TerminalId" }
  }
}

function Get-AdminTerminalProfilePath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TerminalId
  )

  $resolved = Resolve-AdminTerminalId -TerminalId $TerminalId
  switch ($resolved) {
    "Helm" { return "C:\Users\acer\codex-bridge\profiles\admin-helm-v1.profile.json" }
    "Sentinel" { return "C:\Users\acer\codex-bridge\profiles\admin-sentinel-v1.profile.json" }
    default { throw "No profile path registered for $resolved" }
  }
}

function Get-AdminTerminalProfile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TerminalId
  )

  $path = Get-AdminTerminalProfilePath -TerminalId $TerminalId
  return (Get-Content -Raw $path | ConvertFrom-Json)
}

function ConvertTo-CompactJson {
  param(
    [Parameter(Mandatory = $true)]
    $Value
  )

  return ($Value | ConvertTo-Json -Depth 12 -Compress)
}

function Write-JsonFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    $Value
  )

  $directory = Split-Path -Parent $Path
  if (-not [string]::IsNullOrWhiteSpace($directory)) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }
  Set-Content -Path $Path -Value ($Value | ConvertTo-Json -Depth 12) -Encoding UTF8
}

function New-AdminTerminalSidecarPaths {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TerminalId
  )

  $resolved = Resolve-AdminTerminalId -TerminalId $TerminalId
  $terminalKey = $resolved.ToLowerInvariant()
  $root = Join-Path $script:AdminTerminalSidecarDefaultRoot $terminalKey
  return [ordered]@{
    terminalId = $resolved
    terminalKey = $terminalKey
    root = $root
    transcriptPath = Join-Path $root "transcript.log"
    inboxPath = Join-Path $root "inbox.ndjson"
    statusPath = Join-Path $root "status.json"
    sidecarPidPath = Join-Path $root "sidecar.pid"
    childPidPath = Join-Path $root "child.pid"
  }
}

function Ensure-AdminTerminalSidecarPaths {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Paths
  )

  New-Item -ItemType Directory -Force -Path $Paths.root | Out-Null
}

function Get-AdminTerminalSidecarConfig {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TerminalId
  )

  $profile = Get-AdminTerminalProfile -TerminalId $TerminalId
  $paths = New-AdminTerminalSidecarPaths -TerminalId $TerminalId
  $sidecar = $profile.PSObject.Properties["sidecar"]
  if ($null -ne $sidecar) {
    return $sidecar.Value
  }

  return [pscustomobject]@{
    enabled = $true
    terminalId = $paths.terminalId
    runtimeRoot = $paths.root
    transcriptPath = $paths.transcriptPath
    inboxPath = $paths.inboxPath
    statusPath = $paths.statusPath
    sidecarPidPath = $paths.sidecarPidPath
    childPidPath = $paths.childPidPath
    runToolPath = "C:\Users\acer\Asolaria\tools\Run-AdminTerminalSidecar.ps1"
    startToolPath = "C:\Users\acer\Asolaria\tools\Start-AdminTerminalSidecar.ps1"
    stopToolPath = "C:\Users\acer\Asolaria\tools\Stop-AdminTerminalSidecar.ps1"
    sendToolPath = "C:\Users\acer\Asolaria\tools\Send-AdminTerminalInput.ps1"
    statusToolPath = "C:\Users\acer\Asolaria\tools\Get-AdminTerminalSidecarStatus.ps1"
    defaultCommand = "codex"
    defaultArgs = @("-a", "never", "-s", "danger-full-access")
    defaultWorkdir = "C:\Users\acer"
  }
}

function Get-AdminTerminalSidecarStatus {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TerminalId
  )

  $paths = New-AdminTerminalSidecarPaths -TerminalId $TerminalId
  if (-not (Test-Path $paths.statusPath)) {
    return $null
  }
  return (Get-Content -Raw $paths.statusPath | ConvertFrom-Json)
}

function Test-PidRunning {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  try {
    $null = Get-Process -Id $ProcessId -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Write-AdminTerminalTranscriptLine {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Paths,
    [Parameter(Mandatory = $true)]
    [string]$Stream,
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$Text
  )

  $timestamp = [DateTimeOffset]::Now.ToString("o")
  $line = "[{0}] [{1}] {2}" -f $timestamp, $Stream.ToUpperInvariant(), $Text
  Add-Content -Path $Paths.transcriptPath -Value $line -Encoding UTF8
}

function Format-ProcessArgument {
  param(
    [AllowNull()]
    [string]$Value
  )

  if ($null -eq $Value) {
    return '""'
  }
  if ($Value -notmatch '[\s"]') {
    return $Value
  }

  $escaped = $Value -replace '(\\*)"', '$1$1\"'
  $escaped = $escaped -replace '(\\+)$', '$1$1'
  return '"' + $escaped + '"'
}

function Join-ProcessArguments {
  param(
    [string[]]$Arguments
  )

  if ($null -eq $Arguments -or $Arguments.Count -lt 1) {
    return ""
  }
  return (($Arguments | ForEach-Object { Format-ProcessArgument -Value $_ }) -join " ")
}

function New-AdminTerminalCommandEnvelope {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Text,
    [string]$Source = "unknown",
    [string]$Reason = "manual",
    [string]$Mode = "append"
  )

  return [ordered]@{
    id = "cmd_" + [guid]::NewGuid().ToString("n")
    ts = [DateTimeOffset]::Now.ToString("o")
    source = $Source
    reason = $Reason
    mode = $Mode
    text = $Text
  }
}
