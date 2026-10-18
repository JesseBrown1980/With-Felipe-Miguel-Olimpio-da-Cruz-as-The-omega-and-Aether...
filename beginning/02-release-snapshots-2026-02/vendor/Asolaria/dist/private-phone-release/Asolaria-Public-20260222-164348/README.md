# Asolaria

Asolaria is a single local control plane for:
- Codex reasoning (`codex exec` backend connector)
- Asolaria-native Skills (declarative, auditable runbooks under `Asolaria/skills`)
- Antigravity/Cursor external-provider calls (official OpenAI API mode)
- Chrome launch + screenshot capture (Playwright)
- Power Automate Desktop (open and package run)
- Fast intent routing + async jobs (non-blocking UI)
- Persistent conversation memory (disk-backed)
- Image ingest for chat (uploaded or captured images)
- Smart approval automation (`p` / `a` / `y` / `no`)

## Canonical Source

- Canonical source path: `C:\Users\acer\Asolaria`
- Runtime snapshots (for deployment artifacts only, not development):
  - `C:\Users\acer\Asolaria-PublicRuntime`
  - `C:\Users\acer\Asolaria-PublicRuntime-Clean-*`
- See: `docs/CANONICAL_SOURCE.md` and `docs/HANDOVER_ROADMAP.md`

## Start

```powershell
cd C:\Users\acer\Asolaria
npm install
npm start
```

Then open: `http://localhost:4781`

Optional local memory indexer service:

```powershell
cd C:\Users\acer\Asolaria
npm run memory:start
```

Public-safe profile starter:

```powershell
cd C:\Users\acer\Asolaria
powershell -ExecutionPolicy Bypass -File .\tools\Start-Asolaria-Public.ps1 -OpenBrowser
```

Master/public split reference: `PUBLIC_DEPLOYMENT.md`.
Installer capability probe: `GET /api/install/probe`.

Control-plane starter (main app + secure gateway; sandbox optional):

```powershell
cd C:\Users\acer\Asolaria
powershell -ExecutionPolicy Bypass -File .\tools\Start-Asolaria-ControlPlane.ps1 -OpenBrowser
```

Public release pipeline:

```powershell
cd C:\Users\acer\Asolaria
powershell -ExecutionPolicy Bypass -File .\tools\Build-PublicRelease.ps1 -Zip
```

Phone redeploy (private package + phone push + USB open):

```powershell
cd C:\Users\acer\Asolaria
powershell -ExecutionPolicy Bypass -File .\tools\Refresh-Asolaria-PhoneDeployment.ps1 -RemoveLegacyAsolariaApp
```

More details: `docs/PUBLIC_RELEASE_PIPELINE.md`.
Gateway authority details: `docs/GATEWAY_TOOL_AUTHORITY.md`.
Authority modes: `docs/AUTHORITY_MODES.md`.
Gateway audit log: `docs/GATEWAY_AUDIT_LOG.md`.
Vault AppRole runbook: `docs/VAULT_APPROLE_RUNBOOK.md`.

## Local Launcher (Admin)

- Install/repair desktop launchers (local-first, slim default):
  - `powershell -ExecutionPolicy Bypass -File .\tools\Install-Asolaria-DesktopShortcuts.ps1`
  - Optional mirror to the active Windows desktop path (for redirected desktops): `powershell -ExecutionPolicy Bypass -File .\tools\Install-Asolaria-DesktopShortcuts.ps1 -MirrorToActiveDesktop`
  - Optional utility shortcuts (Phone Connect, ADB health, recovery guide, one-button alias): `powershell -ExecutionPolicy Bypass -File .\tools\Install-Asolaria-DesktopShortcuts.ps1 -IncludeUtilityShortcuts`
  - Optional control-plane shortcuts: `powershell -ExecutionPolicy Bypass -File .\tools\Install-Asolaria-DesktopShortcuts.ps1 -IncludeControlPlaneShortcuts`
- Main launcher: `Asolaria (Admin).lnk`
  - Runs `C:\Users\acer\Asolaria\Start-Asolaria-OneButton.cmd` (via `Start-Asolaria.cmd` compatibility routing).
  - If Asolaria is already running, it reuses that session and just opens the interface (no forced reconnect unless requested).
  - Starts Asolaria in phone-ready mode (USB/Wi-Fi/network profile), keeps background phone bridge/monitor services alive, and installs auto-start at logon.
  - Writes startup-method catalog for all alternate launch/test paths to:
    - `reports\startup-methods-latest.md`
    - `logs\startup-method-paths.json`
