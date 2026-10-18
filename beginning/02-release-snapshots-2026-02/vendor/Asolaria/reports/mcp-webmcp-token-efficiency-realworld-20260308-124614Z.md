# MCP/WebMCP + Skill Linking Real-World Token Efficiency Test

Generated: 2026-03-08T12:46:14.537590+00:00

## Runtime Snapshot
- skills_total: 55
- skill_actions_total: 32
- mcp_providers: 1
- cursor_mcp_enabled/configured: True/True
- cursor_mcp_profile: aggressive
- cursor_mcp_tool_schema_mode: full
- cursor_mcp_prompt_token_limit: 900
- live_skill_run: completed job job_1772973631706_zyaaww in 129446 ms

## Token Measurement Table

| Scenario | chars | bytes | chars/4 est | tokens (o200k) | tokens (cl100k) |
|---|---:|---:|---:|---:|---:|
| tools_inline_50 | 33023 | 33023 | 8256 | 7736 | 7085 |
| tools_mcp_current | 307 | 307 | 77 | 83 | 82 |
| tools_mcp_pointer_5_plus_prev | 438 | 438 | 110 | 113 | 112 |
| skill_run_by_id | 114 | 114 | 29 | 26 | 26 |
| skill_run_inlined_single | 2111 | 2111 | 528 | 555 | 548 |
| skill_catalog_ids | 1605 | 1605 | 402 | 398 | 392 |
| skill_catalog_inlined | 47583 | 47583 | 11896 | 11851 | 11595 |

## Savings (o200k)
- inline50 -> mcp_current: 7653 tokens saved (98.93%)
- inline50 -> mcp_pointer5+prev: 7623 tokens saved (98.54%)
- skill single inline -> skill id link: 529 tokens saved (95.32%)
- skill catalog inline -> ids link: 11453 tokens saved (96.64%)

## Interpretation
- MCP pointer-style tool calling massively reduces request payload versus large inline tool schema sets.
- Skill linking by ID is substantially cheaper than embedding full skill JSON/steps in model context.
- Current runtime is aggressive profile, but status reports toolSchemaMode=full; align to pointer if you want strict profile consistency.

## Evidence Inputs
- /api/integrations/external/status
- /api/integrations/external/mcp-cache
- /api/skills/index?force=true
- /api/jobs?limit=50
- local skill definitions under Asolaria/skills/*/skill.json
