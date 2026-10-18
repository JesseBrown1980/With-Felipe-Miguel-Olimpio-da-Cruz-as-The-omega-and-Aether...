# Current State (our repo)

## 1) How tools are currently supplied

- Chat requests are queued into Codex/brain orchestration (`enqueueCodex` -> `runBrainTask`) rather than building OpenAI `tools` arrays inline in the `/api/chat` path.
  - `Asolaria/server.js:10163`
  - `Asolaria/server.js:10445`
  - `Asolaria/server.js:1941`
  - `Asolaria/src/brainOrchestrator.js:129`
- External provider payload builder currently sends only base request fields (`model`, `input` for Responses style, or `model`, `messages` for Chat Completions style). No `tools` object is constructed there.
  - `Asolaria/src/connectors/externalBrainConnector.js:415`
  - `Asolaria/src/connectors/externalBrainConnector.js:418`
  - `Asolaria/src/connectors/externalBrainConnector.js:426`
- Repo scan found no inline JSON patterns for `"tools": [` or `"function": {` in app runtime code (`src`, `server.js`) outside generated/vendor artifacts.
- Current tool governance is implemented at gateway policy level (allow-list + approval patterns), independent of OpenAI function-calling payloads.
  - `Asolaria/config/asolaria.gateway.json:22`
  - `Asolaria/config/asolaria.gateway.json:34`
  - `Asolaria/src/gateway/toolAuthority.js:171`
- Skill registry has its own in-memory cache lifecycle (`registryCache`) which is separate from MCP server tool-list caching.
  - `Asolaria/src/skillRegistry.js:164`

## 2) Repo keyword scan summary

- `allowed_tools`, `server_url`, `connector_id` do not appear in active request-building code.
- MCP string hits in local app code are mostly notebook keyword tagging, not runtime MCP transport/tool integration.
  - `Asolaria/src/notebookStore.js:510`
  - `Asolaria/src/notebookStore.js:518`

## 3) Current architecture + where token bloat can occur

- Current state: Asolaria does **not** currently inline large tool schemas into OpenAI requests in the observed runtime paths.
- Token bloat risk is still relevant if/when Asolaria adds direct tool-calling payloads (especially large inline `function` arrays) or forwards oversized MCP tool catalogs without filtering.
- Independent of tooling, long user/system context and large file/screenshot-derived context remain token drivers.

---

# Verified: OpenAI Remote MCP (2026-02-19)

## 1) Docs MCP server config status in this environment

- Configured and enabled in Codex config:
  - `C:\Users\acer\.codex\config.toml:11`
  - `C:\Users\acer\.codex\config.toml:12`
- Official setup commands (from OpenAI docs):
  - `codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp`
  - `codex mcp list`

## 2) Verified API shape (Responses API)

From OpenAI’s Connectors/MCP guide and Responses schema docs, remote MCP tool objects are of `type: "mcp"` and include:

- `server_label` (identifier used in calls/outputs)
- One of:
  - `server_url` (remote MCP endpoint)
  - `connector_id` (OpenAI connector handle)
- Optional auth/transport-related fields:
  - `authorization` (token, must be sent per request)
  - `headers` (optional HTTP headers)
- Tool scope/approval controls:
  - `allowed_tools` (array or filter object)
  - `require_approval` (`always`/`never` or per-tool policy object)
- Optional context metadata:
  - `server_description`

Also verified in behavior/output:

- Tool import event: `mcp_list_tools`
- Tool execution event: `mcp_call`
- Approval flow objects: `mcp_approval_request` and `mcp_approval_response`

## 3) Filtering + caching guidance (OpenAI docs)

- OpenAI recommends tool filtering (`allowed_tools`) to reduce token overhead and latency when servers expose many tools.
- OpenAI docs explicitly state that keeping `mcp_list_tools` in conversation context avoids re-listing tools every turn.
- OpenAI docs/cookbook also recommend passing `previous_response_id` and/or returning `mcp_list_tools` for latency reduction.

## 4) Naming differences and canonical forms

Canonical (Responses API): snake_case

- `server_label`, `server_url`, `connector_id`, `allowed_tools`, `require_approval`

Agents SDK (JS helper API): camelCase wrappers over same concept

- `serverLabel`, `serverUrl`, `connectorId`, `allowedTools`, `requireApproval`, plus SDK-level `cacheToolsList` on local MCP server classes.

Agents SDK (Python): hosted MCP passed as `tool_config` dict using Responses-style keys

- `"type": "mcp"`, `"server_label"`, `"server_url"`, `"connector_id"`, `"require_approval"`
- Local MCP server classes expose `cache_tools_list` and explicit `tool_filter`.

---

# Verified: MCP Spec / SDK updates (2026-02-19)

