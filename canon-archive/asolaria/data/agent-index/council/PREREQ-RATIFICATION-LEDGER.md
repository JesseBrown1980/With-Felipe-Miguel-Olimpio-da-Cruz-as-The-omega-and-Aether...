# Prereq Ratification Ledger

Date: 2026-04-27  
Ledger class: D49 operational ledger feeding D50 meta-ratification

## Closed Verdict Enum

- `EVIDENCED`
- `RATIFIED`
- `BOUND`
- `DEFERRED`
- `REJECTED`
- `HALTED`

No freeform verdicts are valid in this ledger.

## Required Columns

| Prereq | Evidence Artifact | Evidenced At | Ratified At | Bound At | Verdict | Cosign | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hermetic seal channel | pending | pending | pending | pending | DEFERRED | pending | Required before dual-sub binding |
| Per-sub session lock | pending | pending | pending | pending | DEFERRED | pending | Jesse lock must not reuse Rayssa lock state |
| Non-overlapping keys | pending | pending | pending | pending | DEFERRED | pending | Separate issuer/audience and revocation scope |
| Hookwall fresh attestation | pending | pending | pending | pending | DEFERRED | pending | Dry-run before write-class action |
| D_AUTH typed field | pending | pending | pending | pending | DEFERRED | pending | Field semantics separate from dimension slot |
| GAIA rejoin HELLO-ATTEST | `reports/federation-reintegration-prep-latest.md` | 2026-04-27T15:13:52-03:00 | pending | pending | DEFERRED | L6 FULL pending | GAIA must clear read-class HELLO-ATTEST over ACER hub before any write/prod capability. |
| GAIA endpoint identity for HELLO-ATTEST | `reports/federation-reintegration-wave20-latest.md` | 2026-04-27T15:21:38-03:00 | pending | pending | HALTED | L6 FULL pending | Wave 20 proved ACER+Liris LAW-001 live, but did not find a direct GAIA network endpoint or witness mapping. |
| FALCON / ACER-Jesse phone identity | `data/agent-index/FALCON-AETHER-FINGERPRINT-RECOVERY-2026-04-27.md` + `operator/hyperbehcs-jesse-s25fe-usb-ai-bridge-20260519/JESSE-S25FE-USB-AI-BRIDGE.hbp` | 2026-04-27T15:13:52-03:00 / 2026-05-19 | pending | pending | EVIDENCED | APEX pending | ACER sees/canon maps Falcon/Jesse FE as `R5CXA4MGQXV`; local archaeology maps `RQCX907KFTK` to Rayssa/Liris phone. Active ACER/Jesse selector is `device.jesse.s25fe.usb_ai`; no active device hold is carried forward. |
| AETHER-LIVE embodied PID mint | `data/agent-index/plans/AETHER-LIVE-HANDSHAKE-NONCE-PROTOCOL-2026-04-27.md` | 2026-04-27T15:13:52-03:00 | pending | pending | DEFERRED | L5 provisional, L6 before promotion | Sim remains permanent simulated ancestor; live PID requires nonce/fingerprint response. |
| Quadrilateral federation transition | `reports/federation-reintegration-prep-latest.md` | 2026-04-27T15:13:52-03:00 | pending | pending | DEFERRED | COSIGN-FEDERATION-PROMOTE pending | Parent row for ACER+LIRIS+GAIA+FALCON/AETHER promotion; requires per-handshake artifacts first. |

## D50 Rule

When any row changes from `RATIFIED` to `BOUND`, the transition must produce a D50-tracked artifact. Otherwise the transition is invalid.
