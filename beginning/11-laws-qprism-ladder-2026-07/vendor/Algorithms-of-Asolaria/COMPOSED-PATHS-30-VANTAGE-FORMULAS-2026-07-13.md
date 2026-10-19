# Composed Path-1 / 30-vantage Path-2 Formula Map — 2026-07-13

## Evidence owner

Executable source, CI, full Markdown/HBP receipt and artifacts are merged in:

- [`HYPER-BECHS--the-third-set/composed-paths-30-vantage-v1/`](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/tree/main/composed-paths-30-vantage-v1)
- [`HYPER-BECHS--the-third-set#20`](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/pull/20)
- merge commit `3cbe9d52b9186462a91e1af1323422745ca068e9`

The experiment used the first 1,000,000 bytes of public enwik8, reran the public Path-1 19-test and
Path-2 30-test Rust crates under Rust 1.97, then composed eight retained-store watchers with thirty
prime-PID vantages and four invertible projection lights.

## Canonical formulas

| ID | Formula | Measured result | Claim class |
|---|---|---:|---|
| `F-PATH2-8RAY-LADDER-v1` | `rank(A_k)=min(8k,60); nullity=60-rank(A_k)` | nullity `52,28,4,0,0` at `k=1,4,7,8,30` | measured theorem instance |
| `F-RANK-NOT-WATCHER-COUNT-v1` | `capacity = rank(A), not number of rows/watchers` | duplicate watcher at k=8 left rank `56`, nullity `4`, HOLD | measured negative control |
| `F-FOUR-LIGHT-CONSENSUS-v1` | `x = T_l^-1(A^-1 y_l)` for every invertible light `l` | four canonical selectors identical; zero warp delta | measured exact composition |
| `F-DBWH-ALL-ROW-REPROJECTION-v1` | `accept iff A_selected x_hat=y_selected` | 0/64 and 0/240 mismatches nominal | measured inverse gate |
| `F-DBWH-TAMPER-HOLD-v1` | `mismatch_count(Ax_hat,y)>0 => HOLD` | extra flip `1`; basis flip `180` mismatches | measured negative control |
| `F-PATH1-ZERO-BODY-PAYLOAD-v1` | retained body implies `body_payload_wire=0` | `0 B`, while control remains nonzero | measured retained-store result |
| `F-PATH1-FANOUT-CONTROL-v1` | `R_control=8*receipt_bytes*8/N` | `5,680 B = 0.045440 bpc` | measured wire ledger |
| `F-COMPOSED-ACTIVE-WIRE-v1` | `R=(Path1Fanout+Path2K8Shadows)*8/N` | `6,192 B = 0.049536 bpc` | measured composed wire |
| `F-COMPOSED-DISCOUNT-v1` | `G=R_solo_exact/R_active` | `2.400600/0.049536=48.461725x` | measured conditional/reuse gain |
| `F-COMPOSED-EMISSION-GATE-v1` | `Emit = P1FullSHA ∧ P1Recall8of8 ∧ P2FourLightConsensus` | `VERIFIED_CLONE` | measured exact gate |
| `F-REPLICATED-CONSERVATION-v1` | `S_total=8S_body+S_control+S_shadows(+S_receipts)` | data plane `2,408,200 B`; +portal `2,412,887 B` | measured state ledger |
| `F-ZERO-PAYLOAD-NOT-ZERO-COST-v1` | `payload_delta=0` does not imply `wire=0` or `state=0` | active wire `6,192 B`; retained bodies `2,400,600 B` | measured boundary |
| `F-FOUR-LIGHT-SHADOW-SIZE-v1` | `B_shadow=L*k*r*2` | `4*8*8*2=512 B`; all 30=`1,920 B` | measured serialization |
| `F-TRIAD-PRIME-PID-30-v1` | `PIDfactor=2^1*3^2*5^3*p_vantage` | 30 prime roots arranged as 10 triads | measured construction |
| `F-H0-MODEL-BOUNDARY-v1` | `L_H0=N*H0(byte)/8` | `H0=5.058855 bpb`, model `632,357 B` | measured model, not true file entropy |