## 1) Current protocol revision and versioning

- MCP versioning is date-based (`YYYY-MM-DD`), and current protocol is `2025-11-25`.
- Version negotiation happens during `initialize` lifecycle; client/server agree on a single protocol version per session.

## 2) Transport and protocol changes relevant to integrations

- Standard transports: `stdio` and `Streamable HTTP`.
- `Streamable HTTP` replaces older HTTP+SSE transport from `2024-11-05` lineage.
- Streamable HTTP includes explicit security guidance (Origin validation, localhost binding guidance, auth expectations), resumability semantics, and session headers.

## 3) Tool protocol semantics (server side)

- Discovery via `tools/list` (with pagination).
- Invocation via `tools/call`.
- Change notification via `notifications/tools/list_changed` when supported.

## 4) Notable 2025-11-25 key changes (from MCP changelog)

- OIDC discovery additions for auth server discovery.
- Incremental scope consent improvements.
- Tool-name guidance.
- Sampling now supports tool-calling parameters.
- Experimental tasks support.
- JSON Schema 2020-12 established as default dialect.

---

# Verified: WebMCP & MCP-B (2026-02-19)

## 1) What WebMCP is

- WebMCP is a browser-focused MCP effort (W3C community draft + explainer/repo) aiming to expose web-page context and browser capabilities in MCP-compatible form.
- Draft API surface uses browser-exposed model-context primitives (e.g., `navigator.modelContext`) with operations analogous to listing/calling tools.
- Security model emphasizes explicit permission boundaries and host/browser mediation.

## 2) What MCP-B is

- MCP-B is a browser-MCP bridge architecture where a browser extension acts as an MCP server and aggregates tool access from browser tabs/sites.
- Tool naming and routing is namespaced by tab/server/tool (e.g., `<tab>/<server>/<tool>`), enabling multi-tab aggregation.
- Supports local and remote connectivity patterns (WS/SSE/Streamable HTTP/Stdio references appear in docs), with direct or hosted bridge patterns.

## 3) “Preselector list” disambiguation

- I did **not** find a formal standard term “preselector list” in the primary docs reviewed.
- Closest documented concepts are:
  - OpenAI: `allowed_tools` / `tool_names` filtering
  - MCP-B: tool filtering + context-engineering controls (which tabs/servers/tools are surfaced)
- Inference: “preselector list” is likely informal shorthand for one of those allow-list/filtering mechanisms.

## 4) Token-angle clarification

Two distinct token stories are getting mixed in community discussions:

- Tool-definition payload savings:
  - Not inlining large tool JSON schemas each request.
  - Using MCP server pointer + allow-list/cached tool list context.
- Web automation/context savings:
  - Using structured browser tools and scoped calls instead of repeatedly stuffing raw page text/DOM/screenshot context.

Both can reduce effective token usage, but they are different mechanisms.

---

# Token Measurement Results

Tokenizer run:

- Requested model: `gpt-5.3-codex`
- Actual tokenizer used: `o200k_base` fallback (model-specific tokenizer mapping unavailable in local `tiktoken` map)
- Measurement artifact: `Asolaria/reports/mcp_token_measurements_2026-02-19.json`

| Case | JSON chars | JSON bytes | Estimated tokens (`chars/4`) | Actual tokenizer tokens | Savings vs A |
|---|---:|---:|---:|---:|---:|
| A: 50 inline function tools | 26,510 | 26,510 | 6,627.5 | 5,382 | baseline |
| B: 1 MCP pointer + allow-list(5) | 314 | 314 | 78.5 | 82 | 5,300 tokens (98.48%) |
| C: follow-up with `previous_response_id` (no re-send tool block) | 155 | 155 | 38.75 | 42 | 5,340 tokens (99.22%) |

Conclusion from measured payloads:

- The user heuristic (about ~98% savings) is directionally correct.
- Exact numbers depend heavily on schema verbosity and tokenizer choice.

---

# Recommended Refactor + Security Notes

## 1) Refactor target: inline-tool model -> remote MCP pointers where suitable

Recommended implementation steps for Asolaria:

1. Add an OpenAI Responses MCP tool-builder layer (feature-flagged).
2. Keep inline function tools only for small, purely local deterministic helpers.
3. For external integrations (Drive, Gmail, calendar, docs, code-index tools), prefer `type: "mcp"` with strict allow-lists.

Pseudo-code sketch:

```ts
// src/connectors/openaiMcpToolBuilder.ts
export function buildMcpTools(ctx) {
  return [
    {
      type: "mcp",
      server_label: "workspace_tools",
      server_url: process.env.WORKSPACE_MCP_URL,
      authorization: ctx.mcpAuthToken,
      allowed_tools: ctx.allowedToolNames, // minimal set per task
      require_approval: {
        never: { tool_names: ctx.readOnlyTools },
        always: { tool_names: ctx.writeOrSensitiveTools }
      }
    }
  ];
}
```

