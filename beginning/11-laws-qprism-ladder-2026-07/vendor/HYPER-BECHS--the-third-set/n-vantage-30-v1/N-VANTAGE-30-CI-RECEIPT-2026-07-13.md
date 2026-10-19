# N-VANTAGE 30 composed Path-1/Path-2 learning bench — measured CI receipt

**Date:** 2026-07-13  
**Repository:** `JesseBrown1980/HYPER-BECHS--the-third-set`  
**PR:** `#21`  
**Tested branch head:** `3421a87cf0ebb87089eb9705523c88ddf513940c`  
**PR test merge:** `a16fac2fb585534af8bb53387d91a4dcfaf998ea`  
**Workflow run:** `29252561014`  
**Job:** `86824448501`  
**Artifact:** `8280012094`  
**Artifact SHA-256:** `3983f19a141458021028188b11a53c6c25e0b81add87f6ec8aa49d0160c553e8`  
**Runner:** Ubuntu 24.04, Python 3.12, NumPy 2.4.4, Rust/Cargo 1.97.0

## Outcome

Every gate completed successfully:

```text
pinned public Path-1 crate          19/19 PASS
pinned public Path-2 crate          30/30 PASS
Catalog47 and BEHCS alphabet        PASS
public enwik8 size and SHA          PASS
30-vantage complete-body Path 2     PASS
k<8 insufficient-capacity holds    PASS
k=8 exact recovery                  PASS
k=30 full reprojection              PASS
four light-family tamper holds      PASS
random 8-view dropout recovery      PASS
random 7-view holds                 PASS
Path-1 retained recall              PASS
Path-1 missing-body hold            PASS
six exact persistent-prior passes  PASS
unseen-object transfer controls     PASS
composed Path-1 + Path-2 emission   VERIFIED_CLONE / 0 LOSS
conservation ledger                 MIRROR HELD
41-event OMNIEVENT chain            PASS
artifact seals                      PASS
```

## Data

Two consecutive, non-overlapping public enwik8 slices were used:

```text
object A
  offset 0
  bytes  250,000
  SHA-256
  665fc689441b68462d88f82dc33212abe9c4824be095d03a556c9b55a2829fd3

object B — unseen transfer target
  offset 250,000
  bytes  250,000
  SHA-256
  ad836029f76171281ef9aa90f9011231f2675e19709a42993cb0f0afd9d65ee6
```

Thirty prime-root viewpoints were grouped into ten generator/reflector/reviewer triads. The actual
emirp pairs present in the roster were:

```text
13 ↔ 31
17 ↔ 71
37 ↔ 73
79 ↔ 97
```

`1` is neither prime nor emirp.

# Path 2 — Claude's rank/nullity ladder reproduced exactly

The body was divided into 60-byte stripes over `F_257`. Every viewpoint contributed eight
Vandermonde equations per stripe. The bench reconstructed the **entire 250,000-byte body**, not only
a selector.

```text
k=1    8 equations   rank  8   nullity 52   HELD
k=2   16 equations   rank 16   nullity 44   HELD
k=3   24 equations   rank 24   nullity 36   HELD
k=4   32 equations   rank 32   nullity 28   HELD
k=5   40 equations   rank 40   nullity 20   HELD
k=6   48 equations   rank 48   nullity 12   HELD
k=7   56 equations   rank 56   nullity  4   HELD
k=8   64 equations   rank 60   nullity  0   RECOVER
k=30 240 equations   rank 60   nullity  0   REPROJECT
```

Measured exactness:

```text
recovered SHA-256
665fc689441b68462d88f82dc33212abe9c4824be095d03a556c9b55a2829fd3

k=8 reprojection mismatches     0
k=30 reprojection mismatches    0
```

Five random eight-view subsets each had rank 60, restored the body, and produced zero reprojection
mismatches. Five random seven-view subsets each had rank 56/nullity 4 and were held.

## Four-light tamper gate

