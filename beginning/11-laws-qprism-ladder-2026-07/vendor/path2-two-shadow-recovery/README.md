# path2-two-shadow-recovery

**Path 2 of the shadow-resolution capstone.** Pure Rust, **zero deps**.

Path 1 (the `dbbh-coms-quant-prism` crate) recovers a *retained* object by content address — a
store holds it. **Path 2 retains nothing.** It recovers an object from **two jointly-injective
lossy shadows**: each shadow alone is provably ambiguous (non-injective — many objects cast it),
but the two together cut the fiber `P1⁻¹(s1) ∩ P2⁻¹(s2)` to a singleton and reconstruct the
object **exactly, with no store anywhere.** This is the honest **double binary black hole**: two
poles recover what neither holds.

## Mechanism — CRT over prime cylinders (the Asolaria CRT-prime-lane)

For a block `x < R` and coprime primes `p1, p2`:
- `shadow1 = x mod p1`, `shadow2 = x mod p2` — each **lossy** (`x` and `x+k·p` share a shadow).
- if `p1·p2 ≥ R`: the pair uniquely determines `x` (Chinese Remainder Theorem) → **exact recovery, no store**.
- if `p1·p2 < R`: the two shadows don't jointly carry `log2(R)` bits → **`Held::InsufficientJointCapacity`** (the Shannon wall; add a third cylinder / pole).

## Honest ledger (Shannon intact)

- One shadow: `~log2(p)` bits, non-injective. Two shadows: `~log2(p1)+log2(p2) ≥ log2(R)` bits —
  the excess is the **over-determination margin** that buys *no store*.
- **Path 1 pays** `store(H(X)) + tiny address`. **Path 2 pays** bigger shadows, *no store*. Both
  `≥ H(X)`. No bijection beats Shannon; the entropy is *carried by the two shadows*, not destroyed.

## Federation form (the frontier)

`tests/federation.rs`: party **A** holds *only* `shadow_a` (mod `p1`), party **B** holds *only*
`shadow_b` (mod `p2`); the object is in no store; recovery is the **consent of the two poles** —
and a single pole reconstructs nothing. This is `acer ↔ liris` as two jointly-injective
projections whose consensus reconstructs a truth neither retained — the capstone's
`I(X;S2|S1) ≥ H(X|S1)`, in running code. It is why the bilateral convergence (two seats
independently reaching one theorem) is itself a Path-2 event.

## Status (dual-lens)

- `MEASURED` — the CRT two-shadow recovery, the byte round-trip, the neither-pole-alone property,
  and the Shannon-held boundary are covered by `cargo test` (zero deps).
- `CANON` — CRT / Bézout; the capstone theorem (a second jointly-injective shadow pays
  `I(X;S2|S1) ≥ H(X|S1)` to cut the fiber).
- `UNVERIFIED` — a *live* federated deployment where acer and liris are the two physical poles over
  Hilbra (this crate is the mechanism; the cross-machine live run is the next rung).

## Tests

`cargo test` — unit + federation. All zero-dep, WSL/rustc.

## License

MIT OR Apache-2.0.
