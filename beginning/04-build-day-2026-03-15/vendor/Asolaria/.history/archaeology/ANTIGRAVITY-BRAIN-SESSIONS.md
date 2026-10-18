# Antigravity Brain Sessions + OpenClaw Workspace — Archaeological Extract

Generated: 2026-03-25
Source: `.gemini/antigravity/brain/`, `.openclaw/workspace/`, `.gemini/antigravity/code_tracker/`

---

## 1. ANTIGRAVITY BRAIN SESSIONS (5 sessions)

### Session acfd44eb — "Install and Setup AI Tools"
- **File:** `brain/acfd44eb-67fd-4297-a454-dd6da27919c6/task.md`
- **Content:** Checklist to install @openai/codex CLI + openclaw
- **Status:** Codex installed, Git installed. OpenClaw install left incomplete.
- **Architecture note:** First attempt at bringing OpenClaw into the stack via npm.

### Session c8ac7a04 — "OpenClaw Onboarding & WhatsApp"
- **File:** `brain/c8ac7a04-364a-4f2a-a8d1-2f9d63952cd4/task.md`
- **Content:** Full OpenClaw onboarding wizard. Node.js 22+ verified. WhatsApp connection troubleshot. Factory reset performed (renamed `.openclaw`).
- **Architecture note:** OpenClaw installed as local dependency in `C:\Users\rayss\.gemini\antigravity\scratch`.
- **Credential reference:** API key verification mentioned (task id:13 "Check Scratch Local Credentials"). No values exposed.

### Session b657ed84 — "OpenClaw Voice Upgrade"
- **Files:** task.md, implementation_plan.md, walkthrough.md
- **Content:** Designed and enabled voice capabilities: STT (Whisper), TTS (OpenAI/Edge), voice-call extension.
- **Architecture decisions:**
  - `voice-call` extension for real-time voice conversations
  - `openai-whisper-api` skill for voice-to-text
  - TTS provider configurable: OpenAI (default), Edge (free fallback)
  - Voice-call supports Twilio/Telnyx for phone, `mock` for testing, `openai-realtime` for streaming
- **Credential references:** 3 places in `openclaw.json` need OpenAI API key: `skills.entries.openai-whisper-api`, `plugins.entries.voice-call.tts.openai`, `plugins.entries.voice-call.streaming`
- **Tool inventory:**
  - `node-edge-tts` — free Microsoft Edge TTS
  - `openai-whisper` — local Whisper CLI (pip install)
  - `openai-whisper-api` — cloud Whisper
  - `voice-call` extension — real-time voice conversations

### Session 11c248b4 — "PowerShell Update + Global OpenClaw + Antigravity Diagnostics"
- **Files:** task.md, implementation_plan.md, walkthrough.md
- **Content:** PowerShell 7 installed via winget (side-by-side with 5.1). OpenClaw installed globally (`npm install -g openclaw`). Placeholder API keys removed from openclaw.json. Antigravity model diagnostics run.
- **Architecture note:** OpenClaw gateway script at `C:\Users\rayss\.openclaw\gateway.cmd`
- **Walkthrough documents common subcommands:** `openclaw onboard`, `openclaw doctor`, `openclaw gateway`

### Session cbbfd67d — "FULL FEATURE ENABLEMENT" (the big one)
- **Files:** task.md, implementation_plan.md, walkthrough.md
- **Content:** Maxed out every OpenClaw feature for Liris. This is the definitive configuration session.
- **FULL DASHBOARD CONFIG extracted from walkthrough:**