- One-button alias launcher: `Asolaria App (One Button).lnk`
  - Created only when `-IncludeUtilityShortcuts` is used.
  - Runs `C:\Users\acer\Asolaria\Start-Asolaria-OneButton.cmd`.
- Legacy core-only command path (kept for testing): `C:\Users\acer\Asolaria\Start-Asolaria-Core.cmd`
  - Runs `tools\Start-Asolaria.ps1` without one-button orchestration.
  - `/phone-mode.html` now includes dual-screen phone dashboards:
    - `Active Phone Screen` (interactive) plus `Shadow Workspace` (read-only verification).
    - Shadow can run `follow live` or frozen/manual mode with `Refresh Shadow`.
    - Control guard is explicit: click `Arm Controls (90s)` before sending taps/keys/swipes/text/open-chat actions; it auto-disarms on timeout.
  - Optional command switches:
    - `-OpenPhoneDashboard` to open `/phone-mode.html` immediately.
    - `-StartProMirror` to start real-time scrcpy mirror session.
    - `-HelpRecovery` to run local phone recovery workflow (ADB/Termux/F-Droid checks + tunnel smoke).
    - `-ForceReconnect` to force re-run of phone bridge startup even if server is already healthy.
    - `-StartupMode` for headless auto-start flow.
- Stop launcher: `Stop Asolaria (Admin).lnk`
- Phone connect launcher: `Asolaria Phone Connect.lnk`
  - Created only when `-IncludeUtilityShortcuts` is used.
  - Runs `C:\Users\acer\Asolaria\Start-Asolaria-Phone.cmd`
  - Starts Asolaria, fetches secure mobile URL, copies it to clipboard, and attempts USB bridge/open via `adb` when available.
  - Also auto-ensures the background bridge keeper (`EnableBackgroundKeeper=true`) so USB reverse stays healthy.
  - Mobile Console now supports install as a phone app (PWA) from Chrome.
  - Mobile Console top action includes `Signal Open Asolaria` to open desktop UI remotely (`POST /api/mobile/ui/open` with mobile token auth).
  - Mobile Console includes `Help Recover` in the `Phone (Termux)` card, which queues `POST /api/mobile/help/recover` (authenticated by mobile token) to run local recovery workflow on the PC.
- Optional control-plane launchers (gateway/sandbox tooling available on demand):
  - Install with: `powershell -ExecutionPolicy Bypass -File .\tools\Install-Asolaria-DesktopShortcuts.ps1 -IncludeControlPlaneShortcuts`
  - Or run directly:
    - With sandbox tooling: `powershell -ExecutionPolicy Bypass -File .\tools\Start-Asolaria-ControlPlane.ps1 -IncludeSandbox:$true`
    - Without sandbox tooling: `powershell -ExecutionPolicy Bypass -File .\tools\Start-Asolaria-ControlPlane.ps1 -IncludeSandbox:$false`
- Background keeper (no phone focus changes):
  - Start:
    - `powershell -ExecutionPolicy Bypass -File .\tools\Start-Asolaria-PhoneBackgroundKeeper.ps1 -Port 4781 -CheckIntervalSeconds 20 -MaxHours 12`
  - Stop:
    - `powershell -ExecutionPolicy Bypass -File .\tools\Stop-Asolaria-PhoneBackgroundKeeper.ps1`
  - Purpose: keeps `adb reverse tcp:4781 tcp:4781` active while phone foreground apps (games, etc.) remain untouched.
- Phone tunnel smoke test (non-intrusive):
  - Run once:
    - `powershell -ExecutionPolicy Bypass -File .\tools\Test-Asolaria-PhoneTunnelPath.ps1 -BaseUrl http://127.0.0.1:4781 -Channel vpn`
  - Optional raw phone HTTP probe:
    - `powershell -ExecutionPolicy Bypass -File .\tools\Test-Asolaria-PhoneTunnelPath.ps1 -BaseUrl http://127.0.0.1:4781 -Channel vpn -IncludePhoneRawProbe`
  - Output:
    - JSON summary to stdout
    - markdown report in `reports\phone-tunnel-smoke-*.md`
  - `Start-Asolaria-Phone.ps1` now runs this smoke test by default (`RunPhoneTunnelSmokeTest=true`, raw probe off by default).
  - Mobile Console shows live tunnel health in Connection Mode (`Tunnel smoke` line), sourced from `/api/mobile/control/status` (`phoneTunnelMonitor`).
