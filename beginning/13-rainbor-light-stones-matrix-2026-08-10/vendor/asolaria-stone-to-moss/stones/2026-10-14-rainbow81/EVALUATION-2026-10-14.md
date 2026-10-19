# Asolaria 81-body spatial-hash controls — evaluation, 2026-10-14

## What was verified

- Stone 1: 9 isolated local SHA dependency mutations, each rehashing 81/81 constructed cell commitments, five labels (HBI, HBP, SHA, SH, HASH), and 171 ring commitments when the *shared source root* is recomputed; zero peer records changed beforehand.
- Stone 2: 27 independent mutations (nine source bodies by three coordinate scales) in an 81-entity synthetic system. All 81 stable metadata identifiers remained unchanged when positions were scaled by 1, 1,000,000 and 1,000,000,000.
- Full shared-root recomputation altered all 81 derived cell records and 405 SHA register fields per mutation. With no shared root, only one cell changed.
- A nearest-neighbor logical ring propagated a one-node difference in synchronous waves: 1, 3, 5, 21, 79 and 81 changed at rounds 0, 1, 2, 10, 39 and 40. A complete metadata graph changed all 81 in one *logical* round. An isolated graph remained at one after 40 rounds.
- Independently checked by GitHub Actions on Python 3.11 and Python 3.13, workflow ID 38581376561 in `JesseBrown1980/one-click`.

## What that means

The five-commitment hash architecture supports **identity independent of assigned position** because position was excluded from the metadata preimage. The identical identity hash occurred with three **different assigned Euclidean distances** between the same pair of synthetic bodies: approximately 1,473 km; 1.473 billion km; and 1.473 trillion km. Therefore, a hash that carries no position or trajectory information **cannot recover the distance** from that hash alone. Additional measured spatial, temporal or other physically calibrated signals would be required.

Global cryptographic commitments change after explicit recomputation and dependency fanout. Neither a one-round logical update nor an all-node SHA change establishes instantaneous communication or faster-than-light transport. Software hash diffusion is distinguishable from gravitational attraction, entanglement, or other physical behavior.

## Preserved constraints

The Brown-Hilbert uncoloured free centre is separate from the 81 bodies. The CPU synthetic fixture is not a measurement on a real GPU, actual light emitter, physical long-distance apparatus or human brain. No dynamics law or emergent gravity was validated by these hash tests.

## Next falsifiable real-space experiment

Instrument two physically separated devices with timestamped, independent clocks and independent data capture; record exact physical separation and clock synchronization uncertainty; distinguish data transport links from any claimed transport-free coupling. Test blinded perturbation/control intervals and enforce a preregistered outcome measure. For GPU/brain comparisons, separately measure their physical inputs and outputs rather than assuming equal hash behavior establishes equal physics. Recreate the source artifacts, SHA manifests and HBI/HBP stone after every completed wave.

## Sources

- Nine-wave baseline: https://github.com/JesseBrown1980/asolaria-stone-to-moss/tree/main/stones/2026-10-14-rainbow81/
- Nine-wave independent CI: https://github.com/JesseBrown1980/one-click/actions/runs/38578220972
- 27-wave independent CI: https://github.com/JesseBrown1980/one-click/actions/runs/38581376561
- 27-wave standalone reproduction: https://github.com/JesseBrown1980/one-click/blob/audit/rainbow81-mixture-2026-10-14/experiments/test_spatial_hash_27_waves_ci.py
- Exact 27-wave local inputs and results: `test_spatial_hash_waves.py` and `results-spatial-hash-waves.json` in the downloadable bundle; content hashes in Stone 2.
