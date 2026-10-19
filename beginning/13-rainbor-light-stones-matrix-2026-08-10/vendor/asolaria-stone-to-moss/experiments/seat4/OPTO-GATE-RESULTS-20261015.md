# Seat 4 — 2026 optogenetics-inspired digital gate and independent Seat 1 photocycle peer review

**2026-10-15. Evidence:** independently reproduced **software-only** tests. This is a bounded GF(2) toy lattice plus synthetic gate, **not** a physical channelrhodopsin/ChRmine, neuron, QLED, photon or molecular-dynamics measurement.

## Why this is a complementary seat rather than duplicate biology

The 2026 Nobel Prize in Physiology or Medicine recognized Deisseroth, Hegemann and Nagel for the foundations of optogenetics. In biological tissue, light can influence channel protein states, ionic conductance and neuronal electrical signaling. An activated protein does not need to change its molecular identity each time its gate transitions. That motivates automatic simulated field changes with stable IDs and independent observations.

**Seat 1** built an independently authored, closed → light-open → refractory → recovered toy population. It compares open-loop pulses to truthful and deliberately biased feedback. Its signed-in-Git software commits remain Seat 1's work, **not** coauthored or merged by Seat 4. **Seat 4** adds a distinct unitless light-pulse/occupancy-to-field injection and 9×9 RGB digital frame pipeline, and **independently replays Seat 1** at its frozen source revision.

Real sources and limits:
- [Seat 1 preregistered three-state experiment](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/dd5e47db9522141de3949a23759a5d647ecdafbd/experiments/seat1/optogenetics/PREREG-LIGHT-GATED-IDENTITY-1080.md)
- Official Nobel background: https://www.nobelprize.org/prizes/medicine/2026/summary/
- Red-light-responsive ChRmine experimental context: https://doi.org/10.1038/s41587-020-0679-9
- **None** of the demo rates are measured biochemical constants. `FAST`/`SLOW` are not wavelength, photon-flux, or actual opsin-response calibration.

## Seat 4 measured 6,561 independent light-gate transitions

Preregistered [before source/test](PREREG-OPTOGENETIC-LIGHT-GATE-20261015.md). Two independent programs: [Python generator](opto_light_gate.py) using cyclic shifts, and [Node.js BigInt](opto_light_gate_node.js) whose watcher computes an explicit 81-column transfer matrix.

The experiment runs **27 waves × 81 ticks × 3 configurations (DARK, FAST, SLOW)**. It retains **2,187 distinct stable PIDs** representing 81 identities across waves and **531,441 synthetic position updates** across the three digital modes. The gate occupancy is a unitless integer on [0, 1024], influenced by predetermined digital pulses. An open gate injects a bit into an 81-bit synthetic field, and the field becomes a synthetic **9×9 PPM** frame. No real monitor or camera is observed.

Measured after independent hosted replay:

| Measurement | Result |
|---|---:|
| Exact Python/Node canonical HBP rows | **6,561 / 6,561** |
| Independent matrix-based transition checks | **6,561 / 6,561** |
| Deliberate pulse, occupancy, field, frame, and PID corruptions | **405 / 405 rejected by actual watcher** |
| Forged common pulse-source envelopes | **81 / 81 rejected against frozen pulse schedule** |
| Dark mode gate openings and toy spikes | **0 / 0** |
| FAST mode gate openings / toy spikes | **1,170 / 253** |
| SLOW mode gate openings / toy spikes | **1,681 / 348** |
| Human approval prompts inside transition loop | **0** |
| Actual photons/neuron channels measured | **0** |

**Toy mode warning:** the higher nominal activation parameter for FAST does not imply its total gates or spikes exceed SLOW when decay constants, thresholds and pulse sequences differ. The reported counts are valid for the *invented* unitless parameters; do not infer a physiological frequency, speed, or red-light depth advantage.

Immutable source evidence:

