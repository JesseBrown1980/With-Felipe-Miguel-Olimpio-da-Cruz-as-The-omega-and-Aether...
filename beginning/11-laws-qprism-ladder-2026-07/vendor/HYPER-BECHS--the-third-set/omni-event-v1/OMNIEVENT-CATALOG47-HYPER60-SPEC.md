# OMNIEVENTv1 — Catalog47 + HyperBEHCS-60D reference contract

**Date:** 2026-07-13  
**Status:** reference implementation / independent attack-verify surface  
**Authority:** documentation and CI only; no live dispatcher, device, promotion, or cutover authority

## Why this contract is not a fresh field invention

The canonical Brown-Hilbert root requires a minimal tracked envelope containing a named agent,
profile, device, PID, timestamp and task scope. The public `IX-700` registry already supplies the
semantic axes. This contract addresses events into that registry and then adds the separate
HyperBEHCS selector frame.

Pinned sources:

- `JesseBrown1980/asolaria-behcs-256@802023a9588cf3c72be9f9b353c847f22c616092`
- `data/behcs/codex/catalogs.json`, Git blob `51af0b536c45e8e769066bfd886bf6f08daff75d`
- `data/behcs/codex/alphabet.json`, Git blob `8d4a3298576ce2c9d4a1683ffab667c8a743fc42`
- `tools/behcs/codex-bridge.js` for the eight-glyph `hilbertAddress()` algorithm
- `dbbh-coms-quant-prism/src/lib.rs` for the PID-specific 60D selector algorithm

## The two coordinate systems must not be flattened

```text
Catalog47
  47 named semantic dimensions, each with a prime/cube anchor and status

HyperBEHCS-60D
  sixty 10-bit glyph values; exact tuple reshape and/or PID-specific SHA-derived selector
```

The public repository does **not** define named semantic dimensions D48–D60. Therefore this contract
never invents them. It carries:

```text
dimensional_tags.d1..d35
  actual eight-glyph Brown-Hilbert addresses, compatible with envelope-v1

d47_ext.dims[47]
  one semantic coordinate value per public Catalog47 axis

hyper60.selector[60]
  Q-PRISM selector values, each 0..1023
```

D48/D49 remain proposal references in the Brown-Hilbert adapter. The 60D selector is an extension
frame, not proof that thirteen additional public semantic catalogs have been ratified.

## Catalog47 map

| D | Axis | Runtime use in an event | Status in pinned registry |
|---:|---|---|---|
| 1 | ACTOR | canonical named agent | base D1–D24 |
| 2 | VERB | operation/event kind | base |
| 3 | TARGET | destination/object class | base |
| 4 | RISK | fixed 0–9 risk value | base/fixed |
| 5 | LAYER | runtime/agent/civilization or quant level | base |
| 6 | GATE | hookwall/GNN/Shannon/sovereignty/omni | base |
| 7 | STATE | proposed/queued/gated/executing/completed/failed/blocked/cancelled | base |
| 8 | CHAIN | triggers/feeds/proves/blocks/part-of/etc. | base |
| 9 | WAVE | single/broadcast/scatter/gather/relay/etc. | base |
| 10 | DIALECT | IX/LX/ASO/etc. | base |
| 11 | PROOF | log/hash/test/code/live-probe/chain | base |
| 12 | SCOPE | instant/session/persistent/permanent/etc. | base |
| 13 | SURFACE | runtime surface or daemon | base/expandable |
| 14 | ENERGY | free/light/medium/heavy/massive | base |
| 15 | DEVICE | device fields | base |
| 16 | PID | actor/surface/profile/spawn chain | base |
| 17 | PROFILE | named profile | base |
| 18 | AI_MODEL | model/backend identity | base/expandable |
| 19 | LOCATION | host/network/room/Hilbert level | base |
| 20 | TIME | timestamp/duration/sequence/epoch/TTL/cron | base |
| 21 | HARDWARE | chip/bus/port/driver/protocol | base |
| 22 | TRANSLATION | exact or quant translation kind | base/expandable |
| 23 | FEDERATION | origin/merge/conflict state | base |
| 24 | INTENT | command/autonomous/reactive/scheduled/etc. | base |
| 25 | MODALITY | text/voice/image/video/sensor/code/signal | draft |
| 26 | OMNIDIRECTIONAL | receive/approve/issue/relay/bilateral/etc. | ratified extension |
| 27 | CIPHER | plaintext/AES/TLS/etc. | draft |
| 28 | PROVENANCE | origin/author/signature/witness/source | draft |
| 29 | VERSION | semver/build/git/revision/compatibility | draft |
| 30 | DEPENDENCY | required cubes/catalogs/gates/profiles | draft |
| 31 | SHADOW_MIRROR | live/shadow/bilateral/cache snapshots | ratified extension |
| 32 | PRICE | dollars/tokens/joules/credits; event body carries byte ledger | draft |
| 33 | DEADLINE | not-before/timeout/TTL/hard-stop | draft |
| 34 | CROSS_COLONY | local/cross-host/relay/multi-hop | ratified extension |
| 35 | HYPERLANGUAGE | 24D/35D/47D/N-dim/self-referential | ratified extension |
| 36 | SENSOR | sensor identity | draft |
| 37 | ENVIRONMENT | temperature/power/runtime environment | draft |
| 38 | ENCRYPTION | SHA attestation/TLS/vault/etc. | ratified extension |
| 39 | JURISDICTION | jurisdiction/sovereignty | draft |
| 40 | CONSENT | granted/revoked/pending/owner-only/etc. | draft |
| 41 | AUDIT | log/NDJSON/signed/chain-of-custody | draft |
| 42 | CAPABILITY | scopes/issuer/expiry | draft |
| 43 | QUORUM | required/achieved/tier/agents | draft |
| 44 | HEARTBEAT | alive/stale/dead/recovering/hibernating | ratified extension |
| 45 | MANIFOLD | graph/cluster/neighborhood | draft |
| 46 | SIGNATURE | algorithm/public-key/signature/digest | draft |
| 47 | OMEGA | open/terminal/closure/sealed/archived/dropped | draft |

