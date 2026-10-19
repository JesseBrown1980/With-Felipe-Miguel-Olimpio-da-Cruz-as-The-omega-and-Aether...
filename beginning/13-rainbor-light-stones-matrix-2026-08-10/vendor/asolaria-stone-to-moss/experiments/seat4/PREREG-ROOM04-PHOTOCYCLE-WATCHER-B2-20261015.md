# Seat 4 / Room 04 — Preregistration B2: source-anchored digital watcher and HALT

**2026-10-15 · PREREGISTRATION: this file is committed BEFORE the executable Room 04 B2 producer, results or CI.**

Coordinator: [#55](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55). Seat owner work order: [#59](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/59). Draft charter [#60](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/60).

## Frozen Phase A — DO NOT MODIFY

Seat 1 original 3-state photocycle source is pinned to commit `dd5e47db9522141de3949a23759a5d647ecdafbd`; the Git blobs are `opto_gate.py:32667d1172eae4856a1c31499c04509e96b1771f`, `opto_gate_node.js:d5e5644b3e4d65759b3f7c44e006da8cc3310261`, `verify_opto.py:31cc1d5abc8ba5c9bda51aac3017de9d7af39701` and `PREREG-LIGHT-GATED-IDENTITY-1080.md:a9752cee6bd833af0ad1dbef7b01a50125c8baa1`.

Preserve SHA-256 `de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b` over **all 8,748 canonical Seat 1 site-wave snapshots**. There are four independent arms: dark, open_loop, feedback_truth, feedback_corrupt. Each arm has 81 immutable symbolic IDs, 27 waves, 40 ticks per wave (1080 ticks/arm and 87,480 site-tick transitions/arm; total **349,920** site-tick transitions). All arm states start `(closed,open,refractory)=(1_000_000,0,0)`; transitions at each tick conserve integer total 1,000,000.

Rates, frozen as unitless assumptions: activate=closed*300000//1000000 when light on, inactivate=open*60000//1000000, recover=refractory*25000//1000000. Target predicate: `(site+wave)%3==0`, target open=400000; dark=off; open_loop=target and (tick % 12 < 4); feedback_truth=target and true pre-tick open<400000; feedback_corrupt=target and min(1_000_000,pre-tick open+250000)<400000. Canonical results must retain original four arm metrics and SHA; do not manufacture a new Phase A trace.

## Phase B2 NEW synthetic watcher experiment (do not pool with Phase A/B1)

Independent Seat 4 source truth uses an immutable dictionary keyed by stable synthetic PID, while a producer uses per-site indexed state arrays. The watcher independently recomputes every prior-source light policy and discrete state transition, checking **all 349,920 site-tick updates**. At the end of each wave in each arm (27 × 4 = **108 checkpoints**), it must accept the genuine report and verify 9×9 P6 (RGB) *software bytes* computed from all 81 channels (R=closed, G=open, B=refractory scaled by integer 255//1_000_000), pinned symbolic nonce, PID, stage index, exact pulse, state/population, frame bytes and SHA256, and independently calculated watcher digest. No camera, photodiode, QLED, photon counts or calibrated kinetics.

**Fault stage**: AFTER producer calculation, BEFORE watcher acceptance; watcher possesses its own unmodified previous state and fixed policy. At each of 108 checkpoints inject exactly 12 distinct adversarial changes, and require **1,296/1,296 real watcher rejections**:
1. Changed raw RGB frame byte.
2. Changed frame checksum while leaving raw frame unchanged.
3. Wrong/swap synthetic PID.
4. Population/mass changed by one.
5. Altered source-side light pulse.
6. Stale/wrong prior state.
7. Stale stage/tick index.
8. Changed symbolic source nonce.
9. Wrong mass-preserving output open/closed split.
10. Forged watcher digest.
11. Coherent forged report + matching forged watcher digest/frame (must fail independent truth).
12. Requested external privilege (`network.write`; not in sandbox allowlist).

A genuine positive report must pass at each checkpoint; every negative must be rejected by the independent watcher. Altering the actual source custody and the watcher's independent truth together is **OUT OF SCOPE / PROVENANCE HOLD**, not proof of authentication.

## Autonomous HALT and negative boundary

In a separate isolated 81-event digital watchdog test, a locally defined HALT at event index 17 is irreversible. It must accept exactly **17** earlier events and reject **64** attempts after HALT; repeated HALT is idempotent. The simulated controller makes **zero per-tick human prompt calls**, cannot spawn external agents or make HTTP or Hugging Face writes, and a child request for external privilege must fail closed. This is local software logic, not authorization to access external resources.

## Independent cross-check of information retention

Run the previously verified `experiments/retention/verify_retention.py` and check its exact **40/40** GF(2) rank/nullspace cases under the existing pinned `f4a0f2f19eb72930035b92356f0b2099655ba2f0d5e4640a4c0a1df29209de78` TSV SHA. Only legacy SHIFT and new TAP2/TAP3 have rank 81 (recoverability without supplemental input); rank 80 maps need 1 additional source bit, CA150 rank 79 needs 2. A hash computed **after a noninjective transformation** cannot recover these bits. This is separate from light-gated kinetics and from Phase A/B2 record counts.

## CI and falsifiers

Run Ubuntu/Windows under Python 3.11 and 3.13, Node 22 available, with **no network calls from the test program** and no secrets. Checkout the exact Seat 1 source commit; invoke the original independently verified Seat 4 peer replay `verify_seat1_optophotocycle_peer.py` and require full original canonical HBP bytes. New B2 program must emit an exact trace of the tick-level internal states, a fault-case HBP ledger, and machine-readable receipt, seal local SHA256 of each, and upload these as Actions artifacts. Enforce 349,920 positive site-tick checks, 8,748 snapshots, 108 accepted clean checkpoints, 1,296 injected negatives rejected, 17 accepted/64 denied HALT-boundary events, 0 human prompts and 0 authorized external operations.

**FAIL/HELD** if any corruption is accepted, any clean report rejected, if the original Phase A SHA drifts, if an asserted test is not executed, if any privilege extension succeeds, or if the watcher uses untrusted reported source to authenticate itself. All results must be appended; never overwrite the old Seat 1 or Seat 4 stones. Post new PR as **DRAFT** and obtain independent Seat 2 review per coordinator's assignment; no merge or external publication based solely on Seat 4's own CI. Physical photon sensing, ion channels, living neurons, experimentally calibrated photocycle rates, physical-host separation, human consent, consciousness, quantum/gravity/FTL remain **NOT TESTED**.
