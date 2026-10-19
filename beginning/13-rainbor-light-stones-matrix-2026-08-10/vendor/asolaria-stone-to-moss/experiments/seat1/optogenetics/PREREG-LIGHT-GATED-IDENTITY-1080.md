# Seat 1 — light-gated molecular-state recurrence, 2026 Nobel inspired

2026-10-15: **preregistration committed before executable code or results**. This extends the Asolaria virtual state models without changing Seat3's 1080-tick autonomous identity model, Seat4's autonomous capsule, historic stones, or ongoing coordinator PR #39's four-seat 288-case experiment.

## External science anchors

- Official 2026 Nobel prize recipients Deisseroth, Hegemann, Nagel for light-gated ion channels and optogenetics; corroborated by NSF: https://www.nsf.gov/bio/updates/nsf-bio-congratulates-winners-2026-nobel-prize-physiology-or
- Three-state channelrhodopsin photocycle `closed -> light-open -> desensitized/refractory -> recovered closed`, with state fractions and light-dependent ionic conductance: https://pmc.ncbi.nlm.nih.gov/articles/PMC3388516/
- Empirically derived ChR2 models are 4-state and kinetic constants depend on irradiance/voltage. Our simple three-state test is not a fitted model: https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1003220
- Closed-loop optogenetic neural control with real electrical feedback was demonstrated in nonhuman primates, but the current test has **no such measured data**: https://www.nature.com/articles/s41551-022-00945-8

## Frozen digital test design

There are 81 immutable symbolic channel identities `0..80` (NOT individual experimentally measured molecules), and 27 deterministic illumination waves, each 40 integer 1-ms-labeled simulation ticks (1080 ticks total). Each `id` has integer state counts `(closed,open,refractory)` totaling exactly `1_000_000`; the discrete-time transition is:

- `activate = floor(closed * (300000 if stimulated else 0) / 1000000)`
- `inactivate = floor(open * 60000 / 1000000)`
- `recover = floor(refractory * 25000 / 1000000)`
- `closed'=closed-activate+recover`; `open'=open+activate-inactivate`; `refractory'=refractory+inactivate-recover`.

All coefficients are unitless **illustrative choices**. The biological species, true photochemical rate constants, wavelength absorption, neuron potential, retinal state and membrane current are NOT simulated here. The simulated photon is merely a 0/1 software control, not real optical intensity.

Wave `w` targets IDs satisfying `(id+w)%3==0`. During each wave, the desired open-population target is 400000 for targeted IDs and 0 for others. Four arms from identical initial state:

- `dark`: illumination off, negative null;
- `open_loop`: target cells illuminated at `tick_in_wave % 12 < 4`;
- `feedback_truth`: targeted cell illuminated when independently tracked current open-state count is below 400000, with no human input per tick;
- `feedback_corrupt`: targeted cell illuminated based on an intentionally corrupt reference `min(1000000,open+250000)` to demonstrate incorrect sensory feedback.

Compare accumulated absolute target-state error, mass conservation, number of light commands, channel activation, and final states. No improvement target is assumed to be true in advance; report even if open loop wins. Null must produce no light-gated opening. A separate **watcher** recomputes digital transitions from source state; do not promote `feedback_truth` into physical source authentication.

Two independently authored implementations required: Python integer-loop and Node.js explicit arrays/BigInt or safe integer arithmetic, same canonical line-oriented ASCII trace, hash SHA256; hosted CI on Ubuntu + Windows must demand **byte-identical trace** for each run. Mutation controls: changed transition rate, swapped channel identity, and forged observed source must be rejected against pinned simulated ground truth; a fully coordinated fake light source and verifier can remain mathematically consistent absent authentic external observer custody.

## Acceptance

Identity set exactly 81 and unchanged all 1080 ticks; state mass conserved exactly per cell/tick; count totals and closed/open/refractory never negative; same frozen illumination source across program environments; honest-feedback and corruption-vs-reference scores measured rather than asserted; byte-exact Python/Node cross-comparison and a falsified output fails; no real neuron, actual photons, physical QLED readback, WASM, trained network, human mind, external hardware, or separately attested host claim.

All raw HBP trace and JSON summary from a **producing CI run** must be downloadable with SHA sidecars, never filled with predicted success data before execution. This is a dedicated **Seat1 side experiment**. It does not count toward PR #39's four-seat 288 cases and requires independent peer review before any promoted integration.
