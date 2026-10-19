# N-VANTAGE-30-v1 — composed Path-1/Path-2 learning mirror bench

**Date:** 2026-07-13  
**Status:** executable independent reference bench  
**Data:** two consecutive 250,000-byte slices of public enwik8  
**Scope:** classical digital computation; not physical quantum cloning

## Why thirty

Thirty viewpoints are arranged as ten rule-of-three triads:

```text
(generator, reflector, reviewer) × 10
```

Each viewpoint has a distinct prime root and contributes eight exact linear equations per 60-byte
stripe. The primes are lineage/address labels; they are not the source of the linear-algebra theorem.

Important arithmetic boundary:

```text
1 is neither prime nor emirp.
```

The harness records only actual emirp pairs present in the thirty-prime roster. “Prime backwards” is
used only when both the original and reversed decimal numbers are distinct primes.

## Path 2 — complete-body N-dimensional recovery

The source body is divided into 60-byte stripes over `F_257`. Each viewpoint contributes eight
Vandermonde equations per stripe:

```text
Y = A X mod 257
```

For `k` viewpoints:

```text
rank(A_k) = min(8k, 60)
nullity(A_k) = 60 − rank(A_k)
```

Expected capacity ladder:

```text
k=1   8 equations    nullity 52   HOLD
k=4  32 equations    nullity 28   HOLD
k=7  56 equations    nullity  4   HOLD
k=8  64 equations    nullity  0   RECOVER
k=30 240 equations   nullity  0   OVERDETERMINED VERIFY
```

This bench recovers the **entire 250,000-byte body**, not merely a 60D selector. The first sixty
independent equations are inverted once and applied to all source stripes. Every selected and extra
equation is then reprojected. Four redundant shadow families are labeled:

```text
DBBH_FORWARD
DBBH_REVERSE
DBWH_FORWARD
DBWH_REVERSE
```

Those names describe classical projection roles. One residue in each family is deliberately changed;
every disagreement must be held. A corruption inside the recovery basis must also fail SHA or
reprojection.

A separate three-equations-per-view observer ladder measures the 3D-slice version:

```text
three rows per view × twenty views = sixty independent equations
```

## Path 1 — retained-store federation

The improved Path-1 capsule uses full SHA-256 as authoritative object identity. A compact capsule
contains:

```text
object SHA-256
object length
epoch/run/nonce
watcher Merkle root
full-digest retained-store requirement
```

The receiver either already retains the exact body and recalls it, or returns:

```text
HELD_MISSING_RETAINED_BODY
```

Eight retained watcher copies are counted in the conservation ledger. A 30-watcher capsule is also
measured. The original public Path-1 crate remains separately executed in CI; this benchmark’s
full-digest capsule is a stricter experimental successor to its short compatibility handle.

## Learning is split into four different questions

### 1. Same-object memory

The same eight-watcher capsule is encountered six times. Earlier capsule bodies become a zlib
schema dictionary. This measures control-plane memory, not content compression.

### 2. Persistent prior

The supplied exact adaptive order-2 range coder carries its frequency table through six encounters
with object A. Every pass is decoded from an independent clone of the pre-pass state and must finish
with identical encoder/decoder state.

### 3. Unseen-content transfer

Object B is never used to train the prior or catalogs. Three transfer lanes are measured:

```text
persistent order-2 prior learned only from A
BPE/glyph catalog learned only from A
zstd dictionary learned only from A
```

Every B result is byte-identically restored. Incremental cost and standalone cost including the
shared catalog/dictionary are both reported.

### 4. Unseen capsule-schema transfer

A capsule for B is compressed cold and with the capsule schema learned from A. B is pre-retained for
the positive Path-1 case; the missing-body case must still hold. This measures control-plane schema
transfer and is not presented as body compression.

## Composed gate

Emission is allowed only when:

```text
Path 1 capsule valid
Path 1 retained body exact
Path 2 no-store body exact
Path 2 k=8 capacity full rank
Path 2 k=30 reprojection mismatch count = 0
full SHA-256 agrees across both paths
```

The result is then tagged:

```text
VERIFIED_CLONE / 0 LOSS
```

in the classical byte-identical sense.

## Conservation ledgers

Separate costs are reported for:

```text
Path 1 retained bodies + capsules
Path 2 minimum k=8 shadows
Path 2 full k=30 shadows
persistent prior checkpoint
shared BPE catalog
OMNIEVENT full rows and compact portals
```

The bench never calls the raw body byte count `H(X)`. It reports a zero-order entropy estimate as an
estimate, not the full source entropy. The exact claim is simply:

```text
marginal/conditional wire cost may fall
while retained/distributed total state remains at or above the body information carried
```

If eight watchers and the receiver already retain the exact body, the conditional **body** bits
needed are zero. The control capsule remains nonzero, and the retained copies remain fully charged.

## Cross-check against the supplied Claude numbers

The following values are inputs to attack-verify, not preaccepted outputs:

```text
solo                       4.9045 bpc
8-watcher Path 1           0.0482 bpc
repeat pass 2              0.0154 bpc
repeat pass 6              0.0113 bpc
unseen cold                0.0491 bpc
unseen warm                0.0127 bpc
conservation total         2,009,218 B
```

The workflow uses the same object size implied by `1,506 B / 250,000 B = 0.048192 bpc`, but it does
not force any byte count. It records the actual independent measurements and explains methodological
differences.

## Actual crate guard

The same workflow checks out pinned public revisions of:

```text
dbbh-coms-quant-prism
path2-two-shadow-recovery
```

under Rust 1.97, asserts the exact 19- and 30-test surfaces, and runs all targets before executing the
new composed bench.

## Evidence products

```text
nv30_summary.json
nv30_summary.hbp
nv30_events_full.ndjson
nv30_events_portal_v1.hbp
nv30_events_portal_v2.hbp
nv30_views3d.ndjson
SHA256SUMS
```

Every event is Catalog47-addressed and carries a separate HyperBEHCS-60D selector, actor PID,
triad/role, UTC/HLC/sequence, prior event hash, event hash, and full Merkle membership.
