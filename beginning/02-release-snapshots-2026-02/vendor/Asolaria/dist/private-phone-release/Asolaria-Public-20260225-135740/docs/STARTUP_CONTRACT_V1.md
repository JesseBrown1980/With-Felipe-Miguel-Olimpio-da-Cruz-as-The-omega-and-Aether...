# Startup Contract v1

Date: 2026-02-24
Owner: Jesse
System: Asolaria

## Purpose
Define the required startup behavior, agent roles, permissions, and identity checks.

## Role Model
1. `Asolaria Supervisor`
- Permission scope: elevated permissions over the entire host system.
- Responsibility: orchestration, policy enforcement, safety gates, task routing.

2. `Vertex` worker
- Permission scope: normal user permissions only.
- Responsibility: delegated technical tasks from Asolaria.
- Note: this is a worker codename, not Google Vertex service identity.

3. `Rook` worker
- Permission scope: normal user permissions only.
- Responsibility: delegated operations/support tasks from Asolaria.

4. `Falcon` phone worker
- Permission scope: normal permissions on host.
- Phone scope: control/privilege only inside phone execution context.
- Responsibility: phone-side execution and mobile workflow tasks.

## Required Startup Sequence
1. Start `Asolaria Supervisor` in elevated mode.
2. Open Asolaria app/UI.
3. Read task context from:
- internal Notebook/notes context
- external NotebookLM/API context (if configured)
4. Build task queue and conflict map (avoid overlapping file/task ownership).
5. Spawn `Vertex` worker.
6. Run identity handshake gate for `Vertex` (required before tasks).
7. Spawn `Rook` worker.
8. Run identity handshake gate for `Rook` (required before tasks).
9. Establish phone path in strict order:
- USB
- Wi-Fi/VPN/local network
- tunnel/cellular fallback
10. Spawn `Falcon` phone worker after a phone path is active.
11. Run identity handshake gate for `Falcon` (required before tasks).
12. Dispatch tasks only after all required gates pass.

## Identity Handshake Gate (Mandatory)
For each worker (`Vertex`, `Rook`, `Falcon`):
1. Asolaria sends profile packet.
2. Worker must reply profile ACK.
3. Asolaria asks: `WHO ARE YOU?`
4. Worker must return exact assigned identity/profile.
5. If mismatch or timeout: quarantine worker, do not assign tasks.

## Profile Packet Minimum Fields
- `agent_name`
- `profile_id`
- `mission`
- `allowed_tools`
- `forbidden_actions`
- `permission_scope`
- `subagent_limit`

## Task Isolation Rules
- No worker may take tasks before handshake success.
- Workers must not modify task/files owned by another active worker unless explicitly assigned.
- Supervisor retains final approval authority for cross-boundary actions.

## Sub-Agent Limits
- `Vertex`: max 2 sub-agents.
- `Rook`: max 2 sub-agents.
- `Falcon`: max 2 sub-agents.
- All limits are additionally bounded by real CPU/GPU/memory safety checks.

## Security Rules
- Only Asolaria Supervisor is host-elevated.
- Workers run non-admin on host.
- Phone privilege is scoped to phone execution channel only.
- Any privilege escalation request from workers requires explicit supervisor gate.

## Startup Acceptance Criteria
Startup is valid only if all are true:
1. Supervisor elevated and healthy.
2. `Vertex`, `Rook`, and `Falcon` are started.
3. Each worker passed identity handshake.
4. Phone connection attempted in required order.
5. No task dispatched before handshake completion.
6. Sub-agent limits enforced per worker.
