param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  throw "ffmpeg_not_found"
}

$tmp = Join-Path $env:TEMP ("asolaria-ffmpeg-devices-{0}.txt" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
try {
  cmd /c ("ffmpeg -hide_banner -f dshow -list_devices true -i dummy > ""{0}"" 2>&1" -f $tmp) | Out-Null
  $lines = Get-Content -LiteralPath $tmp -ErrorAction Stop
} finally {
  if (Test-Path -LiteralPath $tmp) {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
}

$video = @()
$audio = @()
foreach ($line in $lines) {
  if ($line -match '\[dshow @ [^\]]+\] "(.+)" \(video\)') {
    $video += $matches[1]
    continue
  }
  if ($line -match '\[dshow @ [^\]]+\] "(.+)" \(audio\)') {
    $audio += $matches[1]
    continue
  }
}

[pscustomobject]@{
  ffmpeg = $ffmpeg.Source
  videoDevices = $video
  audioDevices = $audio
} | ConvertTo-Json -Depth 5
