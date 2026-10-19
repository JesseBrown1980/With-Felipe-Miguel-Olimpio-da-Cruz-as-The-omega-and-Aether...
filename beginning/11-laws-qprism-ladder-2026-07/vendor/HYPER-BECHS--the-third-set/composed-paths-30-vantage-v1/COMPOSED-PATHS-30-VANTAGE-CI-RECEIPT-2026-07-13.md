# Composed Path-1 / 30-vantage Path-2 — measured CI receipt

**Date:** 2026-07-13  
**Repository:** `JesseBrown1980/HYPER-BECHS--the-third-set`  
**PR:** `#20`  
**Tested head:** `77be413b59373571b569c1acad0e17b37aaeb350`  
**Workflow run:** `29250775935`  
**Job:** `86818481781`  
**Artifact:** `8279268369`  
**Artifact SHA-256:** `8afbea49cb9e2f5c259345be476f7b89e79fd9fda5350e0b3b0063f1fe1ed175`  
**Receipt-integrity run:** `29250776025` — PASS

## Corpus and prior crates

The preferred enwik8 source succeeded:

```text
corpus          enwik8:first1000000
full enwik8 SHA 2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8
slice bytes     1,000,000
slice SHA-256   369b688978f649681136198fb96db14c1616756260c55fb4b65e9bc049552cad
```

Before the composition ran, the workflow independently cloned and reran both public Rust crates under
Rust 1.97:

```text
dbbh-coms-quant-prism       19 tests passed
path2-two-shadow-recovery   30 tests passed
```

The supplied historical codec remains an exact baseline only because its decoder reproduces the
input byte-for-byte; the earlier false v0 result was explicitly rejected by the restore gate.

## Final outcome

```text
Path 1       PASS
Path 2       PASS
composition  VERIFIED_CLONE
body SHA     exact
selector     exact
four lights  consensus
```

The run emitted 50 Catalog47/Hyper60 OMNIEVENT rows, a compact OMNIPORTALv2, a full SHA chain and a
256-bit Merkle root:

```text
chain head
  55449801c7092c4547cd1b86aed787367ca24a150ba8beaceeea0ea7ddf2ff5b

Merkle root
  83b3224465835fb97359c668dc1d4a7abb5beea908a2f6d80ed52d9d41663adc
```

## Path 2 — the reported ladder reproduced exactly

One real body-derived HyperBEHCS selector had 60 coordinates. Thirty prime-PID vantages supplied
eight Vandermonde equations each over `F_65537`. The complete experiment was repeated under four
invertible black/white coordinate lights:

```text
IDENTITY
REVERSE
AFFINE
PRIME_PERMUTE
```

Every light produced the same ladder:

| Vantages | Equations | Rank | Nullity | Gate |
|---:|---:|---:|---:|---|
| 1 | 8 | 8 | 52 | `HOLD_INSUFFICIENT_CAPACITY` |
| 4 | 32 | 32 | 28 | `HOLD_INSUFFICIENT_CAPACITY` |
| 7 | 56 | 56 | 4 | `HOLD_INSUFFICIENT_CAPACITY` |
| 8 | 64 | 60 | 0 | `RECOVER_EXACT` |
| 30 | 240 | 60 | 0 | `RECOVER_EXACT` |

At both `k=8` and `k=30`, every light had:

```text
canonical selector mismatches  0
reprojection mismatches        0
inverse-warp metric delta      0
```

All four recovered the canonical selector:

```text
ea765b269cf3686c8e865961ab44be487d0bc9b717c980b38b1f8a23bbb0ac5f
```

This independently reproduces Claude's reported capacity ladder, including the crucial `k=7` HOLD
and `k=8` exact crossing.

### Negative controls

```text
duplicate vantage 8 = vantage 7
  rank at k=8     56
  nullity          4
  outcome          HOLD_INSUFFICIENT_INDEPENDENCE

one flipped extra equation
  recovery basis remains exact
  reprojection mismatches 1
  outcome          HOLD_WATCHER_DISAGREEMENT

one flipped basis equation
  selector mismatches      60
  all-240 reprojection mismatches 180
  outcome          HOLD_WATCHER_DISAGREEMENT
```

This shows that watcher count alone is not capacity. Independent rank and reprojection are the gate.

## Path 1 — eight saved exact runs

The source was encoded exactly with zstd-19 and retained by eight stores under the complete SHA-256:

```text
raw bytes                    1,000,000
one exact zstd body            300,075 B
solo exact code               2.400600 bpc
8 retained exact replicas   2,400,600 B
```

The binary Path-1 receipt contains the full digest, Host8 hint, lengths, run/sender/receiver PIDs,
nonce, attestation root, eight watcher PIDs and eight 64-byte SHA-512 attestation digests:

```text
receipt bytes        710
receipt SHA-256      e02bd8332715abb9653581ba0ea45d3f7a015c41b286db84360612c4ea1c7748
receipt valid        PASS
8/8 recall           SHA-exact
```

A deliberately damaged replica produced:

```text
valid replicas       7
held replicas        1
strict unanimity     HOLD
```

