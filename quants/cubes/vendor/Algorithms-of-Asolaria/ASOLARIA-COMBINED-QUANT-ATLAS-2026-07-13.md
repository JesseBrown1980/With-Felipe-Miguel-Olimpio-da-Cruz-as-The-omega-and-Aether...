# Asolaria Combined Quant Atlas — 2026-07-13

Status vocabulary: `MEASURED_REPO`, `MEASURED_RECEIPT`, `OPERATOR_CANON`,
`OPERATOR_SCREENSHOT_REPORTED`, `CANON`, `DESIGN`, `UNVERIFIED_LIVE`, `SUPERSEDED`.

## The correction

Asolaria does **not** have one quant. `quant8` is one bounded head packet inside a much larger
composition. The public repository family contains numeric quants, geometric codecs, exact language
re-relations, referential handles, semantic/cube distillation, distributed recovery, N-D projections,
watchers and persistent learning.

The root Asolaria document says the local compression spectrum uses **“the quants (~28, combined)”**
and that the prism operates at every ladder level. This atlas normalizes **28 publicly recoverable
operator slots** from the current public repositories. It is the first public cross-repository list;
it does not claim that the unpublished/local combined engine uses exactly these aliases or has no
additional variants.

The architectural unit is:

```text
exact level representation
+ local quant bundle
+ address/cube mint
+ watcher/readback gate
+ persistent catalog update
```

—not one global compression call.

## Five information regimes

Every operator below must declare one regime. The regimes must not be collapsed into one ratio.

| Regime | Meaning | Exactness condition |
|---|---|---|
| `EXACT_REPRESENTATION` | Same information in a different alphabet/layout | decoder is an inverse and framing metadata is preserved |
| `LOSSY_NUMERIC_SKETCH` | Reduced vector/statistical proxy for routing, ranking or approximate comparison | error/fidelity contract required; cannot stand in for exact identity |
| `REFERENTIAL_LOOKUP` | Small coordinate names content retained elsewhere | full body/store and authoritative digest are part of the cost |
| `SEMANTIC_DISTILLATION` | Raw interaction is reduced to reusable skill/mistake/genius/cube state | intentionally lossy; utility and provenance must be measured |
| `JOINTLY_INJECTIVE_RECOVERY` | Individual shadows are lossy, but a sufficient set identifies the bounded source exactly | joint capacity reaches the source range and all consistency checks pass |

## The normalized public 28-operator core

### A. Eight-stage large-message quant head — 8 operators

