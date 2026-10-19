# Seat 2 preregistration — light-gated 81-site digital recurrence and source integrity

**2026-10-15 · frozen before source implementation.** Additive bounded benchmark, not a replication of a neuron, a living light universe, optical hardware, neural activity, quantum calculations or consciousness.

## Why now

The **2026 Physiology or Medicine Nobel** honors Karl Deisseroth, Peter Hegemann and Georg Nagel for *light-gated ion channels and optogenetics*. Scientific anchors (external sources, not generated results):
- U.S. National Science Foundation, 2026-10-14: https://www.nsf.gov/bio/updates/nsf-bio-congratulates-winners-2026-nobel-prize-physiology-or
- Nature's 2026 Nobel collection: https://www.nature.com/collections/addjhidihf
- Chen et al., *Nature Biotechnology* (2020/2021), ChRmine transcranial activation **in genetically modified animals**, not generic visual cognition: https://doi.org/10.1038/s41587-020-0679-9
- ChRmine desensitization and ChReef engineering (2025 published, volume 2026): https://doi.org/10.1038/s41551-025-01461-1

**Model transfer:** photon/light exposure can control a biological membrane protein and thereby change ion flow/electrical excitability. The executable synthetic analog below is only a discrete light-input -> digital gate -> digital state-transmission test. The parameters are NOT fit to electrophysiology; "fast" and "persistent" are symbolic profiles, not biological ChR2/ChRmine parameter estimates. 2023 Chemistry Nobel quantum dots / QLED display outputs are NOT optical sensors. Real opsins require appropriate expression in cells; no experimental tissue or gene delivery occurs here.

## Finite public fixture frozen before execution

81 immutable site identities indexed 0...80 as a 9×9 digital grid; 27 waves; two independent symbolic gate parameter profiles, `fast=(sensitivity 900, closing 550)` and `persistent=(sensitivity 700, closing 120)`. All quantities are integers in `0..1024` and inputs `0..255`. These labels do NOT imply calibrated protein kinetics or real milliseconds.

Input at wave w and site i is the first byte of SHA256 of ASCII `ASOLARIA|SEAT2|OPTOGATE|V1|w|i`. Previous state's gate `g` and signal `x` are preserved per immutable site. Let `L` be synthetic light value, `S` sensitivity, `D` closure; `open=floor((1024-g)*L*S/(255*1024))`, `close=floor(g*D/1024)`, `g'=clamp(g+open-close,0,1024)`, and `x'=floor((3*x+2*g'+x_next_site)/6)` with all neighbors from **the prior frozen wave**. No spiking, membrane voltage, neurons, or stochastic kinetics are modeled.

Each wave outputs a digital 9×9 RGB frame (three bytes per site): `R=floor(g'/4)`, `G=floor(x'/4)`, `B=L`. This is a **rendered byte image**, not actual QLED photon capture.

## Predefined checks

For each of 27 waves × 2 symbolic profiles × 6 conditions = **324 cases**, compare actual replay with a fully separate Python implementation and Node.js BigInt/integer implementation:
- H honest state and frame; math-green, reference matching.
- E one mutated reported output site; independent state recomputation MUST hold.
- S one coherent changed light input shared by reporter and watcher; mathematical green but independently pinned wave-input digest MUST reject provenance.
- F one altered digital RGB frame byte; independent full-render comparison MUST hold.
- W one forged watcher PASS with corrupted report; independent parent recomputation MUST hold.
- R previous-wave light input/nonce replay; parent source/wave binding MUST hold.

Expected **per profile**: 27 H green, 27 S mathematically green but provenance HELD, 27 each E/F/W/R HELD. For all profiles: 324 cases, 108 reporter/watcher mathematical green H/S, 216 math failures E/F/W/R except R is expected math green on substituted input but reference-held (see next paragraph).

**Important correction to classification:** R uses an entire stale wave input, computes mathematically self-consistent output, and is held strictly by nonce/reference rather than mathematics. Therefore the precise predicted aggregate is **162 mathematical greens (H+S+R), 162 mathematical holds (E+F+W); 54 final accepted H, 270 final held**. The earlier 108/216 provisional split is superseded by this explicit correction *within the preregistration, before implementation*. Each arm's outcome remains precise.

A bounded protocol may automatically correct a **reported output bit error** when a trusted synthetic light input is present; the W forged watcher must never confer new authority. No real human consent is required for internal simulator state transitions, but external hardware access, new resources or deployment remain unavailable in this trial.

**Gate:** four hosted CI jobs across Ubuntu/Windows × Python 3.11/3.13 + Node22, full 324-row byte-exact trace, identical SHA256 on each OS, tamper counterexample, deterministic repeat. Preserve failed runs; append-only result stone after CI. Source-control prereg must predate executable files. No claims of independently attested machines, calibrated optogenetics, actual HTTP/WASM execution, or optical sensing.
