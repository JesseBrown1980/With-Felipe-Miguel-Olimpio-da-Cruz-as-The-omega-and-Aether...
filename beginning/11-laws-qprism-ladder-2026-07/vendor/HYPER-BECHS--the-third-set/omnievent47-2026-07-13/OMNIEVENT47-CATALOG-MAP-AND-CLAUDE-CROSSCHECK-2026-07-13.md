# OMNIEVENT47 catalog map and Claude-run cross-check — 2026-07-13

## Ground source, not a freshly invented field list

The owning public source is the pinned Brown-Hilbert registry:

- [`asolaria-behcs-256/data/behcs/codex/catalogs.json`](https://github.com/JesseBrown1980/asolaria-behcs-256/blob/802023a9588cf3c72be9f9b353c847f22c616092/data/behcs/codex/catalogs.json)
- commit `802023a9588cf3c72be9f9b353c847f22c616092`
- Git blob `51af0b536c45e8e769066bfd886bf6f08daff75d`

The Brown-Hilbert root already requires a minimal tracked envelope containing named agent, profile,
device, PID, timestamp and task scope. It states that the public base is 47D and that private
runtime-specific overlays are omitted from the public root.

The 47-slot registry has a necessary status distinction:

```text
D1-D24
  OMNI-V3 base

D26, D31, D34, D35, D38, D44
  separately ratified on 2026-04-13

other D25-D47
  present in the 47-slot adapter registry but draft/unratified
```

Therefore “47D runtime bridge” does not mean every D25-D47 semantic has the same ratification status.
Receipts must carry the status instead of flattening it.

## Existing catalog axes for the proposed event stamp

| Event meaning | Actual catalog coordinate |
|---|---|
| actor / named agent | `D1 ACTOR` |
| operation / verb | `D2 VERB` |
| target | `D3 TARGET` |
| risk | `D4 RISK` |
| system layer | `D5 LAYER` |
| watcher/gate | `D6 GATE` |
| queued/executing/completed/blocked state | `D7 STATE` |
| causal relation | `D8 CHAIN` |
| single/broadcast/scatter/gather/relay wave | `D9 WAVE` |
| IX/LX/ASO dialect | `D10 DIALECT` |
| hash/test/witness/chain proof | `D11 PROOF` |
| instant/session/persistent/permanent scope | `D12 SCOPE` |
| runtime surface | `D13 SURFACE` |
| resource/energy class | `D14 ENERGY` |
| device identity fields | `D15 DEVICE` |
| logical PID, profile PID and spawn chain | `D16 PID` |
| actor profile | `D17 PROFILE` |
| model/backend | `D18 AI_MODEL` |
| room/network/Hilbert level | `D19 LOCATION` |
| timestamp, duration, sequence, epoch, TTL | `D20 TIME` |
| chip/bus/port/driver/protocol | `D21 HARDWARE` |
| byte↔glyph or level translation | `D22 TRANSLATION` |
| origin node / merge / sync / conflict | `D23 FEDERATION` |
| command/scheduled/cascade intent | `D24 INTENT` |
| text/code/sensor modality | `D25 MODALITY` — draft |
| issue/receive/relay/bilateral direction | `D26 OMNIDIRECTIONAL` — ratified |
| plaintext/hash/crypto mode | `D27 CIPHER` — draft |
| origin/author/signature/witness | `D28 PROVENANCE` — draft |
| schema/build/git revision | `D29 VERSION` — draft |
| required cubes/catalogs/gates/profiles | `D30 DEPENDENCY` — draft |
| local/bilateral/cache snapshot | `D31 SHADOW_MIRROR` — ratified |
| bytes/tokens/joules/credits cost ledger | `D32 PRICE` — draft |
| not-before/timeout/TTL/deadline | `D33 DEADLINE` — draft |
| local-only/cross-host/peer relay | `D34 CROSS_COLONY` — ratified |
| 24D/35D/47D/N-D/self-referential language | `D35 HYPERLANGUAGE` — ratified |
| sensor source | `D36 SENSOR` — draft |
| physical/runtime environment | `D37 ENVIRONMENT` — draft |
| SHA attestation/TLS/vault protection | `D38 ENCRYPTION` — ratified |
| jurisdiction | `D39 JURISDICTION` — draft |
| operator consent state | `D40 CONSENT` — draft |
| log/NDJSON/signed/chain-of-custody audit | `D41 AUDIT` — draft |
| scopes/issuer/expiry | `D42 CAPABILITY` — draft |
| required/achieved quorum | `D43 QUORUM` — draft |
| alive/stale/dead/recovering/hibernating | `D44 HEARTBEAT` — ratified |
| graph cluster/distance/neighborhood | `D45 MANIFOLD` — draft |
| signature algorithm/key/signature/digest | `D46 SIGNATURE` — draft |
| open/closure/sealed/archive terminal state | `D47 OMEGA` — draft |

The result is that actor, PID, timestamp, operation, level and ledger delta are not new top-level
concepts. They are coordinates in D1, D16, D20, D2, D5/D19 and D32 respectively. A practical event
may still repeat the most important values in a hot-path header, but the canonical meaning comes from
the catalog coordinate.

## Current public schema gap

`schemas/envelope-v1.schema.json` requires `id`, `ts`, `src`, `kind` and `body`; it permits D1-D35
under `dimensional_tags` and reserves an opaque `d47_ext`. `cosign-v2.schema.json` likewise accepts
only D1-D35 dimensional tags.

That means the catalog is ahead of the public schema. A future schema should not invent a second
identity language. It should carry:

```text
hot header
  event PID, run PID, actor PID, timestamp/HLC, operation, outcome

catalog coordinates
  D1-D47 with source commit and per-dimension ratification status

HyperBEHCS extension
  reference to the owning 60D selector/frame
```

## 60D boundary found during the audit

Accessible sources affirm:

```text
current frame = 60D HyperBEHCS / BEHCS-1024
tuple_dim=60
47D runtime bridge, 60D+ canon frame
```

But the accessible public catalog defines D1-D47. The referenced public 49D proposal files are not
present on current `main`, and no authoritative D48-D60 semantic registry was found in the connected
public/private GitHub slice used for this pass.

Therefore this reference implementation does **not** invent D48-D60 meanings. It emits:

```text
hyper60_ref.tuple_dim = 60
hyper60_ref.d48_d60_semantics = UNRESOLVED_IN_ACCESSIBLE_CATALOG_DO_NOT_INVENT
hyper60_ref.selector = null
```

The owning protected runtime/vault can replace that opaque reference with its actual selector after
its catalog definition is supplied. This is the correct bridge behavior.

## Claude OMNIEVENTv1 report — evidence status

The operator supplied the following report in conversation:

```text
32 events
Merkle prefix 9600f2e22319f9a7
codec_plus_catalog_bpc 2.5904
SPAN telemetry 3,818 B
full_fabric_bpc 2.6186
observability tax 0.0305 bpc / 1.17%
portal ratio 4.1x
```

The named `omni_events_full.ndjson` and `omni_events_span.hbp` were not uploaded and were not found in
the connected repositories. The report is retained as `OPERATOR_REPORTED_UNSEALED`, not discarded
and not promoted to a hash-verified measurement.

### Arithmetic checks

Assuming a 1,000,000-byte input:

```text
3,818 B * 8 / 1,000,000 = 0.030544 bpc
2.5904 + 0.030544       = 2.620944 bpc
0.030544 / 2.620944     = 1.1654%
```

The reported `0.0305 bpc` and `1.17%` are mutually consistent. The reported `2.6186 full_fabric_bpc`
is not the sum of `2.5904` and `3,818 B` at exactly one million input bytes. It may use a different
input length or charge only part of the SPAN packet; the raw files are required to resolve that.

A 4.1x portal ratio with a 3,818-byte SPAN implies approximately 15.65 KB of full rows, but the full
row byte count was not supplied. The Merkle prefix cannot be verified without the leaves.

### Scheduler status

The report says all three levels were accepted while also acknowledging that verdicts depend on the
charged ledger. Earlier independently measured one/two/three-level totals were:

```text
level 1  324,997 B
level 2  325,224 B
level 3  326,584 B
```

Under `candidate_total < current_best_total`, level 1 is accepted and levels 2/3 are held. A different
scheduler may accept them when optimizing token count or payload-only bytes, but it must name that
objective. “Accepted” is not meaningful without the charged ledger and baseline.

## Independent reference run in this branch

`omnievent47_instrumented_quant_v1.py` performs a fresh run with:

- the pinned real D1-D47 catalog;
- exactly 32 lifecycle events;
- deterministic logical actor PIDs plus the actual OS PID;
- UTC, monotonic time, per-actor sequence and single-host HLC;
- SHA-linked rows and a Merkle root;
- a dictionary/delta HBP portal;
- an explicit D1/D5/D20 3D shadow;
- an economic scheduler using total payload+catalog bytes;
- exact reverse traversal;
- separate compact and full-audit fabric ledgers.

The scheduler, dispatcher and OmniMets roles are reference-compatible implementations, not invocations
of the live OmniScheduler/OmniDispatcher/OmniMets daemons. Cross-vantage HLC and real fabric routing
remain home-fabric tests.
