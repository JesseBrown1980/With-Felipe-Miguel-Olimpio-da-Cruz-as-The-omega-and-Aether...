# Seat 2 preregistration — independent Seat 1 photocycle benchmark review

Date 2026-10-15. Frozen **before the executable peer verifier**. Peer source HEAD `dd5e47db9522141de3949a23759a5d647ecdafbd` on `agent/seat-1/optogenetic-photocycle-20261015`. This source is a **synthetic three-population gate**, not a calibrated photocycle, not opsin biophysics, not physical neural or light measurements.

## Independent acceptance requirements

1. Checkout peer at exact Git SHA. Require same source HEAD and pinned `experiments/seat1/optogenetics` fixture and unchanged preregistration.
2. Execute original Seat 1 Python and independent Node programs to generate full trace and compare all bytes, not just summary fields. Assert 4 arms × 27 waves × 81 sites = **8,748 state snapshots**, **1,080 ticks per arm**, exactly 81 immutable identities, and exactly 1,000,000 total population per site in each saved record.
3. Independently recompute *every wave* starting at `(closed,open,refractory)=(1,000,000,0,0)`. On each tick set activation, inactivation and recovery by the frozen source law (integer floor). Compute light commands from input policy, require all 8748 original wave snapshots equal the separately computed ones, and independently check all four accumulated policy error and activation metrics.
4. Verifier MUST reject an altered HBP state byte, swapped identity, an altered rate (tested by recomputing an altered 300001 activation coefficient), changed source light pattern, and a corrupted report. Do not merely use `assert 1!=0` as identity negative evidence; actually mutate a fixture.
5. HBP and JSON source replays match across Ubuntu/Windows × Python 3.11/3.13 and Node 22, repeat twice. Source may have separate JSON keys, so compare the canonical HBP byte-wise and the shared metrics exactly; do not assume Python/Node JSON byte-identity if authors used different metadata.
6. Output a seat-2 machine-readable audit receipt and SHA-256. Require self-contained reproducibility, no secrets or physical host credentials.

## Interpretation

The open/closed/refractory totals are illustrative integer fractions, and a discrete state-transition loop is **not** physical proof of a photon/gate/neuron interface. Light-gated opsins have real biological mechanisms, but no real cells, photodetectors, QLED input, photochemistry or ion current are measured here. Human-per-tick prompts are neither needed nor evidence of consciousness. Brown-Hilbert uncoloured free centre remains outside the software-addressed 81 nodes. CI runners are not separately attested physical hosts.

Existing Seat 2 PR #48 has two symbolic digital profiles and 324 source/fault cases; that model is **not** equivalent to Seat 1's three-population 1080-tick model. Compare only their source/correction trust boundaries, not their scores or rates.