## 2) Dynamic preselection/filtering strategy (“preselector” equivalent)

- Build an intent-to-tool map in router layer.
- Generate minimal `allowed_tools` per turn from intent + risk profile.
- Add deny defaults for write/financial/security tools unless explicit user confirmation.

Pseudo-code sketch:

```ts
const TOOL_POLICY = {
  calendar_read: ["search_events", "get_event"],
  docs_read: ["search_docs", "read_doc"],
  sensitive_write: ["delete_event", "send_email"]
};
```

## 3) Caching strategy

- Preserve `mcp_list_tools` in conversation context.
- Prefer `previous_response_id` chaining for follow-up turns.
- In Agents SDK local-MCP flows, enable `cache_tools_list/cacheToolsList` only for stable servers; invalidate on deployment or tool schema/version change.

## 4) Security posture

- Trust policy:
  - Only use official/known MCP servers by default.
  - Require explicit allow-list for third-party server URLs.
- Approval policy:
  - `never` only for read-only safe tools.
  - `always` for write actions and external side effects.
- Secret handling:
  - Never persist raw `authorization` tokens in app memory logs.
  - Rotate connector OAuth tokens and scope minimally.
- Data minimization:
  - Filter tools and strip excessive tool output fields before model context injection when possible.

## 5) Decision tree

- Use inline custom tools when:
  - tool count is small
  - local deterministic logic
  - no external auth/connectivity needed
- Use remote MCP (Responses/Hosted MCP) when:
  - many external tools or changing tool catalogs
  - connector/OAuth ecosystem needed
  - token/latency pressure from large tool schemas
- Use WebMCP/MCP-B when:
  - browser-native context/tooling across tabs is central
  - authenticated browser sessions/context are part of task execution
  - you need browser bridge semantics more than classic API connectors

---

# Open Questions / What I Need From You

1. I could not confidently verify the exact Lex clip/page for the “MCP is dead-ish” quote end-to-end because one transcript URL currently resolves to a placeholder page. If you share the exact episode/video URL, I’ll pin the quote with full context and date.

---

# Primary Sources

## Local codebase evidence

- `Asolaria/server.js:10163`
- `Asolaria/server.js:10445`
- `Asolaria/server.js:1941`
- `Asolaria/src/brainOrchestrator.js:129`
- `Asolaria/src/connectors/externalBrainConnector.js:415`
- `Asolaria/src/connectors/externalBrainConnector.js:418`
- `Asolaria/src/connectors/externalBrainConnector.js:426`
- `Asolaria/src/skillRegistry.js:164`
- `Asolaria/config/asolaria.gateway.json:22`
- `Asolaria/config/asolaria.gateway.json:34`
- `Asolaria/src/gateway/toolAuthority.js:171`
- `Asolaria/src/notebookStore.js:510`
- `Asolaria/src/notebookStore.js:518`
- `C:\Users\acer\.codex\config.toml:11`
- `C:\Users\acer\.codex\config.toml:12`

## OpenAI docs / SDK

- https://developers.openai.com/api/docs/guides/tools-connectors-mcp/
- https://developers.openai.com/api/reference/responses/object?api-mode=responses
- https://developers.openai.com/cookbook/examples/mcp/mcp_tool_guide/#filter-tools-to-avoid-ballooning-payloads
- https://developers.openai.com/cookbook/examples/o-series/o3o4-mini_prompting_guide/#agentic-experience-with-hosted-tools
- https://openai.github.io/openai-agents-js/guides/mcp
- https://openai.github.io/openai-agents-python/mcp/
- https://openai.github.io/openai-agents-python/tools/

## MCP core spec

- https://modelcontextprotocol.io/specification/2025-11-25
- https://modelcontextprotocol.io/specification/versioning
- https://modelcontextprotocol.io/specification/2025-11-25/changelog
- https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle
- https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
- https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- https://github.com/modelcontextprotocol/modelcontextprotocol

## WebMCP / MCP-B

- https://webmachinelearning.github.io/webmcp/
- https://github.com/webmachinelearning/webmcp
- https://developer.chrome.com/blog/webmcp-epp
- https://mcp-b.ai/
- https://docs.mcp-b.ai/
- https://docs.mcp-b.ai/concepts/
- https://docs.mcp-b.ai/transports/extension/
- https://docs.mcp-b.ai/transports/remote/
- https://docs.mcp-b.ai/for-ai/
- https://docs.mcp-b.ai/concepts/context-engineering/
- https://docs.mcp-b.ai/concepts/performance/
