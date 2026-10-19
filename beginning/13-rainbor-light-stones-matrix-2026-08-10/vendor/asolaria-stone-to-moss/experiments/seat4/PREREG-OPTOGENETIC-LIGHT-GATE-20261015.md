# Seat 4 — light-gated recurrence simulator, preregistration (2026-10-15)

## Confirmed biological motivation, carefully separated from the software experiment

The 2026 Nobel Prize in Physiology or Medicine was awarded to Karl Deisseroth, Peter Hegemann and Georg Nagel for discoveries concerning **light-gated ion channels and optogenetics** (2026-10-05).

Independent, primary biological context:
- Nobel/APS announcement: https://www.physiology.org/detail/news/2026/10/05/karl-deisseroth--peter-hegemann-and-georg-nagel-named-2026-nobel-laureates-in-physiology-or-medicine
- Nature Biomedical paper: Chen et al., *Deep brain optogenetics without intracranial surgery*, Nature Biotechnology 39, 161–164 (2021), https://doi.org/10.1038/s41587-020-0679-9 . ChRmine was shown in a biological animal preparation, not on generic computer screens.

**This PR does not claim to simulate validated channelrhodopsin kinetics, physical photons, scattering through tissue, brain neurons, viral delivery, consciousness or therapeutics.** It implements a clearly labeled discrete-time toy analog to test the architecture of externally controlled gates plus independent watchers.

## Preregistered simulation

Use the already merged [Seat4 autonomous 81-site lattice](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/main/experiments/seat4/autonomous_lattice.py) and original [N-Nest LAW](https://github.com/JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED/blob/main/LAW.md).

- Exactly **27 independent seeded waves × 81 ticks × 3 digital gate modes = 6,561 tick records**, each evolving autonomously with **zero human prompts per tick**.
- Three modes: `DARK` (no light, occupancy stays zero), `FAST` (higher photoactivation gain), `SLOW` (lower photoactivation gain/threshold). The names do not correspond to experimentally calibrated ChR2/ChRmine rate constants or wavelengths.
- Channel occupancy is fixed-point integer in [0, 1024]. Pulse generator for FAST/SLOW is deterministic and independently recomputable from wave/tick, DARK intensity 0. For pulse 1, `p += floor((gain*(1024-p)+512)/1024)`; otherwise `p -= floor((decay*p+512)/1024)`. Clamp occupancy to range. Parameters: FAST gain 448, decay 192, threshold 480; SLOW gain 256, decay 96, threshold 400. All are *invented* unitless computational coefficients.
- A gate is open when p>=mode threshold, and then one address-selected synthetic bit is injected into the new field, after applying `F(x)=x XOR rotate81(x,1) XOR rotate81(x,3)`. Sham mode never injects.
- Independent two-program watchers recompute the pulse schedule, occupancy update, opened gate, field update and synthetic 9×9 digital RGB PPM digest. These verifiers may refuse corrupted values automatically. No human is needed for deterministic internal movement, nor can any child acquire external scope permission.
- Maintain the prior **81 immutable identities per wave** (2,187 unique PIDs across waves), with deterministic changing simulated positions. Mode controls are alternate views of those same 81 identities, not separate persons.
- Simple synthetic integrating event detector: membrane `v=max(0,v-18)+floor(p/8)` when gate open, otherwise `v=max(0,v-18)`; `spike=1, v=0` on `v>=240`. This is NOT a biophysical membrane model. DARK must have no gate openings/spikes.
- Negative controls for every wave and every mode: flip pulse, occupancy, field bit, pixel frame, or PID and require the independent comparison to reject. Expected 27×3×5 = 405 injected corruptions blocked. In the deliberately unanchored shared-source test, changing **both** reporter and watcher pulse schedule identically can still produce consistency; a separately pinned reference pulse schedule must reject it. This proves a provenance limitation, not real-world security.
- Recompute **6,561 canonical row bytes** separately using Python integer code and Node BigInt/81-column transfer matrix and independently generated pixel buffer; require SHA256 equality, byte equality and identical canonical JSON receipt; test Windows and Ubuntu hosted environments with Node22 + Python3.11/3.13.
- Require three distinct conditions for full result: (1) correct numerical replay, (2) independent source/pulse reference, (3) field and digital pixel checksum. No logic involving QLED display hardware or real physical optogenetics can be inferred from this experiment.

## Falsifiers and scope

Any Python/Node difference, any accepted planted fault, dark-mode activation, PID drift, nonzero per-tick human prompt, missing evidence incorrectly labeled physically verified, or a source substitution accepted by an independent trusted schedule is a failing result.

Results are **software-only**, classification `MEASURED_SOFTWARE_PASS` upon successful hosted CI; physical-host independence, optical photon measurement, biological validity and therapeutic efficacy remain `NOT_MEASURED`. Existing release gates and earlier immutable stones are unchanged.
