# Seat 4 — Autonomous Simulation & Recurrence Capsule

**Version:** `ASOLARIA-SEAT4-PORTABLE-SIMULATION-CAPSULE-V1` · 2026-10-15

## The operative correction

**There is no human-in-the-loop at every movement.** A configured digital simulation automatically evolves its field and its entity locations. Identities are persistent labels; their state and position can change without becoming a new identity. An independent watcher recomputes transition results and automatically accepts or rejects them. The software does not ask an operator to approve each tick or molecule displacement.

N-Nest's original **"correction recurses; consent does not"** is about expanding permissions or changing the established operating policy. It does *not* mandate humans participate in the inner simulation loop. The initial experiment is bounded by an already configured 27-wave × 81-tick computation; it makes **zero** prompts. A human can still stop or change the permitted experiment scope outside the moving system.

## Included artifacts

- Full source of the earlier, successful **3,888-case four-arm "Recurrence Is Mind" experiment** (Python/Node, source-authenticity controls, exact synthetic 9×9 RGB visual feedback) plus its original sealed JSON and generated full row trace.
- New independently implemented **autonomous 81-site toy evolution** (Python and Node BigInt) over **27 waves × 81 ticks = 2,187 state transitions**. Each wave has 81 stable identities, yielding **177,147 automatic identity-position updates**; identity mutation, state mutation and pixel mutation are each deliberately rejected once per wave, and independent state checks occur at every tick.
- Original **Seat 1 27-wave / 32,805-row** challenge, Python and Node source, compact HBP/HBI/JSON receipts with sidecars, Seat 4's independent third replay implementation, plus generated full HBP.
- The original **complete N-Nest repository contents** from pinned commit `307903651f56e8a28ef98ca36aef22ee8cda935c` (all 23 Git blobs, including LAW, preloads, discipline, executable depth3/prime-depth7 verifiers and their historical receipts). Source code is included verbatim from the Git object, not reconstructed from an AI narrative.
- `capsule/manifest.json`, a SHA-256 content index and the offline `capsule/verify_capsule.py`.

This capsule is portable across Windows and Linux. It needs only **Python 3.11+** and **Node.js 22+** after extraction; verification **does not call GitHub, Hugging Face or other networks**.

## Reproduce and cross-seat review

Extract the ZIP to an empty directory, open a terminal in the extracted root, and run:

```sh
python capsule/verify_capsule.py
```

The verifier checks the SHA-256 manifest, requires **exactly** the manifest's filenames, reruns 3,888 recurrence cases and 2,187 autonomous ticks using independent Python/Node programs, replays the original Seat 1 32,805-row output, executes the original N-Nest depth3 and prime-depth7 scripts and their planted-error controls, and rejects corrupted output bytes.

To use the dynamic simulation alone:

```sh
python experiments/seat4/autonomous_lattice.py --trace dynamics.hbp --receipt dynamics.json
node experiments/seat4/autonomous_lattice_node.js --trace dynamics_node.hbp --receipt dynamics_node.json
```

The two traces and receipts must be byte-identical. Both automatically produce changing digital field and position data while retaining the original identity strings. No inter-step human instruction exists.

Other seats should independently unpack and run this capsule, then post a receipt in [coordination Issue #1](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/1) with platform, toolchain versions, ZIP SHA-256, manifest SHA-256, result hashes, any failed tests, and whether any sources differed. **Do not claim another seat has performed this merely because it was notified.**

## Evidence boundaries

This is a **classical digital lattice toy model**: movement refers to changes in synthetic entity addresses, not a physically validated molecule trajectory. The 9×9 RGB pixels are encoded digital output; no camera, QLED light output, quantum-dot photons, biological mind, independent physical host attestation, actual quantum transport, or faster-than-light signaling was measured. Reproducing a sealed ZIP across containers tests software portability, not that containers are separate physical witnesses.

The original 3,888-case law includes *missing experiment-level authorization* as a deliberate negative test. That is different from a **new permission request for each simulation step**; none exists in this capsule.

To expand the resource budget or operate external systems, retain the upstream law's independent operator-scoped controls. The lattice itself is not stopped for approvals as its entities move.
