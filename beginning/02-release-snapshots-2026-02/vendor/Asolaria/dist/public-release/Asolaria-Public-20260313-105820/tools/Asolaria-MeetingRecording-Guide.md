# Asolaria Meeting Recording Guide

Use Asolaria-native recording for readable meetings with small files and fast encoding.

## Scripts

- `C:\Users\acer\Asolaria\tools\Get-Asolaria-MeetingDevices.ps1`
- `C:\Users\acer\Asolaria\tools\Start-Asolaria-MeetingRecording.ps1`
- `C:\Users\acer\Asolaria\tools\Stop-Asolaria-MeetingRecording.ps1`

## Quick Start

List available devices:

```powershell
powershell -File C:\Users\acer\Asolaria\tools\Get-Asolaria-MeetingDevices.ps1
```

Start recording (balanced profile, auto-select mic if available):

```powershell
powershell -File C:\Users\acer\Asolaria\tools\Start-Asolaria-MeetingRecording.ps1 -Profile balanced
```

Stop recording cleanly:

```powershell
powershell -File C:\Users\acer\Asolaria\tools\Stop-Asolaria-MeetingRecording.ps1
```

## Profiles

- `small`: smallest files, acceptable readability for most meetings.
- `balanced`: default; readable text with compact file size.
- `crisp`: highest readability (larger files).

## Useful Flags

- `-NoAudio`: video-only recording.
- `-AudioDevice "<exact device name>"`: force specific mic device.
- `-FrameRate 30`: default; can lower to 24 for smaller files.
- `-OutputDir "<folder>"`: choose output location.

## Notes

- Recorder uses hardware H.264 when available and working (`h264_qsv`/`h264_nvenc`/`h264_amf`), otherwise falls back to `libx264`.
- Stop script signals ffmpeg for graceful close so files keep valid metadata.
- Output container is `.mkv` for reliability.
