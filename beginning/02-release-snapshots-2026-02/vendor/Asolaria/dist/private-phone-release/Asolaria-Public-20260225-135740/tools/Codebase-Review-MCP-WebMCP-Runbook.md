# Codebase Review MCP/WebMCP Runbook

Use this runbook to start a codebase-review pass with Asolaria-native skills and local evidence capture.

## Quick Start

1. Validate local skills:
   - `npm run skills:validate`
2. Generate kickoff report:
   - `npm run review:kickoff`
3. Run review skills (chat/API):
   - `skill run codebase.review_kickoff`
   - `skill run codebase.review_external_mcp_cache`

## Output Artifacts

- `reports/codebase-review-kickoff-*.json`
- `reports/codebase-review-kickoff-*.md`
- `reports/codebase-review-kickoff-latest.json`
- `reports/codebase-review-kickoff-latest.md`

## What This Covers

- Local skill registry + action catalog health.
- Loopback MCP/WebMCP extraction of:
  - `/api/health`
  - `/api/skills/index`
  - `/api/integrations/external/status`
  - `/api/integrations/external/mcp-cache`
- External MCP cache counters and provider MCP config summary.

## Guardrails

- Read-only workflow by default.
- Loopback host restriction for WebMCP tasks (`127.0.0.1`, `localhost`).
- Redacted report output for token/secret-like fields.