### Zero payload, nonzero system cost

Because all eight watchers already retained the object:

```text
retransmitted body payload      0 B = 0 bpc
one watcher control receipt   710 B = 0.005680 bpc
8-way receipt fanout        5,680 B = 0.045440 bpc
```

The zero applies only to body payload on a cache hit. The address, receipt, retained bodies and
watcher state remain paid.

## Composed marginal wire

The minimum Path-2 crossing used eight vantages under all four lights:

```text
4 lights × 8 vantages × 8 equations × 2 B = 512 B
```

Combined with the eight-way Path-1 control fanout:

```text
Path-1 fanout           5,680 B
Path-2 k=8 shadows        512 B
combined active wire    6,192 B
combined active wire    0.049536 bpc
```

Compared with one exact standalone zstd code:

```text
2.400600 / 0.049536 = 48.461725×
```

Claude reported `0.0482 bpc`; this independent result is only `0.001336 bpc` or `2.77%` higher, but
it is not labeled a byte-for-byte reproduction because the receipt and shadow ledgers differ.

## Conservation ledger

```text
empirical zero-order byte entropy  5.058855 bits/byte
empirical H0 model size             632,357 B
one exact zstd code                 300,075 B
8 exact replicas                  2,400,600 B
Path-1 fanout                         5,680 B
all 30×4 Path-2 shadows               1,920 B
replicated data-plane total        2,408,200 B
compact event portal                   4,687 B
active replicated+portal total     2,412,887 B = 19.303096 bpc
full event archive                   198,773 B
all of the above retained          2,611,660 B = 20.893280 bpc
```

The empirical H0 number is a zero-order model, not the unknowable exact entropy of this one fixed
file. The exact conservation statement is simpler: the small active wire is possible because the
federation already paid for eight exact retained bodies. No total information or storage bill fell
below the one-copy exact requirement.

Claude's reported `2,009,218 B` total did not reproduce under this named ledger. The independent
replicated data-plane result is `2,408,200 B`; the difference comes from actual compressed-body size,
four-light shadow accounting and the explicit receipt format.

## Four-light interpretation

The four black/white lights were invertible coordinate changes, not physical black holes:

```text
canonical selector
 -> black orientation
 -> 30×8 shadows
 -> sufficient-row inverse
 -> white orientation inverse
 -> canonical selector
 -> all-row reprojection
```

The “warp correction” is the exact inverse map back into the common 60D frame. Each orientation
returned zero canonical and reprojection mismatch.

## Status ledger

### `MEASURED`

- Path-1 Rust suite: 19 passing tests;
- Path-2 Rust suite: 30 passing tests;
- eight exact retained replicas and full-SHA receipt;
- zero body payload with nonzero control wire;
- 30-vantage/eight-equation/four-light rank ladder;
- exact recovery at k=8 and k=30;
- duplicate, extra-equation and basis-equation holds;
- composed Path-1+Path-2 verified emission;
- conservation and observability ledgers.

### Not claimed

- physical quantum cloning;
- actual astrophysical black or white holes;
- zero total communication;
- zero retained state;
- total-ledger compression below Shannon;
- live Acer/Liris/Relic daemon routing;
- that `1` is prime or an emirp.

The mathematically useful part of the operator's `3+0=3; /3=1` intuition is the rule-of-three role
identity and multiplicative neutral element. In standard number theory, `1` is neither prime nor
composite.

## Artifact hashes

```text
corpus_source.hbp
  9c88a390e438c3795185ce44243d29593b94c8d892c9dd61a55ed821097b02f8
path1_receipt.bin
  e02bd8332715abb9653581ba0ea45d3f7a015c41b286db84360612c4ea1c7748
path2_shadows_4lights_30v.bin
  127110a94b7efe66b54befd93a8b3e4b81b8aba5f9dc1b89f632dbc7024a7cc4
path1.json
  e9e263be40a20e9d8fefaf3c4f4d5904c99beac7d9e6bc55eb27441c5ec4c715
path2.json
  611f67641d20b7625ed9b3486593421a16a2c220e68de7fda1032b4c457f1c6c
composed_summary.json
  749d9fafa39d76c465cfe05a4c4b8ae6c62e58651d62231d7fc6fde4b5a83a2a
composed_events_full.ndjson
  e30661b62df59bca9437259383c16db6d17a0ff2cbf4bc6905312d8bb7d31076
composed_events_portal_v2.hbp
  1373202e36ead1f0e85df377ddc60da3b6cee42d19671686a1eaf7bf90f2889d
```

## Final verdict

> Thirty prime-PID vantages reproduced the exact 60D capacity ladder under four invertible
> orientations: seven vantages remained four dimensions blind and were held; eight reached full
> rank and recovered exactly; thirty supplied 180 redundant equations that all reprojected. Eight
> retained Path-1 stores then emitted the exact body using zero retransmitted body bytes but nonzero
> address/control/shadow wire. The composed gate returned `VERIFIED_CLONE`, while the replicated
> storage ledger remained above the one-copy exact information bill.
