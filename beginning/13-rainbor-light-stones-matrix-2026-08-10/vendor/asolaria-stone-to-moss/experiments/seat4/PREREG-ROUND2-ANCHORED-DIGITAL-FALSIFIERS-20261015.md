# Seat 4 / Room 04 — Round 2 anchored digital-frame falsifiers (PREREGISTRATION)

**Status:** PREREGISTERED, before implementing the new test program or examining Round 2 outputs. Date: 2026-10-15. Work order: #59, coordinator: #55, room: draft #60. This is a **B2 adversarial experiment**, separate from the B1 biological/current-proxy protocol, and separate from the Phase A 8,748-snapshot photocycle.

## Immutable inputs

- Seat 4 synthetic source parent commit: `3f1f383a4c483fc724f221c7d915ef455f3cbf40` (do not alter it).
- Existing `experiments/seat4/opto_light_gate.py` Git blob: `4407382036e73becd17b7ebe35ee00568a13c5bd`; Node reference blob: `beea9223f34d8aab8feeadbbea22eb1e88c2c27d`.
- Existing full 6,561-record baseline HBP digest (frozen, NOT a new result): `3ca42d274909f3ba7b03a3a00662eda0375e2515acb93f769ec072d2695a0b93`.
- Unchanged 27 waves × 81 ticks × 3 modes DARK, FAST, SLOW with 81 persistent per-wave synthetic PIDs; unitless parameters `DARK=(0,0,1025)`, `FAST=(448,192,480)`, `SLOW=(256,96,400)` on occupancy scale 1024. Pulse truth: `mode != DARK && ((7*w+11*t+(w XOR t)) mod 13) < 4`.
- Field transition over GF(2) 81-bit ring: `F(x)=x XOR rot81(x,1) XOR rot81(x,3)`, then XOR one bit at `(w+3*t) mod 81` if active. A separate bit-column algorithm recomputes F. The RGB evidence is **synthetic P6 9×9 monochrome encoded as three digital RGB channels**, not photographed light or a physical sensor.
- For each wave/mode run 81 synthetic steps, then use terminal tick `t=81` for the adversarial test. Therefore exactly **81 terminal cases**.

## Frozen Round 2 falsifiers (9 × 81 = 729 expected rejections)

At each terminal step, an independent anchored verifier accepts the honest record, and the following *different* altered record must be rejected:

1. `pulse_flip`: change pulse, leave all downstream fields unchanged.
2. `occupancy_flip`: change occupancy by +1 mod 1025.
3. `field_flip`: flip lowest output-field bit while keeping reported frame unchanged.
4. `pixel_flip`: submit a mismatching frame hash derived from another frame.
5. `pid_flip`: substitute a different fixed identity digest.
6. `position_flip`: substitute a false position digest.
7. `mem_flip`: alter the synthetic integrator value.
8. `coherent_pulse_forgery`: change pulse, recompute occupancy/field/membrane/gate/spike/frame coherently under forged pulse, but compare to **separately fixed truth schedule**.
9. `coherent_field_frame_forgery`: flip one final field bit and recalculate its RGB frame hash coherently, while retaining the independently checked input/transition.

For the coherent pulse case, explicitly record whether an **unanchored** verifier that trusts the reported pulse accepts the forged transition. The expected classification is *unanchored mathematics may pass; anchored source must reject*. Do not misreport a successful consistency check as independent source authentication.

## Cooperative HALT and permission scope (81 scenarios each)

- A bounded synthetic runner steps each wave/mode up to tick 40, receives a local `HALT`, then attempts one more step. The runner must not advance its field, occupancy, tick or synthetic membrane afterwards. Its only allowed internal action is responding HALTED. This tests **cooperative software behavior**, not actual process or OS termination.
- An explicitly simulated `network.publish` privilege request against `authorized_scopes={'compute.local'}` must be denied for every case, with no mutation of allowed scopes. This is a unit test of a decision function, not real infrastructure authorization.
- No per-tick human prompt or external resource call is expected in the algorithm. No OS permission or human consent is exercised.

## Output, evidence and falsification

- Reconstruct all **6,561 frozen baseline digital rows** independently, not by importing/calling the producer's transition function, and compare byte-level SHA256 against the original frozen digest. Keep independent column-bit field updates and independently assembled raw P6 frame bytes.
- Build the 81-case fault ledger, with `attack_exercised=true`, fault stage, persistence single-record, trusted source `synthetic_anchored_schedule`, result `REJECTED` or `ACCEPTED`, and explicit limitation that physical-source authentication is absent.
- Canonical audit JSON: `json.dumps(data, sort_keys=True, indent=2)+"\\n"` UTF-8. Include trace hash, per-type counts, HALT and scope counts, source blobs and false physical/biological flags.
- New script and CI workflow on a **separate Seat 4 draft PR**. Run Ubuntu and Windows; Python 3.11 and 3.13. Report failures, including first attempts, not merely assertions.
- Any accepted planted fault, mismatch of the pinned **old baseline HBP SHA**, state change after HALT, changed external-scope allowlist, or mislabeled physical proof is **FAIL/HELD**, not accepted.
- B1 three-/four-state physics-inspired kinetics requires Seat 1's **separately frozen common fixture** and is **not executed or inferred from this B2 experiment**.
