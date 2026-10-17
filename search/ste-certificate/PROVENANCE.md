# Provenance: asolaria-ste-certificate

This crate ports the search / centrality reduction of the reductions repository, the
Sidon-Tower-Embedding (STE) distance-uniqueness certificate, to integer-only Rust 1.81, together
with the two distance probes kept beside it. Upstream is
`JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything` at
`29307bfedb512235f69bf7c290ee72b2813c7c92` (below: `R:`).

The owner's statement of the reduction (`R:README.md:22`): "A licensed distance-unique projection
(measured **196,251 pairs → 0 collisions**)." … "Centrality becomes tie-free; novelty becomes an
O(1) set-membership test." Its status, in the owner's words (`R:canon/FABRIC-IDENTITY-DOCTRINE.md:49`):
"a **licensed projection property**, **not** a required safety invariant. It is scoped to **one
realized address-set + one embedding version**. On address-set growth: a rolling re-proof is
required, or the projection drops to **DRAFT** while identity stays safe through `RelationKey`
regardless."

## Lanes

| Lane | What runs there | Here |
|---|---|---|
| Hot (in process) | Rust only, `no_std` + `alloc`: integers (`u64`, `u128`), SHA-256, `BTreeSet`. No Node, JSON, Python or floats. | `src/` |
| Cold (verification, CI only) | The stdlib Python referee `tools/ste_referee.py`, which mirrors the three scripts line by line. | `tools/` |

The vendored `.mjs` files are pinned bytes only; nothing in this repository executes them.

## Vendored upstream files

Every file under `vendor/` is byte-identical to upstream (`sha256sum -c UPSTREAM.sha256`).

| Vendored path | Upstream path at `R:` | Git blob | sha256 |
|---|---|---|---|
| `vendor/scratch/sidon-cross-fix.mjs` | `01-rebuild/_scratch/sidon-cross-fix.mjs` | `8544b04603a733d8b9e09a41068cffdc16909d86` | `b2f108704507b60f108a4e19bbe9b8ab4076670ec0d08c2d23a8fdf0a29338c6` |
| `vendor/scratch/distance-probe.mjs` | `01-rebuild/_scratch/distance-probe.mjs` | `37d2e7e7e71b3f2b27b6275531a82a2d4274d8ad` | `335735e13e3d83cf768391594b06007b64ec784095eaf7a56c8feb65794565f6` |
| `vendor/scratch/sidon-probe.mjs` | `01-rebuild/_scratch/sidon-probe.mjs` | `67b412f1e762e0500698e89d38214fadda599590` | `7cb30e0daad76dca66acb7482ac5ad64557411af045747b3eb1d10b101a45dd0` |

`vendor/records/` holds line extracts (`sed -n 'a,bp'`) of the documents that record the outputs.
The whole-file blob is listed so the extract can be re-cut from upstream.

| Vendored path | Upstream file at `R:` (blob) | Lines | sha256 of extract |
|---|---|---|---|
| `vendor/records/F02-builder-123-125.txt` | `01-rebuild/F02-unique-distance-theorem--builder.md` (`e1e04fa6cc47da6355171ad789f2600b27601f5a`) | 123-125 | `dd613f7fe12db3c1b540068b88b3dd689f7948e9f80e5344af692297aa1d50a7` |
| `vendor/records/F02-builder-131.txt` | same | 131 | `a4b844eccca64e139fafe685491e8bb64e186bdf6a08a90aeb0b3ac56911ddec` |
| `vendor/records/F02-builder-185-187.txt` | same | 185-187 | `a0440f653d1fa63bbcd356d9f4b54f3a1105407af038f8227cacc7420a4bcd67` |
| `vendor/records/REBUILD-REPORT-175-176.txt` | `ASOLARIA-PRIME-TOWERS-REBUILD-REPORT.md` (`c9cb13416e70fa4d5a11848895189455066b6c1d`) | 175-176 | `1a1402b3b2197cf5affede99180a668e5ee762ff8ed6cbc6116eb92e90b6681b` |
| `vendor/records/S1-145-146.txt` | `03-synthesis/S1-geometry-theorem-math.md` (`30a24a9ca084e8a33a1cc4cd1e23cd6c998b9dc6`) | 145-146 | `1a1402b3b2197cf5affede99180a668e5ee762ff8ed6cbc6116eb92e90b6681b` |

