# aoom_find_files: a read-only sidecar file finder (from ACER, 2026-10-18)

The owner asked for a sidecar tool, so that searches like "find a 3,078-byte file whose sha256 starts with a65c020a, any name" never need a shell.
It lives in the `asolaria-os-on-metal` MCP server (`server.js` in this zip), alongside the other L2b sidecar tools.

## What it does
- Walks **only allow-listed roots**: the ones in `AOOM_FIND_ROOTS`, separated by `;`.
  - Default on Windows (ACER): `D:/`, `C:/Users/acer`, `C:/HyperBEHCS`, `C:/asolaria-acer`, `C:/tmp`, `C:/$Recycle.Bin`.
  - Default elsewhere: `$HOME` and `/tmp`.
- Filters by **exact size** (`size`) and/or a **case-insensitive name regex** (`name_regex`). It refuses a search with neither.
- **Hashes only the files whose size already matches**, streaming each one. `sha256_prefix` requires `size`, so it never hashes blindly.
- **Never writes, moves or deletes.** It skips `node_modules`, `.git`, `target`, `__pycache__`, `.venv` and `System Volume Information`, and it doesn't follow symlinks.
- Stops at `max_seconds` (default 300, max 900) and `max_results` (default 200, max 500), and reports `timed_out` and `capped`.

## Output (HBP rows, json=0)
    AOOMFINDHIT|path=...|bytes=...|mtime_utc=...|sha256=<full>|prefix_match=1/0/-|json=0
    AOOMFINDSUM|roots=...|size=...|sha256_prefix=...|hits=...|prefix_matches=...|files_scanned=...|dirs_scanned=...|errors=...|timed_out=0/1|capped=0/1|secs=...|writes=0|json=0

## Install (the cloud or any seat)
    mkdir -p asolaria-os-on-metal && cp server.js package.json asolaria-os-on-metal/
    cd asolaria-os-on-metal && npm install          # @modelcontextprotocol/sdk ^1.26.0, zod ^4.3.6
    export AOOM_FIND_ROOTS="/root;/home;/workspace;/tmp"     # whatever this machine should search
Register it with Claude Code, either as a project `.mcp.json` entry or with `claude mcp add`:

    { "mcpServers": { "asolaria-os-on-metal": { "command": "node", "args": ["/abs/path/asolaria-os-on-metal/server.js"],
        "env": { "AOOM_FIND_ROOTS": "/root;/home;/workspace;/tmp" } } } }

Reconnect (`/mcp`) or start a new session. The tool then shows up as `mcp__asolaria-os-on-metal__aoom_find_files`.
Its other tools are ACER-specific: host8, recall and the FABLE5 office paths. They're configurable by env, but they refuse or come back empty where those services don't exist.
The Codex and Claude-message tools spawn processes or call APIs, so don't use them unless directed.

## Use without MCP registration
`test_find.mjs` drives the server over stdio, one JSON argument per call:

    node test_find.mjs ./server.js '{"size":3078,"sha256_prefix":"a65c020a","max_seconds":600}'
    node test_find.mjs ./server.js '{"name_regex":"^COMBINED-BOOK-OF-LAWS","max_seconds":120}'

## Tested on ACER (Windows, node 24, 2026-10-18)
- `{}`: refused (`need_size_or_name_regex`). `{"sha256_prefix":"a65c020a"}`: refused.
- `C:/HyperBEHCS`, size 25,315: 1 hit, the W113 roster, with full sha256 and mtime. 575,201 files in 43 s, 0 writes.
- `C:/HyperBEHCS`, `name_regex ^100-pid-roster-W113`: 5 hits in 3 s.
- `C:/tmp`, `C:/$Recycle.Bin`, `C:/asolaria-acer`, size 3,078 with prefix `a65c020a`: 10 size hits, 0 prefix matches. 202,396 files in 20 s.
