# Asolaria Public Release

Version: 20260219-191542
Generated: 2026-02-19T19:15:51.1750757-03:00

## Security posture

- This package is generated from allowlisted source paths only.
- Runtime/private data folders are excluded.
- Vault files, token files, PID/log/temp artifacts are excluded.
- Leak scan is executed before release completion.

## Operator steps

1. Install dependencies with 
pm install in:
   - repository root
   - src/gateway
   - services/sandbox-manager
2. Start app:
   - Start-Asolaria.cmd (core app only), or
   - Start-Asolaria-ControlPlane.cmd (core app + gateway + sandbox)
3. Set local secrets using the local vault flows. Do not place secrets in source files.