- Phone tunnel monitor (background):
  - Start:
    - `powershell -ExecutionPolicy Bypass -File .\tools\Start-Asolaria-PhoneTunnelMonitor.ps1 -Port 4781 -CheckIntervalSeconds 300 -MaxHours 12`
  - Stop:
    - `powershell -ExecutionPolicy Bypass -File .\tools\Stop-Asolaria-PhoneTunnelMonitor.ps1`
  - Writes rolling status to:
    - `logs\phone-tunnel-smoke-monitor-*.log`
    - `reports\phone-tunnel-smoke-latest.md`
- Heal/Cure compatibility audit:
  - `powershell -ExecutionPolicy Bypass -File .\tools\Heal-Cure-Asolaria-Phone.ps1 -ApplyFixes`
  - Optional skip cleanup: `-SkipCleanup`
- Data cleanup (old artifacts + duplicate memory turns):
  - Dry run: `powershell -ExecutionPolicy Bypass -File .\tools\Clean-Asolaria-DataArtifacts.ps1`
  - Apply: `powershell -ExecutionPolicy Bypass -File .\tools\Clean-Asolaria-DataArtifacts.ps1 -Apply`

## Notes

- Chat commands are routed first for speed. Examples:
  - `open chrome https://example.com`
  - `screenshot https://example.com as home.png`
  - `local ops status`
  - `local build ai_healthcare_project`
  - `local test asolaria`
  - `local script dev on asolaria`
  - `browser task https://example.com`
  - `slack status`
  - `slack channels 50`
  - `slack review #general last 40`
  - `github status`
  - `github repos 30`
  - `open pad`
  - `run pad C:\path\to\package.zip`
  - `skills`
  - `skill info integrations.snapshot`
  - `skill run integrations.snapshot`
  - `antigravity status`
  - `antigravity ask "Reply with exactly: ok"`
  - `cursor status`
  - `cursor ask "Summarize queue health"`
  - `guardian status`
  - `guardian contacts show`
  - `guardian test alert`
  - `moltbook mission`
  - `moltbook draft post`
  - `moltbook decide proceed`
  - `moltbook account create`
  - `moltbook account show`
  - `moltbook open`
- Stealth Mode starts ON by default:
  - Visible actions (`open chrome`, `open pad`, UI launch buttons) are blocked/hidden.
  - Headless/background actions (screenshots, PAD package runs, brain jobs) remain available.
  - Toggle Stealth in the header to allow visible launches.
- Long-running tasks are queued and polled through `/api/jobs/:id`.
- Screenshot capture uses a warm persistent Playwright worker.
- Codex replies are produced through your local Codex CLI session/auth.
- Optional: enable Codex web search with `ASOLARIA_CODEX_WEB_SEARCH=true` (or the UI `Web` selector). This exposes the native `web_search` tool to Codex runs.
- Chat image uploads are stored under `C:\Users\acer\Asolaria\captures\ingest`.
- Memory is persisted in `C:\Users\acer\Asolaria\data\memory.json`.
- Memory clear (`DELETE /api/memory`) is loopback-only and requires explicit `confirm=APPROVE_MEMORY_CLEAR`.
- Notebook memory is persisted in `C:\Users\acer\Asolaria\data\notebook.json`.
- Notebook auto-capture mode can be set with `ASOLARIA_NOTEBOOK_AUTO_MODE=off|auto` or `POST /api/settings` (`notebookAutoMode`).
- Approval prefix memory is persisted in `C:\Users\acer\Asolaria\data\approval-rules.json`.
- Screenshots are written to `C:\Users\acer\Asolaria\captures`.
- PAD package runs require a valid package file path.
- Skills live under `C:\Users\acer\Asolaria\skills` and can be listed via `GET /api/skills`.
- Skills endpoints:
  - `GET /api/skills`
  - `GET /api/skills/:id`
  - `POST /api/skills/run`
  - `POST /api/skills/reload`
