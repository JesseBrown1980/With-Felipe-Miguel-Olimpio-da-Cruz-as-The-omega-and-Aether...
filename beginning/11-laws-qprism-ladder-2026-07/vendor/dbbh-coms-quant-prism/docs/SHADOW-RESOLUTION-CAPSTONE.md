# Shadow-Resolution Capstone

Produced by a 10-agent FABLE-5 (claude-fable-5) adversarial workflow: ground (read the real
`PRISM-COMB-0LOSS.md` + this crate's `src/lib.rs` line-by-line) → prove (3 lenses) → adversarial
verify (all 3 proofs returned `survives=False` until repaired) → synthesize. Posted for bilateral
attack/compare/verify/PR (acer ↔ liris). Tags: `MEASURED` / `CANON` / `UNVERIFIED` / `RETRACTED` / `FALSE`.

## Theorem (attack-survived)

A single lossy shadow `s` of a high-dimensional object `X` is **non-invertible**: its projection map
is non-injective, so `H(X|s) = H(X) − I(X;s) > 0` and **Fano bounds every decoder**
(`P(g(s)≠X) ≥ (H(X|s)−1)/log₂|X|`) — a property of the *map*, not a decoder deficiency. Bit-exact
recovery is regained **not by beating Shannon but by relocating entropy**, via two priced paths:

- **Path 1 — content-addressed retained store (IMPLEMENTED, this crate):** `ContentStore.put(X)`
  pays the full `H(X)` at write and derives `a = AGT-<sha16(X)>` (~64 bits). The wire carries only
  `a`, **constant in `|X|`**. Recovery is exact **iff `X` was retained**; a miss returns `Held`,
  never invents. **This is NOT Slepian-Wolf achievability at rate `H(X|s)`** — the decoder's store
  already equals `X` (`H(X|store)=0`), so `a` is a *dictionary selector* of rate `~log₂ M`
  (`M` = store size), decoupled from `H(X|s)`. Total = `store(H(X)) + wire(~64) ≥ H(X)`.
- **Path 2 — a second jointly-injective shadow (CANON theorem; NO measured Asolaria mechanism yet
  instantiates it):** a second projection `S₂` pays `I(X;S₂|S₁) ≥ H(X|S₁)` to cut the fiber
  `P₁⁻¹(s₁)` to a singleton. Exact recovery holds **iff the joint map is injective**; mere copies
  buy nothing. Total ≥ `H(X)` always.

## Proof sketch

- **Step 1 — one shadow cannot invert.** Non-injectivity ⇒ no `f` with `f(S)=X` a.s.; every decoder
  leaves `H(X|S)=H(X)−I(X;S)>0` (Fano). `[CANON]`
- **Step 2 — the minimum to resolve it.** A helper `M` with `g(S,M)=X` exactly costs
  `E|M| ≥ H(X|S)` (Slepian-Wolf converse, vanishing-error). **Caveat the adversary forced:** the
  *exact zero-error one-shot* floor is the **Witsenhausen** side-information rate
  (`~⌈log·max-fiber⌉`), generally *strictly above* `H(X|S)`. `H(X|S)` is the asymptotic
  vanishing-error rate, not the one-shot price. `[CANON]`
- **Step 3 — the two honest paths, priced correctly** (above). Path 1 is *selection over a store
  that already paid `H(X)`*; Path 2 is *joint over-determination*. Neither dips below `H(X)`.

## Where Shannon holds (three named walls, never crossed)

1. **The floor** — any helper for exact recovery from `S` costs `≥ H(X|S)` (SW converse); exact
   one-shot is higher still (Witsenhausen). No hash, bijection, or learned inverse dips below.
2. **The relocation wall** — recovery is possible *only because* a retained store already paid
   `H(X)`; the ~64-bit crossing is a **name, not a code**; `total = store(H(X)) + wire(64) ≥ H(X)`.
   `handle8 = sha256(content)[:8]` is a coordinate *against* the store, not a compressed form of it.
3. **The joint-capacity wall** — a second shadow resolves the fiber only if `I(X;S₂|S₁) = H(X|S₁)`;
   if `X` carries more entropy than the two shadows jointly capture, recovery stays lossy.

## Map to the two papers + DBBH-CQP

- **The two papers = one wall (single-shadow non-invertibility, no store).** BrainJanus (stochastic
  shadow): the ~0.65 Pearson ceiling **is** `I(X;S)<H(X)` (Gaussian model: ~0.396 bits/dim at
  r=0.65) — a hard residual survives *every* decoder. Exoplanet (deterministic shadow): non-singleton
  fibers make hidden eccentricity non-recoverable; "MSE collapses to the mean" is the posterior mean
  `E[X|S]` sitting in a low-density valley, never emitting the rare tail. **Both invert the shadow
  directly with no retained store — so the ceiling is real and final.**
- **DBBH-CQP works the *complementary* regime.** It is **not shadow-inversion — it is retained-object
  RECALL.** `dbbh_send_addressed` crosses only the address; `dbbh_receive_addressed` returns the exact
  bytes iff the store retained them, else `Held::AddressMismatch` (no invention). The double-binary
  integrity check (`dbbh_receive` re-derives `agt(content)` and requires equality) is a *second
  reference* over-determining the object. `[MEASURED: 19/19 crate tests, prior session]`

## Claim ledger

- `MEASURED` (scoped, prior session): `dbbh-coms-quant-prism` `cargo test` 19/19 green incl
  `far_pole_without_retention_is_held_not_invented`, `fixed_size_address_regardless_of_content_size`,
  `tampered_glyph_is_held_by_address_mismatch`.
- `MEASURED` (doc-cited provenance): 256↔1024 rung round-trip = id, sha256-identical, Rust==Python
  (`PRISM-COMB-0LOSS.md`; Q-PRISM `53023b6`/`79e8d63`/`de00aca`).
- `CANON` (established theorems): `H(X|S)=H(X)−I(X;S)`; Fano; Slepian-Wolf converse + achievability
  `R=H(X|S)`; **Witsenhausen zero-error side-info rate `> H(X|S)`** for the exact one-shot criterion;
  joint-injectivity for two-shadow recovery.
- `CANON` (PRISM-COMB-0LOSS, verified sound): lossless RECOVERY of a retained object + double-binary
  over-determination, **never sub-entropy compression**; bijection law `H(f(X))=H(X)`; groupoid.
- `RETRACTED` (adversarial verdicts folded in): "content-addressing = Slepian-Wolf binning at rate
  `H(X|S)`" — the decoder already holds `X`, so the ~64-bit `AGT` is a dictionary selector
  (`~log₂ M`), decoupled from `H(X|S)`.
- `UNVERIFIED` (not probed this pass): any LIVE Asolaria fabric BEHCS runtime attaining the `H(X|S)`
  bound end-to-end (recall `:4796` / fabric MCP not queried this pass); every ladder rung beyond
  256↔1024 until its own round-trip proof; a measured Path-2 (two-jointly-injective-shadow) instance.
- `FALSE` (banned inflation): "we beat Shannon" / "infinite lossless compression" / "sub-entropy
  coding" / "resolves the papers' inversion wall." **Also wrong (banned deflation):** "just a hash /
  just retrieval" — the consent-gated, hash-chained, no-invention retrieval is a real, precise result.

## Bottom line

The lossy-shadow **inversion** problem has no free lunch (Shannon is final). What Asolaria has —
and it is genuine — is **lossless RECALL of a retained object via content-addressing**, plus a sound
(not-yet-built) **double-binary over-determination** theorem. That is the honest "0-loss": entropy
*relocated and named*, never destroyed.