The REBUILD-REPORT and S1 extracts are byte-identical to each other. The F02 extract separates
`min_dist` and `max_dist` with two spaces where the other two use three. All three separate fields
with runs of spaces; the scripts print one space (`sidon-cross-fix.mjs:20-21`). Comparisons with
the records are therefore field by field after splitting on whitespace.

Privacy: the three scripts and the eight extracted lines were scanned for personal names, e-mail
addresses, host or LAN addresses, local paths and keys; none occur. Line 127 of the F02 builder
document (a local path) lies outside the extracted ranges.

## What is ported

| Upstream | Ported to | Notes |
|---|---|---|
| `isPrime`, `erdosTuran` (`sidon-cross-fix.mjs:1-2` = `sidon-probe.mjs:6-7`, identical text) | `src/sidon.rs` | `a_k = 2*p*k + ((k*k) % p)`, `k = 0 .. p-1`. |
| `babs`, `distMultiset` (`sidon-cross-fix.mjs:3-8`) | `src/cross_fix.rs` `dist_multiset` | BigInt as `u128`; `babs(a - b)` as `a.abs_diff(b)` (all points are non-negative); `Set` as `BTreeSet`; `minD` starts `null` (`None`), `maxD` starts `0n`. |
| towers, anchors, points (`sidon-cross-fix.mjs:10-18`) | `src/cross_fix.rs` `embed` | `W = p^3`, `scaled = S * W`, `maxIntra = scaled[last] - scaled[0]`, `GUARD = 2^40`, `anchor_{t+1} = anchor_t + maxIntra_t + GUARD * W_t`. `Tower` holds the script's `{p, W, scaled, maxIntra}` and `anchor`. |
| the measurement and its output (`sidon-cross-fix.mjs:19-24`) | `src/cross_fix.rs` `certificate`, `stdout_lines` | Line 24 prints its line after the loop of line 23 whatever that loop printed; the port does the same. |
| `reg`, `bhIndexLinear`, `CUBES`, `bhIndexSidon`, `probe` (`distance-probe.mjs:5-31`) | `src/distance_probe.rs` | `u32(sha256(String(name).toUpperCase()))` is the digest's first four bytes, big-endian. `Reg` holds the script's `{sector, lane, glyph}`. |
| `allDistinctDistances`, the single-tower loop and the `BIG` layout (`sidon-probe.mjs:8-33`) | `src/sidon_probe.rs` | `BIG = 1000003`; `acc += (span + 1) * BIG`; points `anchor + x * BIG`. |