One redundant field element was changed in each named family:

```text
DBBH_FORWARD   1 mismatch  HELD_WATCHER_DISAGREEMENT
DBBH_REVERSE   1 mismatch  HELD_WATCHER_DISAGREEMENT
DBWH_FORWARD   1 mismatch  HELD_WATCHER_DISAGREEMENT
DBWH_REVERSE   1 mismatch  HELD_WATCHER_DISAGREEMENT
```

A corruption inside the recovery basis produced a different body SHA and four selected-set
reprojection mismatches. It was held.

## 3D-slice versus eight-equation viewpoint

A second observer calculation used three equations per viewpoint:

```text
19 viewpoints  57 rows  rank 57  nullity 3
20 viewpoints  60 rows  rank 60  nullity 0
30 viewpoints  90 rows  rank 60  nullity 0
```

Thus the required viewpoint count is determined by information/rank supplied per viewpoint, not by a
mystical preferred number.

## Path-2 storage price

```text
minimum k=8 shadows, direct uint16 storage   533,376 B
minimum k=8 information-size estimate        266,876 B
full k=30 shadows, direct uint16 storage    2,000,160 B
source body                                  250,000 B
```

The no-store Path-2 lane paid more than the source information in distributed shadows, as required.

# Path 1 — retained-store pricing

The solo exact body baseline used zstd-19:

```text
solo payload             78,133 B
solo rate                2.500256 bpc
```

The improved Path-1 experiment used full SHA-256 as authoritative address:

```text
full eight-watcher capsule      1,803 B   0.057696 bpc
compact Merkle capsule            106 B   0.003392 bpc
full thirty-watcher capsule     5,196 B   0.166272 bpc
compact thirty-watcher capsule    106 B   0.003392 bpc
```

The compact capsule was `737.10×` smaller than the solo zstd payload on the wire, but only because the
receiver already retained the exact body. With no retained body, the same valid capsule returned:

```text
HELD_MISSING_RETAINED_BODY
```

The compact capsule moves the individual watcher attestations behind their Merkle root; their full
proof bodies remain retained elsewhere.

## Same-object capsule memory

The repeated full capsule was dictionary-coded from prior capsule bodies:

```text
pass  wire bytes  bpc
1          871    0.027872
2          474    0.015168
3          477    0.015264
4          477    0.015264
5          483    0.015456
6          482    0.015424
```

Measured:

```text
pass 1 → pass 2   -45.58%
pass 1 → pass 6   -44.66%
```

Claude's reported pass-2 `0.0154 bpc` reproduced closely. The reported pass-6 `0.0113 bpc` did not;
the independent schema curve plateaued near `0.0153 bpc`.

The theorem-level conditional body cost is zero when the receiver already retains the exact body:

```text
H(body | exact retained body) = 0
```

The measured control wire remained nonzero, and eight retained copies remained fully charged.

# Learning and transfer

## Persistent order-2 prior — same object

Every pass was decoded from an independent clone of the pre-pass model, and encoder/decoder final
state matched exactly.

```text
pass 1   3.214496 bpc
pass 2   2.778656
pass 3   2.744512
pass 4   2.730528
pass 5   2.722240
pass 6   2.716800
```

The exact same-object payload fell `15.48%`, not the reported `77%`.

## Persistent prior — unseen object B

```text
cold B                   3.304224 bpc
warm after 1 A pass      3.130752 bpc   gain 5.250%
warm after 3 A passes    3.163104 bpc   gain 4.271%
warm after 6 A passes    3.188864 bpc   gain 3.491%
```

The prior transferred, but repeated training on the same A slice reduced rather than increased its
benefit on B. The reported `74.2%` unseen-content gain did not reproduce in this codec family.

Prior-state ledger after six A passes:

```text
dense table                 67,108,864 B
non-default cells               16,983
sparse estimate                118,913 B
exact zlib checkpoint          108,586 B
```

## Control-plane schema transfer

