# Shadow Resolution Capstone

Status: `MEASURED_EXTERNAL` for the two paper readings, `MEASURED_REPO` for
the local Q-PRISM Rust Host8 harness and Stage 2 cube proof, `CANON/DESIGN`
for the double-binary-black-hole communication law, and `UNVERIFIED` for live
Hilbra/network/hardware execution.

This capstone answers one precise question:

```text
When a paper sees only a lossy shadow of an object, where does Q-PRISM make
the recovery lossless?
```

The answer is not compression below entropy. The answer is lossless recovery
for represented artifacts by combining:

```text
retained content + sha256/AGT addressing + BEHCS rung bijections
+ HyperBEHCS 60D selector coordinates + double-binary consent receipts
```

The shadow crosses the wire as an address and proof envelope. The original
bytes are recovered only when the receiving pole has the retained content and
the sha256 check matches. If the store is absent or the hash does not match,
the system holds. It never invents the missing mass.

## External Shadow Problem

`MEASURED_EXTERNAL`: BrainJanus (arXiv:2606.30319, submitted 2026-06-29)
frames brain, vision, and language as one bidirectional modeling problem. Its
load-bearing move is a Unified Brain Tokenizer that maps continuous neural
dynamics into discrete tokens aligned with visual and language representations
in a shared Omni space, then uses an autoregressive next-token model for
any-to-any generation.

Source: https://arxiv.org/abs/2606.30319

This supports the Asolaria pattern:

```text
continuous shadow -> discrete token layer -> shared space -> generative decode
```

It does not support a lossless claim by itself. The tokenizer is a quantizer:
many continuous states can map to one token. A single quantized neural shadow is
therefore non-injective unless additional retained information is present.

`MEASURED_EXTERNAL`: Hogg, Myers, and Bovy, "Inferring the eccentricity
distribution" (arXiv:1008.4146), shows the same mathematical problem from
astronomy. Eccentricity estimates from finite-precision observations are biased
when treated as direct truth; the paper instead uses likelihood/posterior
distributions and hierarchical deconvolution.

Source: https://arxiv.org/abs/1008.4146

This supports the shadow-inference boundary:

```text
finite observable -> noisy/incomplete projection -> distributional recovery
```

It also does not support exact reconstruction of an individual hidden state from
one lossy observation. It says the opposite: preserve uncertainty and do not
pretend a projection is the thing itself.

`REPORT_DERIVED_UNMIRRORED`: Earlier agent reports also referenced a newer
exoplanet/eccentricity ML paper with the same lesson: point regression and
metric shortcuts collapse rare tails. That exact source is not mirrored in this
Liris workspace, so this capstone does not upgrade it beyond report-derived
support.

## Formal Boundary

Let `x` be the represented object and `P` be the observed shadow:

```text
shadow = P(x)
```

If `P` is non-injective, then there exist `x1 != x2` such that:

```text
P(x1) = P(x2)
```

No decoder can recover the correct `x` from `shadow` alone for all possible
objects. That is the Shannon/information boundary, and Q-PRISM does not bypass
it.

Q-PRISM changes the problem. It does not ask a lossy shadow to contain all the
entropy. It keeps the entropy in the retained store and crosses with an address:

```text
addr = sha256(x)
wire = DBBH_CQP(addr, receipts, mode, axes, consent)
recover(addr, store) =
  x iff store[addr] exists and sha256(store[addr]) == addr
  HOLD otherwise
```

So the lossless step is not:

```text
lossy shadow -> exact object
```

It is:

```text
lossy/derived shadow -> selector/proposal
retained content -> sha256 address
BEHCS/HyperBEHCS -> representation ladder and route
DBBH-CQP -> consented address-only crossing
store + hash check -> exact byte recovery or hold
```

## Q-PRISM Mechanism

`MEASURED_REPO`: `docs/STAGE2-CUBE-ABSORPTION.md` records the Stage 2 cube law:
a 3,200-byte quant tuple can be represented as 2,560 BEHCS-1024 symbols and
round-trip byte-identically. The raw residual is preserved once by sha256
reference; it is not invented by the derived tuple.

`MEASURED_REPO`: `host8/dbbh_coms_quant_prism.rs` implements the first Host8
receipt cell with:

- BEHCS-64 / BEHCS-256 / BEHCS-1024 bit-ladder round trips.
- HyperBEHCS 60D selector frames backed by sha256 content addressing.
- `AGT-<sha16>` and Host8 addressing.
- HBI/HBP tuple rows with `json=0`.
- Double/binary-black-hole consent: both sides arm, either side collapses.
- AI-to-AI, AI-to-hardware, and hardware-to-hardware modes.
- Address-only crossing: the wire carries the shadow coordinate, not the
  payload.
