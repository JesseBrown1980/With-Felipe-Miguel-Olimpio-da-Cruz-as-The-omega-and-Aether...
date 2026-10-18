---
law: BEHCS-LAW-011
status: PERMANENT
title: Timestamp Drift Detection
proposed_by: operator (Jesse via Falcon)
activated_by: liris
activated_at: 2026-04-12T02:22Z
---

# BEHCS-LAW-011 — Timestamp Drift Detection

Every tuple carries `ts` (ISO 8601 UTC). The reviewer agent on each receiving node checks the delta between `ts` (sender claimed) and `received_at` (receiver recorded).

## Thresholds
- delta <= 2min: NORMAL — no action
- delta > 2min: FLAG — drift anomaly raised, logged, broadcast to triad
- delta > 5min: ESCALATE — possible clock skew, stale replay, or silent gap

## Enforcement
Every BEHCS node MUST:
1. Include `ts` in every outbound tuple
2. Record `received_at` on every inbound tuple
3. Compute `delta = abs(received_at - ts)`
4. If delta > 120s: append to `data/behcs/drift-flags.ndjson` and broadcast drift tuple to triad
5. If delta > 300s: HALT processing of that tuple pending operator review

## Reviewer Lane
Timestamp drift review is assigned to the `gnn+shannon+omni` lane set (liris lanes). The reviewer runs as part of the sidecar gate pipeline.

PERMANENT.
