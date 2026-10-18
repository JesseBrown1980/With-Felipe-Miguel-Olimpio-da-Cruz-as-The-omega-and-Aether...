# MCP/WebMCP Audit (Always-On Snippet)

Use this when the task involves MCP, connectors, WebMCP, MCP-B, tool payload size, or “token bloat” claims.

## Operating Rules
- Treat all concrete claims as untrusted until verified with primary sources or local code inspection.
- Prefer official sources: OpenAI docs/OpenAPI, MCP spec repo/site, W3C draft/repo, browser-vendor docs.
- Do not use private account data or non-public history.
- Do not connect to untrusted MCP servers or leak secrets.

## Required Workflow
1. Inspect local code first:
   - Find how tool schemas are passed today (inline tools vs MCP pointers).
   - Capture file+line evidence.
2. Verify OpenAI API/SDK shape:
   - Use OpenAI Docs MCP server (`openaiDeveloperDocs`) and official API docs.
   - Confirm canonical fields and naming differences (Responses vs Agents SDKs).
3. Verify MCP/WebMCP/MCP-B status as-of date:
   - Identify what is standardized vs preview/experimental.
4. Measure token impact with real tokenizer:
   - A: many inline tools
   - B: one MCP pointer + allow-list
   - C: follow-up/caching pattern where applicable
   - Report chars, bytes, chars/4 estimate, actual tokenizer tokens, delta/savings.
5. Produce implementation guidance:
   - Allow-list strategy
   - Caching/invalidation strategy
   - Approval/security policy
   - Decision tree for inline vs remote MCP vs browser-MCP

## Output Contract
Return markdown with:
- Current State (repo)
- Verified: OpenAI Remote MCP (dated)
- Verified: MCP Spec/SDK updates (dated)
- Verified: WebMCP & MCP-B (dated)
- Token Measurement Results
- Recommended Refactor + Security Notes
- Open Questions (only if unavoidable)