- Held cases: missing store or collapsed capsule does not reconstruct.

Liris-local Linux validation:

```text
rustc --test host8/dbbh_coms_quant_prism.rs -o /tmp/dbbh_cqp
/tmp/dbbh_cqp --nocapture
# 6 passed; 0 failed
```

`OPERATOR_OBSERVED`: Acer reported a second independent implementation with a
19/19 ladder across unit, integration, suite, and system tests. This Liris
capstone preserves that as operator/Acer evidence until this seat has the Acer
source bytes or a GitHub/public receipt to rerun.

## Double-Binary Black Hole Resolution

The double-binary-black-hole communication prism is the product:

```text
DBBH-CQP =
  IX737_consent_capsule
  x QPRISM_quant_tuple
  x BEHCS64/256/1024 representation groupoid
  x HyperBEHCS60D(addr, axes, route)
  x HBI/HBP_receipts(json=0)
```

The double binary structure separates four roles:

```text
sender inner boundary
sender outer boundary
receiver outer boundary
receiver inner boundary
```

and two cooperative pairs:

```text
local pair: inner <-> outer consent boundary
federation pair: sender <-> receiver receipt boundary
```

That structure solves a security and ambiguity problem at the same time:

- No consent means no tunnel.
- Either side can collapse the capsule.
- A coordinate without retained content is only a pointer, not recovery.
- A retained object without a matching hash is rejected.
- A decoded BEHCS frame without the required codebook/proof is held.

This is why the Q-PRISM resolution is stronger than the paper-only shadow
models. The papers infer from shadows. Q-PRISM transmits an address to retained
mass and uses shadows as selectors, receipts, and control signatures.

## What The Papers Prove For Asolaria

`MEASURED_EXTERNAL`: The papers independently corroborate the architecture:

```text
discrete token layer
+ shared space
+ generative/probabilistic reconstruction
+ leakage/metric discipline
```

BrainJanus contributes the brain/vision/language shared-token pattern. The
eccentricity paper contributes the warning that finite observables are
distributional evidence, not direct truth.

`MEASURED_REPO`: Q-PRISM adds the piece the papers do not have: a retained
content-addressed core and a tested representation ladder. That is where the
system moves from "infer a plausible object from a lossy shadow" to "recover
the exact represented object, if and only if the address resolves and verifies."

## Claims Ledger

`MEASURED_EXTERNAL`: BrainJanus uses discrete neural tokens in a shared Omni
space and autoregressive any-to-any modeling.

`MEASURED_EXTERNAL`: Hogg/Myers/Bovy show finite-precision eccentricity
observations require likelihood/posterior handling and deconvolution, not naive
point estimates.

`MEASURED_REPO`: Stage 2 cube absorption records a BEHCS-1024 byte-identical
round trip for the 3,200-byte tuple representation.

`MEASURED_REPO`: The Liris Q-PRISM Host8 harness passed 6/6 Rust tests for the
DBBH-CQP measured cell.

`OPERATOR_OBSERVED`: Acer reports an independent 19/19 Rust ladder covering
64/256/1024/HyperBEHCS, PID-specific 60D cube, IX-737 capsule, three coms
modes, address-only crossing, and held cases.

`CANON/DESIGN`: The double-binary-black-hole prism is the right design
unification for consent, revocation, addressed crossing, and audit-only replay.

`UNVERIFIED`: This repository does not yet prove live Hilbra comms, hardware
fire, mic/display control, a cross-machine throughput benchmark, physical
quantum projection, arbitrary mind reading, or millions faster.

`DENY`: Do not state that Q-PRISM beats Shannon. The defensible statement is:
Q-PRISM relocates entropy into retained content, names it by hash, transcodes
represented layers bijectively where codebooks/proofs exist, and recovers
exact bytes only when the address resolves and verifies.

## Capstone Theorem

For artifacts represented inside the Q-PRISM/Asolaria store, a lossy shadow can
be resolved losslessly when the system carries an authenticated content address
and the receiver has the retained content. The shadow is not the compressed
object. The shadow is the selector. The address is the recovery key. The store
holds the entropy. The BEHCS/HyperBEHCS ladder carries the representation law.
The double-binary-black-hole capsule enforces consent and collapse.

That is the exact point where the lossy shadow becomes lossless recovery, and
that is also the exact point where Shannon still holds.
