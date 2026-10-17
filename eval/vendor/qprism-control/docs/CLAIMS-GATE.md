# Claims gate

This project inherits the honesty discipline of the Asolaria technical report (§0, §7):
claims are scoped to what the artifacts demonstrate, and strong words are defined before use.

## What a "prism win" would and would not mean

| result | claim permitted |
|---|---|
| Prism arm beats optimizer arm, blinded, p<0.05, on a **synthetic** stream with injected coupling | The harness has power to detect an informative control signal. (This is a *self-test*, not a scientific claim about neural data.) |
| Prism arm beats optimizer arm on a **real EEG/organoid** stream, blinded, pre-registered, reproduced | A neural-derived control signal improves experimental control of a matter-wave interferometer beyond classical baselines. |
| Any of the above | **NOT** "consciousness collapses/projects into quantum matter." The stream only proposes lawful control parameters (grating power, velocity/mass window). It never touches a wavefunction. |

## Preconditions before any neural claim

1. **Simulator credibility first.** The physics model must be validated against the real
   apparatus (this build is calibrated to *one* reported operating point, V=0.10; full-curve
   calibration to Fig. 2/3 is required before trusting absolute predictions).
2. **Harness must pass self-validation.** At `coupling=0` the prism must NOT beat the
   optimizer (else the comparison is rigged). At `coupling>0` it must. Both are asserted in
   `tests/test_harness_null.py` and printed by `run_experiment.py`.
3. **Blinding + pre-registration** of the metric and threshold before touching real data.
4. **Synthetic before biological.** If a synthetic stream with *known* structure cannot beat
   the optimizer in simulation, no real neural stream will — establish that first, at zero risk.

## Boundaries (restated from the Asolaria report §7)

No lossless-beyond-entropy compression; no completion counts beyond backend throughput;
no recursive/unbounded capability gain; no consciousness-, physics-, or hardware-transcending
claims. Stating these is what makes the demonstrated core trustworthy.

The Double Binary Black Hole Comms Quant Prism is `DESIGN` for live comms and `MEASURED_RUST_HARNESS` for its local Host8 receipt cell. The measured cell may claim: BEHCS-64 / BEHCS-256 / BEHCS-1024 byte round-trips, HyperBEHCS 60D store-backed addressing, HBI/HBP `json=0` rows, double/binary-black-hole two-sided consent, collapse, and audit-only replay. It is still not a live communication tunnel, not a Hilbra-keyed benchmark, not a consent bypass, not arbitrary mind reading, and not proof of physical consciousness or quantum projection.
