# COMPOSED-PATHS-30-v1 — eight retained watchers, thirty N-D vantages, four inverse lights

**Date:** 2026-07-13  
**Status:** independent classical reference benchmark  
**Object:** first 1,000,000 bytes of public enwik8  
**Boundary:** no physical quantum cloning and no total-ledger Shannon violation

## Purpose

This bench attack-verifies the reported composed result with a stricter ledger and additional negative
controls. It combines:

```text
Path 1
  eight exact retained stores
  + full SHA-256 authoritative address
  + compact watcher attestations
  + zero body-payload cache hit

Path 2
  thirty prime-PID viewpoints
  × eight equations per viewpoint
  × four invertible black/white light orientations
  + capacity/rank gate
  + exact inverse
  + all-shadow reprojection

Composed emission
  Path-1 body SHA must pass
  AND every Path-2 light must recover the body-derived canonical selector
  ELSE HOLD
```

The public Rust Path-1 and Path-2 suites are also rerun under Rust 1.97 in the workflow. The Python
composition is a stronger N-D reference layer around those already-measured crates, not a claim that
it is their source code.

## Prime and rule-of-three arrangement

Thirty actual primes identify the vantages:

```text
11,13,17,19,23,29,31,37,41,43,
47,53,59,61,67,71,73,79,83,89,
97,101,103,107,109,113,127,131,137,139
```

They are arranged as ten round-robin triads:

```text
generator → reflector → reviewer
```

A readable factor PID uses:

```text
2^1 · 3^2 · 5^3 · p_vantage
```

The authoritative actor PID remains an 8-byte SHA-derived identity. `1` is the multiplicative
identity, not a prime; it is not used as a false prime/emirp proof.

## Path 2 — exact capacity ladder

The body derives one 60×10-bit HyperBEHCS/Q-PRISM selector. Every vantage contributes eight distinct
Vandermonde equations over `F_65537`:

```text
y_i = A_i x
```

With `k` vantages:

```text
rank(A_k) = min(8k,60)
nullity   = 60 - rank(A_k)
```

Expected gate:

```text
k=1   8 equations    rank 8    nullity 52   HOLD
k=4  32 equations    rank 32   nullity 28   HOLD
k=7  56 equations    rank 56   nullity 4    HOLD
k=8  64 equations    rank 60   nullity 0    RECOVER + 64-row reprojection
k=30 240 equations   rank 60   nullity 0    RECOVER + 240-row reprojection
```

The gate depends on independent rank, not watcher count. A duplicate-watcher control replaces
vantage 8 with vantage 7; its 64 rows remain rank 56 and must HOLD.

## Four black/white lights

The same canonical selector is viewed through four invertible orientations:

```text
IDENTITY
REVERSE
AFFINE
PRIME_PERMUTE
```

For each orientation:

```text
black side   canonical selector -> oriented selector -> 30×8 shadows
white side   sufficient shadows -> oriented recovery -> inverse warp -> canonical selector
DBWH gate    every selected equation and the canonical selector must match
```

This is the precise meaning of four mathematical lights. They are invertible coordinate changes, not
four physical black holes or quantum beams.

Tamper controls:

```text
duplicate watcher at k=8      -> HOLD_INSUFFICIENT_INDEPENDENCE
one flipped extra equation    -> HOLD_WATCHER_DISAGREEMENT
one flipped basis equation    -> wrong candidate + all-row reprojection HOLD
```

## Path 1 — eight saved runs

The body is compressed exactly with zstd-19 and retained by eight watcher stores under the complete
SHA-256. A binary receipt carries:

```text
full SHA-256
Host8 hint
body/compressed lengths
run/sender/receiver PIDs
nonce
attestation root
8 watcher PIDs
8 × 64-byte SHA-512 attestation digests
```

These digests are not called signatures. The benchmark verifies every exact recall. A one-bit damaged
replica is detected and strict unanimity refuses emission.

When every watcher already retains the body:

```text
body payload on the wire = 0 bytes
control/address receipt   > 0 bytes
```

Therefore “zero” means zero retransmitted body payload, not zero communication and not zero retained
state.

The bench reports separately:

```text
solo exact-code bpc
per-watcher control bpc
8-way fanout control bpc
Path-2 active shadow bpc
total active wire bpc
8-replica retained-store bytes
shared-store policy bytes
```

## Composed gate

Emission requires:

```text
Path1ReceiptValid
AND 8/8 retained recalls are SHA-exact
AND four Path-2 lights recover at k=8
AND four lights agree at k=30
AND recovered selector equals selector derived from recalled body
```

Only then:

```text
COMPOSED_VERIFIED_CLONE
```

## Conservation ledger

The ledger names four distinct quantities:

```text
raw source bytes
empirical zero-order byte-model size
one exact zstd code length
full replicated civilization state
```

The empirical zero-order model is not asserted to be the source's true Shannon entropy. The exact
federation storage includes eight retained compressed bodies, all thirty-vantage shadows, control
receipts, and the compact event portal. Marginal wire can be tiny because prior state has already
been paid.

## OMNI integration

The benchmark emits Catalog47/Hyper60 OMNIEVENT rows for:

```text
run open
Path-1 receipt
8 Path-1 watcher recalls
30 prime-PID Path-2 vantages
4 DBWH light recoveries
3 negative-control holds
composed emission
conservation ledger
run close
```

Every event carries actor/surface/run/trace/span identities, UTC/HLC/sequence, Catalog47 values,
Brown-Hilbert glyph addresses, a 60D selector, prior hash, event hash, and full Merkle commitment.
OMNIPORTALv2 provides the compact active index while full events remain retained.

## Claude-output cross-check

The reported capacity ladder is directly testable and should reproduce exactly. The reported Path-1
`4.9045 -> 0.0482 bpc` and `2,009,218 B` conservation values cannot be accepted without their exact
wire and storage ledgers. This independent run uses a named binary receipt, four-light shadow packet,
and full retained-state accounting. Similar numbers under different ledgers are not treated as the
same measurement.
