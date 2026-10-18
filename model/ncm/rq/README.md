# ncm/rq — residual quantization, tested against balanced ternary

This crate tests two derivations that came in with the Next-Concept Modeling intake (arXiv
2610.14162), D1 and D2, and answers three of the refute targets the intake's map left open (1, 2 and
4). It is integer only, Rust 1.81, and reuses the estate's balanced-ternary kernel
(`asolaria-tribit`, `kernel/tribit`) as a path dependency.

Every number below is **MEASURED**: computed here by the code in `src/`, reproduced by the tests in
`tests/`, and printed by `cargo run --release --example report`. Claims attributed to the NCM paper
are **NAMED** (reported by its authors, not reproduced here). Claims that remain unproven are
**CONJECTURE**.

## How to run

```bash
./check.sh                               # fmt --check, clippy -D warnings, tests, no-float grep
cargo +1.81.0 run --release --example report   # prints every MEASURED row
```

Toolchain is pinned to 1.81.0 in `rust-toolchain.toml`. The tests enumerate the full in-range band
for K = 13 (1,594,323 values) and run 1,000,000 seeded random vectors each for the two D2 schedules;
the suite finishes in a few seconds.

## Trit order and sign convention (stated, as D1 asks)

A trit is the kernel's `asolaria_tribit::Zero`: `Neg = -1`, `Nil = 0`, `Pos = +1`.
`Zero::direction()` returns the signed value and `Zero::from_digit(index + 1)` builds it from an
index in `{-1, 0, +1}`, exactly the packing digit of `kernel/tribit/src/lib.rs`. Trits are written
**most significant first**: slot 0 is the coefficient of `3^(K-1)` (the coarsest level), matching
`TritWord::pack`'s order. The greedy code chosen at level `k` is `index * 3^k`, so its sign is the
trit. This is the convention `recon_msb` inverts and the one every D1 count below is measured in.

## D1 — balanced ternary is the exact-integer case of residual quantization

Greedy coarse-to-fine residual quantization in one dimension, level `k` from `K-1` down to `0`, with
the balanced codebook `{-3^k, 0, +3^k}` and a nearest-code choice (`2r` compared against `±3^k`, so
no division). For `K = 13` every integer in `[-(3^13-1)/2, (3^13-1)/2] = [-797161, 797161]` was
enumerated.

| check | result | MEASURED |
|---|---|---|
| values enumerated | 3^13 | 1,594,323 |
| (a) final residual = 0 | all | 1,594,323 / 1,594,323 |
| (b) greedy indices = tribit balanced trits | all | 1,594,323 / 1,594,323 |
| (c) ties (`2\|r\| == 3^k`) | none | 0 |
| (d) / target 2: invariant held before every level | all | 1,594,323 / 1,594,323 |
| recon_msb inverts x (bijection witness) | all | 1,594,323 / 1,594,323 |

Out of range, a band of 1,000 values on each side starting at `x = ±797,162` (that is
`±((3^13-1)/2 + 1)`):

| check | result | MEASURED |
|---|---|---|
| values tested (both sides) | 2,000 | 2,000 |
| (e) nonzero final residual | all | 2,000 / 2,000 |

Bijection, for every K from 1 to 13: the in-range count is exactly `3^K` and `recon_msb` returns `x`
for all of them, so the map `x → trits` is injective into `{-1,0,+1}^K`; since the domain also has
`3^K` elements it is a bijection, and all `3^K` codewords are distinct. Measured true for K = 1…13.

### Target 1 — the no-tie step (proof)

A tie at level `k` is when `r` is equidistant from two codes, i.e. `2|r| = 3^k`. The left side is
even for every integer `r`; `3^k` is odd for every `k`. An even number never equals an odd one, so no
tie can occur, and the nearest code is always unique. The one-line form: `2r = ±3^k` is impossible
because `3^k` is odd. The enumeration confirms it — **0 ties** over 1,594,323 inputs and all 13
levels — and `tests/d1.rs::target1_the_no_tie_step_is_exact` also scans every residual in
`[-3^k, 3^k]` for each k and finds none. **MEASURED, and proven.**

