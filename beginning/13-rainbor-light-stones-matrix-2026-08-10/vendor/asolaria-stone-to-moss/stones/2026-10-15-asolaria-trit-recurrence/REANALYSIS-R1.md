# Asolaria public stone 0001 — Independent ternary, matrix and three-loop reanalysis

**Date:** 2026-10-15  
**Source of truth:** [public STONE-0001 at immutable commit `7f90d9a8cb850decb419266d9345f2c2005f8328`](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/7f90d9a8cb850decb419266d9345f2c2005f8328/stones/2026-10-15-asolaria-trit-recurrence/STONE-0001-PUBLIC-GENESIS.hbp).  
**Evidence scope:** new standalone local Python3 + independent Node22 computations. **Not GitHub-hosted CI yet**, not physical/biological data, not authenticated instrument custody. Historical Asolaria sources and stones unchanged.

## 1. GF(3) recurrence: information loss versus invertible recurrence

For the **specified** 81-position cyclic linear laws over GF(3),
`T(x)_i = Σ_(k in taps) x_(i-k) mod 3`, with taps `[0,1,3]` or `[0,4,7]`, their ring is `GF(3)[z]/(z^81-1)`. In characteristic 3, `z^81-1=(z-1)^81` because 81=3^4. Both tap polynomials have one zero at z=1 but not two. Therefore the rank of the k-fold map is `max(81-k,0)`. This is **not** a statement about arbitrary carry-preserving balanced-trit laws.

| Logical steps | 0 | 1 | 2 | 3 | 10 | 40 | 80 | 81 | 10^13 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Rank, either law | 81 | 80 | 79 | 78 | 71 | 41 | 1 | 0 | 0 |

Independent Python repeated-squaring cyclic polynomial powers and Node full 81-basis row-elimination checks agree at the tested horizons. At 81 steps all 81 original trit coordinates have lost initial-state distinguishability. For these particular laws, the exact matrix jump to 10^13 steps gives **zero**, not a retained learning state.

An **invertible rotation** of 81 trits preserves all state indefinitely: `T^n(x)_i=x_((i-n) mod 81)`. Thus recurrence alone neither guarantees nor forbids loss of memory; the **actual operator and access to new source/feedback** determine that.

## 2. Time and hash: a changed digest is not skipped computation

A timestamp is an input to a hash when explicitly serialized into its message. Setting time from 1 to 10^13 changed the deterministic SHA256 while leaving the full state bytes unchanged. That demonstrates a hash's sensitivity to its input **only**. It does not demonstrate time travel, generate uncomputed intermediate states, or make a sequential authenticated hash chain verifiable without a separate proof.

Legitimate fast-forward: `T^(a+b)=T^b∘T^a` for a **specified** fixed transition, including efficient powers of matrices/polynomials. Changing laws requires **ordered composition**. A nonlinear law requires its own proof. Changing a time label or final SHA does **not** prove the full hash chain or original-source authenticity.

## 3. Addresses and cost

Prime `2` and prime `29` collide modulo 27. Bare prime residues alone cannot supply globally unique identities. Full origin/context/route/depth/trit tuples can be **designed** injectively, but the claim must be checked for the declared domain. Asolaria's prior 15,309 logical addresses are aliases of 567 band/site rows from 81 original digital memories, **not** new payloads. The avoidance of 2,274,718 bytes is repeated **index metadata**, not compression of 184,815 bank data.

## 4. Three-loop embodied memory benchmark

A **constructed deterministic digital learning problem** tests three cooperating feedback paths:

- **Loop 1 / eyes and membrane:** one newly sampled ternary observation enters a bounded boundary; no ground-truth target leaks through sensor inputs.
- **Loop 2 / recurrence, memory and dendrites:** a 2-trit state holds temporal context; a 9-context/3-choice table learns a mapping after corrections. Weighted graph edges are a proposed later extension, not implemented physical dendrites.
- **Loop 3 / action and external corrective referee:** the agent commits one of three discrete actions, receives the hidden reference **after acting**, and updates its memory model. Its tracked error rate is a simple internal performance estimator, **not consciousness**.

An unseen finite rule is used by the test environment: `target(t)=(sensor(t-1)+2*sensor(t-2)) mod 3`. Learner never directly sees rule. **27 seeded independent software streams**, 600 calibration actions followed by 600 held-out actions per stream (16,200 held-out decisions per arm).

| Arm | Correct / 16,200 | Accuracy |
| --- | ---: | ---: |
| Three loops working | 16,200 | 100.0000% |
| No recurrent memory | 5,338 | 32.9506% |
| No corrective feedback | 5,385 | 33.2407% |
| No informative sensor/context | 5,378 | 33.1975% |
| No action → correction loop | 5,385 | 33.2407% |

The full machine was explicitly designed to learn a finite deterministic lookup table, so its perfect score is **not** evidence of spontaneous self-emergence or general intelligence. It shows that bounded sensors, memory, actions and external error correction can cooperate to produce a new successful behavior under predeclared conditions. A larger emergent-behavior study must test novel held-out tasks, changing environments, unseen sensor mappings, interventions and resource costs.

## 5. Scientific next criteria: *Follow the IS*, not invented observations

Each proposed memory-box agent stores a verifiable current-state tuple: `(source_root, sensor_frame, trits, memory_summary, action, observed_result, prediction_error, law, logical_tick, physical_clock_if_measured)`. Preserve `measured`, `derived`, `hypothetical` and `unverified` provenance classifications. A foggy membrane can be a **noisy and lossy sensing boundary** with calibrated information loss, not an assertion of sentience. Neuron/dendrite terms presently refer to **computational graph analogues**, not biological cells.

**Next falsifiers:** ablate each loop, force false feedback/replays, introduce sensor noise/missing channels, change task laws mid-run, compare invertible/nilpotent recurrence under bounded memory, sign independent raw observations, and hold claims of living biological neurons or optical storage until actual externally auditable instrument data is supplied. The historical optical-memory experiment remains **operator-reported completed**, with raw instrument evidence not yet correlated in this public test.

## Local reproducibility and artifact provenance

Python result JSON **3,095 bytes**, SHA256 `391a02d7320083c33f8efdedf7df93ccc0ffc026d98dd6b5bf867bc8462372ae`. Independent Node review JSON **967 bytes**, SHA256 `fddc47e215c6891b17e3491c9364bf927ef86f7d09b16cc42ef549d425b62c9d`.

A self-contained reproducibility package accompanies this result separately; the report and primary stone provide stable source pins. **No hosted CI result is claimed for this reanalysis.** No merge or edits to original stones were performed beyond adding this new publication folder.
