# Asolaria Shortcut Icon Live

Generated: 2026-02-26 21:14:27 -03:00

## Canonical Icon Source

- Canonical `.ico`: `C:\Users\acer\Asolaria\public\icons\asolaria-icon.ico`
- Expected shortcut icon location: `C:\Users\acer\Asolaria\public\icons\asolaria-icon.ico,0`
- Refresh command (apply icon fixes + update this live doc):

```powershell
cd C:\Users\acer\Asolaria
powershell -ExecutionPolicy Bypass -File .\\tools\\Refresh-Asolaria-ShortcutIconLiveDoc.ps1 -ApplyFixes
```

## Snapshot Summary

- Total Asolaria-related shortcuts scanned: 21
- Runtime launch/stop shortcuts: 19
- Runtime shortcuts with expected icon: 19
- Runtime shortcuts missing/incorrect icon: 0
- Non-runtime Asolaria docs/util shortcuts: 2
- Fixes applied this run: 0

## Shortcut Layout

| Root | Shortcut | Class | Runtime | Icon Status | Target |
|---|---|---|---|---|---|
| startup | Asolaria One Button Startup.lnk | startup_auto | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria-OneButton.cmd |
| desktop_local | Asolaria ADB Health Check.lnk | adb_health | yes | ok | C:\Users\acer\Asolaria\ADB-HealthCheck.cmd |
| desktop_local | Asolaria App (One Button).lnk | launch_one_button | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria-OneButton.cmd |
| desktop_local | Asolaria Control Plane (Admin).lnk | launch_control_plane | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria-ControlPlane.cmd |
| desktop_local | Asolaria Control Plane + Sandbox (Admin).lnk | launch_control_plane_sandbox | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria-ControlPlane-Sandbox.cmd |
| desktop_local | Asolaria Phone Connect.lnk | launch_phone | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria-Phone.cmd |
| desktop_local | Asolaria Phone Recovery Guide.lnk | documentation | no | ok | C:\Windows\System32\notepad.exe |
| desktop_local | Asolaria Phone.lnk | launch_phone | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria-Phone.cmd |
| desktop_local | Asolaria.lnk | launch_main | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria.cmd |
| desktop_local | Stop Asolaria (Admin).lnk | stop_main | yes | ok | C:\Users\acer\Asolaria\Stop-Asolaria.cmd |
| desktop_local | Stop Asolaria Control Plane (Admin).lnk | stop_control_plane | yes | ok | C:\Users\acer\Asolaria\Stop-Asolaria-ControlPlane.cmd |
| desktop_active | Asolaria ADB Health Check.lnk | adb_health | yes | ok | C:\Users\acer\Asolaria\ADB-HealthCheck.cmd |
| desktop_active | Asolaria App (One Button).lnk | launch_one_button | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria-OneButton.cmd |
| desktop_active | Asolaria Control Plane (Admin).lnk | launch_control_plane | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria-ControlPlane.cmd |
| desktop_active | Asolaria Control Plane + Sandbox (Admin).lnk | launch_control_plane_sandbox | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria-ControlPlane-Sandbox.cmd |
| desktop_active | Asolaria Phone Connect.lnk | launch_phone | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria-Phone.cmd |
| desktop_active | Asolaria Phone Recovery Guide.lnk | documentation | no | ok | C:\Windows\System32\notepad.exe |
| desktop_active | Asolaria Phone.lnk | launch_phone | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria-Phone.cmd |
| desktop_active | Asolaria.lnk | launch_main | yes | ok | C:\Users\acer\Asolaria\Start-Asolaria.cmd |
| desktop_active | Stop Asolaria (Admin).lnk | stop_main | yes | ok | C:\Users\acer\Asolaria\Stop-Asolaria.cmd |
| desktop_active | Stop Asolaria Control Plane (Admin).lnk | stop_control_plane | yes | ok | C:\Users\acer\Asolaria\Stop-Asolaria-ControlPlane.cmd |

## Phase Upgrade Notes (Manual, preserved across refreshes)

<!-- PHASE_NOTES_START -->
- Add phase-upgrade notes here.
- Keep this section manual; the script preserves it when refreshing live snapshot.
<!-- PHASE_NOTES_END -->