- OpenClaw support remains in code for legacy experiments, but is intended to stay **disabled by default** on this instance.
- Gateway control-plane audit endpoints (loopback-only):
  - `GET /api/gateway/authority/readiness`
  - `POST /api/gateway/authority/readiness/drill`
  - `POST /api/gateway/heartbeat/run`
  - `POST /api/gateway/remediation/start-sandbox`
  - `GET /api/gateway/authority/status`
  - `GET /api/gateway/audit/status`
  - `GET /api/gateway/audit/events`
  - `GET /api/gateway/audit/verify`
  - `POST /api/gateway/audit/verify`
- Notebook endpoints:
  - `GET /api/notebook/notes`
  - `GET /api/notebook/search`
  - `POST /api/notebook/notes`
  - `PUT /api/notebook/notes/:id`
  - `DELETE /api/notebook/notes/:id` (requires explicit `confirm=DELETE_NOTEBOOK_NOTE:<id>`)
- MoltBook policy endpoint: `GET /api/moltbook/mission`.
- MoltBook account endpoints:
  - `GET /api/moltbook/account`
  - `POST /api/moltbook/account/bootstrap`
  - `POST /api/moltbook/account/update`
  - `POST /api/moltbook/account/mark-registered`
  - `POST /api/moltbook/account/reveal` (requires `{"confirm":true}`)
- Vault status endpoint: `GET /api/vault/status`
- External provider endpoints:
  - `GET /api/providers/external/status`
  - `POST /api/providers/external/run`
  - `GET /api/integrations/external/status` (vault-backed config status)
  - `POST /api/integrations/external/config` (loopback-only vault config)
- Guardian endpoints:
  - `GET /api/guardian/status`
  - `GET /api/guardian/profile`
  - `POST /api/guardian/profile/bootstrap`
  - `POST /api/guardian/profile/update`
  - `GET /api/guardian/smtp`
  - `POST /api/guardian/smtp`
  - `GET /api/guardian/whatsapp`
  - `POST /api/guardian/whatsapp`
  - `GET /api/guardian/alerts`
  - `POST /api/guardian/alert/test`
  - `GET /api/guardian/approvals`
  - `GET /api/guardian/approvals/:id`
  - `POST /api/guardian/approvals/decide`
  - `POST /api/guardian/approvals/webhook`
  - `POST /api/guardian/approvals/whatsapp/inbound`
- Mobile approval endpoints:
  - `GET /api/mobile/bootstrap` (local loopback only)
  - `GET /api/mobile/session` (token-protected)
  - `GET /api/mobile/screen/displays` (token-protected)
  - `GET /api/mobile/windows` (token-protected)
  - `POST /api/mobile/windows/focus` (token-protected; control must be armed)
  - `POST /api/mobile/windows/action` (token-protected; control must be armed)
  - `GET /api/mobile/approvals` (token-protected)
  - `GET /api/mobile/approvals/:id` (token-protected)
  - `POST /api/mobile/approvals/:id/approve` (token-protected)
  - `POST /api/mobile/approvals/:id/deny` (token-protected)
  - `POST /api/mobile/connections` (token-protected)
- Local backend automation endpoints:
  - `GET /api/local/ops/status`
  - `POST /api/local/ops/run` with `{"task":"build|test|script","target":"alias_or_path","script":"name_if_task_script"}`
  - `POST /api/browser/task` with `{"url":"https://...","steps":[...]}` for headless browser actions/extracts
- Slack backend integration endpoints:
  - `GET /api/integrations/slack/status`
  - `POST /api/integrations/slack/config` with `{"botToken":"xoxb-...","defaultChannel":"#general"}` (loopback-only)
  - `GET /api/integrations/slack/channels`
  - `POST /api/integrations/slack/review` with `{"channel":"#general","limit":40,"analyze":true}`
- GitHub integration endpoints:
  - `GET /api/integrations/github/status`
  - `POST /api/integrations/github/config` with `{"token":"ghp_...","defaultOwner":"optional","defaultRepo":"optional","baseUrl":"https://api.github.com"}` (loopback-only)
  - `GET /api/integrations/github/repos`
  - `GET /api/policy/work-links` (shows work-link/VPN gating state)
  - `POST /api/policy/channel/heartbeat` with `{"channel":"vpn"}` to refresh runtime channel heartbeat
  - `GET /api/policy/work-orgs` (shows org profile rules and active org)
  - `POST /api/policy/work-org/select` with `{"organization":"qdd|csi|emergencetek"}`