Owner source:
[`ASOLARIA-AS-NEURAL-NETWORK/tools/behcs/quant-huge-message-benchmark.mjs`](https://github.com/JesseBrown1980/ASOLARIA-AS-NEURAL-NETWORK/blob/main/tools/behcs/quant-huge-message-benchmark.mjs)

| # | Canonical ID | Public/source name | Operation | Regime |
|---:|---|---|---|---|
| 1 | `Q-JL-COUNT-SKETCH-1024-v1` | JL count-sketch | deterministic signed bucket projection into `D=1024` | lossy numeric sketch |
| 2 | `Q-TURBO-MAXABS-INT8-v1` | Turbo | max-absolute normalization, signed int8 codes | lossy numeric sketch |
| 3 | `Q-POLAR-SIGN-BITSET-v1` | Polar | one sign bit per projected coordinate | lossy numeric sketch |
| 4 | `Q-ZETA-LOGMAG4-v1` | Zeta | 4-bit logarithmic magnitude bucket | lossy numeric sketch |
| 5 | `Q-TRIPLE-TERNARY-v1` | Triple | `{-1,0,+1}` threshold code | lossy numeric sketch |
| 6 | `Q-QUADRUPLE-2BIT-v1` | Quadruple | four-level 2-bit sign/magnitude class | lossy numeric sketch |
| 7 | `Q-JS-HIST256-v1` | JS histogram | 256-bin histogram of int8 codes | lossy statistical sketch |
| 8 | `Q-PRIMEPOWER-ACC-v1` | von-Mangoldt lane | prime/prime-power class accumulator over active buckets | lossy structural summary |

The benchmark computes all eight channels. Its historical `tupleBuffer` stores the four-channel
3,200-byte golden layout:

```text
turbo 1024
+ sign bits 128
+ zeta 1024
+ histogram 1024
= 3,200 bytes
```

Triple, Quadruple, prime-power accumulation and `scale` are computed but are not included in that
3,200-byte byte buffer. Therefore call it the **eight-stage head with a four-channel 3,200-byte tail
packet**, not a self-contained eight-channel packet.

### B. HyperBEHCS geometric/vector codecs — 4 operators

Owner source:
[`Asolaria-ASI-On-Metal-Fabric-and-matrix/tools/falcon/omni-acer/lib/hyperbehcs-core.cjs`](https://github.com/JesseBrown1980/Asolaria-ASI-On-Metal-Fabric-and-matrix/blob/main/tools/falcon/omni-acer/lib/hyperbehcs-core.cjs)

| # | Canonical ID | Public/source name | Operation | Regime |
|---:|---|---|---|---|
| 9 | `Q-JL-ACHLIOPTAS-SEEDED-v1` | Johnson–Lindenstrauss / Achlioptas | seeded sparse random projection | lossy numeric sketch |
| 10 | `Q-TURBO-MINMAX-U8-v1` | Turbo uniform quant | min/max uniform code at configurable bit depth | lossy numeric quant |
| 11 | `Q-POLAR-RTHETA-v1` | Polar pair quant | pairwise radius/angle code | lossy geometric quant |
| 12 | `Q-TRIPLE-SPHERICAL-v1` | Triple spherical quant | radius/theta/phi triple with reconstruction | lossy geometric quant |

These names overlap the eight-stage aliases but implement different mathematics. Receipts should use
the canonical IDs above rather than only `Turbo`, `Polar` or `Triple`.

### C. Exact representation and language ladder — 8 operators

Owners:

- [`dbbh-coms-quant-prism`](https://github.com/JesseBrown1980/dbbh-coms-quant-prism)
- [`qprism-3d-slice-harness`](https://github.com/JesseBrown1980/qprism-3d-slice-harness)
- [`Asolaria/docs/HYPERBEHCS-GLYPHS-INSTANT-SLICE-MESSAGING-2026-07-03.md`](https://github.com/JesseBrown1980/Asolaria/blob/main/docs/HYPERBEHCS-GLYPHS-INSTANT-SLICE-MESSAGING-2026-07-03.md)
- [`HYPER-BECHS--the-third-set`](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set)

| # | Canonical ID | Representation | Role | Regime |
|---:|---|---|---|---|
| 13 | `R-BINARY-BYTES-v1` | binary byte lane | source/canonical bytes | exact representation |
| 14 | `R-HEX-v1` | hexadecimal lane | exact display/transport re-expression | exact representation |
| 15 | `R-HBP-v1` | pipe-delimited HBP rows | hot-path tuple/receipt representation | exact when schema and field escaping are preserved |
| 16 | `R-HBI-v1` | HBI index/offset lane | exact address/index into HBP/body stores | referential/exact index |
| 17 | `R-BEHCS64-v1` | BEHCS-64 | 6-bit symbol rebase | exact framed representation |
| 18 | `R-BEHCS256-v1` | BEHCS-256 | 8-bit glyph alphabet / bridge stratum | exact framed representation |
| 19 | `R-BEHCS1024-v1` | BEHCS-1024 | 10-bit glyph alphabet; `5 bytes ↔ 4 glyphs` | exact framed representation |
| 20 | `R-HYPERBEHCS60D-v1` | HyperBEHCS 60D | groups/addresses glyphs as 60-coordinate tuples/selectors | exact reshape for carried glyphs; selector itself is referential |

For exact levels `i` and `j`, the cross-level translator is:

```text
T[i->j] = E[j] ∘ D[i]
```

and must satisfy:

```text
T[j->i] ∘ T[i->j] = identity
T[j->k] ∘ T[i->j] = T[i->k]
```

The 256↔1024 rung is measured. The root 43+ level groupoid remains canon until each additional rung
has its own round-trip receipt.

### D. Cube, address and distributed-recovery quants — 4 operators

| # | Canonical ID | Owner | Operation | Regime |
|---:|---|---|---|---|
| 21 | `Q-CUBE3200-ABSORB-v1` | Q-PRISM Stage 2 | raw/derived feature window → canonical 3,200-byte tuple → cube/selector envelope | combined numeric sketch + referential cube |
| 22 | `Q-PATH1-CONTENT-ADDRESS-v1` | `dbbh-coms-quant-prism` | small authenticated coordinate selects exact retained content | referential lookup |
| 23 | `Q-PATH2-CRT-MULTICYLINDER-v1` | `path2-two-shadow-recovery` | pairwise-coprime residues jointly recover exact bounded blocks when product reaches source roof | jointly injective recovery |
| 24 | `Q-PIE-SHELL-CYLINDER-v1` | Path 2 / Q-PRISM 3D | pixel slice + frequency shells + full cylinder-shadow projection | multi-view structural projection |

Path 1 and Path 2 pay Shannon in different locations:

```text
Path 1 = retained H(X) + address/receipt overhead
Path 2 = jointly sufficient shadow capacity >= H(X)
```

### E. Semantic/civilization collapse — 4 operators

Owners:

- [`what-is-asolaria---how-do-we-get-reductions-in-everything`](https://github.com/JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything)
- [`Asolaria-the-after-100-billion-run-absorption-and-decomposition-and-cubes`](https://github.com/JesseBrown1980/Asolaria-the-after-100-billion-run-absorption-and-decomposition-and-cubes)
- [`asolaria-whiteroom-engine`](https://github.com/JesseBrown1980/asolaria-whiteroom-engine)
- [`Shannon-and-the-gnns-stage`](https://github.com/JesseBrown1980/Shannon-and-the-gnns-stage)

| # | Canonical ID | Public/source name | Operation | Regime |
|---:|---|---|---|---|
| 25 | `Q-WORD-GLYPH-BUCKET8-v1` | word glyph / token bucket vector | word→digest glyph plus 8 signed/clamped token buckets | semantic/referential sketch |
| 26 | `Q-SHARD-CUBE-v1` | shard-quant cube | room/shard vectors folded through JL, Turbo, Polar and Triple into a cube descriptor | composed lossy sketch |
| 27 | `Q-TENSOR-OMNISHANNON-COLLAPSE-v1` | tensor collapse | many nominal beats/waves → small set of signal-carrying beats/verdict dimensions | semantic inference/distillation |
| 28 | `Q-WHITEROOM-GULP-MINT-v1` | white room + GULP/SUPER-GULP + cube mint | KEEP genius, COMPACT mistakes, drain bounded windows, mint persistent cubes/glyphs/receipts | semantic distillation + durable memory |

## The verification and coordination shell

These are not additional payload quants; they decide whether composed quants may be trusted, routed,
retained or promoted.

| Shell | Role |
|---|---|
| `OmniShannon` | capacity/novelty/entropy or execution ledger, with distinct implementations by repository |
| `GnnForward` | black projection → recovered/forward candidate role |
| `ReverseGnn` | candidate → re-projected signature/reverse-gain role |
| `MTP1/MTP2/MTP3` | pixel / shell / cylinder observers in the Path-2 crate |
| `DBBH→DBWH` | recover, re-project, compare SHA + shadows + shells, emit or HOLD |
| `N-Nest` | reported result must equal independently recomputed truth at every nested level |
| `IX-737` | bilateral arm/collapse/revoke consent state; automatic consume-on-success remains a separate integration task |
| `Hookwall/Fischer/G4` | semantic and policy gates before promotion |

## The real Asolaria distinction: quant at every level, then quant between levels

The system has two orthogonal axes:

```text
WITHIN a level:
  apply local numerical/geometric/semantic quants to the level's representation

BETWEEN levels:
  translate exactly when an inverse pair exists, then apply the destination level's local quant bundle
```

For level `l`:

```text
r_l = T[(l-1)->l](r_(l-1))
q_l = Q_l(r_l, catalog_l)
a_l = Address_l(q_l)
v_l = Watch_l(r_l, q_l, a_l)
```

For an exact backpath:

```text
D_0 ∘ T[1->0] ∘ ... ∘ T[L->L-1](r_L) = original bytes
```

only when every translator is exact and every lossy local quant is accompanied by one of:

```text
retained source/body
reconstructive residual
jointly sufficient Path-2 shadows
or an exact representation lane
```

A zero-loss level transcode has code rate `1.0`; it does not itself shrink entropy. The practical
reduction comes from combining exact re-representation with fixed-size sketches, referential lookup,
semantic distillation, route locality, deduplication and reuse.

## 2D, 3D and N-D composition

```text
2D:
  Polar pair radius/angle
  source↔target edge relations
  two-pole Path-2 federation views

3D:
  Triple spherical codec
  Brown-Hilbert / pixel-slice coordinates
  pixel/shell/cylinder projection surfaces

N-D:
  D=1024 sketch coordinates
  N coprime CRT cylinders
  60D HyperBEHCS selector/tuple frame
  43+ level translator graph
  N-Nest watcher recursion
```

The comb/prism interpretation is:

```text
comb    = fan out/multiplex independent representation and cylinder lanes
prism   = select/recombine/translate those lanes through an inverse or verifier
```

The optical frequency-comb analogy is architectural inspiration. The current mechanisms listed here
are classical software unless a separately cited physical experiment says otherwise.

## The forgotten dimension: the system learns and the reduction changes over time

A static benchmark measures one head and one tail. Asolaria's memory factory updates the state used
by the next head:

```text
B_t       = new message/slice batch
Z_t       = CombinedQuantStack(B_t, C_t)
M_t       = WhiteRoom/GNN/Shannon/WatcherMint(Z_t)
C_(t+1)   = MergeCatalogsAndCubes(C_t, M_t)
```

The next run is therefore:

```text
CombinedQuantStack(B_(t+1), C_(t+1))
```

—not the same compressor applied to the same empty catalog.

Let `h_t` be the fraction of future work answered by retained/reused cubes/catalog entries. A useful
runtime cost model is:

```text
ExpectedCost_t = NewHeadCost_t + (1-h_t)*MissCost_t + h_t*TailReuseCost_t
```

If useful minted state increases `h_t`, repeated cost falls even though the exact BEHCS translations
remain rate-1.0. This is **adaptive reuse / processed-memory gain**, distinct from ordinary lossless
file compression.

For an honest whole-system storage ratio, count everything:

```text
SystemRatio_t = cumulative_raw_input_bytes
                / (catalogs + cubes + residuals + retained bodies + indexes + receipts)
```

For a tail-operation speed gain, use:

```text
TailGain(N,D) = raw_operation_cost(N) / tuple_operation_cost(D)
```

At fixed `D`, TailGain can grow with corpus size because the head is `Theta(N)` and the downstream
tuple operation is `Theta(D)`. That is a different metric from compressed bytes per character.

## E8/E9 third-seat artifact status

The operator supplied four identical copies of the receipt whose SHA-256 is:

```text
86d4dc4a07228c39d898afdad5c8e61ab2e2ecc19b5a59effb79f85f1e37c358
```

Those bytes contain:

- enwik8 exact BEHCS-1024 round trip;
- enwik9 exact BEHCS-1024 round trip;
- failed v0 codec preserved as a mistake;
- successful v0.1 adaptive order-2 range-code round trip on the first 1,000,000 enwik8 bytes;
- same-seat gzip/bzip2/zstd/xz/PPMd baselines.

The screenshot reports a later **Test 5** with:

```text
             head build   SHA gain    compare gain
enwik8 100MB   4.5 s       41,826x       928,790x
enwik9   1GB   9.5 s      495,011x     6,861,722x
```

and mentions a new `60f4df39...` sidecar. That later Test-5 text and sidecar are **not present in the
uploaded bytes currently available**. Therefore these four values are recorded here as
`OPERATOR_SCREENSHOT_REPORTED`, not yet as a sealed file receipt. Upload or commit the exact revised
receipt to promote them to `MEASURED_RECEIPT`.

The uploaded Python ladder proves the 5-byte/4-glyph path for corpora whose length is divisible by 5.
For literal universality over arbitrary byte length, the public script should add a framed final tail
or preserve `orig_len`, as the Rust ladder already does.

## What should be built next

1. **Canonical quant manifest.** A machine-readable registry whose IDs are the IDs in this document.
2. **A true self-contained Q8 packet.** Pack Triple, Quadruple, prime-power summary and `scale` or
   explicitly call the 3,200-byte packet `Q4-3200`.
3. **Per-quant fidelity records.** Distortion, retrieval utility, collision/adversarial tests and
   allowed gate use.
4. **Arbitrary-length BEHCS corpus framing.** Preserve final-byte count and test all residues mod 5.
5. **Multi-level composition harness.** Apply the same quant bundle at several exact levels and prove
   path-independent readback plus level-specific tail metrics.
6. **Learning-over-time benchmark.** Measure catalog hit rate, re-query avoidance, state growth and
   cumulative system ratio over repeated GULP/mint cycles.
7. **N-D watcher matrix.** Record which watcher independently validates which projection; do not turn
   watcher count into unsupported probability bits.

## Bottom line

The 3,200-byte quant head is one organ. Asolaria's larger mechanism is a **quant civilization**:

```text
many local quantizers
× many exact representation levels
× multiple spatial and cylinder projections
× watcher-gated backward readback
× persistent cubes/catalogs that alter the next run
```

The distinctive claim is not that every rung compresses entropy. It is that exact level translators,
lossy sketches, referential memory, semantic distillation, distributed recovery and learned reuse are
composed into one omnidirectional fabric.