### Target 2 — the invariant at the top level (proof)

Claim: for `|x| ≤ (3^K-1)/2`, `|r| ≤ (3^(k+1)-1)/2` before each level `k`.

- Top level `k = K-1`: before it, `r = x`, and `(3^((K-1)+1)-1)/2 = (3^K-1)/2 ≥ |x|` by hypothesis.
  It holds, trivially.
- Step down: if `|r| ≤ (3^(k+1)-1)/2` before level `k`, the nearest of `{-3^k, 0, +3^k}` leaves a
  residual of magnitude at most `(3^k-1)/2`. (At the extreme `r = (3^(k+1)-1)/2` the nearest code is
  `+3^k` and the new residual is exactly `(3^k-1)/2`.) That is the bound before level `k-1`.
- At `k = 0` the bound is `(3^0-1)/2 = 0`, so the final residual is 0 — which is check (a).

Measured true before **every** level for all 1,594,323 inputs. **MEASURED, and proven.**

### Why the centring is load-bearing (failure mode a)

With the uncentred codebook `{0, 1·3^k, 2·3^k}`, greedy nearest-code is not base-3 digit extraction.
Over `[0, 3^13-1]` (1,594,323 values), greedy nearest-code disagrees with base-3 extraction on
**1,577,940** of them, and leaves a nonzero residual on the same 1,577,940 (it reconstructs only the
16,383 where the two happen to coincide). Centring on the ground point is what makes greedy equal to
exact digit extraction; without it the method is neither. **MEASURED.**

**Why the surviving count is exactly `2^(n+1) − 1` (proof).** The uncentred codebook is
non-negative, so once a residual goes negative no finer level can bring it back to 0 — exactness
needs the residual to stay `≥ 0` and reach 0, i.e. greedy must never round up. Let `f(n)` be the
exact count over `[0, 3^n − 1]`, split into `L(n)` (lower half `[0, (3^n−1)/2]`) and `U(n)` (upper
half). Partition `[0, 3s − 1]` by the top digit `d`, with `s = 3^(n−1)`:

- `d = 0` (`x ∈ [0, (s−1)/2]`) and `d = 1, r ≥ 0` (`x ∈ [s, s+(s−1)/2]`) both land in the lower half,
  each exact iff its residual is a lower-half exact point one level down → `L(n) = 2·L(n−1)`.
- `d = 2` (`r ≥ 0` plus the clamped tail `x ≥ 2s`) lands in the upper half, covering the whole
  next-level exact set → `U(n) = L(n−1) + U(n−1) = f(n−1)`.

With `L(1) = 2, U(1) = 1`: `L(n) = 2^n` and `U(n) = f(n−1) = 2^n − 1`, hence
`f(n) = L(n) + U(n) = 2^(n+1) − 1`. Checks: `f(1)=3, f(2)=7, f(3)=15, f(13)=16,383`, matching the
enumeration above. So dropping the centring collapses ternary addressing to a binary-sized set.
**MEASURED, and proven.**

