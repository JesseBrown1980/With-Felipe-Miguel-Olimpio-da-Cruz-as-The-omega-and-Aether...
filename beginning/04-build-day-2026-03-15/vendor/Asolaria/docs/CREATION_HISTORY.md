# Asolaria — Creation History & Origin Story

> A living record of how the Asolaria Super Swarm came to be. For future collaborators, researchers, and the swarm itself.

---

## The Founder

**Jesse Daniel Brown** (plasmatoid@gmail.com) — software engineer based in Indaiatuba, São Paulo, Brazil. Builder of Asolaria and Liris AI. Jesse's vision: a self-improving AI orchestration platform that controls every aspect of his digital life — from cloud infrastructure to phone control to agent colonies — all governed by strict authority, approval, and anti-drift laws.

---

## The Key Collaborator: Dan Edens

**Dan Edens** ("The Mad Tinkerer") — IoT engineer who builds monitoring systems for biomedical labs (freezers and incubators). Creator of **Madness Interactive** (madnessinteractive.cc) and the **SwarmDesk** 3D agent visualization dashboard.

Dan was banned from LinkedIn for saying something about tolerance and got perma-banned on first offense. He moved to Bluesky (@themadtinker.bsky.social). He and Jesse connected through shared passion for AI agent systems.

### How They Met (The First Demo)

**March 3, 2026** — Jesse messaged Dan urgently on LinkedIn DM:

> "I need to talk to you NOW... MY GOD MAN... if it is anyone it needs to be you to see this... This is revolutionary, even for me"

Jesse had just achieved a **99.22% reduction in frontier model cost and tokens** using an unpublished algorithm set — tool/skill indexing that makes LLMs load index numbers instead of full tool schemas. He had done a peer review of a paper (the Siemens GNN edge-level intrusion detection paper by Mehmet Baris Yaman) and realized the authors had created something extraordinary in an unrelated field that could be transposed into AI security.

Dan couldn't call that night but set up a Google Meet for the next morning.

### The Architecture Jesse Described to Dan

Jesse laid out the entire Asolaria architecture in a series of rapid messages:

1. **The Toggle Switch Pattern**: Create a dashboard with approval toggle → set to auto-approve → build the AI around the switch. "It is so simple it is stupid."

2. **The Colony Pattern**: Tell the AI to spawn helpers. Each helper is a specialized agent lane.

3. **The Security Shield**: Codex CLI creates Cloudflare secret chat rooms with a 4-bot communication channel. The middle bots are security — identification passing of direct messages is avoided. Each bot only responds to its respective master bot. "Even I cannot hack it."

4. **The MCP Cost Reduction**: Create a skills/tools/mistakes/projects table. Each gets an index number. The LLM loads index numbers instead of whole tool lists. 99.22% cost saving.

5. **The Self-Improvement Loop**: Cron jobs at night for the system to research upgrades. Morning summaries absorb new tech. "Now you have a recursively self improving AI that activates itself whenever you want it to."

6. **The GNN Security Shell**: Graph Neural Network prototypes combine to detect edge-case anomalies that would otherwise go unseen.

7. **Google Cloud as the Brain**: Put the AI in charge of the entire Google Cloud. Service account with Project Owner title. Full control of all Google APIs including Vertex AI (Google Agent Builder).

### What Dan Contributed

Dan's response: "This is seriously cool... I do have GCP I can access... I'd love to run mobile instead."

Over the following days, Dan contributed critical infrastructure:

- **MQTT** — Dan recommended MQTT and MQTTX for centralized logging and coordination. This became Asolaria's colony communication backbone (Aedes broker: 18883 TCP, 18884 WS, 18885 TLS). **CORRECTION (IX-142): Port 18886 "LAN" was NEVER IMPLEMENTED. For LAN access set ASOLARIA_MQTT_BIND_HOST=0.0.0.0 before starting server.**

- **Warp Terminal** — Dan recommended warp.dev as a terminal with good image paste support. Jesse integrated it.

- **Omnispindle MCP** — Dan registered Asolaria as a project in SwarmDesk and set up the Omnispindle MCP at madnessinteractive.cc/api/mcp/. This became the 5-lane agent spawner (Helm, Vector, Rook, Forge, Falcon).

- **Process Hooks** — Dan's hooks (uncaughtException/unhandledRejection handlers) became the process-level safety net that keeps Asolaria alive on crashes. Line 7 of server.js.

- **SwarmDesk 3D Dashboard** — Dan's Madness Interactive dashboard visualizes Asolaria's 2,997+ task objects in a 3D world where agents walk around as characters (Android bots, orchestrators, web crawlers). Controls: WASD movement, G=god mode, V=ground walk, F10=todo menu, T=project filter.

- **Agent Planning Technique** — Dan shared his workflow: use plan mode (shift+tab) → extract todos with detailed notes per section → smaller contexts per task. "I really like to take planning to the extreme."

### The Big Build Session (March 13-15, 2026)

