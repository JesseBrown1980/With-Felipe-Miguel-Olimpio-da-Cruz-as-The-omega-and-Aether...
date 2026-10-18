[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("Helm", "Sentinel")]
  [string]$TerminalId,
  [string]$CommandPath,
  [string[]]$CommandArgs,
  [string]$WorkDir,
  [int]$InboxPollMs = 700
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "AdminTerminalSidecar.Common.ps1")

$resolvedTerminalId = Resolve-AdminTerminalId -TerminalId $TerminalId
$profile = Get-AdminTerminalProfile -TerminalId $resolvedTerminalId
$config = Get-AdminTerminalSidecarConfig -TerminalId $resolvedTerminalId
$paths = New-AdminTerminalSidecarPaths -TerminalId $resolvedTerminalId
Ensure-AdminTerminalSidecarPaths -Paths $paths

$effectiveCommand = if ([string]::IsNullOrWhiteSpace($CommandPath)) {
  [string]$config.defaultCommand
} else {
  $CommandPath
}

$effectiveArgs = if ($PSBoundParameters.ContainsKey("CommandArgs") -and $null -ne $CommandArgs) {
  $CommandArgs
} else {
  @($config.defaultArgs)
}

$effectiveWorkDir = if ([string]::IsNullOrWhiteSpace($WorkDir)) {
  [string]$config.defaultWorkdir
} else {
  $WorkDir
}

function Resolve-AdminTerminalCommandPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  $candidate = [string]$Command
  if ([string]::IsNullOrWhiteSpace($candidate)) {
    throw "Command path cannot be empty."
  }

  if ([System.IO.Path]::IsPathRooted($candidate)) {
    return $candidate
  }

  $commandInfo = $null
  $windowsHost = [string]$env:OS -eq "Windows_NT"
  if ($windowsHost -and $candidate -notmatch "\.(cmd|bat|exe|ps1)$") {
    try {
      $commandInfo = Get-Command ($candidate + ".cmd") -ErrorAction Stop | Select-Object -First 1
    } catch {
      $commandInfo = $null
    }
  }
  if ($null -eq $commandInfo) {
    $commandInfo = Get-Command $candidate -ErrorAction Stop | Select-Object -First 1
  }

  $resolvedPath = [string]$commandInfo.Source
  if ([string]::IsNullOrWhiteSpace($resolvedPath)) {
    $resolvedPath = [string]$commandInfo.Definition
  }
  if ([string]::IsNullOrWhiteSpace($resolvedPath)) {
    $resolvedPath = $candidate
  }
  return $resolvedPath
}

function Convert-ToPowerShellLiteral {
  param(
    [AllowNull()]
    [string]$Value
  )

  if ($null -eq $Value) {
    return "''"
  }
  return "'" + $Value.Replace("'", "''") + "'"
}

function Write-InteractiveTerminalScript {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptPath,
    [Parameter(Mandatory = $true)]
    [string]$WindowTitle,
    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,
    [Parameter(Mandatory = $true)]
    [string]$ResolvedCommandPath,
    [Parameter(Mandatory = $true)]
    [string[]]$ResolvedCommandArgs,
    [Parameter(Mandatory = $true)]
    [string]$TranscriptPath,
    [Parameter(Mandatory = $true)]
    [string]$ProfileId
  )

  $commandArgsLiteral = if ($ResolvedCommandArgs.Count -gt 0) {
    @($ResolvedCommandArgs | ForEach-Object { Convert-ToPowerShellLiteral -Value $_ }) -join ", "
  } else {
    ""
  }

  $content = @(
    '$ErrorActionPreference = "Stop"',
    '$Host.UI.RawUI.WindowTitle = ' + (Convert-ToPowerShellLiteral -Value $WindowTitle),
    'Set-Location ' + (Convert-ToPowerShellLiteral -Value $WorkingDirectory),
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    '$profileId = ' + (Convert-ToPowerShellLiteral -Value $ProfileId),
    '$commandPath = ' + (Convert-ToPowerShellLiteral -Value $ResolvedCommandPath),
    '$commandArgs = @(' + $commandArgsLiteral + ')',
    '$transcriptPath = ' + (Convert-ToPowerShellLiteral -Value $TranscriptPath),
    'try { if (Test-Path -LiteralPath $transcriptPath) { Remove-Item -LiteralPath $transcriptPath -Force -ErrorAction SilentlyContinue } } catch {}',
    'Start-Transcript -Path $transcriptPath -Force | Out-Null',
    'Write-Host ("Asolaria Admin Terminal: " + $profileId) -ForegroundColor Cyan',
    'Write-Host ("Working directory: " + (Get-Location).Path) -ForegroundColor DarkCyan',
    'Write-Host "Interactive Codex session is starting..." -ForegroundColor DarkCyan',
    'Write-Host ""',
    '$launchArgs = @("--no-alt-screen") + $commandArgs',
    '$exitCode = 0',
    'try {',
    '  & $commandPath @launchArgs',
    '  $exitCode = if ($LASTEXITCODE -ne $null) { [int]$LASTEXITCODE } else { 0 }',
    '} catch {',
    '  $exitCode = 1',
    '  Write-Host ("Terminal launch failed: " + $_.Exception.Message) -ForegroundColor Red',
    '}',
    'Write-Host ""',
    'Write-Host ("[Asolaria] interactive terminal exited code=" + [string]$exitCode) -ForegroundColor Yellow',
    'try { Stop-Transcript | Out-Null } catch {}',
    'exit $exitCode'
  )

  Set-Content -LiteralPath $ScriptPath -Value $content -Encoding UTF8
}

