param(
  [Parameter(Mandatory = $true)]
  [string]$OutputPath,
  [Parameter(Mandatory = $true)]
  [string]$Text,
  [string]$Voice = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-ParentDir {
  param([string]$PathValue)
  $parent = Split-Path -Path $PathValue -Parent
  if (-not [string]::IsNullOrWhiteSpace($parent) -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -Path $parent -ItemType Directory -Force | Out-Null
  }
}

function Invoke-BackendCommand {
  param(
    [string]$CommandPath,
    [string]$OutFile,
    [string]$PayloadText,
    [string]$VoiceName
  )
  if ([string]::IsNullOrWhiteSpace($CommandPath)) {
    return $false
  }
  if (-not (Test-Path -LiteralPath $CommandPath)) {
    return $false
  }
  $args = @($OutFile, $PayloadText)
  if (-not [string]::IsNullOrWhiteSpace($VoiceName)) {
    $args += $VoiceName
  }
  & $CommandPath @args
  return (Test-Path -LiteralPath $OutFile)
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$resolvedText = [string]$Text
if ([string]::IsNullOrWhiteSpace($resolvedText)) {
  throw "Text cannot be empty."
}

Ensure-ParentDir -PathValue $resolvedOutput

$backendCmd = [string]([Environment]::GetEnvironmentVariable("ASOLARIA_KITTY_TTS_BACKEND_CMD", "Process"))
if ([string]::IsNullOrWhiteSpace($backendCmd)) {
  $backendCmd = [string]([Environment]::GetEnvironmentVariable("ASOLARIA_KITTY_TTS_BACKEND_CMD", "User"))
}

if (Invoke-BackendCommand -CommandPath $backendCmd -OutFile $resolvedOutput -PayloadText $resolvedText -VoiceName $Voice) {
  Write-Output $resolvedOutput
  exit 0
}

try {
  Add-Type -AssemblyName System.Speech -ErrorAction Stop
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  if (-not [string]::IsNullOrWhiteSpace($Voice)) {
    $availableVoices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
    if ($availableVoices -contains $Voice) {
      $synth.SelectVoice($Voice)
    }
  }
  $synth.SetOutputToWaveFile($resolvedOutput)
  $synth.Speak($resolvedText)
  $synth.Dispose()
  Write-Output $resolvedOutput
  exit 0
} catch {
  $fallbackPath = [System.IO.Path]::ChangeExtension($resolvedOutput, ".txt")
  Set-Content -LiteralPath $fallbackPath -Value $resolvedText -Encoding UTF8
  Write-Output $fallbackPath
  exit 0
}
