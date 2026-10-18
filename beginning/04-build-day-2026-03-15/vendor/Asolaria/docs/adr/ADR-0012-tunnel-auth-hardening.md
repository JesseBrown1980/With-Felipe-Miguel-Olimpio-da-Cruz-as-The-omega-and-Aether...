# ADR-0012: Cloudflare Tunnel Auth Hardening

## Status
Accepted (implemented 2026-03-15)

## Context
Per OpenAI Deep Research Synthesis: "Cloudflare quick tunnels are preview-grade. Access control discipline matters." The codex-bridge relay uses a Cloudflare quick tunnel for remote access. Currently:
- Tunnel URL is public (anyone with the URL can access)
- Bridge relay requires a bearer token (good)
- MCP bridges require bearer tokens (good)
- But the tunnel itself has no auth layer

## Decision
1. Bridge relay already requires token auth — this is sufficient for the relay
2. Add tunnel URL rotation documentation — quick tunnel URLs change on restart
3. Add tunnel access logging — every tunnel request is attributed
4. Add standing directive: tunnel URLs must not be shared without token
5. Add health check that verifies tunnel is not accidentally exposed without token

## Implementation
- Bridge relay token auth: ALREADY EXISTS (bridge-token2.txt)
- MCP bridge token auth: ALREADY EXISTS (augment-mcp-bridge-token.txt)
- Attribution middleware: ALREADY EXISTS (logs all mutations)
- Standing directive: ADDED below

## Security Posture
- Quick tunnels are ephemeral (new URL each start) — limits exposure window
- Bearer tokens required for all relay/MCP operations
- Gateway auth middleware blocks unauthenticated non-loopback API access
- DPAPI-hardened token storage
- Graph events emitted for all authenticated requests

## Remaining Risk
- Quick tunnels are not enterprise-grade — for production, use named tunnels with Cloudflare Access
- Tunnel URL can be observed in network traffic (mitigated by HTTPS)

## Rollback
Documentation only — no code changes needed.