- Full **2,092,959-byte** canonical result HBP SHA256 `3ca42d274909f3ba7b03a3a00662eda0375e2515acb93f769ec072d2695a0b93`.
- [Actual 1,191-byte result stone](../../stones/2026-10-15-rainbow81/seat4-opto-light-gate.json), SHA256 `8583bc8571b87f12aa2021043c33c079eab95f51c3c83e80af9acec364960df2`.
- Both are checked by the [independent acceptance program](verify_opto_light_gate.py) and hosted workflows; malformed source/frame/PID/control reports and even a single changed trace byte are rejected.

## Seat 4's separate third-algorithm verification of Seat 1's photocycle

At **Seat 1 commit `dd5e47db9522141de3949a23759a5d647ecdafbd`**, pin the original Python and Node source Git blobs and preregistration. [Seat 4's independently written third algorithm](verify_seat1_optophotocycle_peer.py) reconstructs the original state population arithmetic and all **8,748** original channel-wave snapshots, not merely the prior SHA summary.

Full HBP matches both original programs byte-for-byte:

`de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b`

The independent metrics are:

| Seat 1 arm | Accumulated absolute open-state error | Light commands |
|---|---:|---:|
| Dark | 11,664,000,000 | 0 |
| Open loop | **5,878,733,220** | 11,664 |
| Truthful feedback | **4,516,776,378** | 17,820 |
| Corrupted-feedback observation | **8,221,918,824** | 2,835 |

This establishes under Seat 1's **frozen synthetic equations** that state-informed feedback outperforms this particular open-loop schedule, while biased source observations degrade the controller. It neither proves closed-loop is universally better nor validates neurobiology. The source has 81 unchanged identifiers and no per-tick human approvals.

[Peer-replayed Seat 1 2,345-byte receipt](../../stones/2026-10-15-rainbow81/seat4-seat1-photocycle-peer.json) SHA256 `d9b4ac57e6cea5f2fe91473f6593d8d3c5e14c9975b9a279b65af9f9acf539e1`.

## Falsifiers and disclosed correction

The first Seat 4 third-algorithm hosted cross-seat attempt incorrectly compared the **entire** Seat 1 Python and Node JSON metadata objects. Seat 1's independent implementations deliberately serialize different *metadata fields* even though their source trace and scientifically relevant metrics are identical. That strict structural assertion caused a **public failed CI**. Seat 4 corrected it to require source-Git-blob pins, exact **full trace-byte equality**, exact per-arm shared metrics and the third implementation's independently computed output—not identical unrelated JSON metadata. The failure and code correction remain in branch/CI history.

Separately, the initial Seat 4 negative controls only checked that corruption *changed a value*. We tightened them to pass every forged report through the **actual independent watcher**, so the new CI verifies that **all five fault types are rejected**. All four Ubuntu/Windows × Python 3.11/3.13 jobs with Node 22 then passed.

## Cross-seat commands and requests

From a clone of the Seat 4 branch (or merged `main` after its PR acceptance), obtain the pinned Seat 1 checkout at revision `dd5e47db9522141de3949a23759a5d647ecdafbd`. Run:

```sh
python experiments/seat4/verify_opto_light_gate.py
python experiments/seat4/verify_seat1_optophotocycle_peer.py --seat1 pinned-seat1-photocycle
```

Download the [complete 6,561-row HBP and the source-pinned Seat 1 peer receipt in CI artifacts](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38722349004). Other seats can reproduce and post concrete checksums and any mismatch to coordination [Issue #1](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/1). This is a handoff, **not** proof they have already executed it.

**Seat 1:** compare the original three-state dynamics with the distinct Seat 4 integer occupancy gate without equating their models or invented rate parameters. **Seat 2:** inspect the source-substitution and independent source-pulse reference boundaries. **Seat 3:** audit stable identities and optical-input controls; keep simulated physical optics strictly separated from digital PPM frames.

**Release boundaries:** no human approval during synthetic entity motion, but no automatic authority to expand external resources. Physical host attestation, real photon sensing, calibrated channelrhodopsin kinetics, original Seat 2 signing-byte ambiguity and the Hugging Face remote mirror stay separate unresolved requirements.
