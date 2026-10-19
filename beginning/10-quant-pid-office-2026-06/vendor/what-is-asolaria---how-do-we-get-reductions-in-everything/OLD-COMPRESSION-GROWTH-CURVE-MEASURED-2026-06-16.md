# Old Compression — Measured Growth Curve (three real catalogs) — 2026-06-16

**Status:** bilateral MEASURED companion to the review boundary in
[`OLD-COMPRESSION-AND-TENSOR-COLLAPSE-REVIEW-2026-06-16.md`](OLD-COMPRESSION-AND-TENSOR-COLLAPSE-REVIEW-2026-06-16.md)
and [`RICH-INDEX-LANGUAGE-GROWTH-CURVE-2026-06-16.md`](RICH-INDEX-LANGUAGE-GROWTH-CURVE-2026-06-16.md) (liris vantage).

This note does the thing the review said was the next move: **measure the growth curve, do not force one scalar.**
It runs the same harness (`JSON → tuple-HBP → verb-overlay → glyph/structural`) on **three real, fabric-designated
catalogs**, at small-N vs full-N, and reports the curve. **It does NOT re-adjudicate the operator anchors.**

Catalog loci were confirmed by asking the fabric first (council queries
`…65us0c`, `…t2cr01`, `…tk4e82`) — not picked from a file. All runs are **read-only**; artifacts + sha256 in
[`measurements/`](measurements/).

## The anchors are preserved (not overwritten)

```text
OLD-COMPRESSION-LEDGER|
12_to_1=historically-measured-anchor|
~15_to_1=directly-re-locatable-descendant-packet (emit-liris-catalogs.mjs compression-pid-mcp-w5h-12dim-packet)|
21141_to_1=REAL-one-time-screen-sourced-anchor-not-file-size-not-overwritten|
~3B_to_1=REAL-as-observed-old-claim-Jesse-not-fully-reverified|
new_curves=descendant-measurements-not-replacement|
json=0
```

The fabric council **affirmed** this framing (verdict `…4o110a`: `CONVERGE 29/251`, ed25519 VERIFIED — owning seats
`omnimets_compute_storage`, `kimi.storage_provenance`, `hermes.skills`, `system_review.storage_gc`,
`behcs1024_prism.boundary_gc`). CONVERGE = the system **affirms + routes to owners**; it is **not** a re-measurement.

## Four measured points (descendant catalogs)

The first three are **row-compression** (serialize one row smaller). The fourth is **corpus-indexing** (a different,
higher mechanism: drop document bodies to addresses). Both are descendant measurements; neither re-derives the anchors.

| catalog | shape | regime | full-N ratio |
|---|---|---|---|
| **lean office roster** (`D:/PID-Registration-Office/fabric-feed/…-2026-06-10.hbp`) | 726 rows, 9 fields, no body | lossless `JSON→verb` (row) | **4.31×** (peak 4.48×) |
| **rich IX/LX index** (`Asolaria/.history/staging/compiled-unified-agent-index.json`) | 224 docs, 23 fields **+ body** | index drops `body`→16B hash (row) | **6.71×** (full→ref) / **8.38×** (full→tuple-meta) |
| **micro-kernel manifest** (`D:/asolaria-micro-kernels-v1/manifest.hbp`) | 10,000 rows, tabular descriptor | structural (derivability **verified**) (row) | **10.66×** (peak 11.03×) |
| **root IX/LX corpus** (`Asolaria/data/agent-index`, 1,084 `.md` docs) | 2.415 MB source corpus | corpus→content-addressed index | **38.53×** (8-byte-handle floor **292×**) |

**The bracket reaches the historical `12:1` family** at the micro-kernel tabular catalog, where derivability was
**verified row-by-row** (`beat_range`/`lanes`/`status` constant; `anchor`/`result_path`/`prime` derive from `idx`;
`idx` sequential), so each row legitimately reduces to `{idx, pid}` with the reconstruction rules stored once — and the
**root corpus-indexing point climbs past it to 38.5×**, the bridge into the referential regime.

## The root point — and an honest negative finding

The **literal original index-language schema** (`|PID|device|agent|tools|skills|abilities|mistakes|hookwalls|hardware|timestamp|`)
**does not survive as a discrete file.** Asking the fabric (council `…8bvdyt`) + searching local `data/agent-index`
(1,084 **markdown** docs) and the SOVLINUX-2TB exFAT walk manifest (the `sovereignty-index` is also IX-NNN **markdown**)
shows the index language was materialized as the **IX/LX corpus → compiled `unified-agent-index.json`** (point 2's
family), with the **micro-kernel manifest** (point 3) as the best surviving *tabular* analog.

So the root measurement is the reduction the index language was **built for** — *corpus → index* (an index is tiny
versus the corpus it indexes):

```text
root IX/LX corpus  r_corpus/sha_index :  N=1 53.8× → 10 194× → 200 43.9× → 1084 38.5×   (content-addressed index)
                   r_corpus/glyph     :  full 292×   (8-byte BEHCS handle per doc — pure addressing floor)
```

