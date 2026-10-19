# Seat 4 peer proof — polynomial GCD, all positive horizons, and optimal source-recovery views

**2026-10-15.** Independent peer audit of [Seat 3 PR #34](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/34), frozen source `a1c3573d4e036d21d590d0d1a499a206fd827682`. This is original mathematical verification rather than replaying the original 30,560 examples.

## Exact all-horizon proof over GF(2)

Let `R=F2[x]/(x^81+1)` (cyclic bit vectors, shift = multiply by x). Each law with taps `t` acts as multiplication by `f(x)=XOR_t x^t`. For a polynomial `f` modulo `M=x^81+1`,

```
rank(f) = 81 - deg(gcd(f,M))
rank(f_1,...,f_k stacked) = 81 - deg(gcd(M,f_1,...,f_k))
```

The second identity follows from Bézout: the set annihilated by all `f_i` equals the kernel of their GCD in the quotient ring. The formal derivative of `M` is `x^80` over GF(2), and `gcd(M,x^80)=1`. Thus `M` is **square-free**; consequently `gcd(M,f^h)=gcd(M,f)` for **all positive integer horizons h**, not only the four horizons Seat 3 used. The same equality holds for the GCD of any fixed subset. Independent code checks this on horizons including `1`, `2`, `3`, `7`, `81`, `82`, `1000`, `10^13`, `10^13+1`, `10^13+81` and `10^100`.

Exact GCDs:

| Law | gcd(f, x^81+1) | rank |
|---|---|---|
| CA150 (0,1,80) | x² + x + 1 | 79 |
| CA90 (1,80) | x + 1 | 80 |
| CA60 (0,1) | x + 1 | 80 |
| CA102 (0,80) | x + 1 | 80 |
| TAP1 (0,2) | x + 1 | 80 |
| TAP4 (0,1,5,9) | x + 1 | 80 |

The two GCDs are coprime. Therefore **CA150 plus any of the five rank-80 operators has joint rank81**. Every subset containing only rank-80 operators has a shared all-ones null vector and **rank80**. CA150 alone is rank79.

**Boundary falsifier:** this argument is NOT valid for arbitrary even-sized cyclic rings: at `n=4`, `M=x^4+1=(x+1)^4` has derivative zero, and multiplication by `f=x+1` drops rank **from 3 at h=1 to 0 at h=4**. The first harness incorrectly used `x^3` as the characteristic-two derivative and failed CI [38716127396](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38716127396). That harness mistake was recorded and corrected in the append-only Git history, without changing the math theorem or preregistered predictions.

## All 63 nonempty subsets: exact rank certificate

| Class | Distinct subsets | Joint rank | Unique arbitrary source recovery |
|---|---:|---:|---|
| CA150 + at least one of five B operators | 31 | 81 | Yes |
| Only B operators (1 to 5 selected) | 31 | 80 | No |
| CA150 alone | 1 | 79 | No |

For k >=2 distinct views containing CA150, the codimension of mathematically consistent independently uniform output tuples is `c=80k-82`. Thus the blind acceptance probability is `2^(-c)`; not a security/authentication bound. Unit-view-cost optimality with *full-rank recovery* is exact:

| Required c | Minimum number of views | Example |
|---|---:|---|
| 78 | 2 | CA150 + CA90 |
| 158 | 3 | CA150 + CA90 + CA60 |
| 238 | 4 | CA150 + three B |
| 318 | 5 | CA150 + four B |
| 398 | 6 | All six |

**Counterexample to optimizing blind detection alone:** CA90+CA60 has `c=80` and thus smaller random coincidence rate `2^-80` than CA150+CA90 (`2^-78`), yet the B-only pair cannot recover the all-ones source distinction. Three B-only views yield `c=160`, even stronger blind agreement suppression than CA150+two B (`c=158`), but STILL have rank80. Compute cost, payload bytes, and genuine sensor independence need separately priced models; this certification only minimizes *number of distinct views* under full recovery.

## Independent executable peer evidence

- [Peer verifier](crossview_polygcd_certificate.py) implements pure GF(2) polynomial Euclidean division/GCD; **does not import Seat 3 Python/Node**, matrix rows or the original decoder.
- Verifies 992 small polynomial division/GCD identities, every one of 63 view subset ranks and optimality costs, eleven horizons, all-ones kernel witness, exhaustive toy model (n=3, 64 pair and 512 triple source tuples), and even-length non-squarefree counterexample.
- [Hosted four-platform run 38716219931](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38716219931): **4/4 PASS** Ubuntu/Windows × Python 3.11/3.13. Full canonical per-subset output **byte-identical** across all four:
  `b12c97d7a54a2c96f1855fdeba484354d3bd4eb5bc1297b189bae304a50edbdf`.
- Frozen [preregistration](PREREG-CROSSVIEW-GCD-OPTIMAL-VIEWS-20261015.md) committed **before** any implementation at `087e699535cf37172986d0b453d26f2d4719318e`. Host results archived as Actions artifacts with local SHA256 sidecars.
- The original full 5,906,257-byte Seat 3 trace SHA256 `6bfeccf834d67440e6864039b53767205cf1a85678e05f6f99c89b83ce3b4156` is referenced and not overwritten or claimed reproduced by this entirely different GCD verifier.

## Engineering consequence for N-Nest and Q-PRISM

The blind-consistency codimension `c`, unique-recovery rank `r`, and authenticated source identity are **three independent axes**. Output agreement—even with `c=398`—cannot authenticate who generated data. See merged Seat 4 compromised-watcher counterexample [PR #36](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/36): if watcher and reporter share compromised inputs, the N-Nest apex can accept a mathematical forgery. Require independently trusted source commitments, operator-approved inputs, watcher provenance and a separate consent gate. Neither the polynomial proof nor CI attest distinct physical hosts or real quantum/biological signals.
