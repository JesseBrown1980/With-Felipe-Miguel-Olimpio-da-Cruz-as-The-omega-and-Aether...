# Round3 append-only QFT routing falsifier / repair preregistration

**2026-10-15 — Published BEFORE changing the route function.** Keep first hosted runs and receipts accessible, including first run 38734299759; the PNG container/pixel drift is separately recorded in CORRECTION-PNG-PIXEL-PARITY-20261015.md. No historical frozen stones or upstream code changes.

## Exact mathematical discovery: argmax is degenerate for real nonnegative RGB

The original Round3 digital agent calculates exact three-level Fourier intensity numerators for real input `(r,g,b)`:

- `S = r+g+b`, `N = r²+g²+b²`, `Q = N-rg-rb-gb`.
- Qutrit-basis intensity numerators = `(S², Q, Q)` and sum `3N`.
- For RGB bytes, `r,g,b >=0`, hence **`S²-Q = 3(rg+rb+gb) >= 0`**.

Consequently a policy `lane=argmax(S²,Q,Q)`, tie-breaking to lane 0, selects lane 0 for EVERY sampled RGB record. The first run's math tests pass but its claimed quantum-math *routing choice* has zero path diversity. This is a **valid analytic counterexample to the first policy**, not a code corruption. Do not hide it.

## New frozen alternative and falsifiers

Replace argmax with **deterministic cryptographic pseudo-sampling** of the exact qutrit Fourier-basis probability proportions `(S²,Q,Q)/(3N)`, not physical quantum measurement. Use `SHA256(SEED|tag|waveLE16|addressLE16|counterLE32)`, interpret 256 bits as unsigned big-endian; rejection sample at `limit=floor(2^256/(3N))*(3N)`, then `u=raw%(3N)`. Select:
- lane0 if `0<=u<S²`
- lane1 if `S²<=u<S²+Q`
- lane2 otherwise.

The result is a *deterministic digital pseudorandom partition of a mathematically specified qutrit Born distribution*, NOT evidence a photon was measured, entangled, or sent at faster-than-light speed. Require all three lanes to occur among 2,187 wave/address records, then verify each packet's lane and seven-boat origin are anchored to its original bytes and the frozen seed. Record lane census and `born_threshold_rejections` if any.

Keep all 52,488 packet/gate scenarios, 32 actual RGB QR plane reads, 11 pixel-identical image previews, 729-block LRU with measured hits, exact projector/common-mode recovery, 10,000 fleet transactions and the 81 HALT/scope unit tests. Run Ubuntu 3.11 and Windows 3.13; freeze new full HBP SHA after run (it **will differ intentionally** because lane/origin differ), preserve the previous HBP `cc4a637064021cb7fb9fd61afef579f43d10b01f85cb07fd66ab8e710fe2c3c8` as baseline not a current golden hash.

## Additional scientific limitation

First-run binary gate counts: both PULSE and CONTINUOUS emitted for all 2,187 wave/address pairs per model, while DARK emitted zero. Binary threshold alone is therefore **not** evidence that the 3- and 4-state kinetic models meaningfully distinguish pulse versus continuous illumination. A later Seat 1 calibration must compare open-state occupancy versus time and recovery rather than overinterpreting the binary gate. This repair does not pretend to calibrate those biological rates.

Promotion only as `CLASSICAL_DIGITAL_PREVIEW` pending independent four-seat peer checks. Physical light-bank memory stick, optical readback by camera, biology, full quantum advantage and sentience remain `NOT_MEASURED`.