## Local Backend Ops (Safe Mode)

- Local build/test execution is constrained to allowlisted roots and alias targets.
- Commands run with direct process spawn (`shell=false`) and bounded timeout/output.
- Python local build uses `compileall -q` with exclusions for heavy/untrusted folders (`.git`, `.venv`, `node_modules`, `build`, `dist`).
- Browser tasks run headless and support only constrained actions (`goto`, `click`, `type`, `press`, `wait`, `extract_text`, `extract_links`).
- Browser task URL policy blocks private-network hosts by default (except loopback).

Environment policy knobs:
- `ASOLARIA_LOCAL_OPS_ENABLED` (`true`/`false`)
- `ASOLARIA_LOCAL_OPS_ALLOWED_ROOTS` (comma/semicolon list)
- `ASOLARIA_LOCAL_OPS_ALIASES` (JSON object like `{"asolaria":"C:\\\\Users\\\\acer\\\\Asolaria"}`)
- `ASOLARIA_LOCAL_OPS_TIMEOUT_MS`
- `ASOLARIA_LOCAL_OPS_MAX_TIMEOUT_MS`
- `ASOLARIA_LOCAL_OPS_MAX_OUTPUT_CHARS`
- `ASOLARIA_LOCAL_OPS_PYTHON_CMD` (optional explicit Python command)
- `ASOLARIA_BROWSER_TASKS_ENABLED`
- `ASOLARIA_BROWSER_TASKS_ALLOW_LOOPBACK`
- `ASOLARIA_BROWSER_TASKS_ALLOW_PRIVATE_NETWORK`
- `ASOLARIA_BROWSER_TASKS_ALLOWED_HOSTS` (comma/semicolon list)

## Slack Backend Review (No UI)

- Slack review runs through Slack Web API only (no browser automation, no UI clicking).
- Transcript normalization redacts URLs to text markers (`[link omitted]`) before analysis.
- Review prompts explicitly enforce: no link navigation, no account-linking actions.
- Channel access can be restricted by policy allowlists.

Environment policy knobs:
- `ASOLARIA_SLACK_ENABLED`
- `ASOLARIA_SLACK_BOT_TOKEN` (optional env-based token; otherwise set via vault/API)
- `ASOLARIA_SLACK_ALLOW_PRIVATE_CHANNELS` (default true)
- `ASOLARIA_SLACK_ALLOW_DIRECT_MESSAGES` (default false)
- `ASOLARIA_SLACK_ALLOWED_CHANNELS` (IDs or names, comma/semicolon list)
- `ASOLARIA_SLACK_MAX_MESSAGES`
- `ASOLARIA_SLACK_MAX_DIGEST_CHARS`

## GitHub Integration (Read-only)

- GitHub is configured via:
  - Environment (`ASOLARIA_GITHUB_TOKEN`) OR
  - Vault (`POST /api/integrations/github/config`, loopback-only)
- Status check:
  - `github status` (chat)
  - `GET /api/integrations/github/status` (API)
- Repo listing:
  - `github repos 30` (chat)
  - `GET /api/integrations/github/repos` (API, queued job)

Environment policy knobs:
- `ASOLARIA_GITHUB_ENABLED` (`true`/`false`)
- `ASOLARIA_GITHUB_MAX_REPOS` (default 50)
- `ASOLARIA_GITHUB_TOKEN`
- `ASOLARIA_GITHUB_API_URL` / `ASOLARIA_GITHUB_API_BASE` (default `https://api.github.com`)
- `ASOLARIA_GITHUB_DEFAULT_OWNER` (optional)
- `ASOLARIA_GITHUB_DEFAULT_REPO` (optional)

## Work Link VPN Guard

- Sensitive work domains are blocked unless required connection channels are active (default required channel: `vpn`).
- This guard applies to backend browser tasks and inspect/screenshot navigation.
- Login/testing rule: Microsoft auth URLs are included, so Teams sign-in checks are blocked unless VPN is active first.
- Strict runtime rule: for VPN-required work links, Asolaria also requires a recent `vpn` heartbeat to treat VPN as active.
- Default sensitive domain set includes:
  - `teams.microsoft.com`
  - `login.microsoftonline.com`
  - `office.com`
  - `outlook.office.com`
  - `sharepoint.com`

