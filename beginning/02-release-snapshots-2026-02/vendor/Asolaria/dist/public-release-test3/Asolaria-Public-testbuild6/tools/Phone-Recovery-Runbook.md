# Phone Recovery Runbook (Samsung / ADB)

## Normal State Check
1. Connect phone by USB and unlock it.
2. Enable `Developer options` and `USB debugging`.
3. Run `ADB-HealthCheck.cmd`.
4. If status is `device`, the connection is healthy.

## If Device Shows `unauthorized`
1. On phone: `Settings -> Developer options -> Revoke USB debugging authorizations`.
2. Reconnect USB cable.
3. On popup, check `Always allow from this computer`, then tap `Allow`.
4. Run `ADB-HealthCheck.cmd` again.

## If Stuck in Recovery
1. Prefer `Reboot system now`.
2. If boot fails, run `Wipe cache partition` once (not factory reset), then reboot.
3. Only use `Apply update from ADB` with the exact signed package for this device/build.

## Sideload Command (Only with Correct Package)
```powershell
$adb="C:\Users\acer\AppData\Local\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe"
& $adb devices -l
& $adb sideload "C:\FULL\PATH\TO\update.zip"
```

## Safety Notes
- Do not sideload random ZIP files.
- Do not factory reset unless you explicitly choose data wipe.
- If firmware restore is required, use Samsung Smart Switch emergency recovery flow.
