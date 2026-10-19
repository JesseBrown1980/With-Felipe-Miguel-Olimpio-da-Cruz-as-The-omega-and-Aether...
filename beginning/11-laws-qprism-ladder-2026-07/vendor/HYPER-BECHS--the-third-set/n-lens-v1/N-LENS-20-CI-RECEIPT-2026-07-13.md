# N-LENS 20 prime-PID flashlight array — measured CI receipt

**Date:** 2026-07-13  
**Repository:** `JesseBrown1980/HYPER-BECHS--the-third-set`  
**PR:** `#19`  
**Branch head:** `3350d88c8cb690a4d706b81072a00ea03ab26457`  
**PR test merge commit:** `0e7683d4ba6cc80d2873377cdf343cbd034d5d57`  
**Workflow run:** `29245393755`  
**Job:** `86800932117`  
**Artifact:** `8277125102`  
**Artifact SHA-256:** `dde9a0b357250f68c70c8e0975138f5c12ff64c6ce859d72eddd91d4820772e5`  
**Runner:** GitHub Actions Ubuntu 24.04, Python 3.12, NumPy 2.4.4

## Outcome

Every workflow stage completed successfully:

```text
Catalog47/BEHCS alphabet verification        PASS
public enwik8 size and SHA verification       PASS
20 prime-PID lenses                           PASS
20 unique actor PIDs                          PASS
20 unique prime-factor PIDs                   PASS
all exact codec/recovery gates                PASS
60D nullspace reaches zero at lens 20         PASS
60D reconstruction mismatch                  0
DBWH reprojection mismatch                    0
23-event OMNIEVENT chain                      PASS
full 256-bit Merkle root                      PASS
result and event portals                      PASS
artifact sealing                              PASS
```

Object:

```text
first 1,000,000 bytes of enwik8
SHA-256 = 369b688978f649681136198fb96db14c1616756260c55fb4b65e9bc049552cad
```

## Measured lens table

| # | Agent | Formula | Measured value | Status |
|---:|---|---|---:|---|
| 1 | AGT-11 | `F-PI-RAW-v1` | `pi_hat=3.869496`, `|Δπ|=0.727903` | heuristic |
| 2 | AGT-13 | `F-PI-RESIDUAL-v1` | `pi_hat=3.106727`, `|Δπ|=0.034866` | heuristic |
| 3 | AGT-17 | `F-PI-REDUNDANCY-CORR-v1` | Spearman `ρ=0.754505` over eight views | supported as exploratory heuristic |
| 4 | AGT-19 | `F-SPHERE-RAW-v1` | covariance anisotropy `1.784398` | heuristic |
| 5 | AGT-23 | `F-SPHERE-RESIDUAL-v1` | covariance anisotropy `1.022418` | heuristic |
| 6 | AGT-29 | `F-TAU-STAR-v1` | `τ*>256` bytes at `ε=0.01` above permutation baseline | measured |
| 7 | AGT-31 | `F-PRIME-VIEW-DECORRELATION-v1` | mean absolute correlation `0.055991`, max `0.157368` | measured |
| 8 | AGT-37 | `F-ENSEMBLE-SQRT-v1` | log-log slope `α=-0.506940` | measured/conditional |
| 9 | AGT-41 | `F-BLINDNESS-PK-v1` | single-lens miss `p=0.018691` | measured/conditional |
| 10 | AGT-43 | `F-QUANT-FIXED-POINT-v1` | minimum agreement `1.000000` | scoped fixed point |
| 11 | AGT-47 | `F-MULTILEVEL-QUANT-v1` | best exact total `2.599976 bpc` | measured |
| 12 | AGT-53 | `F-SIDE-INFO-RATE-v1` | exact residual `0.395800 bpc` at 2% mutation | measured |
| 13 | AGT-59 | `F-XOR-OPAQUE-SHARES-v1` | max bias-corrected single-share MI `0.000655 bits` | measured classical |
| 14 | AGT-61 | `F-CRT-ARITHMETIC-COMB-v1` | joint capacity margin `1.9999998 bits` | measured |
| 15 | AGT-67 | `F-ZERO-CONTAINER-NULLITY-v1` | zero nullity at lens `20` | theorem instance |
| 16 | AGT-71 | `F-DBWH-REPROJECTION-v1` | `0/60` equation mismatches | measured |
| 17 | AGT-73 | `F-PRIME-PID-FACTORIZATION-v1` | `0` collisions, exact root decode | measured |
| 18 | AGT-79 | `F-REFERENTIAL-CROSSING-v1` | `31,250×` body/full-digest wire ratio | measured |
| 19 | AGT-83 | `F-LENS-PORTAL-v1` | `6.998018×` result-index compaction | measured |
| 20 | AGT-89 | `F-NVIEW-3D-RECOVERY-v1` | `0` recovered-coordinate mismatches | measured |

