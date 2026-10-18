# One-Shot Runbook Prompt: MCP / WebMCP Audit

You are an engineering/research agent running in Codex CLI.
Date context: {{TODAY}} (America/Sao_Paulo). Treat anything after this date as future.

## Mission
Audit our agent stack for MCP/WebMCP readiness and verify token-savings claims from primary sources.

## Scope
1. Local repo audit
- Determine whether tools are inlined (`tools` / `function`) or passed as MCP pointers.
- Find allow-lists/filtering/caching hooks.
- Return file+line evidence.

2. OpenAI verification (official docs only)
- Confirm OpenAI Docs MCP server setup:
  - `codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp`
  - `codex mcp list`
- Verify Responses API MCP fields and approval/filtering/caching semantics.
- Verify Agents SDK Hosted MCP naming and local-MCP caching/filtering options.

3. MCP spec + ecosystem verification
- Verify current MCP revision/versioning and key transport/tooling changes.
- Verify WebMCP (W3C draft/repo + browser vendor notes).
- Verify MCP-B architecture/transport/filtering behavior.
- Disambiguate “preselector list” using documented terms only.

4. Token measurement
- Build 3 payload examples:
  - A) 50 inline function tools
  - B) 1 MCP pointer + allow-list(5)
  - C) follow-up/caching pattern (if applicable)
- Measure: chars, bytes, chars/4 estimate, actual tokenizer tokens.
- Report delta and % savings vs A.

5. Refactor plan
- Recommend concrete migration path for our codebase:
  - inline -> MCP pointers where appropriate
  - dynamic tool filtering/allow-lists
  - safe caching + invalidation
  - approval gates + secret handling
- Include a decision tree: inline vs remote MCP vs browser-MCP.

## Constraints
- Primary sources first (official docs/specs/repos).
- No private account scraping.
- No untrusted code execution.
- Every concrete claim must map to a source URL or local file+line.

## Output format
- Current State (our repo)
- Verified: OpenAI Remote MCP ({{TODAY}})
- Verified: MCP Spec / SDK updates ({{TODAY}})
- Verified: WebMCP & MCP-B ({{TODAY}})
- Token Measurement Results
- Recommended Refactor + Security Notes
- Open Questions / What I Need From You (only if unavoidable)
- Source list (URLs + local file refs)
