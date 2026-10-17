# asolaria-gnn-int

An integer-only reference implementation of graph message passing, for the Rust 1.81 / no-float
Aether stack. Zero dependencies, `#![forbid(unsafe_code)]`.

## What it computes

- **Graph**: CSR over `A + I` built from an undirected `(u32, u32)` edge list. Both directions are
  inserted, duplicate edges and caller-supplied self-loops are collapsed, and every node gets one
  self-loop. Node ids `>= n` return `Err`. Empty graphs and isolated nodes are fine.
- **Normalization**: `Â = D^-1/2 (A+I) D^-1/2`. Each coefficient is
  `c = round(65536 / sqrt(d_i * d_j))`, computed exactly as `c = (isqrt(floor(2^34 / (d_i*d_j))) + 1) / 2`,
  i.e. the largest `c` with `(2c-1)^2 * d_i * d_j <= 2^34`.
- **Two GCN layers** (`in_dim -> hidden -> hidden`), each `ReLU(Â · H · W + b)`.
- **Edge head**: `z = ReLU(W1 [h_u || h_v] + b1)`, `logit = w2 · z + b2`, then a hard sigmoid
  `clamp(logit/4 + 1/2, 0, 1)` reported in per-mille, `0..=1000`. No `exp`.

The architecture follows the shape of the estate's float PyTorch baseline (2-layer GCN + MLP edge
classifier). It is a fresh integer reimplementation, not a port of its code or weights. One
deliberate difference: here the second GCN layer also applies ReLU.

## Fixed point

Q16: values are `i32`, `65536 = 1.0`. Single products are exact `i64`; sums are
`i128` (saturating; exact for any input that fits in memory).
Each GCN output is rounded **once** (from Q48 to Q16); the head rounds `z` to Q16 and rounds the
per-mille score once. All rounding is **round half away from zero** (`2.5 -> 3`, `-2.5 -> -3`).
Values that leave `i32` saturate; nothing wraps or panics on large inputs.

## Weights

`Weights::hand_set()` (in = 4, hidden = 4) is **UNTRAINED and HAND-SET**: small multiples of 1/16
picked by hand so that signals propagate. They were not fitted to any data. Callers can load their
own integer weights through `Weights::new(RawWeights { .. })`, which checks every dimension and
returns `Err` on a mismatch.

## What it does not claim

No training, no accuracy, no evaluation. The scores mean nothing beyond being the exact output of
the arithmetic above. This crate does not reproduce, and is unrelated to, any gnn-sidecar results.
It exists to give the stack a deterministic integer message-passing reference to test against.

Known limitation: coefficients are Q16, so their relative error grows with degree (`d_i = d_j = 1000`
gives `65.536 -> 66`, about 0.7%), and any coefficient with `d_i * d_j > 2^34` rounds to 0. A node
whose degree in `A + I` exceeds 131072 therefore loses its own self-loop term, and edges between
two such nodes contribute nothing. Zero layer dimensions return `Err(ZeroDimension)`.

## Tests

`cargo +1.81.0 test --locked` covers exact normalization values for degrees 1..=8, rounding,
permutation invariance, the 2-hop receptive field, isolated nodes, duplicate-edge/self-loop
handling, out-of-range ids, zero dimensions, saturation, score range, and a golden 5-node output. The golden integers
were cross-checked against a separate exact-rational reimplementation before being pinned.