Environment policy knobs:
- `ASOLARIA_WORK_LINK_POLICY_ENABLED` (`true`/`false`)
- `ASOLARIA_WORK_LINK_REQUIRED_CHANNELS` (comma list, default `vpn`)
- `ASOLARIA_WORK_LINK_SENSITIVE_DOMAINS` (comma list)
- `ASOLARIA_WORK_LINK_HARD_VPN_DOMAINS` (comma list; always forces `vpn` regardless of other channel settings)
- `ASOLARIA_WORK_LINK_WARN_ONLY` (`true` to warn instead of block)
- `ASOLARIA_WORK_LINK_REQUIRE_VPN_HEARTBEAT` (`true` by default)

## Work Organization Profiles

- Active work organization controls integration behavior and Teams/VPN requirements.
- Default profiles:
  - `qdd`: Slack-only profile. Teams/Microsoft link navigation is blocked.
  - `csi`: Teams profile, VPN required (location hint: `charleston_sc_us`).
  - `emergencetek`: Teams profile, VPN required (location hint: `charleston_sc_us`).
- Routed chat commands:
  - `work org status`
  - `work org set qdd`
  - `work org set csi`
  - `work org set emergencetek`
- API calls can also pass `organization`/`org` directly on browser/inspect/screenshot tasks.

Environment policy knobs:
- `ASOLARIA_WORK_ORG_POLICY_ENABLED`
- `ASOLARIA_WORK_ORG_DEFAULT`
- `ASOLARIA_ACTIVE_WORK_ORG`
- `ASOLARIA_WORK_ORG_SLACK_ONLY` (comma list, default `qdd`)
- `ASOLARIA_WORK_ORG_TEAMS_VPN_REQUIRED` (comma list, default `csi,emergencetek`)
- `ASOLARIA_WORK_ORG_VPN_LOCATION_HINT` (default `charleston_sc_us`)

## Approval Logic

- `p`: used for read-only trusted command prefixes; prefix is persisted.
- `a`: used for repeated command prefixes during the same brain run.
- `y`: one-time approval for non-destructive commands.
- `no`: reserved as the last fallback after owner decision (or if `approvalMode=deny`).

`approvalMode` can be set in environment or via `POST /api/settings`:
- `smart` (default)
- `manual` (no auto-response)
- `deny` (auto-deny approvals)
- The web UI includes a live approval-mode selector plus memory-window control.
- `approvalPreference` can be:
  - `balanced` (default smart behavior)
  - `pay_priority` (prefer `p`, then `a`, then `y`)
- In `smart` + `pay_priority`, destructive approval prompts are escalated to owner approval first.
  Asolaria creates a pending approval and waits for your decision from phone/desktop interfaces before sending final input to continue.

## Cost And Fallback Behavior

- `costMode` controls memory depth and timeout budgeting:
  - `low` (default): shortest context/time for lowest cost.
  - `balanced`: moderate context/time.
  - `quality`: longest context/time.
- Brain provider order:
  1. Codex
  2. External providers (Antigravity/Cursor) if configured
  3. OpenClaw agent fallback (if Codex/external providers are unavailable/rate-limited)
  4. Template fallback response (no-LMM fallback)
- If Codex credits are exhausted or throttled, Asolaria automatically attempts fallback providers and reports which provider answered.

## Vertex Budget Guardrails

- Vertex status now includes daily budget state in:
  - `GET /api/integrations/vertex/status`
  - `GET /api/integrations/vertex/budget/status`
- Local loopback admin controls:
  - `POST /api/integrations/vertex/budget/config`
  - `POST /api/integrations/vertex/budget/reset`
- Routed operator commands:
  - `vertex budget status`
  - `vertex budget set requests <n> promptTokens <n> outputTokens <n> warnPercent <n> enabled <true|false>`
  - `vertex budget reset`
- Daily UTC limits are enforced as hard stops for:
  - request count,
  - prompt tokens,
  - output tokens.
- Guardian alerting:
  - Near-limit warning is sent once per UTC day when usage reaches `warnPercent`.
  - Exhausted/blocked warning is sent once per UTC day when budget hard-stop is reached.
  - `POST /api/integrations/vertex/budget/reset` re-arms daily alert dedupe state.

