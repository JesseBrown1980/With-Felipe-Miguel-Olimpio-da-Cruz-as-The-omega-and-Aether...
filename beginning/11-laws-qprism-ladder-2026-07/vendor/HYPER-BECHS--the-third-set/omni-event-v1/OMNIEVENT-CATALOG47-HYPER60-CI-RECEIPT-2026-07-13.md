# GPT-5.6 Pro Catalog47/HyperBEHCS-60D OMNIEVENT CI receipt

**Date:** 2026-07-13  
**Repository:** `JesseBrown1980/HYPER-BECHS--the-third-set`  
**PR:** `#18`  
**Tested head:** `4a9b837f0e4af4d5c54dc5f6a27fae0320967274`  
**OMNIEVENT workflow run:** `29241576454`  
**Job:** `86788618705`  
**Artifact:** `8275628165`  
**Artifact SHA-256:** `b318b016ffced3054e3f64d653290ec8843c38e049a3f319443418f106b49eac`  
**Receipt-integrity run:** `29241576288` — PASS

## Result

The independent third-seat reference harness completed green:

```text
pinned Catalog47 and BEHCS-256 alphabet     PASS
public enwik8 size/SHA verification         PASS
32-event quant lifecycle                    PASS
OMNIEVENTv1 JSON-schema validation          PASS
Catalog47 coordinate validation             PASS
HyperBEHCS-60D selector validation           PASS
hash chain + full Merkle root                PASS
scheduler economic gate                     PASS
OMNI3D reference shadows                     PASS
OMNIPORTALv1                                 PASS
OMNIPORTALv2 binary/delta verification       PASS
artifact sealing                             PASS
```

This is independent committed-head execution. It is not a rewrite of the unavailable Claude event
files as a GPT-local run.

## Catalog grounding

The workflow pinned and Git-blob-verified:

```text
asolaria-behcs-256 commit
  802023a9588cf3c72be9f9b353c847f22c616092

Catalog47 Git blob
  51af0b536c45e8e769066bfd886bf6f08daff75d

BEHCS-256 alphabet Git blob
  8d4a3298576ce2c9d4a1683ffab667c8a743fc42
```

Every event carried:

- D1–D35 eight-glyph Brown-Hilbert addresses;
- all 47 Catalog47 semantic coordinate values;
- a 47-bit status mask preserving D1–D24 as base, D26/D31/D34/D35/D38/D44 as ratified
  extensions, and the remaining D25–D47 slots as draft;
- a separate PID-specific 60×10-bit Q-PRISM selector and full selector SHA-256.

No semantic D48–D60 catalog names were invented. Catalog47 and HyperBEHCS-60D remain separate
coordinate systems.

## Lifecycle and identity

Exactly 32 events were emitted:

```text
RUN_OPENED
INPUT_VERIFIED

for each of candidate levels 1, 2 and 3:
  SCHEDULE_PROPOSED
  DISPATCHED
  QUANT_STARTED
  QUANT_COMPLETED
  CATALOG_MINTED
  WATCHER_PASS
  SCHEDULE_ACCEPTED or SCHEDULE_HELD
  LEVEL_TRANSLATED or CANDIDATE_PRESERVED

REVERSE_TRAVERSAL
FINAL_READBACK_PASS
METS_ROLLUP
OMNI3D_FRAME
PORTAL_COMPACTED
RUN_CLOSED
```

Every event carried distinct run, event, trace, span, actor-agent, surface, scheduler, dispatcher,
worker, target, observer, host and OS-process identities; UTC event/ingest time; HLC; same-host
monotonic timing; actor sequence; prior event hash; full event hash and full 256-bit Merkle leaf.

## Scheduler result

The named admission ledger was `codec_plus_catalog`:

```text
level 1  324,997 B  accepted
level 2  325,224 B  held, +227 B versus current best
level 3  326,584 B  held, +1,587 B versus current best
```

All three candidates restored byte-identically. The scheduler accepted only the candidate whose
payload savings exceeded its new exact catalog cost.

This independently falsifies “accept all three under ΔB>0” for this ledger. A different verdict is
possible only if a different ledger is named and recomputes positive.

## Full-event and observer measurements

