# Codex MCP/WebMCP Audit Runbook (One-Shot)

Use this only when you want a full MCP/WebMCP state-of-the-world audit. Do not run by default.

## Preflight

1. Ensure OpenAI docs MCP server is configured:

```powershell
codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp
codex mcp list
```

2. Optional config alternative in `~/.codex/config.toml`:

```toml
[mcp_servers.openaiDeveloperDocs]
url = "https://developers.openai.com/mcp"
```

## One-Shot Prompt

Copy and send this prompt to Codex when you want the audit:

```text
You are an engineering/research agent running inside Codex CLI.
Today's date is 2026-02-19 (America/Sao_Paulo). Treat anything dated after 2026-02-19 as future.

MISSION
Audit our understanding and implementation of MCP / OpenAI remote MCP / WebMCP / MCP-B, with explicit evidence and token-cost measurement.

HARD REQUIREMENTS
- Every concrete claim must be backed by a primary source citation or local code inspection with file+line refs.
- Prefer official docs/specs/repos. Use secondary sources only for lead generation, then confirm with primary sources.
- Do not access private accounts/history. Ask for URLs if needed.
- Do not run untrusted internet code.

PART A - LOCAL CODEBASE CHECK
1) Identify current tool delivery architecture:
- Inline function tools per request?
- MCP servers already used? If yes: pointer config, filtering, caching.
2) Search repo for:
- "tools": [ ... ], "function": { "name", "parameters" }
- "allowed_tools", "tool_names", "tool_choice"
- "mcp", "MCPServer", "list_tools", "callTool", "mcpServers", "server_url", "server_label"
- tool registry/toolset/skills/dynamic loading
3) Output a short "Current State" section and where token bloat likely occurs.

PART B - VERIFY OPENAI REMOTE MCP (AS OF 2026-02-19)
1) Verify docs from OpenAI docs MCP pages for:
- Responses API MCP tool object fields
- approvals, filtering/allow-lists, caching behavior
- Agents SDK HostedMCPTool equivalents and naming differences
- notes on token cost/latency with large tool sets
2) Produce "Verified API Shape" with exact canonical field names and aliases seen in docs.

PART C - VERIFY WEBMCP / MCP-B (AS OF 2026-02-19)
Use primary sources first:
- https://webmachinelearning.github.io/webmcp/
- https://github.com/webmachinelearning/webmcp
- https://developer.chrome.com/blog/webmcp-epp (if available by date)
- https://mcp-b.ai/
- https://docs.mcp-b.ai/
Deliver:
1) What WebMCP is and API shape (for example navigator.modelContext if present).
2) What MCP-B is (extension/tab transport/tool aggregation).
3) Where "preselector list" maps in real docs (allow-list, preselection, cached tool inventory, etc.).
4) Clarify token angle:
- tool-definition payload reduction
- browser-context reduction

PART D - OPTIONAL CLAIM TRACE ("MCP IS DEAD")
1) Search public web/reddit/youtube transcripts for:
- "MCP is dead", "Model Context Protocol is dead", "Lex Fridman MCP", "WebMCP", "MCP-B", "tool bloat", "preselector"
2) If identified confidently, capture quote snippet, speaker, date, and exact criticism context.
3) If not confident, stop and ask user for exact URL/title/channel.

PART E - TOKEN MEASUREMENT (NO GUESSING)
Create and measure at least:
A) 50 inline function tool schemas
B) 1 MCP server pointer + allow-list of 5 tools
C) Any documented hosted registry/caching pointer mechanism (if applicable)
For each:
- raw JSON chars/bytes
- estimated tokens (chars/4)
- actual tokenizer tokens (best available tokenizer for target model; state limitation)
- delta and percent savings

PART F - RECOMMENDED REFACTOR
Deliver:
1) What is actually new and why it matters now.
2) Concrete codebase changes (patches or pseudo-code):
- inline tools -> remote MCP pointers where appropriate
- dynamic allow-list/preselection
- tool-list caching + invalidation strategy
- security posture (approval gates for mutating tools, trusted-server allowlist, secret handling)
3) Decision tree:
- when inline tools are better
- when remote MCP is better
- when WebMCP/MCP-B is relevant

OUTPUT FORMAT
- Current State (our repo)
- Verified: OpenAI Remote MCP (2026-02-19)
- Verified: MCP Spec / SDK updates (2026-02-19)
- Verified: WebMCP & MCP-B (2026-02-19)
- Token Measurement Results
- Recommended Refactor + Security Notes
- Open Questions / What I Need From You (only if unavoidable)
```

