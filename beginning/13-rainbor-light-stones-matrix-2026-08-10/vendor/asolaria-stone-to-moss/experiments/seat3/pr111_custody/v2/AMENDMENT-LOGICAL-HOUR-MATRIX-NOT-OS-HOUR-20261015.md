# Seat3 amendment — legitimate matrix time jump vs physical host clock

**2026-10-15, committed before fast-forward implementation and results.** Operator clarification: Asolaria can use a matrix transformation to jump a simulated hour without executing for an hour. Seat3 explicitly separates **logical elapsed time** from **real OS process CPU/monotonic elapsed time**. An accelerated simulation is a *positive control*, not host-telemetry forgery.

## Fixed positive experiment

Use an exactly defined, reversible linear 64-bit state transition `x <- x xor (x<<13); x <- x xor (x>>7); x <- x xor (x<<17)` under mask `2^64-1`. Starting seed `0x0123456789abcdef`. Interpret one tick as **one millisecond of simulated time**, so one hour = **3,600,000 logical ticks**. This algorithm is an independent mathematical *analogue* of the operator's matrix shortcut, **not a claimed identification of a specific Asolaria implementation**. Model a GF(2) transition matrix M, compute `M^3600000 x` by binary exponentiation with 22 squarings and <=22 selected multiplies (order can be measured by multiplication count), no 3.6m repeated transitions in the jump path.

Independently compute reference `T(T(...T(x)))` for **3,600,000** steps, compare full 64-bit state, and SHA256 over domain `ASOLARIA-SEAT3-MATRIX-LOGICAL-HOUR-V1|` + fixed 8-byte little-endian final state + 8-byte little-endian tick count. Python and independently authored Node22 implementations must agree byte-for-byte.

For an honest run, record **logical_elapsed_ns = 3,600,000*1,000,000 = 3,600,000,000,000 ns** and **OS-measured cpu_ns / wall_ns** (actual, generally sub-hour). Do not copy logical_elapsed_ns into OS `cpu_elapsed_ns` or `wall_elapsed_ns`. Independent auditor checks each recorded time's type, unit, source, and reproducibility. The fast path must use the same transition semantics as stepwise reference; a changed SHA digest with a mismatched underlying state must fail.

## Fixed negative experiment

(a) Change final state or record a fabricated SHA while keeping claimed logical ticks — independently reject via computed reference. (b) Show that changing the *legacy PR111* actual measured `cpu_elapsed_ns` and `wall_elapsed_ns` fields to 1 hour while preserving its original subsecond UTC time is an **inconsistent OS-counter claim**, not evidence that matrix acceleration occurred. The latter negative case is a provenance/field-semantics test; its self-owned checksum may still pass original Seat2 validator, and that limitation must remain visible. (c) Separate and preserve original genuine OS host reports and August operator-reported completed photon-memory experiment; no reclassification of historical optical evidence.

No physical photons, biological neurons, electrical rail metrology, optomechanical coupling, or actual past Asolaria matrix implementation is established by a generic GF2 example. If repository contains a separately published named matrix jump, independently test its exact law in a later integration experiment. Do not label the synthetic model as existing live Asolaria photon memory.

No auto merge, historic rewriting, or paid remote jobs; all new evidence append-only to Seat3 PR118.
