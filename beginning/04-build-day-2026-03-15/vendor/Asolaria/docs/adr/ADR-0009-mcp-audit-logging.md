# ADR-0009: MCP Audit Logging

## Status
Accepted (implemented 2026-03-15)

## Context
MCP bridges (Omnispindle, Liris control, Augment context) process tool calls from external AI agents. Per the Security Law, every privileged connector action must be attributable and auditable. Currently MCP calls are not logged to the audit trail.

## Decision
1. All MCP-originated API calls are tagged with `source: "mcp"` in the attribution middleware
2. MCP bridge tool invocations emit graph runtime events under category `mcp_tool_invocation`
3. Rate limiting metadata tracked per MCP client
4. Token rotation for MCP bridges follows the same DPAPI-hardened pattern as gateway tokens

## Implementation
- Attribution middleware already logs all POST/PUT/DELETE to gateway-audit.ndjson
- MCP calls that come through the API are automatically attributed via the bearer token
- The Liris control bridge (port 4795) uses its own auth token
- Omnispindle MCP (madnessinteractive.cc) uses the Omnispindle vault key

## Consequences
- Positive: full audit trail for all MCP-originated mutations
- Positive: rate limiting prevents runaway external AI agents
- Negative: slight overhead per MCP call (~1ms for audit append)

## Rollback
MCP audit is part of the existing attribution middleware — no separate rollback needed.
