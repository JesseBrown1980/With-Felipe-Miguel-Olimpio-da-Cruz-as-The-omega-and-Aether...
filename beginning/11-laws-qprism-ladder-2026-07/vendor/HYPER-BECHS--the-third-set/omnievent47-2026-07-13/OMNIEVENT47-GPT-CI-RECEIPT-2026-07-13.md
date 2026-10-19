# OMNIEVENT47 catalog-grounded CI receipt — 2026-07-13

**Repository:** `JesseBrown1980/HYPER-BECHS--the-third-set`  
**Pull request:** `#17`  
**Tested head:** `8a52e38c97c9aaae926147e5d6a1450262a015d4`  
**Successful workflow run:** `29240414606`, retry job `86784946753`  
**Artifact:** `8275180854`  
**Artifact digest:** `sha256:018fdc5bc2da4403499efe4b77d33b2807acff651352a799b2fc367099d49a32`  
**Input:** first 1,000,000 bytes of enwik8, SHA-256 `369b688978f649681136198fb96db14c1616756260c55fb4b65e9bc049552cad`

## Catalog source

Every event was stamped against the pinned public Brown-Hilbert registry:

```text
repository  JesseBrown1980/asolaria-behcs-256
commit      802023a9588cf3c72be9f9b353c847f22c616092
path        data/behcs/codex/catalogs.json
file SHA    d14f6624e800f42cbc7d6c662853d68f6a767bbee7c47f76689aebd5b5a73e58
```

D1-D24 were tagged as the OMNI-V3 base. D26, D31, D34, D35, D38 and D44 were tagged separately ratified. Other D25-D47 entries were retained as draft/unratified rather than silently promoted.

The accessible system sources affirm a 60D HyperBEHCS frame, but no authoritative D48-D60 semantic registry was available in the connected slice. The run therefore references `tuple_dim=60` while explicitly emitting `D48_D60=UNRESOLVED_IN_ACCESSIBLE_CATALOG_DO_NOT_INVENT` and no fabricated selector.

## Lifecycle and identity result

The run emitted exactly 32 events from `RUN_OPENED` through `RUN_CLOSED`. Every event carried:

- run PID, event PID, actor-agent PID and actual OS PID;
- requested-by, scheduler, dispatcher, worker, target, observer and host PIDs;
- UTC, monotonic duration, per-actor sequence and single-host HLC;
- all D1-D47 catalog coordinates with source and status;
- antecedent hash and canonical row hash.

All row hashes recomputed, the antecedent chain was unbroken, the Merkle root matched, final readback passed and the ordinary repository receipt-integrity workflow also passed.

```text
run PID        RUN-6d0e0330ab65b6b6
events         32
Merkle root    53f7adc239331481ac6737e02748101b21cbb2c7d9a9405df91e4e4b1d9c874b
NDJSON SHA     7dcb151a9ab6cfb60f2a59ab49f117cbe15c417bd6f975df31a21b4222bab5e9
final readback PASS
```

## Quant and scheduler result

The exact multi-level BPE-plus-zstd body reproduced the prior measured payloads:

| Candidate | Catalog | Payload | Total | Total bpc | Readback | Economic verdict |
|---:|---:|---:|---:|---:|---|---|
| L1 | 2,068 B | 322,929 B | 324,997 B | 2.599976 | PASS | ACCEPT |
| L2 | 4,122 B | 321,102 B | 325,224 B | 2.601792 | PASS | HOLD |
| L3 | 6,176 B | 320,408 B | 326,584 B | 2.612672 | PASS | HOLD |

The reference scheduler used the declared rule `readback PASS AND candidate_total < current_best_total`. This is why only level 1 was accepted. A payload-only scheduler could choose differently, but it must name that ledger.

## Three observability profiles

### Full audit store

```text
full D1-D47 NDJSON       355,010 B
3D shadow                 11,406 B
full-audit fabric bpc      5.531304
full-audit tax            52.995243%
```

### Self-contained HBP SPAN portal

This profile keeps actor/kind/state dictionaries and every row hash inline.

```text
SPAN bytes                 8,295 B
SPAN bpc                    0.066360
full-row/portal ratio      42.798071x
SPAN + 3D bpc               0.157608
compact fabric bpc          2.757584
compact observability tax   5.715438%
```

### Merkle-referenced OMNISPAN_MINv1

This profile keeps fixed schema codes, actor PID suffixes, base-36 deltas and the authoritative full-store Merkle/file roots. It omits per-row hashes inline and therefore requires retention of the canonical NDJSON store.

```text
minimal portal bytes        1,401 B
minimal portal bpc           0.011208
full-row/portal ratio      253.397573x
SPAN-only tax                0.429231%
minimal portal + 3D bpc      0.102456
minimal full-fabric bpc      2.702432
minimal + 3D tax             3.791252%
minimal portal SHA           ff1a92c594b4faff7fb0356992d13bbded314c8e2bbeeffedf875d2279a9d085
schema SHA                   671864e2519f011a83ce1d527b02da6492582779ed737663a898bef942016f67
```

The minimal portal is smaller than the operator-reported Claude SPAN (`3,818 B`) and has a much larger measured portal ratio than the reported `4.1x`, but it uses a different integrity contract: the full event store remains authoritative.

## Claude report cross-check

The operator reported a separate Claude Fable 5 reference run with 32 events, Merkle prefix `9600f2e22319f9a7`, `3,818 B` SPAN telemetry, `2.5904` codec-plus-catalog bpc, `2.6186` full-fabric bpc, `0.0305` observability bpc, `1.17%` tax and a `4.1x` portal ratio. The named event files were not uploaded and were not found in connected repositories, so that run remains `OPERATOR_REPORTED_UNSEALED`.

At exactly 1,000,000 input bytes, `3,818 B = 0.030544 bpc`, and `2.5904 + 0.030544 = 2.620944`, not `2.6186`. The reported 1.17% is consistent with 0.030544 bpc. Raw files are needed to determine whether the discrepancy comes from input length or a different charge basis.

## First failed attempt preserved

The first workflow attempt failed before event emission because the dynamic Python module loader did not register a dataclass-bearing module in `sys.modules`. The v1.1 launcher fixed that loader defect without changing the event/accounting algorithm. A later transient corpus-download failure was retried; the final retry passed every step.

## Scope boundary

The scheduler, dispatcher and OmniMets actors in this run are reference-compatible roles, not invocations of live home-fabric daemons. The 3D output is explicitly a D1/D5/D20 shadow, not the complete 47D or 60D object. Cross-vantage HLC and live Acer/Liris routing remain home-fabric tests.