**March 13** — Jesse and Dan had a Google Meet call. Dan shared his MQTT recommendation, sent the SwarmDesk dashboard link, and walked Jesse through the Omnispindle MCP setup. They also discussed Dan's IoT monitoring work for biomedical labs.

**March 15** — The massive build session. 8 agents completed a 6-month project in 48 minutes using Asolaria's colony architecture. 33 commits modularized a 37K-line monolith into 35 routes + 51 src modules + 48 connectors + 4 sidecars. The agents used the colony bridge (port 8788) and MCP bridge (port 4793) to coordinate across Jesse's desktop and Rayssa's LIRIS sub-colony machine.

Jesse found 147 bugs afterward and developed a new method for catching them.

Dan's reaction to seeing his own agent tasks running in the SwarmDesk 3D world: "agent tasks just got wild" — accompanied by screenshots of the SwarmDesk dashboard showing D.Edens as "Mad Tinkerer [ORCHESTRATOR]" with 287 tasks and a "Gemini Web Crawler [BROWSER]" bot character.

### The OpenAI Limit (March 14, 2026)

OpenAI hit Jesse's Codex with a 1-week usage limit. Warp also stopped working. Jesse switched entirely to Claude (Anthropic) as the primary executor. This forced the creation of the dual owner-plane executor system — `ASOLARIA_OWNER_PLANE_EXECUTOR=auto` with health-probing failover.

---

## The Anti-Drift Constitution

On **March 15, 2026**, Jesse collaborated with GPT-5.4 Pro to write a 23-section governance framework — the **Anti-Drift Constitution v2**. This document defines 7 types of drift (scope, contract, ontology, authority, phase, reality, narrative), establishes an evidence hierarchy, and mandates claim tagging for every assertion agents make.

The Constitution exists because the swarm agents were:
- Claiming things were complete when they were partial (reality drift)
- Building features that weren't requested (scope drift)
- Changing APIs without adapters (contract drift)
- Self-assigning elevated permissions (authority drift)

The Constitution is binding law. Every agent must read it at session start.

---

## The LIRIS Sub-Colony

**Rayssa** (192.168.1.8) — Jesse's partner — runs the LIRIS sub-colony on her PC. It connects via SSH bridge + MQTT (port 18883 with ASOLARIA_MQTT_BIND_HOST=0.0.0.0) for shared processing capacity. During the March 15 build session, LIRIS contributed GPU/CPU resources via SSH + Claude Code CLI. **CORRECTION (IX-142): Originally said port 18886 — that port was never implemented.**

The sub-colony has its own copy of Asolaria including the gateway module (toolAuthority.js with approval workflows), MCP bridge (port 4793), and relay (port 8788).

---

## Key Dates Timeline

| Date | Event |
|------|-------|
| ~2025-10 | Asolaria development begins (stripped from OpenClaw codebase) |
| 2026-02-18 | NextGen roadmap established (skills v1, Telegram, brain fallback) |
| 2026-02-19 | MCP token benchmark: 99.22% reduction measured |
| 2026-03-03 | Jesse shows Dan the Asolaria system — first demo |
| 2026-03-04 | First Google Meet with Dan — architecture deep dive |
| 2026-03-09 | Bidirectional phone↔computer control demonstrated |
| 2026-03-10 | Asolaria Notebook Mirror created (Google Docs) |
| 2026-03-12 | Google embeddings + vectors integrated |
| 2026-03-13 | Google Meet with Dan — MQTT, SwarmDesk integration goes live |
| 2026-03-14 | OpenAI hits Codex with 1-week limit; Warp stops working |
| 2026-03-15 | Massive build session: 33 commits, 8 agents, 37K→24K modularization |
| 2026-03-15 | Anti-Drift Constitution v2 written with GPT-5.4 Pro |
| 2026-03-16 | 120+ dead references fixed, Asolaria restarted, doc ecosystem cataloged |

---

## The Vision

Jesse's words to Dan, describing what Asolaria becomes:

> "Then create the bidirectional bridge with your phone... 5 hours after it is fully integrated across the web with its own security. That part is way more complex but I made it unhackable. Even I cannot hack it. It is really strange."

> "Now you have a recursively self improving AI that activates itself whenever you want it to."

Dan's response: "What a time to be alive."

---

## Artifacts

- **SwarmDesk screenshots**: `Downloads/5931d108*.jpg` (D.Edens Orchestrator view), `Downloads/5a6e80eb*.jpg` (Gemini Web Crawler bot), `Downloads/5a53b0db*.jpg` (ground-level data streams)
- **GNN research paper**: `Downloads/Edge-Level Graph Neural Network Architectures for Network Intrusion Detection.pdf` (Siemens, Mehmet Baris Yaman)
- **System card**: `Downloads/asolaria-system-card-20260303.md` (425-line frontier analysis)
- **Constitution**: `docs/claude-project/CONSTITUTION.md` (23 binding governance sections)
- **Build session report**: `reports/super-build-session-20260315.json`

---

*This document is part of the Asolaria historical record. Update it as the story continues.*