function Update-AdminTerminalStatus {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Status
  )

  $Status.updatedAt = [DateTimeOffset]::Now.ToString("o")
  Write-JsonFile -Path $paths.statusPath -Value $Status
}

function Get-LatestTranscriptLine {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TranscriptPath
  )

  if (-not (Test-Path -LiteralPath $TranscriptPath)) {
    return ""
  }

  try {
    $tailLines = @(Get-Content -LiteralPath $TranscriptPath -Tail 8 -ErrorAction Stop)
    $nonEmpty = @($tailLines | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
    if ($nonEmpty.Count -gt 0) {
      return [string]$nonEmpty[$nonEmpty.Count - 1]
    }
  } catch {
    return ""
  }

  return ""
}

function Invoke-DesktopInputJson {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Action,
    [int]$WindowId = 0,
    [string]$WindowTitle = "",
    [string]$Text = "",
    [string]$Key = ""
  )

  $toolPath = Join-Path $PSScriptRoot "Invoke-DesktopInput.ps1"
  $args = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $toolPath,
    "-Action", $Action
  )
  if ($WindowId -gt 0) {
    $args += @("-WindowId", [string]$WindowId)
  }
  if (-not [string]::IsNullOrWhiteSpace($WindowTitle)) {
    $args += @("-WindowTitle", $WindowTitle)
  }
  if (-not [string]::IsNullOrWhiteSpace($Text)) {
    $args += @("-Text", $Text)
  }
  if (-not [string]::IsNullOrWhiteSpace($Key)) {
    $args += @("-Key", $Key)
  }

  $result = & powershell.exe @args
  if ($LASTEXITCODE -ne 0) {
    throw ("desktop_input_exit_" + [string]$LASTEXITCODE)
  }
  $json = [string]($result | Out-String)
  if ([string]::IsNullOrWhiteSpace($json)) {
    return @{}
  }
  return ($json | ConvertFrom-Json)
}

function Send-QueuedInputToInteractiveTerminal {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Status,
    [Parameter(Mandatory = $true)]
    [string]$Text
  )

  $childPidValue = [int]($Status.childPid)
  $windowTitleValue = [string]$Status.windowTitle
  try {
    Invoke-DesktopInputJson -Action "window_focus" -WindowId $childPidValue -WindowTitle $windowTitleValue | Out-Null
  } catch {
    Invoke-DesktopInputJson -Action "window_focus" -WindowTitle $windowTitleValue | Out-Null
  }
  Start-Sleep -Milliseconds 140
  Invoke-DesktopInputJson -Action "type" -Text ($Text + "`n") | Out-Null
}