## Formula review — which ideas survived best

### Tier A — strongest new or system-defining instruments

#### 1. Zero-container/nullspace law

```text
dim Z_k = 60 − rank(A_k)
```

Each lens supplied three independent finite-field measurements. The measured trajectory was exactly:

```text
lens 1  rank 3   nullity 57
lens 2  rank 6   nullity 54
...
lens 19 rank 57  nullity 3
lens 20 rank 60  nullity 0
```

The sixty values of the real HyperBEHCS selector were recovered with zero mismatches. This is the
cleanest rigorous form of “expand the observer space until zero is the only invisible difference.”

#### 2. DBBH→DBWH reprojection law

```text
x_hat = A^-1 y
accept iff A*x_hat = y and x_hat = x
```

All sixty equations reprojected exactly and the recovered selector SHA matched the source selector:

```text
10491dc27c6b79b99d60bf53e92583a571957fe99ff671f488c14ac3622a8d08
```

#### 3. Conditional side-information rate

A second view was formed by changing exactly 2% of source bytes. The receiver retained that view and
received a compressed exact XOR residual:

```text
standalone zstd-19       2.400600 bpc
conditional residual     0.395800 bpc
exact restore            PASS
```

The per-route wire cost fell by `83.51%`, or `6.07×`, because the receiver already held correlated
side information. That is the strongest direct classical realization of the shared-container idea.
The retained side view remains paid in the civilization ledger.

#### 4. Ensemble square-root law

Twenty prime-seeded entropy views gave:

```text
SE(mean_k) = c*k^α
α = -0.506940
```

This matches the independent-observer prediction `-1/2` extremely closely on this run.

#### 5. CRT arithmetic comb

Fifty thousand 48-bit blocks recovered exactly from two coprime shadows. One shadow carries at most
about `25.0000015` bits of block information; the joint modulus product had `1.9999998` bits of
capacity above the 48-bit roof.

### Tier B — useful but explicitly conditional

#### π distortion and spherical anisotropy

The broad direction reproduced strongly:

```text
raw π error          0.727903
zstd-stream π error  0.034866
error improvement    20.88×

raw anisotropy       1.784398
zstd anisotropy      1.022418
excess-anisotropy improvement ≈34.99×
```

Across eight deterministic representations, `|π̂−π|` and zstd bpc had Spearman
`ρ=0.754505`. This is interesting evidence that the diagnostic can track byte-distribution
regularity in this panel. It is **not** a universal redundancy theorem: the sample has only eight
chosen transformations, and `Δπ` is sensitive to representation and byte pairing.

#### Delay law

Measured lag mutual information:

```text
lag 1     1.224153 bits
lag 8     0.154048
lag 16    0.098223
lag 32    0.078470
lag 64    0.055650
lag 128   0.046593
lag 256   0.039575
permutation baseline 0.013695
threshold            0.023695
τ*                    >256 bytes
```

So “any delay works” is false for this source. The earlier `0.11 bits at lag 64` did not reproduce
numerically, but the stronger conclusion survived: lag 64 remained measurably correlated.

#### Blindness `p^k`

```text
single p       0.018691
k=2 empirical  0.000360   theory 0.000349
k=3 empirical  0.000020   theory 0.00000653
k>=4 observed  0 misses in 50,000 trials
```