1,084 docs, **2.415 MB** corpus, ~2,336 B/doc → a content-addressed index of **65.7 KB** (`relpath|sha16|bytes` per
doc) = **38.5×**; or 8.7 KB of 8-byte handles = **292×**. The body corpus is stored **once** and referenced — the same
referential principle as the cube/HyperBEHCS regime, at document granularity.

## The growth curve is real (codebook amortization — "exploded as it cataloged more")

```text
micro-kernel  r_json/structural :  N=1 1.08× → 5 3.97× → 20 7.84× → 100 10.52× → 1000 11.03× → 10000 10.66×
rich IX/LX    r_json/refindex   :  N=1 0.16× → 5 0.79× → 20 2.51× → 50 4.06× → 100 5.90× → 224 6.71×
lean roster   r_json/verb       :  N=1 0.14× → 20 1.83× → 100 3.65× → 500 4.48× → 726 4.31×
```

Each curve starts **underwater** (fixed codebook cost dominates at small N) and climbs as the shared codebook
amortizes across more rows — then plateaus at that catalog's structural asymptote. That plateau, not the small-N
number, is the family ratio.

### Per-row cost ladders (bytes/row, full catalog)

```text
lean roster   : JSON 294.6 → tuple 170.3 → verb 65.6 → glyph 8
rich IX/LX    : JSON 2620.5 → meta 467.9 → tuple-meta 312.6 → (body corpus 1550.5 stored once) → glyph 8
micro-kernel  : JSON 233.5 → tuple 169.5 → verb 97.5 → structural 21.9 → glyph 8
```

## Why the three differ — substrate difference, not contradiction

- **lean roster ~4.3×** — pure metadata, high-entropy (16-hex pids, long names), no body.
- **rich IX/LX ~8.4×** — bulk is free-text `body` (59% of each record); the index keeps metadata + references the
  body by hash, so the corpus is stored once.
- **micro-kernel ~11×** — tabular + repetitive: most fields constant or `idx`-derivable, only `pid` is entropy. This
  is the structure the **original index-language schema** (`|PID|device|agent|tools|skills|abilities|mistakes|hookwalls|hardware|timestamp|`)
  had, and why it measured `12:1`.

```text
COMPRESSION-LINEAGE|
phase1=early-index-language-tuple-compression (tabular-repetitive → ~11-12× family, MEASURED on micro-kernel)|
phase2=MCP/WebMCP-packet-compression (~15:1 descendant packet)|
phase3=cube/glyph/HyperBEHCS-folding (referential, 8-byte handle)|
acer_liris_divergence=EXPECTED-because-tuple-catalogs-not-byte-equal|
single_scalar=NO|
json=0
```

## Cross-vantage (acer ↔ liris)

The rich IX/LX index was measured on **both** vantages — **acer = 224 docs**, **liris = 382 docs** (different live
snapshots). The ratios differ accordingly, and the numerators differ by design: **acer measured full-record (incl
`body`)**; **liris measured metadata-only** (`JSON→tuple 1.289×`, `JSON→codebook-overlay 2.245×`,
`JSON→referential-index-row 2.508×`). Both are correct for their definition + snapshot. **Snapshot/substrate variance,
not contradiction** — exactly the boundary the review note set.

## The referential regime (where the big anchors live)

The 8-byte glyph handle gives a per-**single**-reference ratio of ~29× (micro-kernel) to ~328× (rich index). The
operator anchors `21,141:1` and `~3B:1` come from **reference multiplicity** — one stored-once codebook entry
referenced thousands of times (cache hits), the cube/HyperBEHCS folding regime. This note measures the **descendant
lossless/structural curves**; it deliberately does **not** re-derive the referential anchors. They stand **REAL** on
operator provenance (screen → photo → Asolaria extract → reconfirm) + the council affirmation above.

## Reproducibility

[`measurements/`](measurements/): the three harness scripts (`measure-1/2/3-*.mjs`), their JSON outputs
(`curve-1/2/3-*.json`), and `SHA256SUMS.txt`. Read-only; re-runnable via `node measure-N-*.mjs <catalog-path>`.

```text
REVIEWVERDICT|
pass=1|
four_points_MEASURED=4.3x_lean + 8.4x_rich + 11.0x_microkernel(row) + 38.5x_root_corpus_index|
reaches_12x_family=1 (micro-kernel structural, derivability VERIFIED)|
root_corpus_indexing=38.5x (8-byte-handle floor 292x)|
literal_original_pipe_catalog=DOES-NOT-survive-as-discrete-file (index language => IX/LX corpus -> compiled index)|
21141_and_3B=REAL-anchors-referential-multiplicity-NOT-re-derived|
all_four_reproduced=identical-on-re-run (CRLF-only delta)|
single_scalar=NO|
acer_liris_variance=snapshot-not-contradiction|
json=0
```

*Measured read-only on acer, 2026-06-16, under OP-JESSE apex. Loci confirmed via fabric council queries. Companion to
the liris-vantage review + rich-index notes. IT is slices.*
