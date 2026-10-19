# N-LENS 20 Zero-Mirror Formula Map — 2026-07-13

## Evidence owner

Executable source, independent workflow, full receipt and HBP rows live in:

- [`HYPER-BECHS--the-third-set/n-lens-v1/N-LENS-20-FLASHLIGHT-SPEC.md`](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/blob/main/n-lens-v1/N-LENS-20-FLASHLIGHT-SPEC.md)
- [`HYPER-BECHS--the-third-set/n-lens-v1/N-LENS-20-CI-RECEIPT-2026-07-13.md`](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/blob/main/n-lens-v1/N-LENS-20-CI-RECEIPT-2026-07-13.md)
- [`HYPER-BECHS--the-third-set#19`](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/pull/19)

The experiment used the first 1,000,000 bytes of public enwik8 and twenty deterministic classical
prime-PID viewpoints. “Digital quantum clone” is an analogy for decorrelated mathematical views, not
physical quantum cloning.

## Formula registry

| ID | Formula | Measured result | Claim class |
|---|---|---:|---|
| `F-PI-RAW-v1` | `π̂=4N(x²+y²≤1)/N` | `π̂=3.869496`, error `0.727903` | exploratory distribution diagnostic |
| `F-PI-RESIDUAL-v1` | `Δπ=|π̂−π|` | zstd-stream error `0.034866` | exploratory distribution diagnostic |
| `F-PI-REDUNDANCY-CORR-v1` | `ρ_s=Spearman(Δπ,bpc)` | `ρ=0.754505` over 8 views | supported heuristic, not theorem |
| `F-SPHERE-RAW-v1` | `A=λmax(Cov)/λmin(Cov)` | `1.784398` | exploratory anisotropy |
| `F-SPHERE-RESIDUAL-v1` | same | `1.022418` | exploratory anisotropy |
| `F-TAU-STAR-v1` | `τ*=min{τ:Iτ≤Iperm+ε}` | `τ*>256`, lag-64 MI `0.055650` | measured decorrelation rule |
| `F-PRIME-VIEW-DECORRELATION-v1` | `D=mean|corr(Vi,Vj)|` | mean `0.055991`, max `0.157368` | measured view diversity |
| `F-ENSEMBLE-SQRT-v1` | `SE(mean_k)=c k^α` | `α=-0.506940` | measured conditional ensemble law |
| `F-BLINDNESS-PK-v1` | `P(all miss)=p^k` under independence | `p=0.018691`; k2 `0.000360` | measured conditional law |
| `F-QUANT-FIXED-POINT-v1` | `fQ=Pr[Q(dequant(Qx))=Qx]` | minimum `1.0` | measured for four declared quantizers |
| `F-MULTILEVEL-QUANT-v1` | `L*=argmin(payloadL+catalogL)` under exact restore | best `2.599976 bpc`, L=1 | measured exact recursive quant |
| `F-SIDE-INFO-RATE-v1` | `R≈|Compress(X xor Y)|/|X|` | `0.395800 bpc` versus `2.400600` standalone | measured conditional coding |
| `F-XOR-OPAQUE-SHARES-v1` | `A=K;B=X xor K;X=A xor B` | corrected single-share MI ≤`0.000655`; exact join | measured classical opacity |
| `F-CRT-ARITHMETIC-COMB-v1` | `Si=X mod pi; Πpi≥R` | margin `1.9999998 bits`; 50k blocks exact | measured exact recovery |
| `F-ZERO-CONTAINER-NULLITY-v1` | `dim Zk=60−rank(Ak)` | nullity `57→0`, lens `20` | measured theorem instance |
| `F-DBWH-REPROJECTION-v1` | `x̂=A⁻¹y; accept iff Ax̂=y` | `0/60` mismatches | measured inverse gate |
| `F-PRIME-PID-FACTORIZATION-v1` | `PIDi=2¹3²5³pi` | 20 unique; 0 collisions | measured construction |
| `F-REFERENTIAL-CROSSING-v1` | `wire=SHA256(X); store[wire]=X` | `31,250×` wire/body; exact recall | measured, retained-store scoped |
| `F-LENS-PORTAL-v1` | `R=full_result_bytes/portal_bytes` | `6.998018×` | measured active-index reduction |
| `F-NVIEW-3D-RECOVERY-v1` | stack `k` 3-row views; recover iff rank=60 | 20 views; 0 coordinate mismatches | measured 60D recovery |