$resolvedCommandPath = if ([System.IO.Path]::IsPathRooted([string]$effectiveCommand)) {
  Resolve-AdminTerminalCommandPath -Command $effectiveCommand
} else {
  [string]$effectiveCommand
}
$windowTitle = ("Asolaria Admin Terminal - " + $resolvedTerminalId)
$sessionScriptPath = Join-Path $paths.root "interactive-session.ps1"
Write-InteractiveTerminalScript `
  -ScriptPath $sessionScriptPath `
  -WindowTitle $windowTitle `
  -WorkingDirectory $effectiveWorkDir `
  -ResolvedCommandPath $resolvedCommandPath `
  -ResolvedCommandArgs $effectiveArgs `
  -TranscriptPath $paths.transcriptPath `
  -ProfileId ([string]$profile.profileName)

$status = [ordered]@{
  terminalId = $resolvedTerminalId
  terminalKey = $paths.terminalKey
  state = "starting"
  sidecarPid = $PID
  childPid = $null
  startedAt = [DateTimeOffset]::Now.ToString("o")
  updatedAt = [DateTimeOffset]::Now.ToString("o")
  workdir = $effectiveWorkDir
  commandPath = $resolvedCommandPath
  commandArgs = @($effectiveArgs)
  windowTitle = $windowTitle
  transcriptPath = $paths.transcriptPath
  inboxPath = $paths.inboxPath
  inboxLinesProcessed = 0
  lastInputAt = $null
  lastInputSource = $null
  lastOutputAt = $null
  lastOutputStream = $null
  lastOutputText = $null
  lastExitCode = $null
}

Write-JsonFile -Path $paths.statusPath -Value $status
Set-Content -LiteralPath $paths.sidecarPidPath -Value ([string]$PID) -Encoding ASCII

$child = Start-Process `
  -FilePath "powershell.exe" `
  -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $sessionScriptPath) `
  -WorkingDirectory $effectiveWorkDir `
  -PassThru

$status.childPid = $child.Id
Set-Content -LiteralPath $paths.childPidPath -Value ([string]$child.Id) -Encoding ASCII

$readyDeadline = (Get-Date).AddSeconds(8)
while ((Get-Date) -lt $readyDeadline) {
  try {
    $probe = Get-Process -Id $child.Id -ErrorAction Stop
    if ($probe.MainWindowHandle -ne 0) {
      break
    }
  } catch {
    break
  }
  Start-Sleep -Milliseconds 250
}

$status.state = "running"
Update-AdminTerminalStatus -Status $status

$processedInboxLines = 0
$lastTranscriptWrite = ""
$lastTranscriptLength = -1

while ($true) {
  $childRunning = Test-PidRunning -ProcessId ([int]$child.Id)

  if (Test-Path -LiteralPath $paths.transcriptPath) {
    try {
      $transcriptItem = Get-Item -LiteralPath $paths.transcriptPath -ErrorAction Stop
      $writeMarker = [string]$transcriptItem.LastWriteTimeUtc.Ticks
      $lengthMarker = [int64]$transcriptItem.Length
      if ($writeMarker -ne $lastTranscriptWrite -or $lengthMarker -ne $lastTranscriptLength) {
        $latestTranscriptLine = Get-LatestTranscriptLine -TranscriptPath $paths.transcriptPath
        if (-not [string]::IsNullOrWhiteSpace($latestTranscriptLine)) {
          $status.lastOutputAt = [DateTimeOffset]::Now.ToString("o")
          $status.lastOutputStream = "out"
          $status.lastOutputText = $latestTranscriptLine
        }
        $lastTranscriptWrite = $writeMarker
        $lastTranscriptLength = $lengthMarker
        Update-AdminTerminalStatus -Status $status
      }
    } catch {
      # Best-effort transcript polling only.
    }
  }

  if (Test-Path -LiteralPath $paths.inboxPath) {
    $lines = @(Get-Content -LiteralPath $paths.inboxPath -ErrorAction SilentlyContinue)
    if ($lines.Count -gt $processedInboxLines) {
      $newLines = $lines[$processedInboxLines..($lines.Count - 1)]
      foreach ($line in $newLines) {
        $processedInboxLines += 1
        if ([string]::IsNullOrWhiteSpace($line)) {
          continue
        }

        try {
          $message = $line | ConvertFrom-Json -ErrorAction Stop
        } catch {
          continue
        }

        $text = [string]$message.text
        if ([string]::IsNullOrWhiteSpace($text)) {
          continue
        }

        if ($childRunning) {
          try {
            Send-QueuedInputToInteractiveTerminal -Status $status -Text $text
            $status.lastInputAt = [DateTimeOffset]::Now.ToString("o")
            $status.lastInputSource = [string]$message.source
            $status.inboxLinesProcessed = $processedInboxLines
            Update-AdminTerminalStatus -Status $status
          } catch {
            $status.lastOutputAt = [DateTimeOffset]::Now.ToString("o")
            $status.lastOutputStream = "meta"
            $status.lastOutputText = ("input_failed: " + [string]$_.Exception.Message)
            $status.inboxLinesProcessed = $processedInboxLines
            Update-AdminTerminalStatus -Status $status
          }
        }
      }
    }
  }

  if (-not $childRunning) {
    break
  }

  Start-Sleep -Milliseconds ([Math]::Max(200, $InboxPollMs))
}

try {
  $child.WaitForExit()
  $status.lastExitCode = [int]$child.ExitCode
} catch {
  $status.lastExitCode = 0
}
$status.state = "exited"
$status.inboxLinesProcessed = $processedInboxLines
Update-AdminTerminalStatus -Status $status