A new B capsule, with B already retained on the receiver, measured:

```text
cold capsule       870 B   0.027840 bpc
warm capsule       484 B   0.015488 bpc
gain                       44.368%
```

Without B in the store, the warm capsule still held. This is schema/control-plane transfer, not body
compression.

## Glyph/BPE catalog transfer to unseen B

A catalog learned only from A was applied to B and reversed exactly:

```text
1 level  incremental 2.882752 bpc   standalone 2.949184 bpc
2 levels incremental 2.881120 bpc   standalone 3.013280 bpc
cold raw zstd-19      2.619680 bpc
```

The transferred glyph catalog made B larger than cold zstd on this slice.

## zstd dictionary control

The best incremental dictionary row used 32,768 shared bytes:

```text
warm payload          2.593344 bpc   1.005% better incrementally
payload + dictionary  3.641920 bpc   39.02% worse standalone
cold zstd-19          2.619680 bpc
```

This confirms a small shared-catalog wire benefit and demonstrates why the catalog must be charged in
the full ledger.

# Composed gate

Both routes produced the same body:

```text
Path 1 retained-store SHA
665fc689441b68462d88f82dc33212abe9c4824be095d03a556c9b55a2829fd3

Path 2 no-store recovery SHA
665fc689441b68462d88f82dc33212abe9c4824be095d03a556c9b55a2829fd3

Path 2 full reprojection mismatches  0
COMPOSED                           VERIFIED_CLONE / 0 LOSS
```

# Conservation

```text
source body                                      250,000 B
empirical zero-order entropy estimate            157,865 B

Path-1 eight retained bodies                   2,000,000 B
Path-1 state before telemetry                  2,012,621 B
Path-2 minimum k=8 u16 shadows                  533,376 B
persistent-prior checkpoint                     108,586 B
shared BPE catalog                                2,076 B

composed state before telemetry                2,656,659 B
full OMNIEVENT rows                              171,934 B
composed state with full events                2,828,593 B
```

Claude's reported `2,009,218 B` is close to the independently measured Path-1-only retained-body
ledger, but it cannot be the full composed Path-1 + Path-2 + prior ledger. The complete measured
composition remained above the source body by construction.

# Events and portals

```text
OMNIEVENT rows             41
full event bytes      171,934 B
portal v1              14,111 B
portal v2               3,881 B
full/portal-v2 ratio    44.301469×
chain head
39a3fd730d770449e72a18d74bfe8e78a447c002a952332458375c16c1f2eec4
Merkle root
36d230d146d017b90c2f79eeec16e789b8398ef0186e25b90dd8d0ebe754b861
```

The compact portal is almost the same byte scale as Claude's reported `3,818 B`; the exact bytes,
object size, event schema, and ledger differ.

# Cross-check verdict

## Reproduced

- the exact `52, 28, 4, 0, 0` Path-2 nullity ladder;
- refusal at seven viewpoints and exact full-body recovery at eight;
- exact k=30 overdetermined reprojection;
- four projection-family tamper holds;
- both real Rust crate surfaces, 19/19 and 30/30;
- a pass-2 capsule rate essentially equal to the reported `0.0154 bpc`;
- exact same-object learning and modest unseen transfer;
- composed Path-1/Path-2 byte identity and honest conservation.

## Not reproduced

- the reported solo `4.9045 bpc` under the independently chosen zstd baseline;
- pass-6 `0.0113 bpc` under the supplied schema-learning method;
- unseen-content `74.2%` transfer gain;
- a full composed conservation total of only `2,009,218 B`.

## Strongest new result

The Path-2 ladder was upgraded from a 60D selector demonstration to exact no-store recovery of a
real 250,000-byte object. Any tested eight complete viewpoints recovered it; every seven-view set was
held; all thirty viewpoints reprojected without a mismatch.

No physical quantum cloning, total-ledger sub-entropy result, or infinite-machine execution is
claimed.
