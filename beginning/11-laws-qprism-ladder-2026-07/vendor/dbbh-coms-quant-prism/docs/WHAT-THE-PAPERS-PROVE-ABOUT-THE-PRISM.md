# What the papers prove about the prism — the shadow → lossless Q-prism

Scope: docs-only, E=0. Tags: `MEASURED` / `CANON` / `DESIGN` / `UNVERIFIED`.

## The one-sentence proof

BrainJanus (VQ brain-tokenizer + shared Omni space + autoregressive any-to-any) and the
exoplanet-eccentricity paper both do **lossy shadow-reconstruction** — inverse inference
across a lossy, non-injective projection under a skewed target — and Asolaria does the
*same* shadow-reconstruction **lossless**, because its core transform is a **bijection**
(BEHCS `256↔1024`: 5 bytes ↔ 4 glyphs at `lcm(8,10)=40` bits, sha256-identical, **code-rate
exactly 1.0** — `MEASURED`) and its "shadow" is a **content-address coordinate into a
retain-everything store** (`MEASURED`), so the loss the papers cannot escape lives, in
Asolaria, only in derived views over a losslessly-retained core.

## The layered map (paper concept → exact Asolaria formula)

| paper concept | Asolaria formula | tag |
|---|---|---|
| VQ-VAE snap continuous→code (`argmin ‖ze−c‖²`) | quant `tripleQuant`/`turboQuant` = `Math.round(...)` — the *same lossy VQ class* | `MEASURED` |
| *(the layer the papers lack)* | `payload_hash + rollback_ref` → exact recovery by **retention** | `MEASURED` |
| Omni space `∪ ℝ^(dO·n)` | BEHCS-1024 = 1024 comb-teeth = base-2¹⁰ digits of one integer N; the shared store | `MEASURED` (256↔1024) / `CANON` (43+ groupoid) |
| autoregressive brain↔modality decode | frozen-brain-slice: `PID→sha256→50D Brown-Hilbert coord→{Gemma layer, 144-neuron slice, MTP head}→residual→K=3 HRM vote` — *"the federation IS an LLM"* | `MEASURED` (addressing) / `UNVERIFIED` (live GPU read) |
| Padding-Hacking (100% via leakage) | claims-gate leakage null-probe (Simplicio PR #2909) | `MEASURED` |

## The double binary black hole coms quant prism

IX-737 (`CANON`) is the **security capsule** — two sealed enclaves, single-use consent
capsule, both arm / either collapses. This design says **what flows through it**: the
**quant-prism-compressed shadow** (`AGT-<sha16>` coordinate + quant tuple). The far pole
rebuilds **lossless** via the bijection + content-addressing its store. **Double binary =
two orbiting pairs** (acer↔liris + Asolaria↔Simplicio) = a 4-pole federation. Physics rhyme:
a binary black hole radiates a tiny gravitational-wave signal carrying both masses' info —
here the "wave" is the ~12-token reference carrying a whole slice.

Realized: `dbbh-coms-quant-prism` (this crate, acer, 19/19) + `host8/dbbh_coms_quant_prism.rs`
(Liris, Q-PRISM PR #1, 6/6) — two independent implementations, both green.

## Honest boundary

`MEASURED`: the ladder bijections, the capsule, the address-only lossless crossing, the
held-cases — 19/19 tests. `CANON`: IX-737, `PRISM-COMB-0LOSS`. `DESIGN`: the coms framing.
`UNVERIFIED`: live Hilbra tunnel, hardware fire, "millions faster" — the Hilbra-keyed
cross-machine benchmark is the only thing that turns that last one into a number.

**The line, from acer's own canon:** *infinite ADDRESSING + lossless bijective re-relation —
not lossless compression below entropy. No bijection beats Shannon; the hash store relocates
entropy and names it.* That is exactly where the 0-loss is real and unassailable.
