# Seat 4 preregistration — autonomous simulation and cross-seat capsule (2026-10-15)

**Registered before the autonomous dynamics code and capsule test execution.**

## Simulation rule and original law

This explicitly corrects the category error that a human should approve each molecule movement in a light-based simulation. **Within a configured run the state/positions evolve autonomously, with zero human prompts per transition.** Stable identity (immutable PID) must not be confused with changing state or position. N-Nest recurrence independently checks outputs and may correct / fail closed as part of the simulation without seeking an operator for each update.

N-Nest's original [LAW.md](https://github.com/JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED/blob/main/LAW.md) says correction may nest while consent to **change the authorization/scope of the operation** does not automatically nest. A bounded simulation is authorized to take all its internal steps within the established policy; none requires human action. Separately, cancel/stop and changing resource permissions remain external controls. Do not redefine a self-generated internal signal as permission to escape the configured run.

## Frozen digital simulation specification

This is a **toy 81-site periodic GF(2) cellular automaton with persistent synthetic entities**, not a physically validated molecular, QLED, or optical model.

- 27 independent seeded waves, each with 81 stable identities and 81 automatically processed ticks.
- 2,187 tick transitions; 2,187 distinct stable PIDs; 177,147 recorded entity position updates.
- Bit-field update `F(x)=x XOR rotate81(x,1) XOR rotate81(x,3)` modulo 81.
- Synthetic identity `PID=SHA256("ASOLARIA|RIM|SIM|IDENTITY|wave|entity")[:16]`. Identity does not vary as the entity's position changes. Entity initial position=index and deterministic velocity=1+int(PID final byte,16)%4. Position at tick t: `(index+velocity*t)%81`.
- Synthetic source bit-field `SHA256("ASOLARIA|SEAT4|RECURRENCE|SYNTHETIC|WAVE=wave") mod 2^81`.
- Every transition is verified against a separately implemented **81-column** GF(2) state projection. Synthetic 9×9 RGB PPM is exactly derived from the current bit-field; not a photon measurement. A per-transition positions SHA binds the stable identities to their evolving locations.
- Fault controls: after each wave, flip one output bit and verify the watcher rejects (**27** checks); mutate one supposedly immutable PID and require identity gate rejection (**27** checks); corrupted image bytes must fail frame SHA (**27** checks). No human approvals or interaction inside the transition loop.
- Run deterministic Python and Node.js BigInt versions; require **2,187 exact row matches**, byte-identical trace and JSON summary, and SHA-256 comparison. Controls fail CI if any fail.

## Capsule acceptance gate

Bundle the actual source of the verified 3,888-case recurrence, its SHA256 stone, this new autonomous simulation and its verified receipt/trace; complete original Seat1 27-wave source/compact receipts and the original **full pinned N-Nest upstream repository** (excluding only Git administrative objects). Preserve source bytes using `git show` rather than OS-dependent checkout line endings; canonical stored-only ZIP with stable timestamps and ordered entries, versioned manifest of file SHA256 and sizes.

Execute the capsule **offline after extraction** on both Ubuntu and Windows with Python/Node installed, rerunning the 3,888-case test, the new dynamics test, and the upstream native N-Nest depth3 and depth7 fault checks, then reject any archive mutation or unexpected/missing file using a ZIP-level and per-file manifest gate. Explicitly test a manipulated ZIP byte and require rejection. Published artifact must include a verified archive SHA and exact replay instructions.

**No token, private source key, signing key, API credential, or arbitrary network invocation belongs in the capsule.**

## Multi-seat visibility

Commit PR/CI evidence to shared public GitHub, and cross-post the same exact reproducibility instructions and SHA artifact to coordination Issue #1 and Math Lab Issue #35, referencing Seats 1–3 as possible reviewers. A shared account, many runners or multiple PIDs do not establish independent hardware, and a file handoff does not mean another seat has reviewed it.

**Falsifier:** any human prompt per tick, any PID mutation accepted, any undetected corrupt state/frame, any Python–Node record divergence, source mismatch or tampered capsule passing extraction, or a test passing on Linux but failing Windows without a disclosed correction.