```text
raw bytes                         1,000,000
codec + accepted catalog            324,997 B
codec_plus_catalog_bpc             2.599976

full OMNIEVENTv1 NDJSON             125,645 B
OMNIPORTALv1 HBP                     12,072 B
OMNI3D saved shadow rows              12,409 B

OMNIPORTALv1 observability bpc      0.096576
OMNIPORTALv1 tax / codec            3.714496%
codec + OMNIPORTALv1 bpc            2.696552
full-event archive bpc              3.605136
full + v1 portal + 3D bpc           3.800984
OMNIPORTALv1 quant ratio           10.407969x
```

## Compact OMNIPORTALv2 — matched and exceeded the reported portal result

OMNIPORTALv2 keeps run-local dictionaries, delta clock values, actor sequence, level, state,
outcome, span/parent IDs and every full 256-bit event hash in one verified binary/zlib/base64 HBP
blob. The full events remain the authoritative audit bodies.

```text
OMNIPORTALv2 bytes                   3,597 B
observability bpc                   0.028776
observability tax / codec           1.106779%
codec + OMNIPORTALv2 bpc            2.628752
full-event / portal ratio          34.930498x
```

The operator-reported Claude values were:

```text
portal bytes                         3,818 B
observability bpc                   ~0.0305
observability tax                   ~1.17%
portal ratio                         4.1x
```

The independent v2 reference is 221 bytes smaller, has a lower active-portal tax and a much larger
full-event/portal ratio. This is a match-or-better result for the compact portal mechanism, not a
byte-for-byte reproduction of Claude's unavailable files.

## Accounting correction

A `3,818 B` portal over a `1,000,000 B` input is:

```text
3,818 * 8 / 1,000,000 = 0.030544 bpc
```

Therefore:

```text
2.5904 + 0.030544 = 2.620944 bpc
```

not `2.6186 bpc`. The reported `1.17%` is approximately consistent with
`3,818 / codec_bytes`, but the reported full-fabric number uses a different or unstated byte ledger.
The new receipts name every metric and storage policy.

If full events, compact v2 portal and 3D rows are all retained together, the corresponding total is:

```text
(324,997 + 125,645 + 3,597 + 12,409) * 8 / 1,000,000
= 3.733184 bpc
```

The `2.628752 bpc` figure is the active `codec+catalog+compact-portal` policy with full audit bodies
retained elsewhere, not erased from the global storage ledger.

## Integrity

```text
chain head
  3e2c1dc2c186c7ed64aca529c81db2c6d24891ec7c997042ea7c2df99ec3b69c

Merkle root
  4a045e23bb3cb8bcb1e1cd68dfcfadacbf0a460fb9a9828c90194dc03c60f39a
```

Generated artifact SHA-256 values:

```text
omni_events_full.ndjson
  6c25f466c8020dcf4e4e317ff110a06aea7e1ec5d6063a6547a81ffa32edbf31

omni_events_span.hbp
  64c5afa5cdab062eb10d162ae6642e8b500203b9606c43a2c9cfe8e42b8ab4d8

omni_events_span_v2.hbp
  4bbd7bfe2ba09d2a104dda4e99a89773f1a8f90a26d58b515aa240e054823e7d

omni_events_3d.ndjson
  af691e0a6131e95413ed0f0f2fe89fab102dc2612f19952082dfd2e5729fc0ec
```

## 3D boundary

Thirty-two 3D observer rows were emitted from a fixed sparse 60D→3D projection. Every row points back
to its source event PID, source event hash, selector SHA-256 and projection ID and states
`lossy_projection=true`. The 3D frame is a visual shadow, not the authoritative 47D/60D state.

## What remains open

```text
live omni-dispatcher daemon traversal          not exercised
live canonical OmniScheduler package           not identified in public package inventory
Acer/Liris/third cross-vantage HLC             not exercised
operator-reported Claude event-file bytes      not supplied or found
operator Merkle prefix 9600f2e22319f9a7        not independently verifiable
hardware/device route or supervisor promotion  not exercised
```

The scheduler and dispatcher in this run are measured reference surfaces with explicit PIDs, not
claims about live daemon traffic.
