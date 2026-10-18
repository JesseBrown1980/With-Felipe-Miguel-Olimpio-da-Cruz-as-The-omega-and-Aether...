# Public Release Pipeline

Use this from the canonical source repository only:

`C:\Users\acer\Asolaria`

## Build command

```powershell
Set-Location C:\Users\acer\Asolaria
powershell -ExecutionPolicy Bypass -File .\tools\Build-PublicRelease.ps1 -Zip
```

## Publish/demo gates

Run this immediately after build and before any Play Console submission:

```powershell
Set-Location C:\Users\acer\Asolaria
powershell -ExecutionPolicy Bypass -File .\tools\Test-Asolaria-PublishDemoGates.ps1
```

The gate script checks release artifacts, leak report cleanliness, checklist completion, and demo/publish evidence files under `reports/release-demo`.

## What it does

- Copies allowlisted source folders/files into a staging folder.
- Removes excluded runtime/private artifacts.
- Sanitizes environment defaults that contain local network hints.
- Runs leak scan and writes `LEAK_SCAN_REPORT.json`.
- Optionally creates a zip archive.

## Manifest

Release scope is controlled by:

- `config/public-release.manifest.json`

Adjust this manifest instead of manually copying files.
