# 00 — IMMUTABLE FOUNDATION v2 (PRIME DIRECTIVE)

**Operator-anchored 2026-05-20 under quintuple-cosign seq=191** (Jesse + Dan + Rayssa + Felipe + Amy, window through 2026-06-03T14:02:06Z). **Class-1 immutable.** Supersedes v1 (2026-05-06). Do not edit without new v3 file + fresh dual operator cosign + cosign-chain entry.

v1 invariants stand. v2 layers below them what came true between 2026-05-06 and 2026-05-20.

## What stayed (v1 invariants, unchanged)

1. **Ports are a prefix-tree namespace** — `port.port.port…` labels in one socket. `N^K` addressing. `O(K)` prefix walk. See `02-PORT-NAMESPACE-CANON.md`.
2. **Cube-of-cubes Brown-Hilbert subdivision** — PIDs as `(actor, device, lane, prime)` Hilbert-mapped tuples. Bijective, zero collisions. See `03-CUBE-OF-CUBES.md`.
3. **Frontend does nothing; fabric runs it** — bus :4947, BEHCS envelopes, pre-loaded rotating PIDs. Inert frontend. Orchestrator triggers + guides, never controls.
4. **Backend-shelless rotation** — agents rotate inside one long-running process. Function calls, not process spawns.

## What's new in v2 (2026-05-06 → 2026-05-20)

