# ADR-0004: Connector Manifest Registry

## Status
Accepted (implemented 2026-03-15)

## Context
44 connectors exist in src/connectors/ as opaque modules with no standardized interface contract. There is no way to programmatically discover connector capabilities, health check availability, secret requirements, or failure modes. This blocks dynamic connector loading (Phase 3), connector governance (Phase 4), and safe MCP exposure (Phase 8).

## Decision
Create src/connectorManifest.js as a registry that discovers all *Connector.js files and calls their manifest() export if available. Each manifest returns a standardized contract: id, version, description, capabilities, readScopes, writeScopes, approvalRequired, healthCheck, retrySemantics, timeoutMs, secretRequirements, sideEffects, failureModes, emittedEvents.

Manifests are added incrementally to each connector file — no big-bang. API at /api/connectors/manifests and /api/connectors/manifests/:id.

## Current Progress
13/42 connectors have manifests (mqtt, hooks, slack, geminiApi, google, vertex, anthropicCli, codex, abacus, augmentContext, symphony, github, telegram). Background agent adding 20 more.

## Consequences
- Positive: programmatic connector discovery, health dashboard, approval requirement visibility
- Negative: manifest() must be maintained alongside connector changes
- Risk: manifest could drift from actual behavior if not tested

## Rollback
Remove manifest() from connector exports, delete src/connectorManifest.js, remove API routes.

## Evidence
- GET /api/connectors/manifests returns total/withManifest/withoutManifest counts
- Each manifest validates against required schema fields
