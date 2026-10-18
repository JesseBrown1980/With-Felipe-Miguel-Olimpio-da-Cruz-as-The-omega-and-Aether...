# Asolaria Handover Roadmap

Date: 2026-02-18

## Canonical source rule

- Canonical source repository: `C:\Users\acer\Asolaria`
- All engineering changes happen only in this repository.
- Runtime snapshots (`Asolaria-PublicRuntime*`) are artifacts, not development sources.

## Goal

Move Asolaria from supervised operator-assist to controlled command authority with explicit safety gates and reversible handover.

## Phase 0: Baseline and source control discipline

Exit criteria:
- Single canonical source rule documented and followed.
- Control-plane components are isolated and launchable:
  - Main app (`server.js`)
  - Gateway (`src/gateway/server.js`)
  - Sandbox manager (`services/sandbox-manager/server.js`)
- Health probes available for each component.

Status (2026-02-18): in progress, mostly complete.

## Phase 1: Secure control plane foundation

Exit criteria:
- Gateway bound to loopback only and authenticated at handshake.
- Tool registry manifests generated from connectors.
- Heartbeat and in-process cron run with logs + backoff.
- Sandbox manager defaults to no-network with strict limits.

Status (2026-02-18): in progress, core scaffold complete.

## Phase 2: Connector mediation through gateway

Exit criteria:
- Dangerous operations pass through gateway policy checks only.
- Host execution stays deny-by-default, explicit allowlist + approvals required.
- Connector calls tagged with actor/session IDs and written to audit stream.

Status (2026-02-18): started. Gateway now enforces allowlist + approval-gated invoke path for selected tools.

## Phase 3: Memory and planning loop

Exit criteria:
- Living-files memory indexer online and queryable.
- Operator-approved goals become scheduled jobs.
- Weekly self-review report generated with blocked/high-risk actions summary.

## Phase 4: Supervised autonomy

Exit criteria:
- Asolaria can execute approved recurring routines without manual prompting.
- Approval queue is reliable across desktop/mobile pathways.
- Automatic retries, backoff, and failure notifications are stable.

## Phase 5: Command handover (controlled)

Exit criteria:
- Explicit authority modes are enforced:
  - `operator_primary`
  - `shared_control`
  - `asolaria_primary`
- `asolaria_primary` requires operator-confirmed transition and rollback path.
- Any critical-risk action still requires owner approval.

## Phase 6: Public distribution pipeline

Exit criteria:
- Public-release export script produces sanitized package from canonical source.
- Export includes no vault data, captures, logs, certs, or tokens.
- Leak scanner passes before release archive is created.

## Operating principle

Handover is not a one-time switch. It is a gated progression with measurable checks and immediate rollback capability.