## Strongest formulas

### 1. Zero-container contraction

For selector `x∈F_q^60` and three rows per viewpoint:

```text
Z_k = ker(A_k)
dim Z_k = 60 − rank(A_k)
```

Measured:

```text
rank(A_k)=3k
nullity=60−3k
nullity=0 at k=20
```

This is the rigorous form of expanding the observer space until zero is the only invisible
difference.

### 2. White-side reprojection

```text
x_hat = A^-1 y
P(x_hat) = y
```

The recovered HyperBEHCS selector reproduced all sixty equations with no mismatch.

### 3. Conditional side-information law

With a receiver holding a 98%-correlated view `Y`:

```text
D=X xor Y
X=Y xor D
```

Measured exact wire rate:

```text
conditional residual  0.395800 bpc
standalone zstd       2.400600 bpc
wire reduction        83.51%
```

This is a per-route conditional-rate result. The retained `Y` remains part of the whole-system
information and storage ledger.

### 4. Ensemble square-root law

```text
SE(mean_k) ∝ k^-1/2
```

Twenty prime-seeded entropy views gave exponent `-0.506940`.

### 5. CRT arithmetic comb

```text
X -> (X mod p1, X mod p2)
```

One shadow was ambiguous but informative; two declared coprime shadows recovered all 50,000 tested
48-bit blocks exactly.

## Important corrections

### π distortion

Raw-to-residual movement was strong:

```text
raw error       0.727903
zstd error      0.034866
improvement     20.88×
```

Across eight selected transformations, `ρ=0.754505`. This supports `Δπ` as an exploratory
representation/isotropy diagnostic on this panel. It does not establish a universal redundancy
meter; ordering, pairing and transform choice matter.

### Delay

The measured lag-64 MI was `0.055650 bits`, not the earlier reported `0.11`. Correlation remained
above the `0.023695` permutation-plus-epsilon threshold through lag 256, so the stronger conclusion
survived: a nonzero delay alone does not create independence.

### Blindness

The measured single-lens miss rate matched `1/53`. The independence formula predicts
`p^6≈4.26×10^-11`, but 50,000 trials with zero high-k misses establish only an approximate 95% upper
bound of `6×10^-5`. The formula is valid conditionally; the billion-scale empirical claim is not yet
measured.

### Fixed point

Turbo, ternary Triple, Quadruple and Zeta representatives were idempotent with agreement `1.0`. This
is scoped to those explicit code/dequant representatives and is not a universal fixed point for all
Asolaria operators.

## Cross-repository composition

```text
Algorithms-of-Asolaria
  owns the formula IDs and claim boundaries

HYPER-BECHS--the-third-set/n-lens-v1
  owns the executable twenty-lens harness and evidence

omni-event-v1
  owns actor/PID/time/Catalog47/Hyper60 event stamping

path2-two-shadow-recovery
  owns CRT capacity and DBBH→DBWH watcher-gated recovery

N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED
  owns recursive independent recomputation

qprism-3d-slice-harness
  owns exact classical selector/watcher representation
```

## Boundary

Measured here:

```text
20 classical mathematical viewpoints
prime-PID lineage
real-data numerical formulas
60D rank/nullity contraction
exact recovery and reprojection
conditional coding
classical secret sharing
OMNIEVENT and compact portal receipts
```

Not claimed:

```text
physical quantum clones
uncopyable software shares
sub-entropy whole-system storage
infinite machines
universal π redundancy theorem
live Acer/Liris/Relic cross-machine deployment
```