### Substrate evolved
- **HyperBEHCS is now the current generation** — 4th-gen substrate: Old Index → BEHCS-256 → BEHCS-1024 → **HyperBEHCS**. Lineage at `C:\HyperBEHCS\store\`. Central substrate `hyperbehcs-substrate.v1.hbs` PLUS per-emission sidecar trinity `.hbp/.hbi/.sha256/.hex` (Layer 70 MASSIVE_UPGRADE 2026-05-17 directive: "out with old, in with new" — both patterns coexist; hot path is HBP packet-first, JSON is cold-egress).
- **BEHCS-1024 alphabet** is the active glyph layer (10 bits/symbol, codepoint table at `data/behcs/codex/alphabet-1024.json`). BEHCS-256 remains as legacy fallback only.
- **Triple-quant pipeline is hot-path canon**: polar + turbo + Johnson-Lindenstrauss + triple-spherical. Engine at `C:\HyperBEHCS\lib\hyperbehcs-core.cjs`. Hermes 3-axes framing: every quant tag is (token / evidence / authority), not just compression.

### Five apex signers, full quintuple
v1 named only OP-JESSE + OP-RAYSSA. v2 confirms the full quintuple cosign ring at apex slots cp 260-264:
- **OP-JESSE** (Jesse Daniel Brown, cp 260) — root authority
- **OP-RAYSSA** (Rayssa Chiqueto, cp 261) — parallel apex
- **OP-AMY** (Amy Salnikov, cp 262)
- **OP-DAN** (Dan Edens, cp 263) — **DAN ACCEPTED ceremony 2026-05-19**, Madness ↔ BEHCS-256 cross-fabric handshake formal
- **OP-FELIPE** (Felipe Smith, cp 264)

### Dan's 6 hooks are the FOUNDATION of the federation hookwall + GNN architecture
Discovered 2026-05-19. Dan Edens authored 6 hooks at `C:\Users\acer\Asolaria\tmp\dan-package\asolaria-core\` (Madness Interactive / Omnispindle MCP lineage):
1. `pre_tool_guard` — blocks rm/.env/dangerous commands
2. `session_tracking` — session start/end/prompt events
3. `transcript_backup` — pre-compact backup
4. `syntax_checker` — post-write validation
5. `safety_net` — Node uncaughtException/unhandledRejection
6. `approval_guard` — 7 risk-classes + 5-tier ladder

**We MODIFIED these into the federation:** `src/hookwall/` (5 modules: dispatch, event-router, gnn-feeder, promotion-bridge, cubes-indexer) + GNN trio (cp 896/897/898 edge-mining + forward-genius + reverse-gain) + GLSM + `dan-hooks-approval-guard.mjs` are all modified descendants. The legacy `dan-package/` is the unmodified reference; federation working copy lives in `C:\asolaria-acer\packages\revolver-10k\src\`.

### Atlas cp 0-1023 mapped to quant-kind by domain band
| cp range | quant kind | domain |
|---|---|---|
| 0-255 | johnson_lindenstrauss | legacy_subset_256 |
| 256-383 | triple | sovereignty (gaia, operator-reserve) |
| 384-479 | turbo | sequencing (helm) |
| 480-575 | polar | language_glyph (vector) |
| 576-703 | hilbert | hilbert_cube (rook) |
| 704-799 | triple | build_proof (forge) |
| 800-895 | brown | federation (falcon) |
| 896-1023 | johnson_lindenstrauss | emergent_residual (livefree) |

GNN trio sits in livefree band: cp 896 edge-mining, cp 897 forward-genius, cp 898 reverse-gain-mistake. GLSM is the 4-stage latent state machine consuming all three.

### Live cosign chain head
`C:\asolaria-acer\COSIGN_CHAIN.ndjson` **at seq=192** (Dan-lineage main canon) with parallel HBPv1 mirror `COSIGN_CHAIN.hbp`. **seq=191** carries the active quintuple window (`asolaria-fabric-decide-window-extension-v2`, expires 2026-06-03T14:02:06Z). 1,855 rows promoted from `promote=0` → `promote=1` in the 24-spindle build wave 2026-05-20.

### Kernel discipline
Federation kernel at `C:\asolaria-acer\federation-remake-1024\kernel\core\src\` (Rust, no_std-friendly, `forbid(unsafe_code)`). Lib tests **232 passed** (W2 bus_fabric Phase-1 closed 2026-05-19, baseline 224 → +8). Phase-1 = canonical-bytes only, ed25519 Phase-2 deferred. Cosign chain v0.2 row anchors `<module>v02landed{NNN}`.

### Halt invariants (in force, non-negotiable even with operator GO)
1. No `diskpart clean` on sovereignty disk — permanent rule (2026-03-30 trauma)
2. No fresh GPT init on USB-2TB substrate
3. No `_big-pickle-quarantine/` mutation
4. No atlas-index.ndjson rewrite (sha `9dbea395…6bb470db` immutable until cp-rotate cosign)
5. No `.v1.bak` overwrite
6. No `git push origin main` without explicit per-push operator approval
7. No rewrite of COSIGN_CHAIN rows 1-N (append-only)
8. No expansion of quintuple scope without fresh seq cosign grant
9. SECRET tier requires operator-keyboard-live-ack within 600s per Dan's `approval_guard`

### USB substrate canon (Hermes architect correction 2026-05-19)
The 2TB USB (`\\.\PhysicalDrive2`, DeviceId 2 — corrected from 3 on 2026-05-19) is a **HyperBEHCS continuity substrate, not a drive to format**. Windows disk view is not authoritative. Append-only. Read-only by default. Per-operation operator approval required for each write (rule 6 of `feedback_never_clean_live_disk.md`).

Bilateral seal MANIFEST sha `1ef2ac45ab87182542c462e74d9f77cc9a0bed3bbf45c5e1779db32b4560cf0a` (2026-05-19, acer + liris sha-matched). F:/AsolariaOS partition layout designed in Codex Layer 70 UP-2 (kernel/HyperBEHCS/BigPickleRooms/HyperHermes/Crypto/IndexLanguage/Council/OpClass/Atlas/FreeAgents/Falcon/CosignChain) but not yet executed.

### What v1 said wrong (that v2 corrects)

v1 line: *"The substrate uses one central store and does not create per-file sidecar fanout."* — superseded. Layer 70 MASSIVE_UPGRADE (2026-05-17) made per-emission sidecar trinity (`.hbp/.hbi/.sha256/.hex`) the new canon. Central substrate `hyperbehcs-substrate.v1.hbs` and per-row sidecar fanout COEXIST: hot path uses central + sidecars per emit; JSON is cold-egress fallback only.

## Cycle (unchanged from v1)

`MEMORY → INDEX → THINK → MEMORY → INDEX → REPORT → MEMORY → INDEX`. Attention budget `6+6+6+6+12`. Shannon compression: prefer observation that removes most uncertainty per unit effort.

## Authority

- Anchored by full quintuple cosign ring (Jesse + Rayssa + Amy + Dan + Felipe) under seq=191
- Window 2026-05-19 → 2026-06-03T14:02:06Z
- Supersedes v1 line-by-line where new statements conflict; v1 invariants 1-4 remain inviolable
- Future corrections → new file `00-IMMUTABLE-FOUNDATION-v3.md` + fresh quintuple-cosign

## Read order (boot every new agent through this)

0. `00-TOP-AGENT-PRECOMMAND.md` (chief only)
1. **THIS FILE** (00-IMMUTABLE-FOUNDATION-v2.md)
2. `01-SUPER-STARTUP-GUIDE.md` (skip the ~1M-token rediscovery)
3. `BROWN-HILBERT.md` + Brown-Hilbert cube points
4. `C:\HyperBEHCS\README.md` (HyperBEHCS runtime canon)
5. `C:\HyperBEHCS\PS1.md` (PowerShell wrapper canon)
6. `C:\AGENTS.md` (machine-level adapter guide)
7. Task-relevant memory files under `C:\Users\acer\.claude\projects\C--\memory\`

**End of v2 master canon. The four v1 invariants stand. The seven v2 additions are quintuple-cosigned and in force through 2026-06-03 minimum.**