The reference implementation carries a 47-bit ratification mask. Draft axes remain useful address
slots but are never silently described as ratified.

## Brown-Hilbert glyph stamp

For `D` and value `v`:

```text
key = "D{D}|{v}"
h = SHA-256(key)
V = big-endian integer from h[0:8]
glyph_address = eight little-endian base-256 digits of V
```

This is the exact `codex-bridge.js` rule. The semantic value stays in `d47_ext`; the glyph is the
compact address.

## HyperBEHCS selector

For actor PID `p` (eight bytes) and canonical event body `x`:

```text
h_c = SHA-256(p || counter_be32 || x)
selector teeth = successive 16-bit words of h_c, masked to 10 bits
repeat counters until 60 values exist
```

Every event carries the sixty values and a SHA-256 digest over their packed big-endian `u16` form.
The compact SPAN portal carries selector digests and points to the full NDJSON rows.

## Required event identities and clocks

```text
run_pid
id / event PID
trace_id
span_id / parent_span_id
actor_agent_pid
surface_pid
actor_os_pid
requested_by_pid
scheduler_pid
dispatcher_pid
worker_pid
target_pid
observer_pid
host_pid
actor_sequence
event_ts_utc
ingest_ts_utc
hybrid logical clock
same-host monotonic start/end
```

Logical agent PID, surface PID and OS process ID are separate namespaces.

## Integrity

Each canonical full event includes:

```text
prev_event_hash
event_hash = SHA-256(canonical event including prev_event_hash)
```

The run footer carries the full 256-bit Merkle root of all event hashes. A 16-hex display prefix is
never the authoritative root.

## Scheduler law

Candidate level `l` is accepted only if:

```text
readback_pass(l) = true
and
previous_best_total_bytes - candidate_total_bytes > 0
```

`candidate_total_bytes` presently means `payload + exact catalog framing`. Telemetry/state/retained
body costs are reported separately and may be added to a stricter admission policy. The ledger basis
is always named.

## Cost metrics

```text
codec_plus_catalog_bpc
observability_span_bpc
fabric_span_bpc             = codec/catalog + compact portal
fabric_full_bpc             = codec/catalog + full OMNIEVENT rows
fabric_dual_plus_3d_bpc     = codec/catalog + full rows + portal + saved 3D shadows
portal_quant_ratio          = full NDJSON bytes / compact SPAN bytes
```

This prevents the contradictory use of one number for different storage policies.

## Omni-3D boundary

`OMNI3D-ACHLIOPTAS-60x3-v1` is a fixed sparse linear observer projection. Every saved frame carries:

```text
source event PID
source event hash
selector SHA-256
projection ID
x/y/z
lossy_projection=true
```

It is a 3D shadow of the 60D selector, never the authoritative state.

## Reference versus live

This CI harness exercises real computation, scheduling decisions, event stamping, hash chaining,
portal compaction, metrics and 3D projection. It uses reference scheduler/dispatcher surface PIDs.
It does **not** claim:

- a request traversed the live `omni-dispatcher` daemon;
- Acer/Liris clocks participated in one cross-vantage HLC;
- a live device, USB, supervisor promotion or hardware route fired;
- the operator-reported Claude event files were independently read—their bytes were not supplied or
  found in GitHub during this attack-verify pass.
