# ASOLARIA CRANK RECEIPT — c→b→a: $0 summon + Rust workload parity (2026-06-19, acer)

## SIGNIFICANCE
The bridge from **registered descriptor → live working agent** is now proven **end-to-end at $0**, via **BOTH** the node lane (`gaia-loader`) **AND** the Rust lane (`host8-serve`), with **byte-exact `instance_pid` parity**. That parity is the **node-retirement precondition** the whole architecture is built on — and it is now MET, with **parity held** (node still serves, nothing retired). A registered seat can be summoned to a position, on any device, as a working agent, for **$0**.

This was reached by an Algorithm-of-Thoughts ordering **c → b → a** (prove the $0 backend → wire GAIA's catalog-load/summon onto it → build the Rust workload twin with parity), each step real and verified.

## NEW ARTIFACTS — clone + replicate
1. **`bigpickle-rebuild/src/gaia-loader.mjs`** (GAIA summon-executor, additive — fills `model-citizen-rotator`'s "summon execution not yet implemented" gap):
   - `loadCatalog()` → 1,860 positions from live `host8-serve http://127.0.0.1:5088/seats.hbp` (office-file fallback) + verb axis (73) + ability profiles (6) + 47D canon.
   - `resolveAgent(position, device, ts)` → device-duplicatable: base = seat `handle8`; **`instance_pid = sha16(handle8|device|ts|verb.noun.glyph.handle8)`** where `glyph = sha16("glyph|"+noun+"|"+cube_bh)`, `verb` from `verbs.hbp`. Same agent loads into ANY device tuple, instance distinct per device.
   - `summon()` → fires `runFreeAgent` (room-dispatcher.mjs: `opencode run -m opencode/big-pickle --dir <unique>` = fresh session = $0). Reuses existing backend; room-dispatcher/rotator UNMODIFIED.
2. **`Asolaria/federation-remake-1024/servers/host8-serve/`** (Rust roster + workload server, in the local workspace, parity twin):
   - Roster routes `/seats.hbp` `/seat.hbp?h=` `/count.hbp` `/health` `/feed` (HBP, `json=0`) — serves 1,860 seats from the PID office.
   - **NEW `/summon.hbp?h=<handle8>&device=<d>`** — `resolve_instance_pid` (sha2) **byte-exact to the node**; resolve-only by default, `&fire=1` does a real $0 opencode summon. `cargo test` **15 passed** (5 new parity tests). Additive; siblings untouched.

## PROOF — replicate this
- Parity (deterministic): `handle8=0155964ffc8ef1f8` (FORMULA-CHIEF), `device=acer`, `ts=1750000000` → **node == Rust == `d125579d9644c37a`**.
- Live $0 summon (Rust `/summon&fire=1`): instance `1bc67f34df67b72a`, **cost 0, exit 0**, response `"FORMULA-CHIEF present and formatted."`
- Live $0 summon (node `gaia-loader.summon`): instance `d022809f13f2c28d`, **cost 0, exit 0**, response `"GAIA-SUMMON FORMULA-CHIEF ok"`.

## CONTEXT — this session's prior receipts (already pushed)
- DISTRICT-F formula-PID registration: `Asolaria` wave-1 `e8268d2` + wave-2 `fe6b629` (242 + 876 seats); mirrored to `Algorithms-of-Asolaria` `f3a8a84`.
- host8-serve LIVE daemon serving 1,860 seats on `:5088` (OS PID 45512).
- 82-artifact photo archaeology: `reductions` branch `acer/photo-archaeology-2026-06-19` (combined log + timeline/system map + 82 verbatim extracts; 12 deflations corrected).

## HONEST GATES (not yet fired)
- `/summon&fire=1` is OFF by default (resolve-only safe default).
- The workload binary is built + parity-proven but **NOT swapped onto the live `:5088` daemon** — that's a separate operator-gated restart (`additive→parity→swap→retire`). `node_retired=0`.
- Verb-parity is catalog-dependent (both readers must use the same `verbs.hbp`). 60D built on **47D canon + HBP axes**, not the unsigned full-69D. Timestamp carried into the hash but no time-gate yet (design).
- Emitters / OP-envelope distribution / GAIA IX-briefing remain the OPs' fire (00/01 + quintet via `:4952`) and design work.

## FOR LIRIS (bilateral — clone + replicate, don't wait)
Clone `bigpickle-rebuild` + `Asolaria` (branch `acer/host8-serve-workload-2026-06-19`). Recompute the parity: `instance_pid = sha256("0155964ffc8ef1f8|acer|1750000000|format.FORMULA-CHIEF.c844dff6b59b40cf.0155964ffc8ef1f8")[:16]` should equal `d125579d9644c37a` (Rust **and** node). Attack-verify, push your own crossverify + any device-side replication to the same repos.