Environment overrides (optional):
- `ASOLARIA_VERTEX_BUDGET_ENABLED`
- `ASOLARIA_VERTEX_BUDGET_MAX_REQUESTS_PER_DAY`
- `ASOLARIA_VERTEX_BUDGET_MAX_PROMPT_TOKENS_PER_DAY`
- `ASOLARIA_VERTEX_BUDGET_MAX_OUTPUT_TOKENS_PER_DAY`
- `ASOLARIA_VERTEX_BUDGET_WARN_PERCENT`

If budget env overrides are set, API budget updates are intentionally blocked.

## Gemini API (AI Studio)

Asolaria can also call the Gemini API via an API key (Generative Language API).

- Status:
  - `GET /api/integrations/gemini_api/status`
- Local loopback admin controls:
  - `POST /api/integrations/gemini_api/config` (stores the API key encrypted in vault)
- Routed operator commands:
  - `gemini api status`
  - `gemini api ask "Explain AI in a few words"`

Important: Gemini API does not automatically have access to Gmail/Drive/Docs/etc. For “connected apps” style behavior, fetch source data via the relevant APIs first (Google integration), then include it in the prompt.

## NotebookLM-Style "Chat With My Content" (API-First)

NotebookLM itself has no public API. Asolaria provides an API-first approximation using:
- Google APIs (Gmail/Calendar/Drive/Docs via OAuth, read-only scopes)
- An LLM backend (Gemini API key or Vertex Gemini), with automatic fallback order

Routed operator commands:
- `notebooklm status` (shows which integrations are ready)
- `notebooklm ask <question>` (optionally: `notebooklm ask <accountEmail> provider <vertex|gemini_api> <question>`)
- `notebooklm open` (opens `https://notebooklm.google.com/` in an isolated Chrome profile; requires `stealthMode=false`)

Notes:
- Answers are saved as a *sensitive* local Notebook note tagged `notebooklm` (stored locally; not injected into future LLM prompts).
- To access additional apps (Keep/Tasks/etc) you must add OAuth scopes + implement the corresponding API fetch.

## External Brain Providers (Antigravity/Cursor Style)

Asolaria can call official OpenAI API formats directly as fallback brains:
- `openai_chat_completions` (`/v1/chat/completions`)
- `openai_responses` (`/v1/responses`)

External provider credentials are vault-backed.
Set or clear config via local loopback endpoint:
- `POST /api/integrations/external/config`
  - required: `provider` (`cursor` or `antigravity`)
  - optional: `enabled`, `apiStyle`, `apiBaseUrl`, `apiPath`, `model`, `organization`, `apiKey`, `requireOfficialApi`, `clear`
- `GET /api/integrations/external/status` returns effective config status.

Vault-only secret rule for external providers:
- API keys must be stored in the encrypted vault.
- Legacy env API keys (for example `ASOLARIA_ANTIGRAVITY_API_KEY`) are detected but ignored.
- Antigravity defaults to `requireOfficialApi=true`.

Health endpoint now reports configured external providers under `providers.external`.

## Secure Credential Memory

- Asolaria now encrypts stored credentials at rest (AES-256-GCM) in namespaced vault files:
  - `C:\Users\acer\Asolaria\data\vault\owner\vault.secrets.json`
  - `C:\Users\acer\Asolaria\data\vault\asolaria\vault.secrets.json`
- Key source:
  - Recommended: set `ASOLARIA_VAULT_MASTER_KEY` in environment (`keySource=env`).
  - Fallback: auto-generated key files under `C:\Users\acer\Asolaria\data\vault\<namespace>\vault.master.key` (`keySource=file`).
- MoltBook account data is saved under encrypted secret `moltbook.account`.
- Guardian profile/contact data is saved under encrypted secret `guardian.profile`.
- Guardian SMTP credentials are saved under encrypted secret `guardian.smtp`.

## Guardian Autonomy

- Guardian risk scoring classifies requests as `low|medium|high|critical`.
- `guardianMode` controls high-risk handling:
  - `off`: no guardian intervention.
  - `notify`: allow action and alert contacts.
  - `autonomous` (default): Asolaria runs a short policy decision for high-risk actions and may allow/block.
  - `strict`: block high-risk actions.