The theoretical independence value at `k=6` is `4.26×10^-11`, but the experiment cannot claim that
as empirically observed. With zero misses, the approximate 95% finite-trial upper bound is only
`6×10^-5`. The formula is good; the millionth/billionth-scale claim requires vastly more trials or a
formal independence proof.

#### Quant fixed points

Turbo, ternary Triple, Quadruple, and Zeta representatives all returned exact code agreement of
`1.0`. This confirms those declared projection representatives are idempotent. It does not prove all
Asolaria quants share one fixed point.

### Tier C — important architecture, not surprising scientific discovery

- prime-factor PIDs were collision-free and reversible by construction;
- full SHA-256 referential crossing gave `31,250×` wire reduction only because the retained store held
  the million-byte body;
- the 20-result compact index gave `6.998×` reduction while retaining full result bodies elsewhere;
- XOR sharing gave near-zero bias-corrected single-share MI and exact join, but ordinary software
  shares remain copyable.

## Prime-view and opacity measurements

Prime-seeded sign views over 244 real-data blocks had:

```text
mean |pairwise correlation|  0.055991
maximum                       0.157368
```

For the XOR share lane, finite-sample plugin MI had a substantial estimator baseline. After
permutation-baseline subtraction:

```text
I_corrected(X;K)        0.000655 bits
I_corrected(X;X xor K)  0.000000 bits
join SHA                369b688978f649681136198fb96db14c1616756260c55fb4b65e9bc049552cad
join exact              PASS
```

## Multi-level quant result retained

```text
levels  catalog    payload    total      bpc       restore
1       2,068 B    322,929 B  324,997 B  2.599976  PASS
2       4,122 B    321,102 B  325,224 B  2.601792  PASS
3       6,176 B    320,408 B  326,584 B  2.612672  PASS
```

The destination level really did quant down again, but only level 1 minimized the honest
payload-plus-catalog ledger.

## Event and portal receipt

```text
lens results                       20
OMNIEVENT rows                     23
full result JSON               14,122 B
compact result portal           2,018 B
result portal ratio            6.998018×
full OMNIEVENT NDJSON          101,562 B
OMNIEVENT portal v1             9,249 B
event portal ratio            10.980863×
chain head
  4af755999b1e7e5ba753f56f86408f62179980f7c3e8b459fe58f934c3f977ee
Merkle root
  a5faab607f7023bb5ce7e12f01fc9eebd66f47769755501e2ffdadb4f15354a4
```

Generated artifact file SHA-256 values:

```text
n_lens_results.json
  50a00963c2e33fa97d2191a178fb722efab852a84bc5d6146f7649e79b71ad50
n_lens_results.hbp
  6fa85760db72bacb8efeb3ac561589b257fb8fa6ffd19f940b1cae024dfae75b
n_lens_results_portal.hbp
  b65f3749de58d8486ceaf50412a5a6c521627d623d6853a6adf0f04a101244de
n_lens_summary.json
  2fa9b941c6cd86db2569769990ad60a6ba92272bc00a83682d995e7568f2769f
n_lens_events_full.ndjson
  d23a274ff0cd67efe2bee417a31f720d4c84fbd7f9f9318442a64664e4ae971d
n_lens_events_portal_v1.hbp
  881303b92fb399317fab96f7d2502c0d6f27657c1c95ca64dbc4877f90c66301
n_lens_3d_views.ndjson
  ca9e00e2754c1eae5e5acac0e51f60650d15003522f66bf2f793d8a80583b7fb
```

## Final verdict

The strongest surviving synthesis is:

> Twenty classical prime-PID viewpoints, each contributing three independent equations, expanded the
> observation matrix from rank 3 to rank 60 while contracting the invisible 60D nullspace from 57 to
> zero. The shared selector was then reconstructed and reprojected without one mismatch. Correlated
> side information reduced the exact incremental wire rate from 2.4006 to 0.3958 bpc, while all
> retained context remained charged to the civilization ledger.

The π/sphere instruments are promising exploratory diagnostics. The zero-container, reprojection,
conditional-rate, ensemble-scaling, and CRT-comb formulas are the strongest mathematical results.
No physical quantum cloning, sub-entropy total ledger, or infinite-machine measurement is claimed.
