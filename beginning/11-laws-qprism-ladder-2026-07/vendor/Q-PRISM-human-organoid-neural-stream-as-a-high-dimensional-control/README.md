# Q-PRISM

Human/organoid/neural streams as high-dimensional control signals for macroscopic matter-wave interferometry.

This repository starts from a conservative scientific frame:

- A 2026 Nature matter-wave interferometry result reports quantum interference of sodium nanoparticles containing more than 7,000 atoms and masses greater than 170,000 Da, with macroscopicity `mu = 15.5`: <https://www.nature.com/articles/s41586-025-09917-9>
- That result does not prove consciousness couples to a quantum experiment.
- Q-PRISM is the testable bridge: use neural/consciousness-derived streams as high-dimensional control and hypothesis signals, then compare them against random and classical optimizers on interferometer prediction/control tasks.

## Core Claim

Q-PRISM does **not** claim that consciousness directly collapses or projects into matter waves.

It asks a sharper experimental question:

> Can a prismed neural or organoid-derived stream improve prediction, control, anomaly discovery, or schedule selection in macroscopic quantum-interference experiments beyond random, classical ML, and human-only baselines?

## Layers

1. **Physics layer**
   - Models a sodium nanoparticle interferometer.
   - Exposes lawful control channels: grating phase, laser power, velocity-bin selection, scan schedule, decoherence assumptions, detector analysis.

2. **Prism layer**
   - Converts neural/semantic/time-series input into high-dimensional control proposals.
   - Starts with deterministic synthetic streams; later accepts EEG, BCI, organoid, or Neuralink-style streams only under explicit ethics and consent gates.

3. **Experiment layer**
   - Runs blinded schedule comparisons:
     - random control
     - classical optimizer
     - Q-PRISM neural/prism schedule
   - Scores visibility, phase prediction, anomaly detection, and reproducibility.

4. **Claims gate**
   - A positive result may support: `neural-prism signal improves experimental control`.
   - It does not support: `consciousness entered the wavefunction`, unless a separate experiment directly proves that mechanism.

## Run

```powershell
npm test
npm run simulate
```

The first simulator is intentionally small and dependency-free. It is a scaffold for the actual hardware-facing protocol, not a substitute for the real experiment.

## Repository Map

- `docs/nature-2026-metal-cluster-interferometry.md` - physics anchor.
- `docs/research-program.md` - staged Q-PRISM roadmap.
- `docs/claims-gate.md` - what can and cannot be claimed.
- `docs/ethics-and-human-subjects.md` - consent and safety gates.
- `src/qprism-simulator.mjs` - dependency-free interferometer toy model.
- `src/qprism-control-policy.mjs` - deterministic schedule/control proposal utilities.
- `test/qprism-smoke.test.mjs` - smoke tests for the scaffold.