- `guardianRiskThreshold` controls when guardian triggers (default `high`).
- `guardianAlertsEnabled` controls alert dispatch.
- `guardianAutoBlockCritical` can force-block critical requests.
- `guardianNotifyPolicy` controls when notifications are sent:
  - `important` (default): notify on blocked, critical, or security-compromise events
  - `critical_only`: notify only on critical/security-compromise events
  - `all`: notify on all guardian-triggered events
- Default contacts are pre-seeded for Jesse Daniel Brown and stored encrypted.
- Default contact routing:
  - `plasmatoid@gmail.com` receives primary alerts
  - `jessebrown.soft1980@gmail.com` is emergency-only (`security_emergency`)
- Email delivery requires SMTP config via `POST /api/guardian/smtp`; otherwise alerts are still logged locally:
  - `C:\Users\acer\Asolaria\data\guardian-alerts.json`
  - `C:\Users\acer\Asolaria\logs\guardian-alerts.log`
- Optional WhatsApp push (Twilio) can be configured via `POST /api/guardian/whatsapp`.
- Optional emergency SMS/voice relay can be sent to a private IZT-compatible webhook:
  - `ASOLARIA_IZT_RELAY_URL`
  - `ASOLARIA_OWNER_PHONE`
  - `ASOLARIA_VOICE_STYLE`
- Optional Codex relay alert can be sent to a `codex-bridge` instance (useful for multi-agent supervision):
  - `ASOLARIA_CODEX_BRIDGE_URL` (example: `https://<tunnel>.trycloudflare.com`)
  - `ASOLARIA_CODEX_BRIDGE_TOKEN`
  - `ASOLARIA_CODEX_BRIDGE_ROOM` (default `asolaria_bridge`)
  - `ASOLARIA_CODEX_BRIDGE_TO` (default `this-codex`)
  - `ASOLARIA_CODEX_BRIDGE_NOTIFY_MODE` (`critical_or_security` default; also supports `important`, `all_alerts`, `security_only`)

## Voice Stack

- Voice status + planning: `GET /api/voice/status`
- Local STT (if configured): `POST /api/voice/transcribe`
- Local TTS (if configured): `POST /api/voice/speak`
- Chunked conversational reply for low-latency turn streaming: `POST /api/voice/reply`
- Free/private default stack:
  - STT: local Whisper (`ASOLARIA_WHISPER_CMD`)
  - TTS: local Piper (`ASOLARIA_PIPER_CMD`)
  - Transport: USB -> VPN -> private internet

## Connection Security Policy

- Runtime storage can be isolated with `ASOLARIA_INSTANCE_ROOT`:
  - unset: uses project folders (`.\data`, `.\captures`, `.\logs`)
  - set: uses `<ASOLARIA_INSTANCE_ROOT>\data|captures|logs` (recommended for public instance)
- Channel preference order is secure-first: `usb -> vpn -> private_internet -> public_internet`.
- Public channels are blocked by default.
- `public_internet` is only eligible when BOTH are true:
  - `connectionAllowPublicInternet=true`
  - `connectionPublicInternetPrivate=true`
- Remote API access defaults (Wi-Fi / internet):
  - `networkRemoteAuthRequired=true` (token required)
  - `networkRequireEncryptedRemote=true` (VPN or HTTPS required)
  - `networkStealthDeny=true` (unauthorized remote requests return hidden `404`)
- Remote auth token:
  - `ASOLARIA_REMOTE_API_TOKEN` (falls back to mobile approval token if not set)
- Optional remote base override (useful for tunnels/reverse proxies):
  - `ASOLARIA_REMOTE_APPROVAL_BASE_URL` (example: `https://your-subdomain.trycloudflare.com`)
- For private Wi-Fi usage:
  - Use VPN mesh (Tailscale/WireGuard) OR HTTPS reverse proxy with trusted cert.
  - Include token in `x-asolaria-token` header.
- You can inspect routing + policy at `GET /api/health` under:
  - `networkPolicy`
  - `connectionRouting`

## OpenClaw Modes

- `openclawMode=read_only` (default): status/list/read actions only.
- `openclawMode=governed`: allows gated control actions (start/stop/restart/run).
- `openclawMode=disabled`: blocks all OpenClaw actions.

## MoltBook Guardrails

- External posting is blocked by default (`allowExternalPosting=false`).
- "Inspect skills only" policy is enforced in prompt policy text.
- Decision flow can be triggered with `moltbook decide proceed` and returns a safety decision before action.
