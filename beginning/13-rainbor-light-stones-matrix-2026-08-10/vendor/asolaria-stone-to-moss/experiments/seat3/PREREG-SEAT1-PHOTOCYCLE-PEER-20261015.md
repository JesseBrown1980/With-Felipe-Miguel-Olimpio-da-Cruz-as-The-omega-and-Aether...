# Seat 3 preregistration — independent Seat 1 photocycle peer audit and actuator-cost frontier

**Date 2026-10-15.** This audit is **post-publication confirmatory** with respect to Seat 1's already published baseline outcomes. It is *not* a fresh blinded physical challenge, and does not pretend the baseline target SHA was unknown. Predictions and acceptance gates below are committed before writing the Seat 3 reimplementation.

## Frozen producer evidence (different model from Seat 3 PR #49)

- Producer [Seat 1 PR #50](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/50) head commit `19f21a880d16e84902d157a6d3bc4bcd908dc888`.
- Seat1 `experiments/seat1/optogenetics/PREREG-LIGHT-GATED-IDENTITY-1080.md` Git blob `a9752cee6bd833af0ad1dbef7b01a50125c8baa1`, producer Python code blob `32667d1172eae4856a1c31499c04509e96b1771f`, Node code blob `d5e5644b3e4d65759b3f7c44e006da8cc3310261`.
- Original producing [Actions run 38721708651](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38721708651): 3/3 PASS (Ubuntu, Windows, cross-OS); full HBP SHA256 already published `de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b`.
- This is not Seat3 PR #49's separate 960-tick spectral-receptor experiment. Do not pool outputs/row counts.

## Mathematical model fixed before coding

81 identities `id=0..80`, 27 waves, 40 ticks each, 4 arms independently starting all `(C,O,R)=(1_000_000,0,0)`. State count always `C+O+R=1_000_000`. For current-state values and simulated binary light input `L`:
```
activation   = floor(C*300000/1000000) if L else 0
inactivation = floor(O*60000/1000000)
recovery     = floor(R*25000/1000000)
C' = C - activation + recovery
O' = O + activation - inactivation
R' = R + inactivation - recovery
```
Target for each wave and channel is `target=(id+wave)%3==0`; desired O=400000 if targeted else zero. Controls:
- dark: L=0 always
- open_loop: L=target && tick%12<4
- feedback_truth: L=target && prior O<400000
- feedback_corrupt: L=target && min(1000000, prior O+250000)<400000

Error is summed `abs(O' - target_O)` at every id/wave/tick. Counts are integer exact; no experimental photonics data or biophysical calibration.

## Preregistered Seat 3 proof obligations

1. **Independent implementation:** Node 22 `Uint32Array` double-buffer synchronous state machine with a separately written state transition and provenance-watcher validator. Do not import or run Seat1's producer code for the independent verdict. Generate the exact canonical ASCII HBP lines using the published fixture, and check **entire 8,748 state snapshots** and the producer's full trace SHA256 `de2c...0a8b`, not merely summaries. Linux/Windows CI.
2. **Raw measured metrics:** independent code must calculate, not copy, the producer's published (absolute error, commands) pairs: dark `(11664000000,0)`, open_loop `(5878733220,11664)`, feedback_truth `(4516776378,17820)`, feedback_corrupt `(8221918824,2835)`.
3. **New derived exact cost frontier:** for objective `J=error+lambda*light_commands`, truthful feedback vs this specific open-loop control has crossover `lambda*=(5878733220-4516776378)/(17820-11664)=8407141/38` error-units/command. Compare at lambda=0 (feedback beats open), lambda=221240 (feedback beats open), lambda=221241 (open beats feedback) without floating point. This is NOT a physical energy-efficiency measurement. Do not extrapolate to all open-loop policies or tuned controllers.
4. **Real mutation controls:** from frozen pre-state and separately specified intended light command, recompute `(C',O',R')` and compare a reported tuple with its ID, wave, tick and light label. Reject **mass-conserving** coordinated C/O error, swapped ID, true opening-rate +1, a prior-state/stale report, altered light schedule. Merely asserting `1!=0` is not a working negative control. Include coherent substitute source accepted as locally mathematical but origin NOT authenticated.
5. **Source/trust limitations:** Same-input watcher can recompute honestly over falsely substituted light input; origin remains unverified without a separately trusted external reference. Per-tick simulation is autonomous. No physical hosts, optical sensor, biological opsin expression, real Q-PRISM/neuron coupling, hardware QLED, or human consciousness claim.
6. **Fail-closed CI and artifacts:** require actual Node-replayed full digest, a separate Python verifier of exact numeric metrics/frontier/controls, and changed-output mutation rejected; Ubuntu and Windows jobs; SHA256 sidecars produced per CI run. Commit append-only summary stone **after** hosted success, with new CI rerun validating the committed checksum; do not overwrite older records.

## Explicit peer-review finding to investigate

Seat1 `controls()` source at frozen producer blob includes the assertions `assert 1!=0` and `assert 300000+250000!=300000`, which alone do not inject an ID-swap or a forged measurement into the normal transition pathway. Independently test real mutated reports, and ask Seat1 to relabel or upgrade such gates if genuine test coverage is missing. Distinguish a *theoretically distinguishable mutation* from an *actually executed fail-closed watcher*.

Any disagreement must be published as HELD with direct input/output witnesses. PR remains open for another seat's review, no automatic merge or physical challenge.