JavaScript Number values. All three scripts compute their Number values on integers; every such
value is below 2^53 (the referee's `check_bounds` lists 4,411 of them, the largest 97,526,292,578).
On integers in that range binary64 `+`, `-`, `*`, `%`, `Math.abs` and `Math.max` are exact, so the
port uses `u64`. `tests/jsnum.rs` re-derives every `+`/`*` expression in JavaScript evaluation
order with `l0_edge::jsnum::Dbl` (the crate `model/l0-edge`, as a dev-dependency) and checks the
binary64 bit patterns equal the port's integers. `p ** 3` (`distance-probe.mjs:13`) is checked
there as `p * p * p`; the Node run below prints the same lines as the port.

The public functions take any `u64` / `u128`; they equal the scripts' Number functions on inputs
that keep every Number value below 2^53. For `erdos_turan(p)` that holds for `p < 2^26`, where
`k*k` and `2*p*k + (k*k % p)` stay below 2^53. Measured on Node v22.22.0 with
`sidon-cross-fix.mjs:1-2` evaluated unchanged: at `p = 67108859` (the largest prime below 2^26)
0 of the 67,108,859 entries differ from the exact integers; at `p = 67108879` (the first prime
above 2^26) 15 of the 67,108,879 entries differ, the first at `k = 67108850` (Node
9007199388959140, exact and `erdos_turan` 9007199388959141).

Upper-casing. `String(name).toUpperCase()` (`distance-probe.mjs:8`) is `str::to_uppercase` here,
which in Rust 1.81 follows Unicode 15.1.0 (`char::UNICODE_VERSION`), as does the referee's
Python 3.13 `str.upper`. Measured over every code point: Rust 1.81 and Python 3.13 each change
1,525 code points; Node v22.22.0 (`process.versions.unicode` 16.0, ICU 77.1) changes 1,552. The 27
further code points are U+019B, U+0264, U+1C8A, U+A7CD, U+A7DB and U+10D70..U+10D85. A name
holding one of them is hashed with a different upper-cased form on Node v22.22.0, so its seed,
sector, lane and glyph differ: `reg("\u{264}")` gives sector 32, lane 0, glyph 500 here and in the
referee, and 23 / 2 / 622 on Node (the values of U+A7CB, its Unicode 16.0 upper case);
`reg("\u{10D70}")` gives 71 / 1 / 409 here and 18 / 0 / 735 on Node. The script's names
`POS-0 .. POS-255` (`:21`) are ASCII, which all three upper-case alike; the parity in this file is
measured on those names. `tests/probes.rs` (`upper_casing_follows_unicode_15_1`) pins the U+0264
case and the Unicode version.

## Measured agreement

| Check | Command | Result |
|---|---|---|
| vendored bytes | `sha256sum -c UPSTREAM.sha256` | 8/8 OK |
| vendored bytes equal upstream at `29307bf` | curl of the raw files at the commit, `git hash-object`, `cmp`, `sed -n` + `cmp` (the CI step in the CI snippet) | 3/3 scripts and 5/5 extracts equal; 6/6 blob ids equal |
| Rust tests on 1.81.0 | `cargo +1.81.0 test --locked` | 17 passed, 0 failed (certificate 7, jsnum 3, probes 7) |
| referee | `python3 -I tools/ste_referee.py --check` | bounds OK; 4/4 committed fixtures regenerate byte-identical; records equal field by field |
| Rust stdout = referee stdout | `cargo +1.81.0 run --example ste_stdout -- <script>` vs `python3 -I tools/ste_referee.py --stdout <script>`, `cmp` | 3/3 scripts identical |
| upstream stdout (local, once) | `node <script>.mjs` (v22.22.0) on byte-identical copies outside this repository, `cmp` with both | 3/3 identical (sha256 prefixes `78b40e46acfa788f`, `e1b01aea59758dcd`, `06c4b475c5f1330a`); not part of CI |

The certificate (`sidon-cross-fix.mjs`), as printed by Rust, the referee and Node:

```
CROSS-FIX towers=11 points=627 pairs=196251 distinct_dist=196251 collisions=0
min_dist=37349 max_dist=2617523875674652731
INTRA all towers zero-collision: OK
```

It equals the records `R:01-rebuild/F02-unique-distance-theorem--builder.md:185-187`,
`R:ASOLARIA-PRIME-TOWERS-REBUILD-REPORT.md:175-176` and
`R:03-synthesis/S1-geometry-theorem-math.md:145-146` field by field. 627 = 13+17+23+31+41+47+73+79+83+89+131
and 196,251 = 627·626/2. Line 23's loop prints nothing for these towers (every tower's intra
multiset has 0 collisions).

`distance-probe.mjs`:

```
LINEAR  N=64 uniq_index=64/64 pairwise_distances total=2016 distinct=2014 collisions=2
SIDON   N=64 uniq_index=64/64 pairwise_distances total=2016 distinct=2014 collisions=2
LINEAR  N=128 uniq_index=128/128 pairwise_distances total=8128 distinct=8053 collisions=75
SIDON   N=128 uniq_index=128/128 pairwise_distances total=8128 distinct=8096 collisions=32
LINEAR  N=256 uniq_index=256/256 pairwise_distances total=32640 distinct=30799 collisions=1841
SIDON   N=256 uniq_index=256/256 pairwise_distances total=32640 distinct=31744 collisions=896
```

The three `LINEAR` lines equal `R:01-rebuild/F02-unique-distance-theorem--builder.md:123-125`
field by field (2 / 75 / 1841). The `SIDON` count at N=256 equals the "896 at N=256" of `:131`.
The `SIDON` lines at N=64 and N=128 (2 and 32) have no recorded value in `R:`.

