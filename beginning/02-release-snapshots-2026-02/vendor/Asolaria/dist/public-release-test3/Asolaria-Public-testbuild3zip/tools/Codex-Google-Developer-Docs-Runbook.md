# Codex + Google Developer Docs (MCP) Runbook

Use this when you need authoritative Google developer documentation (API reference pages, quotas/limits, auth scopes, error codes, exact field/parameter names) and want citations/links.

## One-time MCP Setup (Codex)

1. Add the MCP server (if missing):

```powershell
codex mcp add googleDeveloperKnowledge --url https://developerknowledge.googleapis.com/mcp
```

2. Ensure `C:\Users\acer\.codex\config.toml` contains:

```toml
[mcp_servers.googleDeveloperKnowledge]
url = "https://developerknowledge.googleapis.com/mcp"
env_http_headers = { "X-Goog-Api-Key" = "GOOGLE_DEVKNOWLEDGE_API_KEY" }
```

## Set API Key (per shell)

Current PowerShell session:

```powershell
$env:GOOGLE_DEVKNOWLEDGE_API_KEY = "<your-api-key>"
```

Persist for future shells:

```powershell
setx GOOGLE_DEVKNOWLEDGE_API_KEY "<your-api-key>"
```

Rules:
- Never paste or commit the key.
- Refer to the env var name only: `GOOGLE_DEVKNOWLEDGE_API_KEY`.

## Verify MCP Connectivity

```powershell
codex mcp list
codex mcp get googleDeveloperKnowledge
```

## Use With Codex (Recommended)

Use the skill:

```powershell
codex exec "Use $google-code-wiki to find and cite the official Google docs for: <question>"
```

If the skill name is not available in your environment, be explicit:

```powershell
codex exec "Use the googleDeveloperKnowledge MCP server to find and cite the official Google docs for: <question>"
```

## Use With Other Programs (Any MCP Client)

- MCP server URL: `https://developerknowledge.googleapis.com/mcp`
- Required HTTP header: `X-Goog-Api-Key: <value of GOOGLE_DEVKNOWLEDGE_API_KEY>`

## Troubleshooting

- 401/403: the env var is not set in the shell running Codex, or the API key is not permitted to call the Developer Knowledge API (or that API is not enabled for the project).
- Results look wrong/stale: include the exact product name + version in your query and cross-check another official doc page.