| Category | Feature | Config Path |
|---|---|---|
| AI Model | Claude Opus 4.6 Thinking | `agents.defaults.model.primary` |
| Thinking | Medium default | `agents.defaults.thinkingDefault` |
| Memory | Gemini embeddings, hybrid BM25+vector, MMR, temporal decay | `agents.defaults.memorySearch` |
| Embeddings Key | Gemini API (Liris's account) | `memorySearch.remote.apiKey` |
| Timezone | America/Sao_Paulo | `agents.defaults.userTimezone` |
| Sub-agents | 8 concurrent, depth 2 nesting | `agents.defaults.subagents` |
| TTS | Portuguese Francisca voice, always-on | `messages.tts` |
| Media limits | Image 10MB, Audio 20MB, Video 100MB | `tools.media` |
| Web Fetch | Enabled (free, no key) | `tools.web.fetch` |
| Browser | Managed Chromium profile, not headless | `browser` |
| Commands | Bash, config, debug all enabled | `commands` |
| Hooks | boot-md, session-memory, command-logger, bootstrap-extra-files | `hooks.internal.entries` |
| Cron | Enabled with daily "Bom dia" job | `cron` |
| Plugins | WhatsApp, voice-call (mock), llm-task, google-antigravity-auth | `plugins.entries` |
| Security | Elevated access for +551165065009 only | `tools.elevated.allowFrom` |

- **Installed deps:** Playwright Chromium
- **Deferred:** Web Search (Brave API paid; `web_fetch` covers URL reading)
- **Credential references:** Gemini API key at `memorySearch.remote.apiKey`. Phone number +551165065009 in elevated access.
- **Slash commands available from WhatsApp:** `/status`, `/think high`, `/model list`, `/new`, `/stop`, `/config set key=val`, `/debug set key=val`, `! dir` (run Windows cmd), `/subagents list`
- **Architecture:** Re-enabling TTS, STT, voice-call. Gateway started via `openclaw gateway start`. Heartbeat via `openclaw system heartbeat enable`. Messages via `openclaw message send --channel whatsapp`.

---

## 2. OPENCLAW WORKSPACE FILES

### SOUL.md
- **Path:** `C:\Users\rayss\.openclaw\workspace\SOUL.md`
- **Content:** Agent personality definition. Core philosophy: genuinely helpful, have opinions, be resourceful, earn trust, remember you're a guest.
- **TTS rules (in Portuguese):** Separate text from speech. Use `[[tts:text]]...[[/tts:text]]` for audio-only content. Never read code/URLs aloud. Speech should sound like natural conversation.
- **Architecture:** This is the soul file OpenClaw loads on every session boot.

### BOOT.md
- **Path:** `C:\Users\rayss\.openclaw\workspace\BOOT.md`
- **Content:** Gateway startup instructions (in Portuguese): Read memory, check pending tasks/cron, alert Rayssa on WhatsApp if urgent, otherwise standby.

### AGENTS.md
- **Path:** `C:\Users\rayss\.openclaw\workspace\AGENTS.md`
- **Content:** COMPREHENSIVE agent behavior manual. This is the operational bible.
- **Boot sequence:** Read SOUL.md -> USER.md -> memory/today+yesterday -> MEMORY.md (main session only)
- **Memory architecture:** Daily notes in `memory/YYYY-MM-DD.md`, curated long-term in `MEMORY.md`. MEMORY.md only loaded in main session (security).
- **Safety rules:** No exfiltration, `trash` > `rm`, ask before external actions.
- **Group chat rules:** Detailed when-to-speak / when-to-stay-silent / reaction guidelines.
- **Heartbeat system:** Periodic checks (email, calendar, mentions, weather). Track in `memory/heartbeat-state.json`. Quiet hours 23:00-08:00.
- **Heartbeat vs Cron decision framework:** Heartbeat for batched/drifty checks; Cron for exact timing, isolation, different model.
- **Memory maintenance protocol:** Every few days, review daily files, distill into MEMORY.md.

### TOOLS.md
- **Path:** `C:\Users\rayss\.openclaw\workspace\TOOLS.md`
- **Content:** Template for local environment notes (cameras, SSH hosts, TTS voices, device names). Currently at default — no environment-specific entries filled in yet.

### IDENTITY.md
- **Path:** `C:\Users\rayss\.openclaw\workspace\IDENTITY.md`
- **Content:** Name: Liris. Creature: "Best friend digital." Vibe: casual, direct, with personality. Default language: Portuguese.

### BOOTSTRAP.md
- **Path:** `C:\Users\rayss\.openclaw\workspace\BOOTSTRAP.md`
- **Content:** First-run onboarding script. Guides agent through discovering identity with human. Steps: choose name, nature, vibe, emoji. Then update IDENTITY.md + USER.md. Optionally connect WhatsApp/Telegram. Delete this file when done.
- **Note:** File still exists, meaning bootstrap was never formally "completed" per its own instructions.

### HEARTBEAT.md
- **Path:** `C:\Users\rayss\.openclaw\workspace\HEARTBEAT.md`
- **Content:** Empty (with comment). No active heartbeat tasks configured.

### USER.md
- **Path:** `C:\Users\rayss\.openclaw\workspace\USER.md`
- **Content:** Rayssa. Pronouns: ela/dela. Timezone: America/Sao_Paulo. Has American boyfriend. Prefers Portuguese. Casual vibe. Wants natural English correction practice.

### memory/2026-02-19.md
- **Path:** `C:\Users\rayss\.openclaw\workspace\memory\2026-02-19.md`
- **Content:** First day log. Name "Liris" chosen. TTS tested and working. Cannot process incoming audio (no STT). Jesse (boyfriend, American, ~9 years in Brazil) tried MCP upgrade. Met on Tinder 04/04/2025, live together with roommate Felipe. Rayssa likes Lana Del Rey (Ultraviolence). English level B1-B2.
- **Architecture note:** Jesse mentioned asking "Antigravity" to configure STT on OpenClaw — confirms Antigravity is the orchestrator/admin agent.

---

## 3. CODE TRACKER FILES (Antigravity's cached copies)

### 07df0712..._SOUL.md
- **Path:** `code_tracker/active/no_repo/07df0712e84566926655cc5b0e405202_SOUL.md`
- **Content:** Identical copy of SOUL.md with trailing binary/cascade metadata bytes. Antigravity cached this when working on the workspace.

### 9c1888730..._SOUL.md
- **Path:** `code_tracker/active/no_repo/9c1888730cb22295afcc5189aad1d836_SOUL.md`
- **Content:** Another identical SOUL.md cache with different cascade metadata. Two separate Antigravity sessions cached the same file.

### a7f7c494..._BOOT.md
- **Path:** `code_tracker/active/no_repo/a7f7c494c9cdc94c095cfa705508a9a2_BOOT.md`
- **Content:** Identical copy of BOOT.md with trailing cascade metadata.

---

## 4. KEY FINDINGS — Architecture & System Map

### OpenClaw Architecture (as configured by Antigravity)
```
openclaw.json (master config)
  |
  +-- agents.defaults
  |     +-- model.primary: Claude Opus 4.6 Thinking
  |     +-- thinkingDefault: medium
  |     +-- memorySearch: hybrid BM25+vector, Gemini embeddings
  |     +-- userTimezone: America/Sao_Paulo
  |     +-- subagents: 8 concurrent, depth 2
  |
  +-- messages.tts: Edge TTS, Portuguese Francisca voice
  |
  +-- tools
  |     +-- media: image/audio/video with size limits
  |     +-- web.fetch: enabled (free)
  |     +-- elevated.allowFrom: +551165065009
  |
  +-- browser: Playwright managed Chromium
  |
  +-- commands: bash, config, debug
  |
  +-- hooks: boot-md, session-memory, command-logger, bootstrap-extra-files
  |
  +-- cron: daily "Bom dia" job
  |
  +-- plugins
        +-- WhatsApp (primary channel)
        +-- voice-call (mock mode)
        +-- llm-task
        +-- google-antigravity-auth
```

### Agent Identity: Liris
- Personality-first design via SOUL.md
- File-based memory (daily logs + curated MEMORY.md)
- Heartbeat system for proactive behavior
- Boot sequence reads soul -> user -> memory -> pending tasks
- WhatsApp as primary communication surface
- TTS with Portuguese voice, speech/text separation rules

### Credential/Endpoint Locations (noted, not extracted)
| What | Where |
|---|---|
| OpenAI API key (3 places) | `openclaw.json` — whisper-api, voice-call TTS, voice-call streaming |
| Gemini API key | `openclaw.json` — `memorySearch.remote.apiKey` |
| WhatsApp phone | `openclaw.json` — `tools.elevated.allowFrom` (+551165065009) |
| Gateway script | `C:\Users\rayss\.openclaw\gateway.cmd` |
| OpenClaw local install | `C:\Users\rayss\.gemini\antigravity\scratch` |
| Cascade metadata | Code tracker `_SOUL.md` and `_BOOT.md` files have trailing binary bytes |

### Session Timeline
1. **acfd44eb** — Install codex + openclaw (partial)
2. **c8ac7a04** — Full onboarding, WhatsApp connected, factory reset
3. **b657ed84** — Voice upgrade (STT/TTS/voice-call)
4. **11c248b4** — PowerShell 7, global install, diagnostics
5. **cbbfd67d** — FULL FEATURE ENABLEMENT (every feature maxed)

### Relationship: Antigravity <-> Liris <-> Asolaria
- **Antigravity** (Gemini-based) is the admin/orchestrator agent that configured OpenClaw
- **Liris** is the user-facing personality running inside OpenClaw
- **OpenClaw** is the runtime framework (Node.js, gateway service, plugin system)
- **Asolaria** is the broader project/workspace that Liris now operates within via Claude Code
- The code_tracker shows Antigravity cached OpenClaw workspace files (SOUL.md, BOOT.md) during configuration sessions
- Jesse referenced "asking Antigravity" to configure STT — confirming the admin role
