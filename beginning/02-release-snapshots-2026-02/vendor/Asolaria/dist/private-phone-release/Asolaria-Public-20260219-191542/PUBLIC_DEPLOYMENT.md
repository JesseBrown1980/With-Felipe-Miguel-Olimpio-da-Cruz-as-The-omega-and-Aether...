# Master vs Public Asolaria

This project should run as two separate runtime instances:

- `Master Asolaria` (private): Jesse/John operations, sensitive connectors, private memory/vault.
- `Public Asolaria` (sanitized): no private credentials, no private automation, no PHI/PII.

Do not reuse the same runtime `data/`, `captures/`, or `logs/` between these instances.

## Runtime Isolation

Use environment variable:

- `ASOLARIA_INSTANCE_ROOT=<absolute path>`
- `ASOLARIA_PROFILE=public`
- `ASOLARIA_PUBLIC_MODE=true`

When set, Asolaria writes these folders under that root:

- `data/`
- `captures/`
- `logs/`

Health endpoint now reports active runtime roots:

- `GET /api/health` -> `paths.projectRoot`, `paths.instanceRoot`, `paths.dataDir`, `paths.capturesDir`, `paths.logsDir`
- `GET /api/health` -> `profile.mode` (`public` or `master`)
- `GET /api/install/probe` -> host capability + recommended install plan

## Public Baseline

Use `tools/Start-Asolaria-Public.ps1` for a strict baseline profile.

Example:

```powershell
cd C:\Users\acer\Asolaria
powershell -ExecutionPolicy Bypass -File .\tools\Start-Asolaria-Public.ps1 -OpenBrowser
```

Default public profile behavior:

- disables local ops/browser automation
- disables Slack/GitHub/Google/GCP/Vertex connectors
- disables OpenClaw control (`openclawMode=disabled`)
- disables private guardian bootstrap contacts (`ASOLARIA_GUARDIAN_PRESET=empty`)
- keeps strict guardian behavior and token/encryption requirements
- uses isolated runtime root (`%USERPROFILE%\Asolaria-PublicRuntime`)
- uses separate ports (`4791` / `5444`)

If you previously started a public runtime before this policy, existing profile data may still contain old contacts.
Use a fresh instance root path for first clean public bootstrap.

## Phone Differences (Android vs iPhone)

- Android companion app supports the in-app JS bridge (Termux control + native notifications).
- iPhone does **not** have Termux bridge. iPhone usage should be web/PWA-only for approvals/status.
- For public app design, treat mobile as:
  - token-authenticated approval console
  - push/alert destination
  - no direct privileged shell bridge by default

## Release Rule

Before publishing any build:

1. Start only the public profile.
2. Verify `/api/health` paths point to public instance root.
3. Verify no private connector credentials are configured.
4. Verify notebook/memory/vault files are public-only and fresh.