`sidon-probe.mjs` (no recorded output in `R:`: a grep for `SIDON-TOWER`, `CROSS-TOWER`, `75198`,
`75,198`, `121053` and `121,053` finds the script's lines 18 and 33 and the heading
`01-rebuild/F02-unique-distance-theorem--builder.md:253`; no output line):

```
SIDON-TOWER p=13 points=13 pairs=78 distinct_dist=78 collisions=0
SIDON-TOWER p=17 points=17 pairs=136 distinct_dist=136 collisions=0
SIDON-TOWER p=23 points=23 pairs=253 distinct_dist=253 collisions=0
SIDON-TOWER p=31 points=31 pairs=465 distinct_dist=465 collisions=0
SIDON-TOWER p=131 points=131 pairs=8515 distinct_dist=8515 collisions=0
CROSS-TOWER total_points=627 pairs=196251 distinct_dist=75198 collisions=121053
```

`R:README.md:149` names `sidon-cross-fix.mjs` and `distance-probe.mjs` as "the actual probe
scripts … that produced the measured certificate".

## Relation to the exporter linearizer

The F02 builder document states its probe used "the exact `mintPid` seeding and the exact
`bhIndex` linearizer" (`R:01-rebuild/F02-unique-distance-theorem--builder.md:119-120`). Measured at
`JesseBrown1980/ASOLARIA-AS-NEURAL-NETWORK` @ `4cc7624`: `bhIndexLinear` (`distance-probe.mjs:10`)
is the formula of `bhIndex` in `tools/behcs/pre-existence-graph-exporter.mjs:47-49`, and for the
names `POS-0 .. POS-255` the name sanitizing of `mintPid` (`tools/behcs/github-pid-register.mjs:45`)
leaves the upper-cased name unchanged (256/256), so `reg` gives the same `sector`, `lane` and
`glyph` as `mintPid` (`:49` seed, `:59` lane, `:62` glyph_1024, `:63` sector; `SECTORS = 113`,
`WIDTH = 1024` at `:15-16`).

## Read notes (2026-10-17 reductions read; not in this repository)

- `REDUCTIONS-READ.md:53`: axis 6 row (owner claim `README:22`, status canon `:49`, code
  `sidon-cross-fix.mjs:1-24`, re-runs L31/L32 matched, aether "absent").
- `REDUCTIONS-READ.md:207`: no code computes `RelationKey` / `RelationEvent` / `ProjectionCert` in any clone.
- `REDUCTIONS-READ.md:212`: search / centrality (STE) wiring row; upstream code to port is
  `sidon-cross-fix.mjs`, exact integers fit `u128`; E2 and M2 not recorded as run.
- `REDUCTIONS-READ.md:241`: owner decision 6, which cold-lane proofs (STE among them) move into the hot lane.
- `REDUCTIONS-READ.md:308-309`: ledger L31 (certificate) and L32 (2 / 75 / 1,841; 896), matched.
- `axes.md:37-38`: re-runs #11 (certificate) and #12 (naive-linearizer control), matched.
- `axes.md:58`: search / centrality axis row.
- `axes.md:122-129`: §7 search / centrality (DOC, CODE, RE-RUN, aether absent).

## Not brought in (no upstream code)

- `ProjectionCert`, `RelationKey`, `RelationEvent`: named in the canon and README; no code in any
  clone (`REDUCTIONS-READ.md:207`).
- The Rolling Projection Licence (M2) and its experiment E2, `quant-delta-rolling.mjs` emitting
  `QUANTDELTA-ROLL` (`R:04-completeness/missing-and-next.md:29-33,75`;
  `R:ASOLARIA-PRIME-TOWERS-REBUILD-REPORT.md:434`): described as a "NEW mechanism"; no file of that
  name in any clone or in the private mirror's history.
- The per-PID `sha16` dither (`R:ASOLARIA-PRIME-TOWERS-REBUILD-REPORT.md:179`;
  `R:01-rebuild/F02-unique-distance-theorem--theorist.md:102-105`): described, no code found.
