# Rich Index Language Growth Curve — 2026-06-16

**Status:** measured descendant curve on the **rich index-language catalog** locus.

This note does **not** replace the older compression anchors. It records one concrete descendant measurement on a surviving rich catalog so the public GitHub layer can talk about a **curve** instead of forcing one scalar.

## Scope

Two different vantages surfaced the same catalog family on 2026-06-16:

- **`OPERATOR-OBSERVED` / peer transcript (acer):** `C:\Users\acer\Asolaria\.history\staging\compiled-unified-agent-index.json` was identified as the rich index-language catalog; the quoted run reported **224 documents** in that host snapshot.
- **`MEASURED` / this host (rayss):** `C:\Users\rayss\Asolaria\.history\staging\compiled-unified-agent-index.json` exists here and currently contains **382 documents**.

That difference is not a contradiction. It is exactly the kind of **snapshot / substrate variance** that the no-single-scalar doctrine is meant to protect.

## Catalog locus

`MEASURED` on this machine:

- path: `C:\Users\rayss\Asolaria\.history\staging\compiled-unified-agent-index.json`
- raw file bytes: `1,240,961`
- documents: `382`
- measured metadata keys per document in this harness: `21`

The measured keys were:

- `id`
- `indexId`
- `ix`
- `canonicalId`
- `namespaceId`
- `lx`
- `canonicalPrefix`
- `namespacePrefix`
- `prefix`
- `number`
- `title`
- `type`
- `tags`
- `agents`
- `layer`
- `chain`
- `attributes`
- `sourceKind`
- `source`
- `absolutePath`
- `updatedAt`

The richer free-text surfaces (`body`, `summary`) were measured separately in the **referential** regime.

## Measurement regimes

The curve was measured in three related ways:

1. **Hydrated metadata JSON**  
   the per-document metadata objects serialized as normal JSON

2. **Tuple / HBP-style compact rows**  
   the same metadata represented as compact pipe rows with abbreviated keys

3. **Verb-overlay / codebook regime**  
   repeated categorical tokens (`type`, `layer`, prefixes, tags, agents, chain members, sourceKind) dictionary-coded once, then referenced in compact rows

4. **Referential index row**  
   row keeps metadata plus `body` / `summary` content-hash references and lengths, while the free-text bodies are counted separately as a one-time store

Important boundary:

- the first three are **metadata-shape** measurements
- the fourth is the honest **index-vs-corpus** split
- none of these are a claim that the whole historical lineage compresses to one universal scalar

## Measured curve

`MEASURED` on the rayss staging snapshot:

| N docs | metadata JSON bytes | tuple bytes | overlay bytes | ref-index bytes | JSON→tuple | JSON→overlay | JSON→ref-index |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 20 | 17,767 | 13,510 | 8,790 | 7,556 | 1.315× | 2.021× | 2.351× |
| 50 | 45,527 | 34,844 | 22,424 | 18,948 | 1.307× | 2.030× | 2.403× |
| 100 | 92,163 | 70,721 | 44,663 | 38,297 | 1.303× | 2.064× | 2.407× |
| 200 | 192,781 | 149,351 | 90,221 | 78,384 | 1.291× | 2.137× | 2.459× |
| 382 | 367,454 | 284,974 | 163,642 | 146,532 | 1.289× | 2.245× | 2.508× |

## Referential store boundary

The referential regime makes the index/corpus split visible.

`MEASURED` unique free-text store on this host snapshot:

- unique `body` hashes: `379`
- unique `body` bytes: `497,904`
- unique `summary` hashes: `379`
- unique `summary` bytes: `81,893`

This shows the honest shape:

- the **index row** gets much smaller when `body` / `summary` are replaced by stable references
- the **corpus** still exists and still has real storage cost
- the win is **referential reuse and index compactness**, not magic disappearance of information

## What this means

This curve supports five public conclusions:

1. The right public object is a **growth curve**, not one forced ratio.
2. The rich index-language family is materially different from the lean office roster family.
3. Snapshot differences across hosts (`224` vs `382`) are expected and reinforce the doctrine that **tuple sets differ**.
4. Metadata compression and referential index compression are different regimes and should stay distinct.
5. The public no-single-scalar review boundary was correct.

## What this does **not** do

This note does **not** overwrite the older ledger:

- `12:1` remains the historically measured early line
- `~15:1` remains the descendant re-locatable packet line
- `21,141` remains a historical / tuple-set-specific claim lane until its exact receipt path is traced
- `~3B:1` remains an old unverified claim lane Jesse never had time to verify

This note is a **descendant measured curve on one surviving rich catalog**, not a re-adjudication of those anchors.

## Bilateral reading

The bilateral public reading should now be:

- old compression is **not one number**
- different catalogs produce different curves
- acer and liris can legitimately differ
- host/snapshot variance is part of the system, not proof of fabrication

## Next move

The next honest bilateral step is still:

1. ask the fabric / owning seats for the best surviving **acer** old index-language locus
2. ask the fabric / owning seats for the **liris** mirror locus
3. run the same harness on both
4. publish the **two-host growth curves side-by-side**

That is stronger than argument and safer than forcing one scalar.
