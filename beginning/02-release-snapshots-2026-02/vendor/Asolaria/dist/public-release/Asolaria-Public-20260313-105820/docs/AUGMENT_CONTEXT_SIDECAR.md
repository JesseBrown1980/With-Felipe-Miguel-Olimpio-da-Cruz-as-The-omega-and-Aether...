# Augment Context Sidecar

This integration adds Augment as a read-only context sidecar for Asolaria. It is intentionally not a new top-level brain provider.

## Modes

- `local_cli`
  - Uses the local Asolaria MCP bridge against the current workspace.
  - If Auggie CLI is installed, the bridge can proxy its `codebase-retrieval` tool, but Auggie is optional now.
  - Best for human-operated Codex sessions on the same machine as the checkout.
  - Does not directly attach to Asolaria external providers because the current external MCP runtime expects a remote MCP server.

- `remote_mcp`
  - Stores a remote MCP server URL or connector ID plus optional auth/headers.
  - Can be applied onto `cursor` or `antigravity` via Asolaria's external-provider MCP settings.
  - Locked to read-only `codebase-retrieval` with `read_only` + `never` approval.

## API

- `GET /api/integrations/augment-context/status`
- `POST /api/integrations/augment-context/config`
- `POST /api/integrations/augment-context/apply`

## Current local setup

- Workspace root: `C:\Users\acer\Asolaria`
- Local MCP URL: `http://127.0.0.1:4793/mcp`
- Bridge token file: `C:\Users\acer\Asolaria\logs\augment-mcp-bridge-token.txt`
- Public tunnel URL artifact: `C:\Users\acer\Asolaria\logs\augment-mcp-bridge-url.txt`
- Default local Codex command:

```powershell
codex mcp add augment-context --transport http "http://127.0.0.1:4793/mcp" --header "Authorization: Bearer <bridge token>"
```

## Remote bridge mode

If you want Asolaria's `cursor` external provider to use Augment, the supported path is:

1. Start the local bridge in [augment-mcp-bridge.js](/C:/Users/acer/Asolaria/tools/augment-mcp-bridge.js).
2. Optionally let it proxy Auggie if Auggie is installed; otherwise it serves Asolaria-owned local retrieval directly.
3. Start the bridge and a Cloudflare quick tunnel with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Start-AugmentMcpBridge.ps1
```

4. Save the returned `serverUrl` plus bridge token into `POST /api/integrations/augment-context/config`.
   Prefer a custom header like `X-Asolaria-Bridge-Token` instead of the MCP `authorization` field when routing through the OpenAI Responses API.
5. Apply it to `cursor` with `POST /api/integrations/augment-context/apply`.
6. For Claude's web custom connector, the public MCP URL can be used with a `?token=<bridge token>` query parameter because the bridge accepts URL-token auth in addition to headers.

The bridge is intentionally narrow:

- Only `codebase-retrieval` is exposed.
- HTTP access is bearer-protected and also accepts a tokenized URL form for clients that cannot send custom headers.
- The downstream MCP surface is stateless Streamable HTTP, suitable for remote MCP clients.

## Safety

- `.augmentignore` is checked in at the repo root to keep runtime data, temp files, and local secrets out of Augment indexing by default.
- Allowed tools are restricted to `codebase-retrieval`.
- Generated provider patches always use `read_only`, `never`, and a compact/pointer schema selected from the configured auth shape.

## Helm / Sentinel

- `Helm` may use Augment as a read-only indexing and retrieval sidecar while coordinating QDD.
- `Sentinel` may use the same sidecar to detect stale assumptions, conflicting restart packets, or scope drift.
- Even in `SUPER_SWARM` mode, Augment stays read-only. It is not a top-level writer lane and it must not replace local Codex or controller decisions.
