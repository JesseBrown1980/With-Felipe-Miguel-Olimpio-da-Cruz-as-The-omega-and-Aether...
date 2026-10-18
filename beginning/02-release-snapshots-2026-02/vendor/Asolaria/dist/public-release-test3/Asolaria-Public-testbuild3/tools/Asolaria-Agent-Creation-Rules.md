# Asolaria Agent Creation Rules (Low-Cost + Safe)

Purpose: make agent creation reliable, auditable, and cost-controlled by default.

## Mandatory Rules

1. Free-first workflow:
- Prefer local tools, existing project scripts, and read-only API checks before paid model calls.
- Use Google Developer Knowledge MCP for docs lookup instead of trial-and-error prompts.

2. Minimal-cost provider order:
- Use Codex/local automation first.
- Use external providers only when Codex is unavailable or blocked.
- Use Vertex only when Google-specific reasoning/model behavior is required.

3. Vertex budget enforcement:
- Check budget before multi-step work: `vertex budget status`.
- Keep daily hard caps enabled.
- If warning threshold is reached, switch to lower-cost/non-Vertex path unless owner explicitly approves extra spend.
- If exhausted, do not retry loops; adjust budget/reset only with explicit owner instruction.

4. Cloud mutation guardrails:
- Read-only GCP discovery is allowed for diagnostics.
- Mutating actions (for example API enablement) stay behind guardian approval.
- `gcp/services/enable` must preflight first and return `mode=noop` when already enabled.

5. Agent spec before execution:
- Every new agent task must include:
  - goal and stop condition,
  - allowed systems/accounts,
  - max spend and time box,
  - rollback/abort path.
- If any field is missing, downgrade to planning-only mode.

6. Separation of concerns:
- Keep relay tokens, API keys, and cloud credentials out of chat content.
- Use vault/env variables only; never paste secrets into prompts or logs.
- Keep rooms scoped by collaboration and enforce sender allowlists.

## Operator Commands

- `vertex budget status`
- `vertex budget set requests 40 promptTokens 120000 outputTokens 40000 warnPercent 80 enabled true`
- `vertex budget reset`
- `gcp status`
- `gcp services enabled <project>`

## Spend Escalation Policy

1. Try free/local path first.
2. If blocked, try existing configured provider path without new cloud resources.
3. If still blocked, request owner approval with estimated cost/risk before new paid resources or higher limits.
