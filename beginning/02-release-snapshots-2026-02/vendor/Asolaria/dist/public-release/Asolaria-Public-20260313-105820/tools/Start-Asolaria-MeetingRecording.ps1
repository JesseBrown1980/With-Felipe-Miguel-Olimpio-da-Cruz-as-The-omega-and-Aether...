param(
  [ValidateSet("balanced","small","crisp")]
  [string]$Profile = "balanced",
  [string]$OutputDir = "C:\Users\acer\Asolaria\captures\meetings",
  [string]$AudioDevice = "",
  [int]$FrameRate = 30,
  [switch]$NoAudio
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Directory {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Get-EncoderName {
  $encText = ffmpeg -hide_banner -encoders 2>$null | Out-String
  $candidates = @()
  if ($encText -match 'h264_nvenc') { $candidates += "h264_nvenc" }
  if ($encText -match 'h264_qsv') { $candidates += "h264_qsv" }
  if ($encText -match 'h264_amf') { $candidates += "h264_amf" }
  $candidates += "libx264"

  foreach ($enc in $candidates) {
    cmd /c ("ffmpeg -hide_banner -loglevel error -f lavfi -i testsrc=size=1280x720:rate=30 -t 1 -an -c:v {0} -f null NUL >NUL 2>NUL" -f $enc) | Out-Null
    if ($LASTEXITCODE -eq 0) {
      return $enc
    }
  }

  return "libx264"
}

function Get-DefaultAudioDevice {
  $tmp = Join-Path $env:TEMP ("asolaria-ffmpeg-devices-{0}.txt" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
  try {
    cmd /c ("ffmpeg -hide_banner -f dshow -list_devices true -i dummy > ""{0}"" 2>&1" -f $tmp) | Out-Null
    $lines = Get-Content -LiteralPath $tmp -ErrorAction Stop
  } catch {
    return ""
  } finally {
    if (Test-Path -LiteralPath $tmp) {
      Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
  }

  foreach ($line in $lines) {
    if ($line -match '\[dshow @ [^\]]+\] "(.+)" \(audio\)') {
      return $matches[1]
    }
  }
  return ""
}

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  throw "ffmpeg_not_found"
}

$runtimeDir = "C:\Users\acer\Asolaria\runtime"
$logsDir = "C:\Users\acer\Asolaria\logs"
Ensure-Directory -Path $OutputDir
Ensure-Directory -Path $runtimeDir
Ensure-Directory -Path $logsDir

$statePath = Join-Path $runtimeDir "meeting-recorder.json"
if (Test-Path -LiteralPath $statePath) {
  try {
    $existing = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    $running = $false
    if ($existing.ffmpegPid) {
      $running = [bool](Get-Process -Id ([int]$existing.ffmpegPid) -ErrorAction SilentlyContinue)
    } elseif ($existing.pid) {
      $running = [bool](Get-Process -Id ([int]$existing.pid) -ErrorAction SilentlyContinue)
    }
    if ($running) {
      throw ("meeting_recorder_already_running pid={0}" -f $existing.ffmpegPid)
    }
  } catch {
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
  }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputPath = Join-Path $OutputDir ("meeting-{0}.mkv" -f $stamp)
$stdoutLogPath = Join-Path $logsDir ("meeting-recorder-{0}.stdout.log" -f $stamp)
$stderrLogPath = Join-Path $logsDir ("meeting-recorder-{0}.stderr.log" -f $stamp)
$argsPath = Join-Path $runtimeDir ("meeting-recorder-args-{0}.json" -f $stamp)
$stopSignalPath = Join-Path $runtimeDir ("meeting-recorder-stop-{0}.sig" -f $stamp)
$workerScript = Join-Path $PSScriptRoot "Run-Asolaria-MeetingRecordingWorker.ps1"
if (-not (Test-Path -LiteralPath $workerScript)) {
  throw ("worker_script_missing: {0}" -f $workerScript)
}

$encoder = Get-EncoderName
$videoArgs = @()
switch ($encoder) {
  "h264_nvenc" {
    switch ($Profile) {
      "small"   { $videoArgs = @("-c:v","h264_nvenc","-preset","p5","-rc","vbr_hq","-cq","28","-b:v","0","-maxrate","2200k","-bufsize","4400k") }
      "crisp"   { $videoArgs = @("-c:v","h264_nvenc","-preset","p5","-rc","vbr_hq","-cq","21","-b:v","0","-maxrate","7000k","-bufsize","14000k") }
      default   { $videoArgs = @("-c:v","h264_nvenc","-preset","p5","-rc","vbr_hq","-cq","24","-b:v","0","-maxrate","4200k","-bufsize","8400k") }
    }
  }
  "h264_qsv" {
    switch ($Profile) {
      "small"   { $videoArgs = @("-c:v","h264_qsv","-global_quality","30","-look_ahead","1","-maxrate","2400k") }
      "crisp"   { $videoArgs = @("-c:v","h264_qsv","-global_quality","23","-look_ahead","1","-maxrate","7000k") }
      default   { $videoArgs = @("-c:v","h264_qsv","-global_quality","26","-look_ahead","1","-maxrate","4300k") }
    }
  }
  "h264_amf" {
    switch ($Profile) {
      "small"   { $videoArgs = @("-c:v","h264_amf","-quality","balanced","-rc","vbr_peak","-qp_i","30","-qp_p","32","-maxrate","2200k") }
      "crisp"   { $videoArgs = @("-c:v","h264_amf","-quality","quality","-rc","vbr_peak","-qp_i","21","-qp_p","23","-maxrate","7000k") }
      default   { $videoArgs = @("-c:v","h264_amf","-quality","balanced","-rc","vbr_peak","-qp_i","25","-qp_p","27","-maxrate","4200k") }
    }
  }
  default {
    switch ($Profile) {
      "small"   { $videoArgs = @("-c:v","libx264","-preset","veryfast","-crf","30","-maxrate","2200k","-bufsize","4400k") }
      "crisp"   { $videoArgs = @("-c:v","libx264","-preset","veryfast","-crf","22","-maxrate","7000k","-bufsize","14000k") }
      default   { $videoArgs = @("-c:v","libx264","-preset","veryfast","-crf","26","-maxrate","4200k","-bufsize","8400k") }
    }
  }
}

# Keep text readable while keeping file size lower on high-res displays.
$vf = "scale='min(1920,iw)':-2:flags=lanczos,format=yuv420p"

$args = @(
  "-y",
  "-hide_banner",
  "-loglevel","warning",
  "-f","gdigrab",
  "-draw_mouse","1",
  "-framerate",[string]$FrameRate,
  "-i","desktop"
)

$usingAudio = $false
if (-not $NoAudio.IsPresent) {
  if ([string]::IsNullOrWhiteSpace($AudioDevice)) {
    $AudioDevice = Get-DefaultAudioDevice
  }
  if (-not [string]::IsNullOrWhiteSpace($AudioDevice)) {
    $args += @("-f","dshow","-i",("audio={0}" -f $AudioDevice))
    $usingAudio = $true
  }
}

$args += @("-vf",$vf)
$args += $videoArgs
if ($usingAudio) {
  $args += @("-c:a","aac","-b:a","96k","-ar","48000","-ac","1")
} else {
  $args += @("-an")
}
$args += @($outputPath)

$argsPack = [ordered]@{
  ffmpegPath = $ffmpeg.Source
  args = $args
}
$argsPack | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $argsPath -Encoding UTF8

$state = [ordered]@{
  pid = 0
  ffmpegPid = 0
  workerPid = 0
  startedAt = (Get-Date).ToString("o")
  output = $outputPath
  logStdout = $stdoutLogPath
  logStderr = $stderrLogPath
  argsPath = $argsPath
  stopSignalPath = $stopSignalPath
  profile = $Profile
  encoder = $encoder
  frameRate = $FrameRate
  audioEnabled = $usingAudio
  audioDevice = $AudioDevice
}
$state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $statePath -Encoding UTF8

$workerProc = Start-Process `
  -FilePath "powershell.exe" `
  -ArgumentList @("-NoProfile","-File",$workerScript,"-ArgsPath",$argsPath,"-StatePath",$statePath,"-StopSignalPath",$stopSignalPath) `
  -WindowStyle Hidden `
  -PassThru

try {
  $state.workerPid = [int]$workerProc.Id
  $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $statePath -Encoding UTF8
} catch {}

Start-Sleep -Milliseconds 800
$finalState = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
[pscustomobject]$finalState | ConvertTo-Json -Depth 6