## Strongest formulas

### 1. Eight-ray capacity ladder

For a 60D selector and eight independent equations per vantage:

```text
rank(A_k)=min(8k,60)
nullity(A_k)=60-rank(A_k)
```

Measured:

```text
k=1   nullity 52  HOLD
k=4   nullity 28  HOLD
k=7   nullity 4   HOLD
k=8   nullity 0   RECOVER
k=30  nullity 0   RECOVER + 180 redundant checks beyond a 60-row basis
```

This is the precise “eight watchers clear the roof” result. The number eight follows from
`ceil(60/8)`, not from a universal mystical constant.

### 2. Rank, not count

A duplicate eighth watcher supplied eight rows but no new independent information:

```text
row count 64
rank      56
nullity    4
outcome   HOLD_INSUFFICIENT_INDEPENDENCE
```

The result prevents a false promotion based only on watcher count.

### 3. Four-light inverse consensus

For invertible coordinate maps `T_l`:

```text
black_l(x) = A T_l(x)
white_l(y) = T_l^-1(A^-1 y)
```

All four lights—identity, reverse, affine and prime permutation—returned the same canonical selector
with zero canonical, inverse-warp and reprojection mismatch.

### 4. Conditional/reuse wire law

When all eight Path-1 watchers already retain the exact body:

```text
body payload        0 B
Path-1 fanout    5,680 B
Path-2 k=8         512 B
active wire      6,192 B = 0.049536 bpc
```

The active wire was `48.461725x` smaller than one standalone zstd exact code. This is a marginal
reuse/conditional result. The retained bodies remain paid.

### 5. Conservation

```text
8 exact replicas                 2,400,600 B
Path-1 fanout                         5,680 B
all 30-vantage four-light shadows     1,920 B
replicated data plane             2,408,200 B
compact event portal                  4,687 B
```

Zero body retransmission did not produce zero total wire or zero total state.

## Cross-check against the reported Claude bench

### Reproduced

```text
k=1/4/7 holds
k=8 recovers exactly
k=30 reprojects exactly
composed Path-1 + Path-2 emits exact body
small marginal wire with large retained-state ledger
```

### Close but not byte-identical

```text
reported marginal rate     0.0482 bpc
independent measured rate  0.049536 bpc
relative difference        2.771784%
```

The receipt and shadow formats differ, so the values are not called the same measurement.

### Did not reproduce under the named ledger

```text
reported retained/conservation total   2,009,218 B
independent replicated data plane       2,408,200 B
```

The independent result uses the measured 300,075-byte exact zstd body, eight replicas, an explicit
710-byte receipt fanout and four-light shadow accounting.

## Number-theory boundary

The factor-PID path uses actual primes and fixed exponents. In standard number theory:

```text
1 is neither prime nor composite
9 is 3^2 and is not prime
an emirp is a prime whose reversed decimal digits form a different prime
```

The useful role of `1` is the multiplicative identity, not a new prime class.

## Cross-repository ownership

```text
Algorithms-of-Asolaria
  owns formula IDs, ledger names and claim boundaries

HYPER-BECHS--the-third-set/composed-paths-30-vantage-v1
  owns executable composition and evidence

dbbh-coms-quant-prism
  owns public Path-1 retained-store mechanism and tests

path2-two-shadow-recovery
  owns public CRT Path-2 and DBBH→DBWH watcher tests

n-lens-v1
  owns prior twenty-view nullspace/conditional-coding formulas

omni-event-v1
  owns Catalog47/Hyper60 event identity and compact portal
```

## Boundary

Not claimed:

```text
physical quantum cloning
astrophysical black/white-hole realization
zero total wire
zero retained state
whole-system storage below Shannon
that a fixed file has a uniquely measurable entropy equal to H0
live Acer/Liris/Relic routing
```