So D1's in-range claim, a CONJECTURE in the intake map, is confirmed here: the integer ternary form
reconstructs 100% by construction (compare the paper's NAMED 99.99% on OWT tokens).

### Second machine (ACER) — byte-for-byte

ACER ran an independent D1 crate (its own `tribit` kernel, reused via `#[path]`) on Windows and
pinned the K=13 code stream to `3cae2346…`. Rebuilt here from ACER's exact sources — only the
Windows `#[path]` repointed at the shipped kernel — cargo 1.81.0 reproduces the same hash over all
20,726,199 bytes (`all_levels_pass=1`, 231 ns/value here vs 242 on ACER). The run, its receipt and
the two-machine note are filed in `docs/handoffs/acer-post60d-2026-10-18/ncm-d1-run/`. **MEASURED on
two machines, two operating systems.**

## D2 — a ternary multiscale schedule on the 27-cube, and target 4

### ACER's proposal: sum down, repeat up (1/3/9/27)

Down is the block sum of three (addition only, no division, the remainder never dropped to a mean);
up repeats each value. Measured over all of `{-1,0,1}^9` (the 1/3/9 sub-schedule, 19,683 vectors) and
over 1,000,000 seeded random length-27 vectors with entries in `[-13, 13]`:

| set | round-trip exact (finest) | full-pyramid exact | per-level residual range | per-level "coarse = block sums" |
|---|---|---|---|---|
| `{-1,0,1}^9`, all 19,683 | 1 / 19,683 | 1 / 19,683 | L0 [-2, 2], L1 [-6, 6] | L0: 1, L1: 343 |
| random 27, 1,000,000 | 0 / 1,000,000 | 0 / 1,000,000 | L0 [-26, 26], L1 [-75, 77], L2 [-151, 152] | L0: 0, L1: 0, L2: 2 |

All MEASURED. The only vector that round-trips under sum/repeat is the all-zero one: `up(down([a,b,c]))
= [a+b+c, a+b+c, a+b+c]`, which equals `[a,b,c]` only when `a=b=c=0`. The "coarse = block sums"
counts are the degenerate cases where a level's block sums are all zero (`7^3 = 343` such vectors in
`{-1,0,1}^9`, two by chance in the random run). So the sum/repeat pair is exact only trivially — its
exactness carries no information about the finer levels.

### Target 4 — an exact *and* non-trivial integer down/up pair, without learning

Yes. An integer S-transform lifting step on a block of three is exactly invertible and its coarse
value is informative:

```
lift3(a,b,c)   -> coarse = floor((a+b+c)/3),  d1 = b-a,  d2 = c-b
unlift3(c,d1,d2) -> a = c - floor((2*d1+d2)/3), b = a+d1, c = b+d2
```

Floors use Euclidean division by the constant 3, so it is integer only and correct for negatives.
Stacked over the 27-cube (`lift_27` / `unlift_27`: 1 coarse scalar + 26 details) it is a full exact
down/up pair whose level-1 coarse values are the nine block floor-means.

| run | round-trip exact | coarse = floor-mean | coarse = exact mean |
|---|---|---|---|
| `lift3` over all of `[-13,13]^3` (19,683) | 19,683 / 19,683 | 19,683 / 19,683 | 6,561 / 19,683 |
| `lift_27` over 1,000,000 random 27-vectors | 1,000,000 / 1,000,000 | coarse level = block means: 1,000,000 / 1,000,000 | — |

All MEASURED. The coarse level is the block-mean signal (exact mean whenever the block sum is
divisible by 3, which is `3^8 = 6,561` of the `3^9` triples; the floor-mean otherwise). That is a
genuine downsampled signal, not a repeated scalar, so the pair is non-trivial. No training was used.

### The caveat that stands (NAMED, from the intake map, 2026-10-08 rung law)

An exact round trip proves the **addressing**, not that the coarse levels carry **meaning**. In NCM,
meaning comes from training with nested dropout (the authors show it only qualitatively; NAMED). The
lifting coarse level above is informative in the **signal** sense — it preserves block means — which
is signal structure, a wavelet, and nothing more. No arithmetic round trip transfers NCM's learned
"concepts" onto the Asolaria axes, where axis meaning is assigned rather than learned. Target 4's
answer is therefore: an exact, non-trivial integer down/up pair exists without learning, but
"non-trivial" there means *signal-informative*, not *semantically meaningful*. The map's caveat
holds.

## Provenance

Reuses `asolaria-tribit` (`kernel/tribit`) by path, the same way `ternary/` does; no third-party
files are vendored into this crate, so there is no `UPSTREAM.sha256`. License is `MIT OR Apache-2.0`,
matching the rest of the estate; `publish = false`.
