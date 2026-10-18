# Startup Architecture Gap Report

Date: 2026-02-24
Scope: Compare current runtime behavior with `STARTUP_CONTRACT_V1.md`.

## Executive Summary
Current architecture is close on connectivity and orchestration infrastructure, but does not yet implement the required multi-worker startup contract. The main gaps are worker spawning, profile handshake enforcement, and strict privilege separation between supervisor and workers.

## Current Architecture (Observed)
1. Startup scripts run elevated (`RunAs`), and launch the core runtime:
- [tools/Start-Asolaria.ps1:69](../tools/Start-Asolaria.ps1#L69)
- [tools/Start-Asolaria.ps1:84](../tools/Start-Asolaria.ps1#L84)
- [tools/Start-Asolaria.ps1:241](../tools/Start-Asolaria.ps1#L241)

2. One-button and phone scripts also elevate:
- [tools/Start-Asolaria-OneButton.ps1:23](../tools/Start-Asolaria-OneButton.ps1#L23)
- [tools/Start-Asolaria-OneButton.ps1:44](../tools/Start-Asolaria-OneButton.ps1#L44)
- [tools/Start-Asolaria-Phone.ps1:71](../tools/Start-Asolaria-Phone.ps1#L71)
- [tools/Start-Asolaria-Phone.ps1:95](../tools/Start-Asolaria-Phone.ps1#L95)

3. Startup automation currently queues one Codex job from memory seed; it does not spawn named workers:
- [server.js:5981](../server.js#L5981)
- [server.js:5999](../server.js#L5999)
- [server.js:17307](../server.js#L17307)

4. Provider order exists (`codex`, then fallbacks) but is provider fallback logic, not worker process spawning:
- [server.js:1183](../server.js#L1183)
- [server.js:1185](../server.js#L1185)
- [src/brainOrchestrator.js:146](../src/brainOrchestrator.js#L146)

5. Agent colony section is status/telemetry over `codex-bridge` PID files, not runtime spawn control:
- [server.js:7033](../server.js#L7033)
- [server.js:7063](../server.js#L7063)
- [server.js:7073](../server.js#L7073)
- [server.js:7089](../server.js#L7089)

6. Existing lane names/profiles observed:
- `Vector` (`core-vector-v1`)
- `Rook` (`ops-rook-v1`)
- `Forge` (`build-forge-v1`)
- `Falcon` (`mobile-falcon-v1`)
- [server.js:7065](../server.js#L7065)
- [server.js:7073](../server.js#L7073)
- [server.js:7081](../server.js#L7081)
- [server.js:7089](../server.js#L7089)

7. Phone connection preference order already matches required transport sequence:
- [tools/Start-Asolaria-OneButton.ps1:683](../tools/Start-Asolaria-OneButton.ps1#L683)
- [tools/Start-Asolaria-Phone.ps1:538](../tools/Start-Asolaria-Phone.ps1#L538)

8. Phone control is implemented via ADB reverse/companion routing; no current phone Codex spawn handshake path was found:
- [tools/Start-Asolaria-Phone.ps1:715](../tools/Start-Asolaria-Phone.ps1#L715)
- [tools/Start-Asolaria-Phone.ps1:781](../tools/Start-Asolaria-Phone.ps1#L781)

9. No explicit startup identity handshake gate (`WHO ARE YOU` profile verification) was found in runtime code paths.

## Contract Gap Matrix

| Requirement | Current State | Gap |
|---|---|---|
| Supervisor elevated | Implemented | None |
| Workers non-admin on host | Not enforced; launch context is elevated in startup scripts | High |
| Spawn `Vertex` worker at startup | Not implemented | High |
| Spawn `Rook` worker at startup | Not implemented | High |
| Spawn `Falcon` phone worker at startup | Not implemented as a worker bootstrap flow | High |
| Profile packet per worker | Not implemented | High |
| Mandatory `WHO ARE YOU` handshake gate | Not implemented | High |
| Block tasking until identity verified | Not implemented | High |
| Per-worker sub-agent cap = 2 | Not implemented | Medium |
| Phone path order USB -> Wi-Fi/VPN -> tunnel | Implemented in connection preference | None |
| NotebookLM context read during startup sequence | Not explicit in startup orchestration path | Medium |

## Naming Alignment Note
The current lane labeled `Vector` appears to be the closest existing mapping to your intended `Vertex` worker codename. Current architecture does not yet enforce this mapping as a startup policy.

## Recommended Implementation Order
1. Add a startup orchestrator module that creates `Vertex`, `Rook`, `Falcon` sessions explicitly.
2. Add profile packet + identity handshake state machine (hard gate before tasks).
3. Split permission model:
- supervisor elevated
- workers launched under standard user token
4. Add worker registry with required fields:
- `name`, `profile_id`, `permission_scope`, `handshake_state`, `subagent_count`.
5. Add enforcement for sub-agent limit (`<=2`) per worker.
6. Add startup acceptance checks and fail-closed behavior when any handshake fails.

## Readiness Verdict
Current architecture is infrastructure-ready for routing and monitoring, but not contract-ready for the required multi-worker secure startup flow.
